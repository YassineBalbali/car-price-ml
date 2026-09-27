from fastembed import TextEmbedding

for m in TextEmbedding.list_supported_models():
    nom = m["model"]
    taille = m.get("size_in_GB", 0)
    print(f"{nom:58} dim={m['dim']:4}  {taille:.2f} Go")
