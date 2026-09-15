import { useState } from "react";
import "./App.css";

const API_URL = "https://car-price-ml-906z.onrender.com";

const DEFAULTS = {
  cylinders: 4,
  displacement: 120,
  horsepower: 90,
  weight: 2400,
  acceleration: 15,
  model_year: 80,
  origin: "japan",
};

const FIELDS = [
  { name: "cylinders", label: "Cylindres", min: 2, max: 16, step: 1 },
  { name: "displacement", label: "Cylindrée (pouces³)", min: 50, max: 500, step: 1 },
  { name: "horsepower", label: "Puissance (ch)", min: 40, max: 250, step: 1 },
  { name: "weight", label: "Poids (lb)", min: 1500, max: 5500, step: 10 },
  { name: "acceleration", label: "Accélération (s, 0-60 mph)", min: 8, max: 25, step: 0.5 },
  { name: "model_year", label: "Année du modèle", min: 70, max: 82, step: 1 },
];

export default function App() {
  const [form, setForm] = useState(DEFAULTS);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = (name, value) =>
    setForm((f) => ({ ...f, [name]: value }));

  const submit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) =>
          k === "origin" ? [k, v] : [k, Number(v)]
        )
      );

      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const detail = await res.json();
        throw new Error(detail.detail?.[0]?.msg ?? "Requête invalide");
      }

      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Prédiction de consommation</h1>
        <p>
          Random Forest entraîné sur 398 véhicules (1970-1982).
          MAE 1.58 mpg · R² 0.844
        </p>
      </header>

      <div className="form">
        {FIELDS.map((f) => (
          <label key={f.name}>
            <span>{f.label}</span>
            <input
              type="number"
              value={form[f.name]}
              min={f.min}
              max={f.max}
              step={f.step}
              onChange={(e) => update(f.name, e.target.value)}
            />
          </label>
        ))}

        <label>
          <span>Origine</span>
          <select
            value={form.origin}
            onChange={(e) => update("origin", e.target.value)}
          >
            <option value="usa">États-Unis</option>
            <option value="europe">Europe</option>
            <option value="japan">Japon</option>
          </select>
        </label>
      </div>

      <button onClick={submit} disabled={loading}>
        {loading ? "Calcul en cours…" : "Prédire"}
      </button>

      {loading && (
        <p className="hint">
          Le serveur gratuit se réveille après inactivité — jusqu'à 30 s.
        </p>
      )}

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="result">
          <div>
            <strong>{result.mpg}</strong>
            <span>mpg</span>
          </div>
          <div>
            <strong>{result.litres_per_100km}</strong>
            <span>L/100 km</span>
          </div>
        </div>
      )}
    </div>
  );
}