"""
Logique de classement de la recherche sémantique.

Partagée entre l'API et le mode test d'embeddings.py : évaluer autre chose
que ce qui est servi aux utilisateurs n'a aucun intérêt.

Trois mécanismes complémentaires, chacun compétent là où les autres échouent :

1. le FILTRE garantit les contraintes fermes — « électrique » doit exclure
   les thermiques, ce qu'aucun score de similarité ne peut promettre ;
2. les EMBEDDINGS comprennent l'intention floue — « partir en vacances à
   cinq » rejoint « familiale spacieuse » sans aucun mot commun ;
3. le RECLASSEMENT tranche les superlatifs — un modèle de langage rapproche
   les sujets, pas les négations : « moins polluante » et « très polluante »
   parlent tous deux de pollution, donc leurs vecteurs sont proches.
"""

import re

import numpy as np

# Vivier sélectionné par le sens avant reclassement. Trop large, le tri par
# critère efface la pertinence sémantique ; trop étroit, il ne corrige plus rien.
VIVIER = 60

# Poids du critère mesurable face à la similarité sémantique. À 1, « petite
# voiture pas chère » renverrait la voiture la moins chère du catalogue,
# quelle que soit sa taille.
POIDS_CRITERE = 0.45

# (motif, colonne, valeurs acceptées, libellé)
INTENTIONS = [
    (
        r"\b(rechargeable|plug.?in|phev)\b",
        "categorie",
        {"hybride_rechargeable"},
        "hybride rechargeable",
    ),
    (
        r"\b([ée]lectriques?|batterie|z[ée]ro [ée]mission|bev)\b",
        "categorie",
        {"electrique"},
        "100 % électrique",
    ),
    (r"\bhybrides?\b", "categorie", {"hybride"}, "hybride"),
    (r"\b(diesel|gazole|gasoil)\b", "carburant", {"diesel"}, "diesel"),
    (r"\b(essence|sans.?plomb|sp95|sp98)\b", "carburant", {"petrol"}, "essence"),
    (r"\b(gpl|gaz)\b", "carburant", {"lpg"}, "GPL"),
    (r"\b(e85|[ée]thanol)\b", "carburant", {"e85"}, "E85"),
]

# (motif, colonne, tri croissant, libellé)
CRITERES = [
    (
        r"(moins polluante|[ée]cologiques?|propres?|z[ée]ro [ée]mission|pollue|co2)",
        "co2",
        True,
        "émissions de CO2 les plus faibles",
    ),
    (
        r"(sportives?|puissantes?|performantes?|rapides?|nerveuses?|vives?)",
        "_kg_par_kw",
        True,
        "meilleur rapport poids-puissance",
    ),
    (
        r"(grande autonomie|autonomie|longue distance sans recharge)",
        "autonomie_electrique",
        False,
        "plus grande autonomie",
    ),
    (
        r"(\d[\d\s]{3,}\s?km|gros rouleurs?|beaucoup de (kilom|route)|"
        r"pas ch[èe]res?|[ée]conomiques?|petit budget|moins ch[èe]re|"
        r"co[ûu]t|d[ée]pense|consomme le moins|sobres?)",
        "_cout_100",
        True,
        "coût aux 100 km le plus bas",
    ),
    # Pas de critère pour « familiale » : la masse est un mauvais indicateur
    # d'habitabilité, les voitures puissantes étant lourdes elles aussi. Le
    # vocabulaire des descriptions traite déjà ce besoin correctement.
]


def colonnes_derivees(catalogue):
    """Ajoute les colonnes servant au reclassement. À appeler au chargement."""
    catalogue["_cout_100"] = np.where(
        catalogue["categorie"] == "electrique",
        catalogue["conso_electrique"] / 10 * 0.22,
        catalogue["consommation"] * 1.75,
    )
    catalogue["_kg_par_kw"] = catalogue["masse"] / catalogue["puissance"]
    return catalogue


def filtre_intention(catalogue, q: str):
    """Repère une motorisation imposée. Retourne (indices, libellé) ou (None, None)."""
    texte = q.lower()
    for motif, colonne, valeurs, libelle in INTENTIONS:
        if re.search(motif, texte):
            masque = catalogue[colonne].isin(valeurs).to_numpy()
            if masque.any():
                return np.flatnonzero(masque), libelle
    return None, None


def critere(q: str):
    """Repère un superlatif ou un besoin chiffré, à traduire en tri."""
    texte = q.lower()
    for motif, colonne, croissant, libelle in CRITERES:
        if re.search(motif, texte):
            return colonne, croissant, libelle
    return None, None, None


def _normaliser(valeurs, meilleur_bas):
    """Ramène une grandeur entre 0 (le pire) et 1 (le meilleur)."""
    mini, maxi = float(valeurs.min()), float(valeurs.max())
    if maxi == mini:
        return np.ones_like(valeurs, dtype="float64")
    note = (valeurs - mini) / (maxi - mini)
    return 1 - note if meilleur_bas else note


def classer(catalogue, vecteurs, vecteur_requete, q, limite=8, seuil=0.35):
    """
    Classe le catalogue pour une demande.

    Retourne (indices retenus, scores, libellé du filtre, libellé du tri).
    """
    scores = vecteurs @ vecteur_requete

    candidats, libelle_filtre = filtre_intention(catalogue, q)
    if candidats is None:
        candidats = np.arange(len(scores))

    ordonnes = candidats[np.argsort(-scores[candidats])]
    pertinents = [i for i in ordonnes if scores[i] >= seuil]

    # Un filtre strict peut vider les résultats : on garde alors les
    # meilleurs de la catégorie demandée plutôt que de ne rien renvoyer
    if not pertinents and libelle_filtre:
        pertinents = list(ordonnes[:VIVIER])

    if not pertinents:
        return [], scores, libelle_filtre, None

    colonne, croissant, libelle_critere = critere(q)
    if colonne:
        vivier = np.array(pertinents[:VIVIER])
        valeurs = catalogue[colonne].to_numpy()[vivier]
        valides = ~np.isnan(valeurs)

        if valides.sum() >= limite:
            vivier = vivier[valides]
            valeurs = valeurs[valides]

            # Les deux grandeurs n'ont ni la même unité ni la même échelle :
            # on les ramène chacune entre 0 et 1 avant de les combiner.
            note_critere = _normaliser(valeurs, meilleur_bas=croissant)
            note_sens = _normaliser(scores[vivier], meilleur_bas=False)

            final = (1 - POIDS_CRITERE) * note_sens + POIDS_CRITERE * note_critere
            pertinents = list(vivier[np.argsort(-final)])
        else:
            libelle_critere = None

    return pertinents[:limite], scores, libelle_filtre, libelle_critere