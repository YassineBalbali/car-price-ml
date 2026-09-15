import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal

app = FastAPI(title="Car MPG Predictor", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

model = joblib.load("model.pkl")


class CarInput(BaseModel):
    cylinders: int = Field(..., ge=2, le=16)
    displacement: float = Field(..., gt=0)
    horsepower: float = Field(..., gt=0)
    weight: int = Field(..., gt=0)
    acceleration: float = Field(..., gt=0)
    model_year: int = Field(..., ge=70, le=82)
    origin: Literal["usa", "europe", "japan"]

    @property
    def age(self) -> int:
        return 82 - self.model_year


class Prediction(BaseModel):
    mpg: float
    litres_per_100km: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=Prediction)
def predict(car: CarInput):
    row = car.model_dump()
    row["age"] = car.age
    df = pd.DataFrame([row])

    mpg = float(model.predict(df)[0])
    return Prediction(
        mpg=round(mpg, 2),
        litres_per_100km=round(235.21 / mpg, 2)
    )