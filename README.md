# Car MPG Prediction

Prédiction de la consommation de carburant d'un véhicule (miles per gallon) à partir de ses caractéristiques techniques, servie via une API REST containerisée et une interface React.

**Démo** : https://car-price-ml-pink.vercel.app  
**API** : https://car-price-ml-906z.onrender.com/docs

> L'API est hébergée sur une instance gratuite qui se met en veille après 15 minutes d'inactivité. Le premier appel peut donc prendre une trentaine de secondes.

**Stack** : Python · scikit-learn · FastAPI · React · Docker

---

## Problème

Estimer la consommation d'un véhicule sans mesure physique, à partir de caractéristiques connues au catalogue : cylindrée, poids, puissance, nombre de cylindres, accélération, année et origine.

Il s'agit d'un problème de **régression supervisée** : la cible est une variable continue.

---

## Données

Dataset `mpg` (Auto MPG, UCI Machine Learning Repository), 398 véhicules commercialisés entre 1970 et 1982.

| Colonne | Type | Rôle |
|---|---|---|
| `mpg` | float | Cible |
| `cylinders` | int | Feature |
| `displacement` | float | Feature |
| `horsepower` | float | Feature (6 valeurs manquantes) |
| `weight` | int | Feature |
| `acceleration` | float | Feature |
| `model_year` | int | Source de `age` |
| `origin` | str | Feature catégorielle |
| `name` | str | Écartée (identifiant unique) |

---

## Méthodologie

### Préparation

Le prétraitement est encapsulé dans un `Pipeline` scikit-learn, entraîné exclusivement sur le jeu d'entraînement afin d'éviter toute **fuite de données** :

- `SimpleImputer(median)` sur les variables numériques — la médiane résiste aux valeurs extrêmes
- `StandardScaler` — sans normalisation, `weight` (~3000) écraserait `cylinders` (~6) dans les modèles linéaires
- `OneHotEncoder` sur `origin` — un encodage ordinal introduirait un ordre fictif entre les pays

### Feature engineering

Création de la variable `age = 82 - model_year`, plus directement interprétable que l'année de sortie.

### Découpage

80% entraînement / 20% test (`random_state=42`). Le jeu de test n'est utilisé qu'une seule fois, en fin de projet. Toutes les décisions de modélisation reposent sur la validation croisée du jeu d'entraînement.

---

## Résultats

| Modèle | MAE | RMSE | R² (test) |
|---|---|---|---|
| Baseline (moyenne) | 5.96 | — | 0.000 |
| Régression linéaire | 2.29 | 2.89 | 0.845 |
| **Random Forest** (300 arbres) | **1.58** | **2.17** | **0.912** |

**Validation croisée** (5 plis, sur le jeu d'entraînement) : R² = **0.844 ± 0.033**

Le score de 0.912 obtenu sur le jeu de test est optimiste : la validation croisée, moyennée sur cinq découpages, fournit l'estimation la plus honnête de la performance réelle. **C'est la valeur 0.844 qui doit être retenue.**

L'écart entre R² d'entraînement (0.981) et R² de test (0.912) reste dans les limites attendues pour une forêt aléatoire, qui s'ajuste finement aux données d'entraînement par construction.

---

## Interprétation

Importance des variables (Random Forest) :

| Variable | Importance |
|---|---|
| `displacement` | 38% |
| `weight` | 18% |
| `cylinders` | 16% |
| `horsepower` | 13% |
| `age` | 12% |
| `acceleration` | 3% |
| `origin` (3 modalités) | < 1% |

La cylindrée domine largement, ce qui est cohérent avec la physique du moteur.

L'importance quasi nulle de `origin` ne signifie pas que l'origine du véhicule est sans lien avec la consommation, mais que cette information est **déjà contenue** dans les autres variables : un véhicule japonais de cette période se caractérise par un moteur de faible cylindrée et un poids réduit. Une fois `displacement` et `weight` connues, l'origine n'apporte plus d'information supplémentaire.

La même réserve s'applique au partage entre `displacement` et `cylinders`, fortement corrélées entre elles : la répartition de leur importance respective est en partie arbitraire.

---

## Limites

- **Données historiques** (1970-1982). Le modèle est inapplicable aux véhicules actuels : évolution des motorisations, injection, hybridation, normes d'émission.
- **Volume réduit** (398 observations), d'où la variabilité observée entre les plis de validation croisée (0.783 à 0.873).
- **Variables absentes** : aérodynamisme, type de transmission, conditions de conduite. Elles expliquent une partie des ~16% de variance non capturée.
- **Pas d'optimisation d'hyperparamètres** : les paramètres de la forêt sont ceux par défaut, hors le nombre d'arbres. Une recherche par validation croisée apporterait un gain marginal sur un dataset de cette taille.

---

## Architecture

| Composant | Technologie | Hébergement |
|---|---|---|
| Modèle | scikit-learn (Random Forest) | Sérialisé avec joblib |
| API | FastAPI + Pydantic | Render |
| Frontend | React + Vite | Vercel |
| Conteneurisation | Docker | — |

Le frontend n'embarque aucune logique métier : il envoie les caractéristiques du véhicule à l'API et affiche la prédiction retournée. Le modèle ne quitte jamais le serveur.

---

## API

### Endpoints

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/health` | Statut du service |
| `POST` | `/predict` | Prédiction de consommation |
| `GET` | `/docs` | Documentation interactive (Swagger) |

### Exemple

**Requête**

```json
POST /predict
{
  "cylinders": 4,
  "displacement": 120.0,
  "horsepower": 90.0,
  "weight": 2400,
  "acceleration": 15.0,
  "model_year": 80,
  "origin": "japan"
}
```

**Réponse**

```json
{
  "mpg": 34.66,
  "litres_per_100km": 6.79
}
```

Les entrées sont validées par Pydantic avant d'atteindre le modèle : bornes sur les valeurs numériques, `origin` restreinte à `usa` / `europe` / `japan`. Toute entrée invalide est rejetée en HTTP 422 sans appel au modèle.

La variable `age` est recalculée côté API selon la formule exacte utilisée à l'entraînement — une divergence entre le feature engineering d'entraînement et celui de production produirait des prédictions silencieusement fausses.

---

## Installation

### API — local

```bash
git clone https://github.com/YassineBalbali/car-price-ml.git
cd car-price-ml

python -m venv .venv
source .venv/bin/activate        # Windows : .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn api:app --reload
```

API disponible sur `http://localhost:8000/docs`.

### API — Docker

```bash
docker build -t car-mpg-api .
docker run -p 8000:8000 car-mpg-api
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Interface disponible sur `http://localhost:5173`.

L'URL de l'API est définie dans la constante `API_URL` de `frontend/src/App.jsx`.

### Notebooks

```bash
pip install -r requirements-dev.txt
jupyter notebook
```

---

## Structure

```
car-price-ml/
├── notebooks/
│   ├── 01_exploration.ipynb      # EDA, distributions, corrélations
│   └── 02_modeling.ipynb         # Préparation, modèles, évaluation
├── frontend/
│   └── src/
│       ├── App.jsx               # Formulaire et appel API
│       └── App.css
├── api.py                        # Service FastAPI
├── model.pkl                     # Pipeline sérialisé (joblib)
├── requirements.txt              # Dépendances de production
├── requirements-dev.txt          # Dépendances notebooks
├── Dockerfile
└── README.md
```

Les versions de `scikit-learn`, `pandas` et `numpy` sont figées dans `requirements.txt` : `model.pkl` a été sérialisé avec ces versions précises, et un écart au chargement peut provoquer une erreur ou modifier silencieusement les prédictions.

---

## Pistes d'amélioration

- Recherche d'hyperparamètres (`GridSearchCV`) et comparaison avec un modèle de gradient boosting
- Suivi d'expériences avec MLflow
- Intervalles de prédiction plutôt qu'une valeur ponctuelle
- Journalisation des requêtes et détection de dérive des données en production
- Tests automatisés sur les endpoints (`pytest` + `TestClient`)

---

## Auteur

**Yassine Balbali** — [github.com/YassineBalbali](https://github.com/YassineBalbali)