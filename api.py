import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal, Optional

app = FastAPI(
    title="Vehicle Consumption Predictor",
    description="Prédiction de consommation pour véhicules thermiques, hybrides et électriques (EPA 1984-2027)",
    version="2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

MODELS = {
    "thermique": joblib.load("models/model_thermique.pkl"),
    "hybride": joblib.load("models/model_hybride.pkl"),
    "electrique": joblib.load("models/model_electrique.pkl"),
}

# Fiabilité mesurée en validation croisée (5 plis)
FIABILITE = {
    "thermique": {"cv_r2": 0.910, "ecart_type": 0.002, "n": 46228, "mae": 1.12},
    "hybride": {"cv_r2": 0.926, "ecart_type": 0.012, "n": 1873, "mae": 1.82},
    "electrique": {"cv_r2": 0.604, "ecart_type": 0.082, "n": 1572, "mae": 2.96},
}

Classe = Literal[
    "citadine", "compacte", "berline", "grande_berline",
    "break", "suv", "pickup", "van", "biplace", "autre",
]
Transmission = Literal["traction", "propulsion", "integrale"]


class ThermiqueInput(BaseModel):
    year: int = Field(..., ge=1984, le=2027)
    cylinders: float = Field(..., ge=2, le=16)
    displ: float = Field(..., gt=0, le=10, description="Cylindrée en litres")
    classe: Classe
    transmission: Transmission
    boite: Literal["manuelle", "automatique"]
    fuelType1: Literal[
        "Regular Gasoline", "Premium Gasoline", "Midgrade Gasoline", "Diesel"
    ] = "Regular Gasoline"


class HybrideInput(ThermiqueInput):
    pass


class ElectriqueInput(BaseModel):
    year: int = Field(..., ge=1984, le=2027)
    range: int = Field(..., gt=0, le=800, description="Autonomie en miles")
    classe: Classe
    transmission: Transmission
    make: str = Field(..., min_length=1, max_length=40)


class Prediction(BaseModel):
    categorie: str
    unite_principale: str
    valeur: float
    l_per_100km: Optional[float] = None
    kwh_per_100km: Optional[float] = None
    mpg: Optional[float] = None
    fiabilite: dict


@app.get("/health")
def health():
    return {"status": "ok", "modeles": list(MODELS.keys())}


@app.get("/metadata")
def metadata():
    """Valeurs acceptées et fiabilité de chaque modèle — utile pour construire le front."""
    return {
        "classes": list(Classe.__args__),
        "transmissions": list(Transmission.__args__),
        "boites": ["manuelle", "automatique"],
        "carburants": [
            "Regular Gasoline", "Premium Gasoline", "Midgrade Gasoline", "Diesel"
        ],
        "annees": {"min": 1984, "max": 2027},
        "fiabilite": FIABILITE,
    }


def _predire_thermique(data: dict, categorie: str) -> Prediction:
    df = pd.DataFrame([data])
    mpg = float(MODELS[categorie].predict(df)[0])

    if mpg <= 0:
        raise HTTPException(500, "Prédiction invalide")

    return Prediction(
        categorie=categorie,
        unite_principale="mpg",
        valeur=round(mpg, 2),
        mpg=round(mpg, 2),
        l_per_100km=round(235.21 / mpg, 2),
        fiabilite=FIABILITE[categorie],
    )


@app.post("/predict/thermique", response_model=Prediction)
def predict_thermique(car: ThermiqueInput):
    return _predire_thermique(car.model_dump(), "thermique")


@app.post("/predict/hybride", response_model=Prediction)
def predict_hybride(car: HybrideInput):
    return _predire_thermique(car.model_dump(), "hybride")


@app.post("/predict/electrique", response_model=Prediction)
def predict_electrique(car: ElectriqueInput):
    df = pd.DataFrame([car.model_dump()])
    kwh_100mi = float(MODELS["electrique"].predict(df)[0])

    if kwh_100mi <= 0:
        raise HTTPException(500, "Prédiction invalide")

    # 1 mile = 1.60934 km
    kwh_100km = kwh_100mi / 1.60934

    return Prediction(
        categorie="electrique",
        unite_principale="kWh/100 mi",
        valeur=round(kwh_100mi, 2),
        kwh_per_100km=round(kwh_100km, 2),
        fiabilite=FIABILITE["electrique"],
    )