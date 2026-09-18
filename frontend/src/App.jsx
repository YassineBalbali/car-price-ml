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

const ECHELLES = {
  carburant: { min: 3, max: 25, unite: "L/100 km", seuils: [5.5, 9] },
  electrique: { min: 12, max: 32, unite: "kWh/100 km", seuils: [17, 22] },
};

function niveau(valeur, seuils) {
  if (valeur <= seuils[0]) return "sobre";
  if (valeur <= seuils[1]) return "moyen";
  return "eleve";
}

const MENTIONS = {
  sobre: "parmi les plus sobres de sa génération",
  moyen: "dans la moyenne du parc",
  eleve: "au-dessus de la moyenne du parc",
};

function Echelle({ valeur, type }) {
  const { min, max, unite, seuils } = ECHELLES[type];
  const borne = Math.min(Math.max(valeur, min), max);
  const position = ((borne - min) / (max - min)) * 100;
  const n = niveau(valeur, seuils);

  return (
    <figure className="echelle">
      <div className="piste">
        <div className={`marqueur ${n}`} style={{ left: `${position}%` }} />
      </div>
      <figcaption>
        <span>
          {min} {unite}
        </span>
        <span>{max}</span>
      </figcaption>
      <p className={`mention ${n}`}>{MENTIONS[n]}</p>
    </figure>
  );
}

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

      if (!res.ok) throw new Error("erreur");

      setResult(await res.json());
    } catch {
      setError(
        "Le service n'a pas répondu. Réessayez dans un instant — le serveur peut être en veille."
      );
    } finally {
      setLoading(false);
    }
  };

  const estElectrique = motorisation === "electrique";
  const estVehiculeElectrique = result?.kwh_per_100km != null;

  return (
    <div className="page">
      <header className="entete">
        <h1>Combien consomme cette voiture&nbsp;?</h1>
        <p>
          Décrivez un véhicule et obtenez une estimation de sa consommation,
          calculée par trois modèles entraînés sur les relevés officiels de
          l'agence américaine de l'environnement&nbsp;: 50&nbsp;242 véhicules
          testés entre 1984 et 2027.
        </p>
      </header>

      <div className="colonnes">
        <section className="panneau saisie">
          <div className="tabs" role="tablist" aria-label="Motorisation">
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

          <div className="champs">
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
                  <span>Cylindrée en litres</span>
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
                  <span>Autonomie en miles</span>
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

          <button className="envoyer" onClick={submit} disabled={loading}>
            {loading ? "Calcul en cours…" : "Estimer la consommation"}
          </button>
        </section>

        <section className="panneau lecture" aria-live="polite">
          {!result && !loading && !error && (
            <div className="vide">
              <p>
                L'estimation s'affichera ici, avec la position du véhicule sur
                l'échelle du parc automobile.
              </p>
            </div>
          )}

          {loading && (
            <div className="vide">
              <p>
                Le serveur se réveille après une période d'inactivité. Comptez
                jusqu'à trente secondes au premier appel.
              </p>
            </div>
          )}

          {error && (
            <div className="vide">
              <p className="erreur">{error}</p>
            </div>
          )}

          {result && (
            <>
              <div className="lecture-principale">
                <span className="valeur">
                  {estVehiculeElectrique
                    ? result.kwh_per_100km
                    : result.l_per_100km}
                </span>
                <span className="unite">
                  {estVehiculeElectrique ? "kWh / 100 km" : "litres / 100 km"}
                </span>
              </div>

              <p className="equivalence">
                Soit {estVehiculeElectrique ? result.valeur : result.mpg}{" "}
                {estVehiculeElectrique
                  ? "kWh aux 100 miles"
                  : "miles par gallon"}
                , l'unité employée aux États-Unis.
              </p>

              <Echelle
                valeur={
                  estVehiculeElectrique
                    ? result.kwh_per_100km
                    : result.l_per_100km
                }
                type={estVehiculeElectrique ? "electrique" : "carburant"}
              />

              <div className="fiabilite">
                <p>
                  Modèle {result.categorie}, entraîné sur{" "}
                  {result.fiabilite.n.toLocaleString("fr-FR")} véhicules. Il
                  explique {Math.round(result.fiabilite.cv_r2 * 100)} % de la
                  variation observée en validation croisée, avec une erreur
                  moyenne de {result.fiabilite.mae}.
                </p>
                {result.categorie === "electrique" && (
                  <p className="reserve">
                    Les données publiées ne décrivent ni la masse ni
                    l'aérodynamisme, qui déterminent l'essentiel de la
                    consommation électrique. Cette estimation est donc bien
                    moins fiable que celles des véhicules thermiques et
                    hybrides.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <footer>
        <p>
          Données&nbsp;: U.S. Environmental Protection Agency, fueleconomy.gov.
          Les estimations reposent sur des cycles d'homologation et diffèrent de
          la consommation réelle, qui dépend de la conduite et des conditions de
          circulation.
        </p>
      </footer>
    </div>
  );
}