"""
Vérifie que fastembed et sentence-transformers produisent bien le même
espace vectoriel pour le modèle E5.

Les vecteurs du catalogue ont été générés avec sentence-transformers. Si
l'API encode les requêtes avec fastembed, les deux doivent coïncider,
sinon la recherche renverra n'importe quoi sans lever la moindre erreur.
"""

import numpy as np

MODELE = "intfloat/multilingual-e5-small"
PHRASES = [
    "query: petite voiture pas chère pour la ville",
    "query: électrique avec une grande autonomie",
    "passage: diesel gazole, familiale spacieuse, gros rouleur",
]


def normaliser(v):
    v = np.asarray(v, dtype="float32")
    n = np.linalg.norm(v)
    return v / n if n else v


def principal():
    from fastembed import TextEmbedding
    from sentence_transformers import SentenceTransformer

    print("Chargement des deux moteurs…")
    rapide = TextEmbedding(model_name=MODELE)
    reference = SentenceTransformer(MODELE)

    vecteurs_rapides = [normaliser(v) for v in rapide.embed(PHRASES)]
    vecteurs_reference = reference.encode(PHRASES, normalize_embeddings=True)

    print("\nSimilarité entre les deux implémentations :")
    accord = True
    for phrase, a, b in zip(PHRASES, vecteurs_rapides, vecteurs_reference):
        similarite = float(np.dot(a, b))
        etat = "identique" if similarite > 0.99 else "DIVERGENT"
        if similarite <= 0.99:
            accord = False
        print(f"  {similarite:.4f}  {etat}  {phrase[:52]}")

    print()
    if accord:
        print("Les deux moteurs sont interchangeables : fastembed peut servir en production.")
    else:
        print(
            "Les vecteurs diffèrent. Régénérez le catalogue avec fastembed "
            "plutôt que de mélanger les deux implémentations."
        )


if __name__ == "__main__":
    principal()