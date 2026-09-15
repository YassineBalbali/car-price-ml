import { useState } from "react";
import "./App.css";

const API_URL = "https://car-price-ml-906z.onrender.com";

const CLASSES = [
  ["citadine", "Citadine"],
  ["compacte", "Compacte"],
  ["berline", "Berline"],
  ["grande_berline", "Grande berline"],
  ["break", "Break"],
  ["suv", "SUV"],
  ["pickup", "Pickup"],
  ["van", "Van"],
  ["biplace", "Biplace"],
  ["autre", "Autre"],
];

const TRANSMISSIONS = [
  ["traction", "Traction"],
  ["propulsion", "Propulsion"],
  ["integrale", "Intégrale"],
];

const CARBURANTS = [
  ["Regular Gasoline", "Essence ordinaire"],
  ["Premium Gasoline", "Essence premium"],
  ["Midgrade Gasoline", "Essence intermédiaire"],
  ["Diesel", "Diesel"],
];

const MOTORISATIONS = {
  thermique: {
    label: "Thermique",
    defaults: {
      year: 2024,
      cylinders: 4,
      displ: 1.5,
      classe: "compacte",
      transmission: "traction",
      boite: "automatique",
      fuelType1: "Regular Gasoline",
    },
  },
  hybride: {
    label: "Hybride",
    defaults: {
      year: 2024,
      cylinders: 4,
      displ: 2.5,
      classe: "berline",
      transmission: "traction",
      boite: "automatique",
      fuelType1: "Regular Gasoline",
    },
  },
  electrique: {
    label: "Électrique",
    defaults: {
      year: 2024,
      range: 300,
      classe: "berline",
      transmission: "integrale",
      make: "Tesla",
    },
  },
};

const NUMERIQUES = ["year", "cylinders", "displ", "range"];

export default function App() {
  const [motorisation, setMotorisation] = useState("thermique");
  const [form, setForm] = useState(MOTORISATIONS.thermique.defaults);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const changerMotorisation = (m) => {
    setMotorisation(m);
    setForm(MOTORISATIONS[m].defaults);
    setResult(null);
    setError(null);
  };

  const update = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const submit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) =>
          NUMERIQUES.includes(k) ? [k, Number(v)] : [k, v]
        )
      );

      const res = await fetch(`${API_URL}/predict/${motorisation}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const detail = await res.json();
        throw new Error(
          detail.detail?.[0]?.msg ?? "Vérifiez les valeurs saisies."
        );
      }

      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const estElectrique = motorisation === "electrique";

  return (
    <div className="app">
      <header>
        <h1>Consommation d'un véhicule</h1>
        <p>
          Trois modèles entraînés sur les relevés officiels de l'EPA,
          50 242 véhicules commercialisés entre 1984 et 2027.
        </p>
      </header>

      <div className="tabs" role="tablist">
        {Object.entries(MOTORISATIONS).map(([cle, { label }]) => (
          <button
            key={cle}
            role="tab"
            aria-selected={motorisation === cle}
            className={motorisation === cle ? "tab active" : "tab"}
            onClick={() => changerMotorisation(cle)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="form">
        <label>
          <span>Année du modèle</span>
          <input
            type="number"
            min="1984"
            max="2027"
            value={form.year}
            onChange={(e) => update("year", e.target.value)}
          />
        </label>

        {!estElectrique && (
          <>
            <label>
              <span>Cylindres</span>
              <input
                type="number"
                min="2"
                max="16"
                value={form.cylinders}
                onChange={(e) => update("cylinders", e.target.value)}
              />
            </label>

            <label>
              <span>Cylindrée (litres)</span>
              <input
                type="number"
                min="0.5"
                max="10"
                step="0.1"
                value={form.displ}
                onChange={(e) => update("displ", e.target.value)}
              />
            </label>
          </>
        )}

        {estElectrique && (
          <>
            <label>
              <span>Autonomie (miles)</span>
              <input
                type="number"
                min="20"
                max="800"
                value={form.range}
                onChange={(e) => update("range", e.target.value)}
              />
            </label>

            <label>
              <span>Constructeur</span>
              <input
                type="text"
                value={form.make}
                onChange={(e) => update("make", e.target.value)}
              />
            </label>
          </>
        )}

        <label>
          <span>Catégorie</span>
          <select
            value={form.classe}
            onChange={(e) => update("classe", e.target.value)}
          >
            {CLASSES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Transmission</span>
          <select
            value={form.transmission}
            onChange={(e) => update("transmission", e.target.value)}
          >
            {TRANSMISSIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>

        {!estElectrique && (
          <>
            <label>
              <span>Boîte de vitesses</span>
              <select
                value={form.boite}
                onChange={(e) => update("boite", e.target.value)}
              >
                <option value="automatique">Automatique</option>
                <option value="manuelle">Manuelle</option>
              </select>
            </label>

            <label>
              <span>Carburant</span>
              <select
                value={form.fuelType1}
                onChange={(e) => update("fuelType1", e.target.value)}
              >
                {CARBURANTS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      <button className="submit" onClick={submit} disabled={loading}>
        {loading ? "Calcul en cours…" : "Estimer la consommation"}
      </button>

      {loading && (
        <p className="hint">
          Le serveur se réveille après une période d'inactivité — jusqu'à 30 secondes.
        </p>
      )}

      {error && <p className="error">{error}</p>}

      {result && (
        <>
          <div className="result">
            {result.kwh_per_100km !== null ? (
              <>
                <div>
                  <strong>{result.kwh_per_100km}</strong>
                  <span>kWh / 100 km</span>
                </div>
                <div>
                  <strong>{result.valeur}</strong>
                  <span>kWh / 100 miles</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <strong>{result.l_per_100km}</strong>
                  <span>litres / 100 km</span>
                </div>
                <div>
                  <strong>{result.mpg}</strong>
                  <span>miles par gallon</span>
                </div>
              </>
            )}
          </div>

          <div className="fiabilite">
            <p>
              Modèle {result.categorie} : R² de {result.fiabilite.cv_r2} (±{" "}
              {result.fiabilite.ecart_type}) en validation croisée, entraîné sur{" "}
              {result.fiabilite.n.toLocaleString("fr-FR")} véhicules. Erreur
              moyenne de {result.fiabilite.mae}.
            </p>
            {result.categorie === "electrique" && (
              <p className="avertissement">
                Les données disponibles ne décrivent ni la masse ni
                l'aérodynamisme, qui déterminent l'essentiel de la consommation
                électrique. Cette estimation est nettement moins fiable que
                celles des deux autres modèles.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}