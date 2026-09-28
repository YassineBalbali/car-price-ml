import os
import re
import threading
from functools import lru_cache

import joblib
import numpy as np
import pandas as pd

import recherche
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal, Optional

app = FastAPI(
    title="Consommation des véhicules européens",
    description=(
        "Prédiction de consommation à partir des immatriculations françaises 2025 "
        "(Agence européenne pour l'environnement)."
    ),
    version="3.1",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

CATALOGUE = recherche.colonnes_derivees(pd.read_csv("data/catalogue_fr_2025.csv"))

# ─── Recherche sémantique ───────────────────────────────────────────────
# Les vecteurs sont précalculés par embeddings.py. Le modèle n'est chargé
# qu'au premier appel : l'API démarre et fonctionne sans lui.
VECTEURS = None
MODELE_TEXTE = None
DESCRIPTIONS = None

# La recherche sémantique charge un modèle ONNX de 250 Mo : impossible sur
# un hébergement limité à 512 Mo de mémoire. Elle n'est donc activée que si
# SEMANTIQUE=1, valeur mise en local et laissée absente en production.
SEMANTIQUE_ACTIVE = os.getenv("SEMANTIQUE", "0") == "1"

if SEMANTIQUE_ACTIVE and os.path.exists("data/vecteurs.npy"):
    VECTEURS = np.load("data/vecteurs.npy")
    if len(VECTEURS) != len(CATALOGUE):
        print(
            f"Vecteurs ({len(VECTEURS)}) et catalogue ({len(CATALOGUE)}) "
            "désynchronisés : relancez embeddings.py"
        )
        VECTEURS = None

if os.path.exists("data/descriptions.csv"):
    DESCRIPTIONS = pd.read_csv("data/descriptions.csv")["description"].tolist()


_VERROU_MODELE = threading.Lock()
# Doit être rigoureusement le même modèle que dans embeddings.py :
# deux modèles différents produisent des espaces vectoriels incompatibles.
NOM_MODELE = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def _modele_texte():
    """
    Charge le modèle d'embeddings une seule fois.

    fastembed est préféré : même modèle, exécuté avec ONNX, environ 50 Mo
    contre 1,5 Go pour PyTorch. C'est ce qui permet de tenir dans les
    512 Mo d'un hébergement gratuit. sentence-transformers sert de repli
    en développement local.

    Le verrou évite que deux requêtes simultanées déclenchent deux
    chargements en parallèle au démarrage.
    """
    global MODELE_TEXTE
    if MODELE_TEXTE is not None:
        return MODELE_TEXTE

    with _VERROU_MODELE:
        if MODELE_TEXTE is None:
            try:
                from fastembed import TextEmbedding

                moteur = TextEmbedding(model_name=NOM_MODELE)
                MODELE_TEXTE = ("fastembed", moteur)
            except ImportError:
                from sentence_transformers import SentenceTransformer

                MODELE_TEXTE = ("sentence-transformers", SentenceTransformer(NOM_MODELE))

            print(f"Moteur d'embeddings : {MODELE_TEXTE[0]}")

    return MODELE_TEXTE


@lru_cache(maxsize=256)
def _vecteur_requete(texte: str):
    """
    Encode une recherche, avec mise en cache.

    Les mêmes demandes reviennent souvent (exemples proposés, requêtes
    répétées) : le cache évite de refaire tourner le modèle.
    """
    moteur, modele = _modele_texte()

    if moteur == "fastembed":
        vecteur = np.asarray(next(iter(modele.embed([texte]))), dtype="float32")
        # fastembed ne normalise pas selon le modèle : on le fait ici pour
        # que le produit scalaire vaille bien la similarité cosinus
        norme = np.linalg.norm(vecteur)
        return vecteur / norme if norme else vecteur

    return modele.encode([texte], normalize_embeddings=True)[0]


@app.on_event("startup")
def _prechauffer():
    """
    Charge le modèle en tâche de fond dès le démarrage.

    L'API répond immédiatement aux autres endpoints pendant ce temps ;
    seule la première recherche sémantique attendra, et seulement si elle
    arrive avant la fin du chargement.
    """
    if VECTEURS is None:
        return

    def travail():
        try:
            _vecteur_requete("préchauffage")
            print("Modèle sémantique prêt")
        except Exception as e:
            print(f"Modèle sémantique indisponible : {e}")

    threading.Thread(target=travail, daemon=True).start()
MODELE_CONSO = joblib.load("models/eu_conso.pkl")
MODELE_ELEC = joblib.load("models/eu_conso_electrique.pkl")

# Texte de recherche précalculé une seule fois au démarrage :
# « marque modèle » en minuscules, et sa version sans espaces
# pour que « mg3 » trouve « MG 3 » et inversement.
TEXTE_RECHERCHE = (CATALOGUE["marque"] + " " + CATALOGUE["modele"]).str.lower()
TEXTE_COMPACT = TEXTE_RECHERCHE.str.replace(r"[\s\-]", "", regex=True)

FIABILITE = {
    "carburant": {"cv_r2": 0.934, "ecart_type": 0.007, "mae": 0.39, "n": 727},
    "electrique": {"cv_r2": 0.728, "ecart_type": 0.052, "mae": 10.08, "n": 323},
}

CARBURANTS_FR = {
    "petrol": "Essence",
    "diesel": "Diesel",
    "lpg": "GPL",
    "e85": "Superéthanol E85",
    "petrol/electric": "Hybride essence",
    "diesel/electric": "Hybride diesel",
    "electric": "Électrique",
}

LIBELLES_CATEGORIE = {
    "thermique": "Thermique pur",
    "hybride": "Hybride non rechargeable",
    "hybride_rechargeable": "Hybride rechargeable",
    "electrique": "Électrique",
}

COMMENTAIRES_CATEGORIE = {
    "thermique": (
        "Motorisation classique. La consommation suit directement la puissance "
        "installée et la cylindrée."
    ),
    "hybride": (
        "L'assistance électrique récupère l'énergie au freinage. Le gain est réel "
        "en usage urbain, plus faible sur route."
    ),
    "hybride_rechargeable": (
        "Valeur d'homologation calculée batterie pleine, sans rapport avec un "
        "usage sans recharge régulière."
    ),
    "electrique": (
        "Aucune émission à l'échappement. La consommation dépend surtout de la "
        "masse et de l'aérodynamisme."
    ),
}

# Facteurs d'émission réglementaires (g CO2 par litre brûlé)
CO2_PAR_LITRE = {
    "petrol": 23.92,
    "petrol/electric": 23.92,
    "e85": 23.92,
    "lpg": 16.70,
    "diesel": 26.40,
    "diesel/electric": 26.40,
}

# Prix moyens du carburant, en euros par litre
PRIX_LITRE = {
    "petrol": 1.75,
    "petrol/electric": 1.75,
    "diesel": 1.70,
    "diesel/electric": 1.70,
    "lpg": 0.95,
    "e85": 0.85,
}
PRIX_KWH = 0.22
KM_PAR_AN = 15000


class VehiculeThermique(BaseModel):
    masse: float = Field(..., ge=500, le=3500, description="Masse en kg")
    cylindree: float = Field(..., ge=600, le=8000, description="Cylindrée en cm³")
    puissance: float = Field(..., ge=20, le=700, description="Puissance en kW")
    carburant: Literal[
        "petrol", "diesel", "lpg", "e85", "petrol/electric", "diesel/electric"
    ]
    categorie: Literal["thermique", "hybride"]
    marque: str = Field(default="AUTRE", max_length=40)


class VehiculeElectrique(BaseModel):
    masse: float = Field(..., ge=500, le=3500)
    puissance: float = Field(..., ge=20, le=1000)
    autonomie_electrique: float = Field(
        ..., ge=50, le=900, description="Autonomie en km"
    )
    marque: str = Field(default="AUTRE", max_length=40)


class Prediction(BaseModel):
    unite: str
    valeur: float
    l_100km: Optional[float] = None
    kwh_100km: Optional[float] = None
    co2_estime: Optional[float] = None
    cout_annuel: Optional[float] = None
    fiabilite: dict


class Vehicule(BaseModel):
    marque: str
    modele: str
    carburant: str
    carburant_libelle: str
    categorie: str
    masse: Optional[float] = None
    cylindree: Optional[float] = None
    puissance: Optional[float] = None
    consommation: Optional[float] = None
    conso_electrique: Optional[float] = None
    autonomie_electrique: Optional[float] = None
    co2: Optional[float] = None
    immatriculations: int
    score: Optional[float] = None
    description: Optional[str] = None


def _nettoyer_modele(marque: str, modele: str) -> str:
    """Certains libellés répètent la marque : « TOYOTA TOYOTA YARIS »."""
    if modele.upper().startswith(marque.upper() + " "):
        return modele[len(marque) + 1 :]
    return modele


def _ligne_vers_vehicule(row) -> Vehicule:
    def val(c):
        v = row[c]
        return None if pd.isna(v) else float(v)

    return Vehicule(
        marque=row["marque"],
        modele=_nettoyer_modele(row["marque"], row["modele"]),
        carburant=row["carburant"],
        carburant_libelle=CARBURANTS_FR.get(row["carburant"], row["carburant"]),
        categorie=row["categorie"],
        masse=val("masse"),
        cylindree=val("cylindree"),
        puissance=val("puissance"),
        consommation=val("consommation"),
        conso_electrique=val("conso_electrique"),
        autonomie_electrique=val("autonomie_electrique"),
        co2=val("co2"),
        immatriculations=int(row["immatriculations"]),
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "vehicules": len(CATALOGUE),
        "recherche_semantique": VECTEURS is not None,
        "semantique_autorisee": SEMANTIQUE_ACTIVE,
    }


@app.get("/metadata")
def metadata():
    return {
        "source": "Agence européenne pour l'environnement — immatriculations France 2025",
        "vehicules": len(CATALOGUE),
        "marques": sorted(CATALOGUE["marque"].unique().tolist()),
        "carburants": CARBURANTS_FR,
        "categories": sorted(CATALOGUE["categorie"].unique().tolist()),
        "fiabilite": FIABILITE,
    }


@app.get("/statistiques")
def statistiques():
    """Répartition du parc immatriculé en 2025, par type de motorisation."""
    lignes = []
    total = CATALOGUE["immatriculations"].sum()

    for cat in ["thermique", "hybride", "hybride_rechargeable", "electrique"]:
        sous = CATALOGUE[CATALOGUE["categorie"] == cat]
        if sous.empty:
            continue

        colonne = "conso_electrique" if cat == "electrique" else "consommation"
        valeurs = sous[colonne].dropna()
        if valeurs.empty:
            continue

        lignes.append(
            {
                "categorie": cat,
                "libelle": LIBELLES_CATEGORIE[cat],
                "versions": int(len(sous)),
                "immatriculations": int(sous["immatriculations"].sum()),
                "part": round(100 * sous["immatriculations"].sum() / total, 1),
                "conso_mediane": (
                    round(float(valeurs.median()) / 10, 1)
                    if cat == "electrique"
                    else round(float(valeurs.median()), 1)
                ),
                "unite": "kWh/100 km" if cat == "electrique" else "L/100 km",
                "co2_median": round(float(sous["co2"].median())),
                "masse_mediane": int(sous["masse"].median()),
                "commentaire": COMMENTAIRES_CATEGORIE[cat],
            }
        )

    return {
        "total_immatriculations": int(total),
        "total_versions": int(len(CATALOGUE)),
        "categories": lignes,
    }


@app.get("/recherche", response_model=list[Vehicule])
def recherche(
    q: str = Query(
        ...,
        min_length=2,
        description="Marque et/ou modèle, ex. « golf », « hyundai i20 », « mg3 »",
    ),
    limite: int = Query(20, ge=1, le=300),
):
    """
    Recherche un véhicule réel dans le catalogue.

    Chaque mot de la requête doit apparaître dans « marque + modèle ».
    Un mot est accepté s'il correspond en début de mot dans le texte normal,
    ou n'importe où dans la version sans espaces (pour « mg3 » ↔ « MG 3 »).
    """
    mots = [m for m in q.strip().lower().split() if m]
    if not mots:
        raise HTTPException(422, "Requête vide")

    masque = pd.Series(True, index=CATALOGUE.index)

    for mot in mots:
        mot_sur = re.escape(mot)
        mot_compact = re.escape(re.sub(r"[\s\-]", "", mot))

        trouve_normal = TEXTE_RECHERCHE.str.contains(
            r"\b" + mot_sur, na=False, regex=True
        )
        trouve_compact = TEXTE_COMPACT.str.contains(
            mot_compact, na=False, regex=True
        )
        masque &= trouve_normal | trouve_compact

    resultats = CATALOGUE[masque].sort_values("immatriculations", ascending=False)

    if resultats.empty:
        raise HTTPException(404, f"Aucun véhicule ne correspond à « {q} »")

    return [_ligne_vers_vehicule(r) for _, r in resultats.head(limite).iterrows()]


@app.get("/recherche/semantique", response_model=list[Vehicule])
def recherche_semantique(
    q: str = Query(
        ...,
        min_length=3,
        description="Besoin en langage courant, ex. « petite citadine économique »",
    ),
    limite: int = Query(8, ge=1, le=40),
    seuil: float = Query(0.35, ge=0, le=1, description="Similarité minimale"),
):
    """
    Recherche par le sens plutôt que par les mots.

    Chaque version du catalogue est décrite par une phrase, transformée en
    vecteur. La requête subit le même traitement, et l'on classe les
    véhicules par similarité cosinus.
    """
    if VECTEURS is None:
        raise HTTPException(
            503,
            "Recherche sémantique désactivée sur ce serveur, faute de mémoire "
            "suffisante. Elle fonctionne en local avec SEMANTIQUE=1.",
        )

    try:
        vecteur = _vecteur_requete(q.strip().lower())
    except ImportError:
        raise HTTPException(
            503,
            "Dépendance manquante : pip install fastembed",
        )

    # Les vecteurs étant normalisés, le produit scalaire est la similarité cosinus
    retenus, scores, _, _ = recherche.classer(
        CATALOGUE, VECTEURS, vecteur, q, limite=limite, seuil=seuil
    )

    if not retenus:
        raise HTTPException(404, f"Aucun véhicule ne correspond à « {q} »")

    resultats = []
    for i in retenus:
        vehicule = _ligne_vers_vehicule(CATALOGUE.iloc[i])
        vehicule.score = round(float(scores[i]), 3)
        if DESCRIPTIONS:
            vehicule.description = DESCRIPTIONS[i]
        resultats.append(vehicule)

    return resultats


@app.post("/predict/carburant", response_model=Prediction)
def predict_carburant(v: VehiculeThermique):
    """Prédiction pour un véhicule thermique ou hybride non rechargeable."""
    df = pd.DataFrame([v.model_dump()])
    litres = float(MODELE_CONSO.predict(df)[0])

    if litres <= 0:
        raise HTTPException(500, "Prédiction invalide")

    co2 = litres * CO2_PAR_LITRE.get(v.carburant, 23.92)
    cout = litres / 100 * KM_PAR_AN * PRIX_LITRE.get(v.carburant, 1.75)

    return Prediction(
        unite="L/100 km",
        valeur=round(litres, 2),
        l_100km=round(litres, 2),
        co2_estime=round(co2, 1),
        cout_annuel=round(cout),
        fiabilite=FIABILITE["carburant"],
    )


@app.post("/predict/electrique", response_model=Prediction)
def predict_electrique(v: VehiculeElectrique):
    """Prédiction pour un véhicule 100 % électrique."""
    df = pd.DataFrame([v.model_dump()])
    wh_km = float(MODELE_ELEC.predict(df)[0])

    if wh_km <= 0:
        raise HTTPException(500, "Prédiction invalide")

    kwh_100 = wh_km / 10
    cout = kwh_100 / 100 * KM_PAR_AN * PRIX_KWH

    return Prediction(
        unite="kWh/100 km",
        valeur=round(kwh_100, 1),
        kwh_100km=round(kwh_100, 1),
        co2_estime=0.0,
        cout_annuel=round(cout),
        fiabilite=FIABILITE["electrique"],
    )