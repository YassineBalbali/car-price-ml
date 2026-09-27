FROM python:3.12-slim

WORKDIR /app

# Les dépendances d'abord : cette couche est mise en cache tant que
# requirements.txt ne change pas, ce qui accélère les redéploiements.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api.py ./
COPY models/ ./models/

# Catalogue, descriptions et vecteurs précalculés : sans eux, la recherche
# sémantique se désactive silencieusement au démarrage.
COPY data/catalogue_fr_2025.csv ./data/
COPY data/descriptions.csv ./data/
COPY data/vecteurs.npy ./data/

# Le modèle ONNX est téléchargé au premier démarrage et mis en cache ici
ENV FASTEMBED_CACHE_PATH=/app/.cache

EXPOSE 8000

CMD ["sh", "-c", "uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}"]