"""
Génère les descriptions textuelles du catalogue et leurs vecteurs sémantiques.

    python embeddings.py           génère data/descriptions.csv et data/vecteurs.npy
    python embeddings.py --test    interroge les vecteurs existants pour juger la qualité

Le modèle ne connaît des voitures QUE ce qui est écrit dans ces descriptions.
Chaque règle doit donc employer les mots qu'un utilisateur taperait, et ne
jamais se contredire : « à l'aise sur autoroute » et « autonomie limitée,
plutôt pour la ville » dans la même phrase brouillent le sens du vecteur.
"""

import sys

import numpy as np
import pandas as pd

# Modèle multilingue disponible à la fois dans fastembed et
# sentence-transformers, et assez léger pour un hébergement gratuit.
# Contrairement à E5, il n'attend aucun préfixe « query: » ou « passage: ».
MODELE = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
CATALOGUE = "data/catalogue_fr_2025.csv"


def encoder(textes):
    """
    Encode avec fastembed, la même bibliothèque que l'API.

    Utiliser deux implémentations différentes entre la génération et la
    recherche produirait des vecteurs incompatibles, sans aucune erreur
    visible : les résultats seraient simplement absurdes.
    """
    from fastembed import TextEmbedding

    moteur = TextEmbedding(model_name=MODELE)
    vecteurs = np.array(list(moteur.embed(textes)), dtype="float32")

    # Similarité cosinus par simple produit scalaire
    normes = np.linalg.norm(vecteurs, axis=1, keepdims=True)
    return vecteurs / np.where(normes == 0, 1, normes)

PRIX = {
    "petrol": 1.75,
    "petrol/electric": 1.75,
    "diesel": 1.70,
    "diesel/electric": 1.70,
    "lpg": 0.95,
    "e85": 0.85,
}
PRIX_KWH = 0.22

MOTORISATIONS = {
    "petrol": "essence",
    "diesel": "diesel gazole",
    "lpg": "GPL, roule au gaz",
    "e85": "superéthanol E85",
    "petrol/electric": "hybride essence sans prise",
    "diesel/electric": "hybride diesel sans prise",
    "electric": "électrique à batterie, se recharge sur borne",
}


# ─── Caractérisation, calculée une fois pour rester cohérente ────────────


# Une batterie de traction pèse environ 300 kg : sans cet abattement, toute
# électrique serait classée parmi les grands véhicules.
ABATTEMENT_BATTERIE = 300


def gabarit(masse, categorie="", kw=None):
    """
    La masse sert d'indice de taille, faute de carrosserie dans les données.

    Une sportive légère fausse ce raisonnement : 725 kg pour 157 kW, c'est
    une voiture de piste, pas une citadine. Le rapport poids-puissance sert
    donc de garde-fou.
    """
    if pd.isna(masse):
        return "", 0

    if pd.notna(kw) and kw and masse / kw < 7:
        return "voiture de sport légère, deux places, usage plaisir", 1
    if categorie == "electrique":
        masse -= ABATTEMENT_BATTERIE
    elif categorie == "hybride_rechargeable":
        masse -= ABATTEMENT_BATTERIE / 2
    if masse < 1100:
        return "toute petite citadine légère, facile à garer", 1
    if masse < 1280:
        return "petite citadine maniable", 2
    if masse < 1480:
        return "compacte polyvalente", 3
    if masse < 1750:
        return "familiale spacieuse, grand coffre", 4
    if masse < 2050:
        return "très grand véhicule volumineux", 5
    return "véhicule très lourd et imposant", 6


def performances(masse, kw):
    """Le rapport poids-puissance décrit le tempérament, sans parler d'usage."""
    if pd.isna(kw) or pd.isna(masse) or kw == 0:
        return ""
    ratio = masse / kw
    if ratio < 9:
        return "sportive et très puissante"
    if ratio < 13:
        return "bonnes reprises"
    if ratio < 18:
        return "performances courantes"
    return "motorisation modeste et tranquille"


def cout_aux_100(ligne):
    """Traduit la consommation en euros : c'est ainsi qu'on parle du budget."""
    if ligne["categorie"] == "electrique":
        if pd.isna(ligne["conso_electrique"]):
            return None
        return ligne["conso_electrique"] / 10 * PRIX_KWH
    if pd.isna(ligne["consommation"]):
        return None
    return ligne["consommation"] * PRIX.get(ligne["carburant"], 1.75)


def budget(cout):
    if cout is None:
        return ""
    if cout < 4:
        return f"{cout:.2f} € aux 100 km, très bon marché à l'usage, petit budget"
    if cout < 8:
        return f"{cout:.2f} € aux 100 km, économique"
    if cout < 12:
        return f"{cout:.2f} € aux 100 km, coût moyen"
    return f"{cout:.2f} € aux 100 km, chère à faire rouler"


def aptitudes(ligne, taille):
    """
    Décide en une seule fois des usages adaptés, pour éviter toute
    contradiction entre les phrases générées.
    """
    cat = ligne["categorie"]
    autonomie = ligne["autonomie_electrique"]
    conso = ligne["consommation"]
    mots = []

    kw = ligne["puissance"]
    sportive_extreme = pd.notna(kw) and kw and ligne["masse"] / kw < 7

    ville = not sportive_extreme and (taille <= 3 or cat in ("hybride", "electrique"))
    if cat == "electrique":
        longue_distance = pd.notna(autonomie) and autonomie >= 420
        tres_court = pd.notna(autonomie) and autonomie < 280
    else:
        # Un diesel reste un véhicule de grand rouleur, même gourmand
        longue_distance = (
            ligne["carburant"] == "diesel" or pd.isna(conso) or conso <= 7
        )
        tres_court = False

    if ville:
        if cat == "hybride":
            mots.append("excellente en ville et dans les embouteillages")
        elif cat == "electrique":
            mots.append("silencieuse en ville, trajets domicile-travail")
        else:
            mots.append("facile en ville")

    if tres_court:
        mots.append(f"autonomie limitée de {int(autonomie)} km, trajets courts seulement")
    elif longue_distance:
        if cat == "electrique":
            mots.append(f"grande autonomie de {int(autonomie)} km, longs trajets possibles")
        elif ligne["carburant"] == "diesel":
            mots.append(
                "gros rouleur, 20 000 à 50 000 km par an, longues distances "
                "quotidiennes sur autoroute, grande autonomie par plein"
            )
        elif conso <= 5.5:
            # Réservé aux essences vraiment sobres : cette phrase perdait son
            # sens à force d'être attribuée à presque toutes les voitures
            mots.append("sobre sur route et autoroute")

    if taille >= 4:
        mots.append("famille nombreuse, cinq places et bagages, vacances")
    elif taille <= 1:
        mots.append("encombrement minimal, deuxième voiture")

    return mots


def ecologie(ligne):
    co2 = ligne["co2"]
    if pd.isna(co2):
        return ""
    # Le mot « polluante » est réservé aux véhicules qui émettent : employé
    # partout, il effaçait l'avantage lexical des électriques.
    if co2 == 0:
        return (
            "zéro émission de CO2, aucune pollution à l'usage, la voiture la "
            "plus propre et la plus écologique, aucun rejet"
        )
    if co2 < 100:
        return f"{int(co2)} g de CO2 par km, faibles rejets"
    if co2 > 160:
        return f"{int(co2)} g de CO2 par km, très polluante, malus écologique"
    return f"{int(co2)} g de CO2 par km, rejets moyens"


def decrire(ligne):
    """
    Décrit la voiture SANS son nom : « Grandland » attirait les recherches
    contenant « grande », « Sportage » celles contenant « sportive ». Le nom
    reste consultable dans descriptions.csv pour la recherche par mot-clé.
    """
    texte_gabarit, taille = gabarit(
        ligne["masse"], ligne["categorie"], ligne["puissance"]
    )
    morceaux = [
        MOTORISATIONS.get(ligne["carburant"], ""),
        texte_gabarit,
        performances(ligne["masse"], ligne["puissance"]),
        budget(cout_aux_100(ligne)),
        *aptitudes(ligne, taille),
        ecologie(ligne),
    ]
    if ligne["immatriculations"] >= 10000:
        morceaux.append("modèle très répandu en France")

    return ", ".join(m for m in morceaux if m)


# ─── Génération ─────────────────────────────────────────────────────────


def generer():
    catalogue = pd.read_csv(CATALOGUE)
    print(f"{len(catalogue)} versions chargées")

    catalogue["description"] = catalogue.apply(decrire, axis=1)

    print("\nExemples de descriptions générées :\n")
    for _, ligne in catalogue.sample(4, random_state=3).iterrows():
        print(f"  {ligne['description']}\n")

    print(f"Encodage avec {MODELE}…")
    vecteurs = encoder(catalogue["description"].tolist())

    catalogue[["marque", "modele", "carburant", "description"]].to_csv(
        "data/descriptions.csv", index=False
    )
    np.save("data/vecteurs.npy", vecteurs.astype("float32"))

    print(f"\nVecteurs : {vecteurs.shape}")
    print("Écrits dans data/vecteurs.npy et data/descriptions.csv")


# ─── Évaluation ─────────────────────────────────────────────────────────

REQUETES_TEST = [
    "petite voiture pas chère pour la ville",
    "grande familiale pour partir en vacances à cinq",
    "électrique avec une grande autonomie pour l'autoroute",
    "je fais 40 000 km par an sur autoroute",
    "voiture sportive et puissante",
    "la moins polluante possible",
]


def tester():
    """
    Évalue exactement ce que sert l'API : filtre, similarité et
    reclassement. Juger la similarité brute donnerait une image fausse de
    ce que voit l'utilisateur.
    """
    import recherche

    catalogue = recherche.colonnes_derivees(pd.read_csv(CATALOGUE))
    vecteurs = np.load("data/vecteurs.npy")

    requetes = encoder(REQUETES_TEST)

    for requete, vecteur in zip(REQUETES_TEST, requetes):
        retenus, scores, filtre, tri = recherche.classer(
            catalogue, vecteurs, vecteur, requete, limite=5
        )

        entete = f"\n« {requete} »"
        if filtre:
            entete += f"   [filtre : {filtre}]"
        if tri:
            entete += f"   [tri : {tri}]"
        print(entete)

        if not retenus:
            print("  aucun résultat au-dessus du seuil")
            continue

        for i in retenus:
            v = catalogue.iloc[i]
            unite = (
                f"{v['conso_electrique'] / 10:.1f} kWh"
                if v["categorie"] == "electrique"
                else f"{v['consommation']:.1f} L"
            )
            print(
                f"  {scores[i]:.3f}  {v['marque']} {v['modele']:<22}"
                f" {unite}/100 km · {v['_cout_100']:.2f} €/100km"
                f" · {v['co2']:.0f} g · {v['categorie']}"
            )


if __name__ == "__main__":
    if "--test" in sys.argv:
        tester()
    else:
        generer()