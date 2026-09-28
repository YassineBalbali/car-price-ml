"""
Compresse le logo du bandeau.

    python compresser_logo.py

Le fichier d'origine pèse environ 1,2 Mo pour une image affichée sur
130 pixels de haut : c'est la ressource la plus lourde du site, chargée à
chaque visite. On le redimensionne et on le réenregistre en PNG optimisé.
"""

from pathlib import Path

from PIL import Image

SOURCE = Path("frontend/public/logo.png")
LARGEUR_CIBLE = 520  # largement suffisant pour un affichage à 130 px de haut


def principal():
    if not SOURCE.exists():
        print(f"Introuvable : {SOURCE}")
        return

    avant = SOURCE.stat().st_size
    image = Image.open(SOURCE)

    print(f"Avant : {image.width}×{image.height} px, {avant / 1024:.0f} Ko")

    if image.width > LARGEUR_CIBLE:
        hauteur = round(image.height * LARGEUR_CIBLE / image.width)
        image = image.resize((LARGEUR_CIBLE, hauteur), Image.LANCZOS)

    # Une sauvegarde de l'original, au cas où
    original = SOURCE.with_name("logo-original.png")
    if not original.exists():
        SOURCE.replace(original)

    image.convert("RGB").save(SOURCE, "PNG", optimize=True)

    apres = SOURCE.stat().st_size
    print(f"Après : {image.width}×{image.height} px, {apres / 1024:.0f} Ko")
    print(f"Réduction : {100 * (1 - apres / avant):.0f} %")
    print(f"L'original est conservé dans {original.name}")


if __name__ == "__main__":
    principal()