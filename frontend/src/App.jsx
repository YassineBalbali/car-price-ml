import { useState, useEffect } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

const CARBURANTS = [
  ["petrol", "Essence sans plomb 95-E10"],
  ["diesel", "Gazole B7"],
  ["lpg", "GPL carburant"],
  ["e85", "Superéthanol E85"],
];

const ARCHITECTURES = [
  ["thermique", "Thermique seule"],
  ["hybride", "Hybride auto-rechargeable (HEV)"],
];

const SUGGESTIONS = [
  ["Renault Clio", "clio"],
  ["Volkswagen Golf", "golf"],
  ["MG MG3", "mg3"],
  ["Dacia Sandero", "sandero"],
  ["Tesla Model 3", "tesla"],
  ["BYD Dolphin", "byd"],
];

const BESOINS = [
  ["Petite citadine économique", "petite citadine économique pour la ville"],
  ["Familiale spacieuse", "grande voiture familiale spacieuse pour cinq personnes"],
  ["Électrique longue autonomie", "voiture électrique avec une grande autonomie"],
  ["Gros rouleur autoroute", "voiture confortable pour faire beaucoup d'autoroute"],
  ["Sportive puissante", "voiture puissante et sportive"],
  ["Hybride urbaine", "hybride efficace dans les embouteillages"],
];

/* Chaque onglet porte un libellé long pour le bureau et un libellé court
   pour la barre d'onglets mobile, où quatre colonnes se partagent la
   largeur de l'écran. */
const PAGES = [
  ["simulateur", "Simulateur", "Simulateur", "jauge"],
  ["comparateur", "Comparateur", "Comparer", "balance"],
  ["usage", "Conditions réelles", "Conditions", "curseurs"],
  ["methodologie", "Méthodologie & Sources", "Méthode", "fiole"],
];

const ICONES = {
  jauge: (
    <>
      <path d="M4 17a8 8 0 1 1 16 0" />
      <path d="M12 17l4.5-5.5" />
      <circle cx="12" cy="17" r="1.3" />
    </>
  ),
  balance: (
    <>
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-6" />
      <path d="M3 19h18" />
    </>
  ),
  curseurs: (
    <>
      <path d="M4 7h10M18 7h2" />
      <path d="M4 12h4M12 12h8" />
      <path d="M4 17h12M20 17h0" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="17" r="2" />
    </>
  ),
  fiole: (
    <>
      <path d="M10 3v6.5L5.5 17A2 2 0 0 0 7.2 20h9.6a2 2 0 0 0 1.7-3L14 9.5V3" />
      <path d="M9 3h6" />
      <path d="M8 14h8" />
    </>
  ),
};

/* ─── Correction d'usage ───────────────────────────────
   Ces coefficients ne viennent PAS du modèle d'apprentissage : les données
   d'homologation ne contiennent ni météo, ni style de conduite, ni
   équipement. Ils sont appliqués par-dessus l'estimation, à partir de
   valeurs publiées par l'ADEME, et le détail du calcul est affiché. */
const USAGE_DEFAUT = {
  actif: false,
  style: "standard",
  vitesse: 130,
  ville: 30,
  autoroute: 35,
  temperature: "tempere",
  clim: "eco",
  chauffage: "inactif",
  occupants: 2,
  bagages: 30,
  barres: false,
  coffre: false,
  velos: false,
  remorque: false,
  pneus: "ete",
  sousGonflage: false,
  soh: "neuf",
};

const STYLES = {
  tranquille: { pct: -8, libelle: "Tranquille", aide: "Anticipation, bas régimes" },
  standard: { pct: 0, libelle: "Standard", aide: "Référence WLTP" },
  dynamique: { pct: 9, libelle: "Dynamique", aide: "Relances franches" },
  sportif: { pct: 18, libelle: "Sportif", aide: "Hauts régimes fréquents" },
};

const TEMPERATURES = {
  hiverRude: { libelle: "Hiver rude", aide: "−5 °C, givre", th: 14, el: 30 },
  hiverDoux: { libelle: "Hiver doux", aide: "5 °C, frais humide", th: 6, el: 15 },
  tempere: { libelle: "Tempéré", aide: "18 à 23 °C", th: 0, el: 0 },
  canicule: { libelle: "Canicule", aide: "32 °C", th: 4, el: 6 },
};

const CLIMS = {
  off: { libelle: "Désactivée", pct: 0 },
  eco: { libelle: "Éco 22 °C", pct: 2.5 },
  confort: { libelle: "Confort 20 °C", pct: 5 },
};

const CHAUFFAGES = {
  inactif: { libelle: "Inactif", th: 0, el: 0 },
  modere: { libelle: "Modéré", th: 1, el: 8 },
  intensif: { libelle: "Intensif + sièges", th: 2, el: 15 },
};

const PNEUS = {
  ete: { libelle: "Été haute efficacité", aide: "Classe A ou B", pct: 0 },
  quatre: { libelle: "Quatre saisons", aide: "Compromis annuel", pct: 2.5 },
  hiver: { libelle: "Hiver 3PMSF", aide: "Gomme tendre", pct: 5 },
};

const SOH = {
  neuf: { libelle: "Neuf", aide: "100 % · 0-2 ans", perte: 0 },
  intermediaire: { libelle: "Intermédiaire", aide: "92 % · 3-5 ans", perte: 8 },
  use: { libelle: "Usé", aide: "85 % · plus de 6 ans", perte: 15 },
};

const EQUIPEMENTS = [
  ["barres", "Barres de toit nues", 3, "Traînée supplémentaire"],
  ["coffre", "Coffre de toit", 15, "ADEME : 10 à 20 %"],
  ["velos", "Porte-vélos", 8, "Traînée et masse"],
  ["remorque", "Remorque attelée", 22, "Masse et traînée cumulées"],
];

const estElectriqueV = (v) => v.consommation == null;

// Facteur de la portion autoroutière : la traînée croît avec le carré de la
// vitesse, et représente environ 70 % de l'énergie dépensée à cette allure.
const facteurAutoroute = (vitesse, elec) => {
  const base = elec ? 1.25 : 1.15;
  return base * (1 + 0.7 * ((vitesse / 130) ** 2 - 1));
};

function facteursUsage(v, u) {
  const elec = estElectriqueV(v);
  const details = [];
  const pousser = (groupe, libelle, facteur, source) => {
    if (Math.abs(facteur - 1) > 0.0005)
      details.push({ groupe, libelle, facteur, source });
  };

  // A. Conduite et vitesse
  const style = STYLES[u.style] ?? STYLES.standard;
  pousser("conduite", `Conduite ${style.libelle.toLowerCase()}`, 1 + style.pct / 100,
    "Ordre de grandeur ADEME : jusqu'à 15 % d'écart selon la conduite");

  const wVille = u.ville / 100;
  const wAuto = u.autoroute / 100;
  const wRoute = Math.max(0, 1 - wVille - wAuto);
  const fTrajet =
    wVille * (elec ? 0.9 : 1.1) + wRoute * 1 + wAuto * facteurAutoroute(u.vitesse, elec);
  pousser("conduite", `Répartition des trajets, autoroute à ${u.vitesse} km/h`, fTrajet,
    elec
      ? "En ville, la récupération au freinage favorise l'électrique"
      : "La traînée croît avec le carré de la vitesse");

  // B. Climat
  const temp = TEMPERATURES[u.temperature] ?? TEMPERATURES.tempere;
  pousser("climat", temp.libelle, 1 + (elec ? temp.el : temp.th) / 100,
    elec ? "Batterie froide : rendement et capacité réduits" : "Moteur froid au démarrage");

  if (u.temperature === "canicule" || u.temperature === "tempere") {
    const clim = CLIMS[u.clim] ?? CLIMS.off;
    pousser("climat", `Climatisation ${clim.libelle.toLowerCase()}`, 1 + clim.pct / 100,
      "ADEME : 1 à 7 % selon l'usage");
  }

  if (u.temperature === "hiverRude" || u.temperature === "hiverDoux") {
    const ch = CHAUFFAGES[u.chauffage] ?? CHAUFFAGES.inactif;
    pousser("climat", `Chauffage ${ch.libelle.toLowerCase()}`, 1 + (elec ? ch.el : ch.th) / 100,
      elec
        ? "L'électrique chauffe avec la batterie"
        : "Le thermique réutilise la chaleur du moteur");
  }

  // C. Charge et aérodynamique
  const masse = Math.max(0, u.occupants - 1) * 75 + Number(u.bagages);
  pousser("charge", `Charge embarquée : ${masse} kg`, 1 + (masse / 100) * 0.025,
    "Environ 2,5 % de consommation pour 100 kg transportés");

  EQUIPEMENTS.forEach(([code, libelle, pct, source]) => {
    if (u[code]) pousser("charge", libelle, 1 + pct / 100, source);
  });

  // D. Pneumatiques
  const pneus = PNEUS[u.pneus] ?? PNEUS.ete;
  pousser("pneus", `Pneus ${pneus.libelle.toLowerCase()}`, 1 + pneus.pct / 100,
    "Résistance au roulement selon la gomme");
  if (u.sousGonflage)
    pousser("pneus", "Sous-gonflage de 0,3 bar", 1.012, "ADEME : +1,2 %");

  const total = details.reduce((a, d) => a * d.facteur, 1);

  // La santé de la batterie réduit l'autonomie, pas la consommation
  const perteAutonomie = elec ? (SOH[u.soh] ?? SOH.neuf).perte : 0;

  return { details, total, perteAutonomie };
}

const LIBELLE_CATEGORIE = {
  thermique: "Thermique",
  hybride: "Hybride (HEV)",
  hybride_rechargeable: "Hybride rechargeable",
  electrique: "100 % électrique",
};

const KILOMETRAGES = [10000, 15000, 25000];
const MAX_COMPARAISON = 4;

const VIDE_CARBURANT = {
  masse: 1300,
  cylindree: 1200,
  puissance: 74,
  carburant: "petrol",
  categorie: "thermique",
  marque: "AUTRE",
};

const VIDE_ELECTRIQUE = {
  masse: 1700,
  puissance: 150,
  autonomie_electrique: 400,
  marque: "AUTRE",
};

const NUMERIQUES = ["masse", "cylindree", "puissance", "autonomie_electrique"];

const KWH_PAR_LITRE = 9.7;

const ch = (kw) => Math.round(kw * 1.35962);
const fr = (n, d = 0) =>
  Number(n).toLocaleString("fr-FR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const cle = (v) => `${v.marque}|${v.modele}|${v.carburant}`;

const consoDe = (v) =>
  v.consommation != null ? v.consommation : v.conso_electrique / 10;

const uniteDe = (v) => (v.consommation != null ? "L/100 km" : "kWh/100 km");

const energieDe = (v) =>
  v.consommation != null
    ? v.consommation * KWH_PAR_LITRE
    : v.conso_electrique / 10;

const prixUnitaire = (v, prix) => {
  if (v.consommation == null) return prix.kwh;
  if (v.carburant.startsWith("diesel")) return prix.gazole;
  if (v.carburant === "lpg") return 0.95;
  if (v.carburant === "e85") return 0.85;
  return prix.essence;
};

const cout100 = (v, prix) => consoDe(v) * prixUnitaire(v, prix);
const coutAnnuel = (v, prix, km) => (cout100(v, prix) * km) / 100;

/* ─── Recherche de photos ──────────────────────────────
   1. Table manuelle (prioritaire) : pour corriger un modèle précis,
      ajoute "MARQUE|MODELE": "URL de l'image".
   2. Article Wikipédia de la génération la plus récente (« Clio V »).
   3. Wikimédia Commons : photos récentes (année dans le nom du fichier),
      vue de face privilégiée, intérieurs et détails exclus.
   4. Secours : image principale de l’article Wikipédia général.
*/
/* Pour ajouter un modèle : sur commons.wikimedia.org, ouvre la photo voulue,
   copie son nom de fichier (sans « File: ») et place-le après Special:FilePath/.
   Les espaces deviennent des « _ ». La clé reprend la marque et le modèle
   affichés sur la carte, en majuscules. */
const FILEPATH = "https://commons.wikimedia.org/wiki/Special:FilePath/";

const IMAGES_MANUELLES = {
  // Clio V restylée (2023-2025) : la Clio VI de fin 2025 n'est pas dans les données 2025.
  // La clé exacte (modèle complet) est prioritaire sur la clé courte.
  "RENAULT|CLIO E-TECH HYBRID":
    FILEPATH +
    "2023_Renault_Clio_Evolution_E-Tech_-_1598cc_1.6_(145PS)_Petrol_Hybrid_-_Silver_-_05-2024,_Front.jpg?width=520",

  // Une photo différente par carburant ; « defaut » sert pour les autres cas
  "RENAULT|CLIO": {
    petrol:
      FILEPATH +
      "Renault_Clio_V_(2023)_Esprit_Alpine_Automesse_Ludwigsburg_2023_1X7A0012.jpg?width=520",
    diesel:
      FILEPATH +
      "2024_Renault_Clio_Esprit_Alpine_E-Tech_-_1598cc_1.6_(145PS)_Petrol_Hybrid_-_Flame_Red_-_05-2024,_Front.jpg?width=520",
    // « BF » = bi-fuel : c'est précisément la version GPL
    lpg:
      FILEPATH +
      "Renault_Clio_TCe100_Techno_BF_Black_Diamond_(1).jpg?width=520",
    defaut:
      FILEPATH +
      "Renault_Clio_V_(2023)_Esprit_Alpine_Automesse_Ludwigsburg_2023_1X7A0012.jpg?width=520",
  },
};

const MOTS_PARASITES = [
  "HYBRID+",
  "HYBRID",
  "E-TECH",
  "ELECTRIC",
  "ELECTRIQUE",
  "PLUG-IN",
  "4MATIC",
  "FULL",
  "MILD",
  "EV",
];

const ANNEE_RECENTE = /(2023|2024|2025|2026)/;
const VUE_AVANT = /(front|vorn|avant|[–-]\s?f\b)/i;
const A_EXCLURE =
  /(interior|innenraum|int[ée]rieur|cockpit|dashboard|armaturen|rear|heck|arri[eè]re|[–-]\s?r\b|engine|motor|moteur|logo|badge|emblem|wheel|felge|jante|seat|sitz|trunk|kofferraum|coffre|detail|light|leuchte|phare)/i;

// Voitures anciennes photographiées récemment : l'année du fichier est
// celle de la photo, pas celle du modèle.
const VOITURE_ANCIENNE =
  /(oldtimer|youngtimer|classic|klassik|historic|museum|mus[ée]e|retro|r[ée]tro|rallye|rally|racing|race|rennen|williams|cup\b|tuning|treffen|meeting|concours|vintage|ancienne|\bR\.?S\.?\b|trophy|renault sport)/i;

const ROMAINS = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

// Codes de châssis : Mercedes « (W177) », BMW « (G20) ». Chez BMW, la lettre
// marque la génération (E puis F, G, U) ; chez Mercedes, c'est le numéro.
const LETTRES_BMW = { E: 1, F: 2, G: 3, U: 4 };

const codeChassis = (titre) => {
  const m = titre.match(/\(([A-Z])\s?(\d{2,3})\b/);
  if (!m) return null;
  return (LETTRES_BMW[m[1]] ?? 0) * 1000 + Number(m[2]);
};

// Lit la génération notée dans un titre : « (V) », « (IV, Facelift) », « Mk8 », « (W177) »
const generationDe = (titre) => {
  const romain = titre.match(/\((X|IX|VIII|VII|VI|V|IV|III|II|I)\b/);
  if (romain) return ROMAINS[romain[1]];
  const mk = titre.match(/\b(?:Mk|MK|Mark)\s?(\d{1,2})\b/);
  if (mk) return Number(mk[1]);
  return codeChassis(titre);
};

const nomModele = (v) => {
  const marque = v.marque.toUpperCase();
  let modele = v.modele.toUpperCase();
  if (modele.startsWith(marque + " ")) modele = modele.slice(marque.length + 1);
  return modele
    .split(/\s+/)
    .filter((w) => w && !MOTS_PARASITES.includes(w))
    .slice(0, 2)
    .join(" ");
};

const marqueLisible = (v) => v.marque.split("-")[0];

const compacter = (s) => s.toLowerCase().replace(/[\s\-_]/g, "");

// Mercedes à lettre : « A 180 D » se cherche « Classe A » sur Wikipédia
const CLASSES_MERCEDES = /^(A|B|C|E|S|G|V|T)$/;

const termes = (v) => {
  const modele = nomModele(v);
  const premier = modele.split(" ")[0] ?? "";
  const marque = marqueLisible(v);

  if (v.marque.toUpperCase().startsWith("MERCEDES") && CLASSES_MERCEDES.test(premier)) {
    return {
      wiki: `Mercedes-Benz Classe ${premier}`,
      motWiki: `classe${premier.toLowerCase()}`,
      commons: `Mercedes-Benz ${modele}`,
      motCommons: compacter(modele),
    };
  }

  return {
    wiki: `${marque} ${modele}`,
    motWiki: compacter(premier),
    commons: `${marque} ${modele}`,
    // Un premier mot d'une seule lettre est trop vague pour filtrer
    motCommons: compacter(premier.length <= 1 ? modele : premier),
  };
};

// Article Wikipédia de la génération la plus récente : « Renault Clio V »,
// « Peugeot 208 II ». Leur photo est choisie par les éditeurs et montre
// exactement cette génération.
async function imageGeneration(v) {
  const t = termes(v);
  if (!t.motWiki) return null;

  const url =
    "https://fr.wikipedia.org/w/api.php?action=query&generator=search" +
    `&gsrsearch=${encodeURIComponent(t.wiki)}` +
    "&gsrlimit=20&prop=pageimages&piprop=thumbnail&pithumbsize=520" +
    "&format=json&origin=*";

  const d = await (await fetch(url)).json();
  const pages = Object.values(d?.query?.pages ?? {});

  const marque = compacter(marqueLisible(v));

  const generations = pages
    .filter((p) => p.thumbnail)
    .filter((p) => {
      const titre = compacter(p.title);
      return titre.includes(t.motWiki) && titre.includes(marque);
    })
    .map((p) => {
      const romain = p.title.match(/\s(X|IX|VIII|VII|VI|V|IV|III|II|I)$/);
      if (romain) return { page: p, gen: ROMAINS[romain[1]] };
      const chassis = codeChassis(p.title);
      return chassis != null ? { page: p, gen: chassis } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.gen - a.gen);

  const meilleure = generations[0]?.page;
  return meilleure
    ? { src: meilleure.thumbnail.source, titre: meilleure.title, source: "Wikipédia" }
    : null;
}

async function imageCommons(v) {
  const t = termes(v);
  if (!t.motCommons) return null;

  const url =
    "https://commons.wikimedia.org/w/api.php?action=query" +
    "&generator=search&gsrnamespace=6&gsrlimit=50" +
    `&gsrsearch=${encodeURIComponent(t.commons)}` +
    "&prop=imageinfo&iiprop=url&iiurlwidth=520&format=json&origin=*";

  const d = await (await fetch(url)).json();
  const pages = Object.values(d?.query?.pages ?? {}).sort(
    (a, b) => a.index - b.index
  );

  // Le modèle doit figurer dans le nom du fichier
  const motCle = t.motCommons;

  let candidats = pages.filter(
    (p) =>
      /\.(jpe?g|png|webp)$/i.test(p.title) &&
      ANNEE_RECENTE.test(p.title) &&
      !A_EXCLURE.test(p.title) &&
      !VOITURE_ANCIENNE.test(p.title) &&
      compacter(p.title).includes(motCle)
  );

  // Ne garder que la génération la plus récente parmi celles trouvées
  const generations = candidats
    .map((p) => generationDe(p.title))
    .filter((g) => g != null);

  if (generations.length) {
    const plusRecente = Math.max(...generations);
    candidats = candidats.filter((p) => generationDe(p.title) === plusRecente);
  }

  // Préférence : vue de face, puis fichier nommé « 2024 Marque Modèle… »
  const score = (p) =>
    (VUE_AVANT.test(p.title) ? 2 : 0) +
    (/^File:(2023|2024|2025|2026)\s/.test(p.title) ? 1 : 0) +
    (/facelift|restyl/i.test(p.title) ? 1 : 0);

  const choix = [...candidats].sort((a, b) => score(b) - score(a))[0];
  const src = choix?.imageinfo?.[0]?.thumburl;

  return src
    ? { src, titre: choix.title.replace(/^File:/, ""), source: "Wikimédia Commons" }
    : null;
}

async function imageWikipedia(v) {
  const t = termes(v);
  const url =
    "https://fr.wikipedia.org/w/api.php?action=query&generator=search" +
    `&gsrsearch=${encodeURIComponent(`${t.wiki} automobile`)}` +
    "&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=520" +
    "&format=json&origin=*";

  const d = await (await fetch(url)).json();
  const p = d?.query?.pages ? Object.values(d.query.pages)[0] : null;
  if (!p?.thumbnail) return null;

  // L'article général montre souvent une ancienne génération ou un montage
  // historique : on n'accepte sa photo que si son nom de fichier est récent.
  const fichier = decodeURIComponent(p.thumbnail.source.split("/").pop());
  if (!ANNEE_RECENTE.test(fichier) || VOITURE_ANCIENNE.test(fichier)) return null;

  return { src: p.thumbnail.source, titre: p.title, source: "Wikipédia" };
}

const imageManuelle = (v) => {
  const entree =
    IMAGES_MANUELLES[`${v.marque}|${v.modele}`.toUpperCase()] ??
    IMAGES_MANUELLES[`${v.marque}|${nomModele(v)}`.toUpperCase()];
  if (!entree) return null;

  // Une entrée peut être une adresse unique, ou une photo par carburant
  const src =
    typeof entree === "string" ? entree : entree[v.carburant] ?? entree.defaut;

  return src ? { src, titre: v.modele, source: "Wikimédia Commons" } : null;
};

async function trouverImage(v) {
  const manuelle = imageManuelle(v);
  if (manuelle) return manuelle;

  for (const source of [imageGeneration, imageCommons, imageWikipedia]) {
    try {
      const resultat = await source(v);
      if (resultat) return resultat;
    } catch {
      /* on passe à la source suivante */
    }
  }

  return null;
}

// Cache local pour ne pas refaire les recherches à chaque visite
const CLE_CACHE = "autoconso-images-v5";

const lireCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CLE_CACHE)) ?? {};
  } catch {
    return {};
  }
};

const ecrireCache = (k, valeur) => {
  try {
    const c = lireCache();
    c[k] = valeur;
    localStorage.setItem(CLE_CACHE, JSON.stringify(c));
  } catch {
    /* stockage indisponible : sans conséquence */
  }
};

function FenetreCompte({ fermer, onConnexion }) {
  const [mode, setMode] = useState("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  const inscription = mode === "inscription";

  const valider = async (e) => {
    e.preventDefault();
    setErreur(null);

    if (motDePasse.length < 8) {
      return setErreur("Le mot de passe doit faire au moins 8 caractères.");
    }

    setEnvoi(true);
    try {
      const res = await fetch(
        `${API_URL}/auth/${inscription ? "inscription" : "connexion"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            inscription
              ? { email, mot_de_passe: motDePasse, prenom, nom }
              : { email, mot_de_passe: motDePasse }
          ),
        }
      );

      const donnees = await res.json().catch(() => ({}));

      if (!res.ok) {
        // FastAPI renvoie soit une chaîne, soit une liste de détails
        const detail = donnees.detail;
        setErreur(
          typeof detail === "string"
            ? detail
            : Array.isArray(detail)
            ? detail[0]?.msg ?? "Saisie invalide"
            : "Une erreur est survenue."
        );
        return;
      }

      onConnexion(donnees);
    } catch {
      setErreur("Le serveur ne répond pas. Réessayez dans quelques secondes.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="voile" onClick={fermer}>
      <div
        className="fenetre"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className="fermer" onClick={fermer} aria-label="Fermer">
          ×
        </button>

        <span className="num">Compte AutoConso</span>
        <h2>{inscription ? "Créer un compte" : "Se connecter"}</h2>

        <div className="bascule">
          <button
            className={!inscription ? "actif" : ""}
            onClick={() => {
              setMode("connexion");
              setErreur(null);
            }}
          >
            Connexion
          </button>
          <button
            className={inscription ? "actif" : ""}
            onClick={() => {
              setMode("inscription");
              setErreur(null);
            }}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={valider}>
          {inscription && (
            <div className="deux-champs">
              <label className="champ">
                <span className="etiquette">Prénom</span>
                <input
                  type="text"
                  autoComplete="given-name"
                  required
                  maxLength={80}
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                />
              </label>
              <label className="champ">
                <span className="etiquette">Nom</span>
                <input
                  type="text"
                  autoComplete="family-name"
                  required
                  maxLength={80}
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
              </label>
            </div>
          )}

          <label className="champ">
            <span className="etiquette">Adresse électronique</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
            />
          </label>

          <label className="champ">
            <span className="etiquette">Mot de passe</span>
            <input
              type="password"
              autoComplete={inscription ? "new-password" : "current-password"}
              required
              minLength={8}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="Au moins 8 caractères"
            />
            {inscription && (
              <span className="sous">
                Huit caractères minimum, dont une lettre et un chiffre.
              </span>
            )}
          </label>

          {erreur && <p className="erreur">{erreur}</p>}

          <button className="lancer" type="submit" disabled={envoi}>
            {envoi
              ? "Envoi…"
              : inscription
              ? "Créer mon compte"
              : "Me connecter"}
          </button>
        </form>

        <p className="note">
          Votre mot de passe n'est jamais enregistré : seule une empreinte
          irréversible l'est. La session est conservée trente jours sur cet
          appareil.
        </p>
      </div>
    </div>
  );
}

const Silhouette = () => (
  <svg viewBox="0 0 120 50" className="silhouette" aria-hidden="true">
    <path
      d="M8 36 L13 27 Q17 22 26 21 L42 19 Q51 11 63 11 L78 11 Q89 11 97 19 L107 21 Q113 23 113 30 L113 36 Z"
      fill="currentColor"
    />
    <circle cx="32" cy="37" r="7" className="roue" />
    <circle cx="93" cy="37" r="7" className="roue" />
  </svg>
);

const CLE_SESSION = "autoconso-session";

const lireSession = () => {
  try {
    return JSON.parse(localStorage.getItem(CLE_SESSION));
  } catch {
    return null;
  }
};

export default function App() {
  const [page, setPage] = useState("simulateur");
  const [session, setSession] = useState(lireSession);
  const [compteOuvert, setCompteOuvert] = useState(false);
  const [stats, setStats] = useState(null);

  /* ─── État du simulateur ─── */
  const [requete, setRequete] = useState("");
  const [modeRecherche, setModeRecherche] = useState("nom");
  const [resultats, setResultats] = useState(null);
  const [chercheEnCours, setChercheEnCours] = useState(false);
  const [erreurRecherche, setErreurRecherche] = useState(null);

  const [choisi, setChoisi] = useState(null);
  const [mode, setMode] = useState("carburant");
  const [form, setForm] = useState(VIDE_CARBURANT);
  const [charge, setCharge] = useState(0);

  const [prediction, setPrediction] = useState(null);
  const [calculEnCours, setCalculEnCours] = useState(false);
  const [erreurCalcul, setErreurCalcul] = useState(null);

  /* ─── État du comparateur ─── */
  const [selection, setSelection] = useState([]);
  const [images, setImages] = useState({});
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [requeteComp, setRequeteComp] = useState("");
  const [resultatsComp, setResultatsComp] = useState(null);
  const [chercheComp, setChercheComp] = useState(false);
  const [km, setKm] = useState(15000);
  const [usage, setUsage] = useState(USAGE_DEFAUT);
  const [prix, setPrix] = useState({
    essence: 1.75,
    gazole: 1.7,
    kwh: 0.22,
    kwhRapide: 0.59,
  });

  useEffect(() => {
    fetch(`${API_URL}/statistiques`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => {});
  }, []);

  /* ─── Photos des véhicules ─── */
  useEffect(() => {
    const cache = lireCache();
    const aCharger = choisi ? [...selection, choisi] : selection;

    aCharger.forEach((v) => {
      const k = cle(v);
      if (k in images) return;

      // La table manuelle l'emporte toujours, même sur le cache
      const manuelle = imageManuelle(v);
      if (manuelle) {
        setImages((i) => ({ ...i, [k]: manuelle }));
        return;
      }

      if (k in cache) {
        setImages((i) => ({ ...i, [k]: cache[k] }));
        return;
      }

      setImages((i) => ({ ...i, [k]: "chargement" }));

      trouverImage(v).then((resultat) => {
        setImages((i) => ({ ...i, [k]: resultat }));
        ecrireCache(k, resultat);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, choisi]);

  /* ─── Recherche (simulateur) ─── */
  const chercher = async (terme) => {
    const q = (terme ?? requete).trim();
    if (q.length < 2) return;

    setRequete(q);
    setChercheEnCours(true);
    setErreurRecherche(null);
    setResultats(null);

    const route =
      modeRecherche === "besoin"
        ? `${API_URL}/recherche/semantique?q=${encodeURIComponent(q)}&limite=12`
        : `${API_URL}/recherche?q=${encodeURIComponent(q)}&limite=40`;

    try {
      const res = await fetch(route);
      if (res.status === 404) return setResultats([]);
      if (res.status === 503) {
        const d = await res.json();
        throw new Error(d.detail);
      }
      if (!res.ok) throw new Error();
      setResultats(await res.json());
    } catch (e) {
      setErreurRecherche(
        e.message?.startsWith("Recherche sémantique") ||
          e.message?.startsWith("Dépendance")
          ? e.message
          : "Le registre n'a pas répondu. Le serveur est peut-être en veille — réessayez dans quelques secondes."
      );
    } finally {
      setChercheEnCours(false);
    }
  };

  /* ─── Recherche (comparateur) ─── */
  const chercherComp = async (terme) => {
    const q = (terme ?? requeteComp).trim();
    if (q.length < 2) return;

    setRequeteComp(q);
    setChercheComp(true);
    setResultatsComp(null);

    try {
      const res = await fetch(
        `${API_URL}/recherche?q=${encodeURIComponent(q)}&limite=12`
      );
      if (res.status === 404) return setResultatsComp([]);
      if (!res.ok) throw new Error();
      setResultatsComp(await res.json());
    } catch {
      setResultatsComp([]);
    } finally {
      setChercheComp(false);
    }
  };

  const ajouter = (v) => {
    if (selection.some((s) => cle(s) === cle(v))) return;
    if (selection.length >= MAX_COMPARAISON) return;
    setSelection((s) => [...s, v]);
    setAjoutOuvert(false);
    setRequeteComp("");
    setResultatsComp(null);
  };

  const retirer = (v) =>
    setSelection((s) => s.filter((x) => cle(x) !== cle(v)));

  const reinitialiserComp = () => {
    setSelection([]);
    setAjoutOuvert(false);
    setRequeteComp("");
    setResultatsComp(null);
  };

  /* ─── Simulateur ─── */
  const selectionner = (v) => {
    setChoisi(v);
    setPrediction(null);
    setErreurCalcul(null);
    setCharge(0);
    setResultats(null);

    if (v.categorie === "electrique") {
      setMode("electrique");
      setForm({
        masse: v.masse ?? 1700,
        puissance: v.puissance ?? 150,
        autonomie_electrique: v.autonomie_electrique ?? 400,
        marque: v.marque,
      });
    } else {
      setMode("carburant");
      setForm({
        masse: v.masse ?? 1300,
        cylindree: v.cylindree ?? 1200,
        puissance: v.puissance ?? 74,
        carburant: ["petrol", "diesel", "lpg", "e85"].includes(v.carburant)
          ? v.carburant
          : "petrol",
        categorie: v.categorie === "hybride" ? "hybride" : "thermique",
        marque: v.marque,
      });
    }

    setTimeout(() => {
      document
        .querySelector(".deux-colonnes")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const changerMode = (nouveau) => {
    if (nouveau === mode) return;
    setMode(nouveau);
    setChoisi(null);
    setCharge(0);
    setForm(nouveau === "electrique" ? VIDE_ELECTRIQUE : VIDE_CARBURANT);
    setPrediction(null);
    setErreurCalcul(null);
  };

  const maj = (champ, valeur) => {
    setForm((f) => ({ ...f, [champ]: valeur }));
    if (champ === "masse") setCharge(0);
  };

  const calculer = async () => {
    setCalculEnCours(true);
    setErreurCalcul(null);
    setPrediction(null);

    const envoi = Object.fromEntries(
      Object.entries(form).map(([k, v]) =>
        NUMERIQUES.includes(k) ? [k, Number(v)] : [k, v]
      )
    );
    envoi.masse = Number(form.masse) + charge;

    try {
      const res = await fetch(`${API_URL}/predict/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envoi),
      });
      if (!res.ok) throw new Error();
      setPrediction(await res.json());
    } catch {
      setErreurCalcul(
        "Le calcul n'a pas abouti. Vérifiez que les valeurs restent dans les bornes indiquées."
      );
    } finally {
      setCalculEnCours(false);
    }
  };

  const electrique = mode === "electrique";
  const unite = electrique ? "kWh/100 km" : "L/100 km";

  const mesure = choisi
    ? choisi.categorie === "electrique"
      ? choisi.conso_electrique / 10
      : choisi.consommation
    : null;

  const predite = prediction ? prediction.kwh_100km ?? prediction.l_100km : null;
  const ecart = mesure != null && predite != null ? predite - mesure : null;
  const ecartPct = ecart != null && mesure ? (ecart / mesure) * 100 : null;

  const coutHomologue =
    mesure != null && !electrique
      ? Math.round((mesure / 100) * 15000 * 1.75)
      : null;
  const co2Homologue = choisi?.co2 ?? null;

  /* ─── Correction d'usage appliquée aux coûts ─── */
  const facteurDe = (v) => (usage.actif ? facteursUsage(v, usage).total : 1);
  const consoReelle = (v) => consoDe(v) * facteurDe(v);
  const cout100R = (v) => cout100(v, prix) * facteurDe(v);
  const coutAnnuelR = (v) => coutAnnuel(v, prix, km) * facteurDe(v);

  /* ─── Calculs du comparateur ─── */
  const reference = selection[0] ?? null;
  const classement = [...selection].sort(
    (a, b) => coutAnnuelR(a) - coutAnnuelR(b)
  );
  const coutMax = classement.length ? coutAnnuelR(classement[classement.length - 1]) : 1;
  const plusSobre = classement[0] ?? null;
  const plusCher = classement[classement.length - 1] ?? null;
  const memesUnites =
    selection.length > 0 && selection.every((v) => uniteDe(v) === uniteDe(selection[0]));

  // Détermine la meilleure et la pire valeur d'une ligne du tableau
  const extremes = (valeurs, sens) => {
    const nums = valeurs.filter((x) => x != null && !Number.isNaN(x));
    if (nums.length < 2) return { meilleur: null, pire: null };
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    if (min === max) return { meilleur: null, pire: null };
    return sens === "bas"
      ? { meilleur: min, pire: max }
      : { meilleur: max, pire: min };
  };

  const classeCellule = (valeur, ext) => {
    if (valeur == null) return "";
    if (valeur === ext.meilleur) return "mieux";
    if (valeur === ext.pire) return "moins-bien";
    return "";
  };

  const ligneTableau = (libelle, valeurs, formater, sens = null, note = null) => {
    const ext = sens ? extremes(valeurs, sens) : { meilleur: null, pire: null };
    return (
      <tr key={libelle}>
        <td>
          {libelle}
          {note && <em>{note}</em>}
        </td>
        {valeurs.map((val, i) => (
          <td key={i} className={classeCellule(val, ext)}>
            {val == null ? "—" : formater(val, selection[i])}
          </td>
        ))}
      </tr>
    );
  };

  const listeRecherche = (items, onClic) => (
    <ul className="registre">
      {items.map((v, i) => (
        <li key={i}>
          <button className="entree" onClick={() => onClic(v)}>
            <div className="identite">
              <h3>
                {v.marque} {v.modele}
                {v.categorie === "electrique" && (
                  <em className="vert">100 % électrique</em>
                )}
              </h3>
              <p>
                {v.carburant_libelle}
                {v.puissance ? ` · ${v.puissance} kW (${ch(v.puissance)} ch)` : ""}
                {v.masse ? ` · ${fr(v.masse)} kg` : ""}
                {v.cylindree ? ` · ${v.cylindree} cm³` : ""}
              </p>
              {v.description && (
                <p className="description-auto">{v.description}</p>
              )}
            </div>
            <div className="mesure">
              <strong>{consoDe(v).toFixed(1)}</strong>
              <span className="u">{uniteDe(v)}</span>
              <span className="legende">
                {v.score != null
                  ? `Correspondance ${Math.round(v.score * 100)} %`
                  : "WLTP mixte homologué"}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="site">
      <nav>
        <div className="marque">
          <img src="/logo.png" alt="AutoConso" className="logo-img" />
        </div>
        <div className="compte">
          {session ? (
            <>
              <span className="courriel">
                {session.prenom ? `Bonjour ${session.prenom}` : session.email}
              </span>
              <button
                className="bouton-compte"
                onClick={() => {
                  localStorage.removeItem(CLE_SESSION);
                  setSession(null);
                }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <button
              className="bouton-compte principal"
              onClick={() => setCompteOuvert(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3.4" />
                <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
              </svg>
              <span>Se connecter</span>
            </button>
          )}
        </div>

        <div className="liens">
          {PAGES.map(([c, libelle, court, icone]) => (
            <button
              key={c}
              className={page === c ? "actif" : ""}
              onClick={() => setPage(c)}
              aria-current={page === c ? "page" : undefined}
            >
              <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
                {ICONES[icone]}
              </svg>
              <span className="long">{libelle}</span>
              <span className="court">{court}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ═══════════════ COMPARATEUR ═══════════════ */}
      {page === "comparateur" && (
        <>
          <header className="entete-comp">
            <p className="kicker">
              <i />
              Comparateur multi-modèles · Données EEA 2025
            </p>
            <div className="entete-comp-ligne">
              <div>
                <h1>Comparez la consommation entre véhicules</h1>
                <p className="chapeau">
                  Confrontez jusqu'à quatre modèles du parc français sur leur
                  consommation homologuée, leurs émissions et leur budget
                  énergie.
                </p>
              </div>
              {selection.length > 0 && (
                <div className="actions-comp">
                  <button className="bouton-sec" onClick={() => window.print()}>
                    Imprimer le rapport
                  </button>
                  <button className="bouton-sec" onClick={reinitialiserComp}>
                    Réinitialiser
                  </button>
                </div>
              )}
            </div>

            {usage.actif && (
              <p className="bandeau-usage">
                Conditions réelles appliquées : les budgets intègrent une
                correction de{" "}
                <strong>
                  +{fr((facteursUsage({ consommation: 6 }, usage).total - 1) * 100, 1)} %
                </strong>{" "}
                sur les voitures à carburant.{" "}
                <button className="lien-discret" onClick={() => setPage("usage")}>
                  Modifier
                </button>
              </p>
            )}

            <div className="reglages">
              <div className="reglage">
                <span className="sur">Kilométrage annuel</span>
                <div className="pilules">
                  {KILOMETRAGES.map((k) => (
                    <button
                      key={k}
                      className={km === k ? "actif" : ""}
                      onClick={() => setKm(k)}
                    >
                      {fr(k)} km/an
                    </button>
                  ))}
                </div>
              </div>
              <div className="reglage">
                <span className="sur">Tarifs retenus</span>
                <div className="tarifs">
                  <label>
                    Essence
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="4"
                      value={prix.essence}
                      onChange={(e) =>
                        setPrix((p) => ({ ...p, essence: Number(e.target.value) }))
                      }
                    />
                    €/L
                  </label>
                  <label>
                    Gazole
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="4"
                      value={prix.gazole}
                      onChange={(e) =>
                        setPrix((p) => ({ ...p, gazole: Number(e.target.value) }))
                      }
                    />
                    €/L
                  </label>
                  <label>
                    Électricité
                    <input
                      type="number"
                      step="0.01"
                      min="0.05"
                      max="1"
                      value={prix.kwh}
                      onChange={(e) =>
                        setPrix((p) => ({ ...p, kwh: Number(e.target.value) }))
                      }
                    />
                    €/kWh
                  </label>
                </div>
              </div>
            </div>
          </header>

          {/* Cartes véhicules */}
          <section className="grille-vehicules">
            {selection.map((v, i) => {
              const img = images[cle(v)];
              const cout = coutAnnuelR(v);
              const coutRef = reference ? coutAnnuelR(reference) : cout;
              const diffCout = cout - coutRef;
              const diffConso =
                reference && uniteDe(v) === uniteDe(reference)
                  ? consoDe(v) - consoDe(reference)
                  : null;
              const diffPct =
                diffConso != null ? (diffConso / consoDe(reference)) * 100 : null;

              return (
                <article
                  key={cle(v)}
                  className={i === 0 ? "carte-vehicule reference" : "carte-vehicule"}
                >
                  <div className="carte-haut">
                    <span className={`badge ${v.categorie}`}>
                      {LIBELLE_CATEGORIE[v.categorie] ?? v.categorie}
                    </span>
                    <span className="rang">
                      #{i + 1} {i === 0 ? "réf." : "comp."}
                    </span>
                  </div>

                  <div className="photo">
                    {img && img !== "chargement" ? (
                      <img src={img.src} alt={img.titre} loading="lazy" />
                    ) : (
                      <Silhouette />
                    )}
                    {v.masse && <span className="photo-tag">{fr(v.masse)} kg</span>}
                    {img && img !== "chargement" && (
                      <span className="credit" title={img.titre}>
                        {img.source}
                      </span>
                    )}
                  </div>

                  <h3>
                    {v.marque} {v.modele}
                  </h3>
                  <p className="sous-titre">
                    {v.carburant_libelle}
                    {v.puissance ? ` · ${ch(v.puissance)} ch` : ""}
                    {v.cylindree ? ` · ${fr(v.cylindree)} cm³` : ""}
                  </p>

                  <div className="bloc-conso">
                    <div className="bloc-conso-tete">
                      <span className="sur">Conso homologuée WLTP</span>
                      {i > 0 && diffConso != null && Math.abs(diffConso) >= 0.05 && (
                        <span className={diffConso > 0 ? "delta haut" : "delta bas"}>
                          {diffConso > 0 ? "+" : ""}
                          {diffConso.toFixed(1)} ({diffPct > 0 ? "+" : ""}
                          {diffPct.toFixed(1)} %)
                        </span>
                      )}
                    </div>
                    <strong>{fr(consoDe(v), 1)}</strong>
                    <span className="u">{uniteDe(v)}</span>
                  </div>

                  <div className="mini-grille">
                    <div>
                      <span className="sur">Budget annuel</span>
                      <strong>{fr(cout)} €</strong>
                      <em
                        className={
                          i === 0 ? "" : diffCout > 0 ? "texte-rouge" : "texte-vert"
                        }
                      >
                        {i === 0
                          ? `pour ${fr(km)} km`
                          : `${diffCout > 0 ? "+" : ""}${fr(diffCout)} € vs réf.`}
                      </em>
                    </div>
                    <div>
                      <span className="sur">CO₂</span>
                      <strong>
                        {v.co2} <small>g/km</small>
                      </strong>
                      <em>WLTP</em>
                    </div>
                  </div>

                  <div className="carte-pied">
                    <span>{fr(v.immatriculations)} immatriculations 2025</span>
                    <button
                      className="retirer"
                      onClick={() => retirer(v)}
                      aria-label={`Retirer ${v.modele}`}
                    >
                      ×
                    </button>
                  </div>
                </article>
              );
            })}

            {selection.length < MAX_COMPARAISON && (
              <article className="carte-ajout">
                {!ajoutOuvert ? (
                  <button
                    className="zone-ajout"
                    onClick={() => setAjoutOuvert(true)}
                  >
                    <span className="plus">+</span>
                    <strong>
                      {selection.length === 0
                        ? "Choisir un premier véhicule"
                        : `Ajouter un ${selection.length + 1}ᵉ modèle`}
                    </strong>
                    <span className="aide-ajout">
                      Comparez une motorisation électrique, hybride ou thermique.
                    </span>
                  </button>
                ) : (
                  <div className="recherche-ajout">
                    <div className="barre">
                      <input
                        type="search"
                        autoFocus
                        value={requeteComp}
                        placeholder="Clio, Yaris, MG3…"
                        onChange={(e) => setRequeteComp(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && chercherComp()}
                      />
                      <button
                        onClick={() => chercherComp()}
                        disabled={chercheComp}
                      >
                        {chercheComp ? "…" : "OK"}
                      </button>
                    </div>

                    {!resultatsComp && (
                      <div className="suggestions-ajout">
                        {SUGGESTIONS.map(([libelle, terme]) => (
                          <button
                            key={terme}
                            className="puce"
                            onClick={() => chercherComp(terme)}
                          >
                            + {libelle}
                          </button>
                        ))}
                      </div>
                    )}

                    {resultatsComp?.length === 0 && (
                      <p className="aide">Aucune dénomination ne correspond.</p>
                    )}

                    {resultatsComp?.length > 0 && (
                      <ul className="liste-ajout">
                        {resultatsComp.map((v) => {
                          const deja = selection.some((s) => cle(s) === cle(v));
                          return (
                            <li key={cle(v)}>
                              <button disabled={deja} onClick={() => ajouter(v)}>
                                <span>
                                  {v.marque} {v.modele}
                                  <em>{v.carburant_libelle}</em>
                                </span>
                                <b>
                                  {fr(consoDe(v), 1)}{" "}
                                  <small>{uniteDe(v)}</small>
                                </b>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <button
                      className="lien-discret"
                      onClick={() => {
                        setAjoutOuvert(false);
                        setResultatsComp(null);
                        setRequeteComp("");
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </article>
            )}
          </section>

          {/* Coût énergétique comparé */}
          {selection.length >= 2 && (
            <section className="bloc-cout">
              <div className="bloc-cout-tete">
                <div>
                  <span className="num">Analyse de rentabilité comparée</span>
                  <h2>
                    Coût énergétique annuel estimé ({fr(km)} km)
                  </h2>
                </div>
                <p>
                  Modèle le plus sobre :{" "}
                  <strong className="texte-vert">
                    {plusSobre.marque} {plusSobre.modele}
                  </strong>
                </p>
              </div>

              {classement.map((v, i) => {
                const cout = coutAnnuelR(v);
                const surcout = cout - coutAnnuelR(plusSobre);
                const surcoutPct = (surcout / coutAnnuelR(plusSobre)) * 100;
                const rang =
                  i === 0 ? "premier" : i === classement.length - 1 ? "dernier" : "milieu";
                const quantite = (consoReelle(v) * km) / 100;

                return (
                  <div key={cle(v)} className={`barre-cout ${rang}`}>
                    <div className="barre-cout-tete">
                      <span className="nom">
                        <i />
                        {v.marque} {v.modele}
                      </span>
                      <span className="montant">
                        {fr(cout, 2)} € / an
                        {i > 0 && <em> (+{fr(surcout, 2)} €)</em>}
                      </span>
                    </div>
                    <div className="piste">
                      <div
                        className="remplissage"
                        style={{ width: `${Math.max((cout / coutMax) * 100, 3)}%` }}
                      />
                    </div>
                    <div className="barre-cout-pied">
                      <span>
                        {fr(cout100R(v), 2)} € aux 100 km ·{" "}
                        {fr(quantite)}{" "}
                        {v.consommation != null ? "litres" : "kWh"} consommés / an
                      </span>
                      <span>
                        {i === 0
                          ? "Référence économique du comparatif"
                          : `+${fr(surcoutPct, 1)} % de surcoût`}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="bilan-cout">
                Sur 5 ans ({fr(km * 5)} km), rouler en{" "}
                <strong>
                  {plusSobre.marque} {plusSobre.modele}
                </strong>{" "}
                génère une économie de{" "}
                <strong className="texte-vert">
                  {fr((coutAnnuelR(plusCher) - coutAnnuelR(plusSobre)) * 5, 2)}{" "}
                  €
                </strong>{" "}
                en énergie par rapport à la{" "}
                <strong>
                  {plusCher.marque} {plusCher.modele}
                </strong>
                .
              </div>
            </section>
          )}

          {/* Tableau multicritères */}
          {selection.length >= 2 && (
            <section className="bloc-tableau">
              <div className="bloc-tableau-tete">
                <div>
                  <span className="num">Référentiel détaillé</span>
                  <h2>Tableau comparatif multicritères</h2>
                </div>
                <span className="protocole">
                  Valeurs d'homologation WLTP · EEA 2025
                </span>
              </div>

              <div className="defilement">
                <table className="tableau-multi">
                  <thead>
                    <tr>
                      <th>Critères d'analyse</th>
                      {selection.map((v) => (
                        <th key={cle(v)}>
                          {v.marque} {v.modele}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="section">
                      <td colSpan={selection.length + 1}>
                        1. Architecture &amp; chaîne de traction
                      </td>
                    </tr>
                    {ligneTableau(
                      "Motorisation",
                      selection.map((v) => v.categorie),
                      (val) => LIBELLE_CATEGORIE[val] ?? val
                    )}
                    {ligneTableau(
                      "Énergie",
                      selection.map((v) => v.carburant_libelle),
                      (val) => val
                    )}
                    {ligneTableau(
                      "Puissance",
                      selection.map((v) => v.puissance),
                      (val) => `${ch(val)} ch (${val} kW)`,
                      "haut"
                    )}
                    {ligneTableau(
                      "Cylindrée",
                      selection.map((v) => v.cylindree),
                      (val) => `${fr(val)} cm³`
                    )}
                    {ligneTableau(
                      "Masse homologuée",
                      selection.map((v) => v.masse),
                      (val) => `${fr(val)} kg`,
                      "bas"
                    )}
                    {ligneTableau(
                      "Rapport poids / puissance",
                      selection.map((v) =>
                        v.masse && v.puissance ? v.masse / v.puissance : null
                      ),
                      (val) => `${fr(val, 1)} kg/kW`,
                      "bas",
                      "Plus il est bas, plus le véhicule est vif"
                    )}

                    <tr className="section">
                      <td colSpan={selection.length + 1}>2. Consommation</td>
                    </tr>
                    {ligneTableau(
                      "Consommation homologuée",
                      selection.map((v) => consoDe(v)),
                      (val, v) => `${fr(val, 1)} ${uniteDe(v)}`,
                      memesUnites ? "bas" : null,
                      memesUnites ? "Cycle mixte WLTP" : "Unités différentes selon la motorisation"
                    )}
                    {usage.actif &&
                      ligneTableau(
                        "Consommation en conditions réelles",
                        selection.map((v) => consoReelle(v)),
                        (val, v) => `${fr(val, 1)} ${uniteDe(v)}`,
                        memesUnites ? "bas" : null,
                        "Correction d'usage appliquée hors modèle"
                      )}
                    {ligneTableau(
                      "Énergie équivalente",
                      selection.map((v) => energieDe(v)),
                      (val) => `${fr(val, 1)} kWh/100 km`,
                      "bas",
                      "1 litre d'essence ≈ 9,7 kWh"
                    )}
                    {selection.some((v) => v.autonomie_electrique) &&
                      ligneTableau(
                        "Autonomie électrique",
                        selection.map((v) => v.autonomie_electrique ?? null),
                        (val) => `${fr(val)} km`,
                        "haut"
                      )}

                    <tr className="section">
                      <td colSpan={selection.length + 1}>
                        3. Budget d'exploitation
                      </td>
                    </tr>
                    {ligneTableau(
                      "Coût aux 100 km",
                      selection.map((v) => cout100R(v)),
                      (val) => `${fr(val, 2)} €`,
                      "bas"
                    )}
                    {ligneTableau(
                      `Budget annuel (${fr(km)} km)`,
                      selection.map((v) => coutAnnuelR(v)),
                      (val) => `${fr(val, 2)} €`,
                      "bas"
                    )}
                    {ligneTableau(
                      "Budget sur 5 ans",
                      selection.map((v) => coutAnnuelR(v) * 5),
                      (val) => `${fr(val)} €`,
                      "bas"
                    )}

                    <tr className="section">
                      <td colSpan={selection.length + 1}>
                        4. Environnement &amp; marché
                      </td>
                    </tr>
                    {ligneTableau(
                      "Émissions CO₂",
                      selection.map((v) => v.co2),
                      (val) => `${val} g/km`,
                      "bas"
                    )}
                    {ligneTableau(
                      "Immatriculations 2025",
                      selection.map((v) => v.immatriculations),
                      (val) => fr(val),
                      null,
                      "Volume vendu en France"
                    )}
                  </tbody>
                </table>
              </div>

              <p className="note">
                Les consommations comparées sont les valeurs d'homologation
                WLTP, mesurées sur banc. La consommation réelle est
                généralement supérieure de 10 à 20 %. Les coûts dépendent des
                tarifs et du kilométrage que vous avez choisis ci-dessus.
              </p>
            </section>
          )}

          {selection.length === 1 && (
            <p className="indication">
              Ajoutez au moins un second véhicule pour afficher l'analyse de
              coût et le tableau comparatif.
            </p>
          )}
        </>
      )}

      {/* ═══════════════ CONDITIONS RÉELLES ═══════════════ */}
      {page === "usage" && (() => {
        const maj = (champ, valeur) => setUsage((u) => ({ ...u, [champ]: valeur }));
        const bascule = (champ) => setUsage((u) => ({ ...u, [champ]: !u[champ] }));

        const thermique = facteursUsage({ consommation: 6.2 }, usage);
        const electrique = facteursUsage({ conso_electrique: 170 }, usage);
        const pctTh = (thermique.total - 1) * 100;
        const pctEl = (electrique.total - 1) * 100;

        const actifs = Object.keys(USAGE_DEFAUT).filter(
          (c) => c !== "actif" && usage[c] !== USAGE_DEFAUT[c]
        ).length;

        const route = Math.max(0, 100 - usage.ville - usage.autoroute);
        const surcout =
          ((6.2 * (thermique.total - 1)) / 100) * km * prix.essence;

        const parGroupe = (groupe) =>
          thermique.details
            .filter((d) => d.groupe === groupe)
            .reduce((a, d) => a * d.facteur, 1);

        const GROUPES = [
          ["conduite", "Conduite et vitesse", "var(--nuit)"],
          ["climat", "Climat et auxiliaires", "var(--rouge)"],
          ["charge", "Charge et aérodynamique", "var(--ambre)"],
          ["pneus", "Pneumatiques", "var(--vert)"],
        ];

        return (
          <>
            <header className="entete-usage">
              <p className="kicker">
                <i />
                Paramètres de roulage · correction appliquée hors modèle
              </p>
              <div className="entete-comp-ligne">
                <div>
                  <h1>Filtres avancés &amp; paramètres de roulage</h1>
                  <p className="chapeau">
                    Ajustez vos conditions réelles d'utilisation pour affiner
                    l'estimation au plus près de votre quotidien.
                  </p>
                </div>
                <div className="actions-comp">
                  <button
                    className="bouton-sec"
                    onClick={() => setUsage(USAGE_DEFAUT)}
                  >
                    Rétablir les valeurs par défaut
                  </button>
                  <button
                    className={usage.actif ? "bouton-sec" : "bouton-principal"}
                    onClick={() => maj("actif", !usage.actif)}
                  >
                    {usage.actif
                      ? "Filtres appliqués — désactiver"
                      : `Appliquer les filtres (${actifs} actif${actifs > 1 ? "s" : ""})`}
                  </button>
                </div>
              </div>

              <div className="protocole-bande">
                <div>
                  <span className="num">Protocole</span>
                  <p>
                    Coefficients publiés par l'ADEME et principes physiques,
                    appliqués par-dessus l'estimation du modèle.
                  </p>
                </div>
                <div>
                  <span className="num">Effet de la vitesse</span>
                  <p>
                    La traînée aérodynamique croît avec le carré de la vitesse
                    et pèse environ 70 % de l'énergie sur autoroute.
                  </p>
                </div>
                <div>
                  <span className="num">Ce que le modèle ignore</span>
                  <p>
                    Météo, conduite et équipements sont absents des données
                    d'homologation : ils ne sont pas prédits, ils sont corrigés.
                  </p>
                </div>
              </div>
            </header>

            <div className="usage-grille">
              <div className="usage-colonne">
                {/* A — Conduite */}
                <section className="panneau-usage">
                  <div className="usage-tete">
                    <h2>
                      <i>A</i> Profil de conduite et vitesse
                    </h2>
                    <em>{fr((parGroupe("conduite") - 1) * 100, 1)} %</em>
                  </div>

                  <p className="etiquette-usage">Style de conduite</p>
                  <div className="choix quatre">
                    {Object.entries(STYLES).map(([code, s]) => (
                      <button
                        key={code}
                        className={usage.style === code ? "actif" : ""}
                        onClick={() => maj("style", code)}
                      >
                        <strong>{s.libelle}</strong>
                        <em>
                          {s.pct > 0 ? "+" : ""}
                          {s.pct} %
                        </em>
                      </button>
                    ))}
                  </div>

                  <p className="etiquette-usage">
                    Vitesse de croisière sur autoroute
                    <b>{usage.vitesse} km/h</b>
                  </p>
                  <input
                    type="range"
                    min="100"
                    max="145"
                    step="5"
                    value={usage.vitesse}
                    onChange={(e) => maj("vitesse", Number(e.target.value))}
                  />
                  <div className="bornes">
                    <span>100 · trajet fluide</span>
                    <span>
                      {fr((facteurAutoroute(usage.vitesse, false) - 1) * 100, 1)} %
                      sur la portion autoroutière
                    </span>
                    <span>145</span>
                  </div>

                  <p className="etiquette-usage">
                    Répartition des trajets
                    <b>{usage.ville + route + usage.autoroute} %</b>
                  </p>
                  <div className="repartition">
                    <label>
                      <span>Ville dense</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={usage.ville}
                        onChange={(e) =>
                          maj(
                            "ville",
                            Math.min(Number(e.target.value), 100 - usage.autoroute)
                          )
                        }
                      />
                      <b>{usage.ville} %</b>
                    </label>
                    <label>
                      <span>Route départementale</span>
                      <input type="range" min="0" max="100" value={route} disabled />
                      <b>{route} %</b>
                    </label>
                    <label>
                      <span>Autoroute</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={usage.autoroute}
                        onChange={(e) =>
                          maj(
                            "autoroute",
                            Math.min(Number(e.target.value), 100 - usage.ville)
                          )
                        }
                      />
                      <b>{usage.autoroute} %</b>
                    </label>
                  </div>
                </section>

                {/* B — Climat */}
                <section className="panneau-usage">
                  <div className="usage-tete">
                    <h2>
                      <i>B</i> Climat, saison et auxiliaires
                    </h2>
                    <em>{fr((parGroupe("climat") - 1) * 100, 1)} %</em>
                  </div>

                  <p className="etiquette-usage">Température moyenne du parcours</p>
                  <div className="choix quatre">
                    {Object.entries(TEMPERATURES).map(([code, t]) => (
                      <button
                        key={code}
                        className={usage.temperature === code ? "actif" : ""}
                        onClick={() => maj("temperature", code)}
                      >
                        <strong>{t.libelle}</strong>
                        <em>{t.aide}</em>
                        <span className="pct">
                          {t.th > 0 ? "+" : ""}
                          {t.th} % · élec {t.el > 0 ? "+" : ""}
                          {t.el} %
                        </span>
                      </button>
                    ))}
                  </div>

                  {(usage.temperature === "tempere" ||
                    usage.temperature === "canicule") && (
                    <>
                      <p className="etiquette-usage">Climatisation</p>
                      <div className="choix">
                        {Object.entries(CLIMS).map(([code, c]) => (
                          <button
                            key={code}
                            className={usage.clim === code ? "actif" : ""}
                            onClick={() => maj("clim", code)}
                          >
                            <strong>{c.libelle}</strong>
                            <em>
                              {c.pct > 0 ? "+" : ""}
                              {c.pct} %
                            </em>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {(usage.temperature === "hiverRude" ||
                    usage.temperature === "hiverDoux") && (
                    <>
                      <p className="etiquette-usage">Chauffage de l'habitacle</p>
                      <div className="choix">
                        {Object.entries(CHAUFFAGES).map(([code, c]) => (
                          <button
                            key={code}
                            className={usage.chauffage === code ? "actif" : ""}
                            onClick={() => maj("chauffage", code)}
                          >
                            <strong>{c.libelle}</strong>
                            <em>
                              {c.th} % · élec +{c.el} %
                            </em>
                          </button>
                        ))}
                      </div>
                      <p className="remarque">
                        Un moteur thermique chauffe l'habitacle avec sa chaleur
                        perdue : l'effet est quasi nul. Une électrique doit la
                        produire, et puise dans sa batterie.
                      </p>
                    </>
                  )}
                </section>

                {/* C — Charge */}
                <section className="panneau-usage">
                  <div className="usage-tete">
                    <h2>
                      <i>C</i> Charge utile et aérodynamique
                    </h2>
                    <em>{fr((parGroupe("charge") - 1) * 100, 1)} %</em>
                  </div>

                  <div className="deux-champs">
                    <div>
                      <p className="etiquette-usage">
                        Occupants à bord
                        <b>{Math.max(0, usage.occupants - 1) * 75} kg ajoutés</b>
                      </p>
                      <div className="choix cinq">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            className={usage.occupants === n ? "actif" : ""}
                            onClick={() => maj("occupants", n)}
                          >
                            <strong>{n}</strong>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="etiquette-usage">
                        Chargement du coffre
                        <b>{usage.bagages} kg</b>
                      </p>
                      <div className="choix quatre">
                        {[
                          [0, "Vide"],
                          [30, "Normal"],
                          [80, "Plein"],
                          [150, "Maximum"],
                        ].map(([kg, libelle]) => (
                          <button
                            key={kg}
                            className={usage.bagages === kg ? "actif" : ""}
                            onClick={() => maj("bagages", kg)}
                          >
                            <strong>{libelle}</strong>
                            <em>{kg} kg</em>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="etiquette-usage">Équipements extérieurs</p>
                  <div className="cases">
                    {EQUIPEMENTS.map(([code, libelle, pct, source]) => (
                      <label key={code} className="interrupteur">
                        <input
                          type="checkbox"
                          checked={usage[code]}
                          onChange={() => bascule(code)}
                        />
                        <span>
                          {libelle}
                          <em>
                            +{pct} % · {source}
                          </em>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>

                {/* D — Pneumatiques */}
                <section className="panneau-usage">
                  <div className="usage-tete">
                    <h2>
                      <i>D</i> Pneumatiques et chaîne de traction
                    </h2>
                    <em>{fr((parGroupe("pneus") - 1) * 100, 1)} %</em>
                  </div>

                  <div className="deux-champs">
                    <div>
                      <p className="etiquette-usage">Type de pneumatiques</p>
                      <div className="liste-radio">
                        {Object.entries(PNEUS).map(([code, p]) => (
                          <button
                            key={code}
                            className={usage.pneus === code ? "ligne actif" : "ligne"}
                            onClick={() => maj("pneus", code)}
                          >
                            <span>
                              {p.libelle}
                              <em>{p.aide}</em>
                            </span>
                            <b>
                              {p.pct > 0 ? "+" : ""}
                              {p.pct} %
                            </b>
                          </button>
                        ))}
                        <label className="ligne interrupteur">
                          <input
                            type="checkbox"
                            checked={usage.sousGonflage}
                            onChange={() => bascule("sousGonflage")}
                          />
                          <span>
                            Sous-gonflage de 0,3 bar
                            <em>ADEME : +1,2 %</em>
                          </span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <p className="etiquette-usage">
                        Santé de la batterie
                        <b>véhicules électriques</b>
                      </p>
                      <div className="choix">
                        {Object.entries(SOH).map(([code, s]) => (
                          <button
                            key={code}
                            className={usage.soh === code ? "actif" : ""}
                            onClick={() => maj("soh", code)}
                          >
                            <strong>{s.libelle}</strong>
                            <em>{s.aide}</em>
                          </button>
                        ))}
                      </div>
                      <p className="remarque">
                        Une batterie vieillie perd de la capacité, donc de
                        l'autonomie, mais sa consommation aux 100 km change peu.
                        L'effet est donc porté sur l'autonomie
                        {electrique.perteAutonomie > 0 &&
                          ` : environ −${electrique.perteAutonomie} %`}
                        .
                      </p>
                    </div>
                  </div>
                </section>

                {/* E — Barèmes */}
                <section className="panneau-usage">
                  <div className="usage-tete">
                    <h2>
                      <i>E</i> Barèmes énergétiques de référence
                    </h2>
                    <em>modifiable</em>
                  </div>

                  <div className="bareme-grille">
                    {[
                      ["essence", "Essence SP95-E10", "€/L"],
                      ["gazole", "Gazole B7", "€/L"],
                      ["kwh", "Électricité à domicile", "€/kWh"],
                      ["kwhRapide", "Recharge rapide", "€/kWh"],
                    ].map(([code, libelle, unite]) => (
                      <label key={code}>
                        <span>{libelle}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.05"
                          max="4"
                          value={prix[code]}
                          onChange={(e) =>
                            setPrix((p) => ({ ...p, [code]: Number(e.target.value) }))
                          }
                        />
                        <em>{unite}</em>
                      </label>
                    ))}
                  </div>
                </section>
              </div>

              {/* Panneau d'impact */}
              <aside className="impact">
                <div className="impact-tete">
                  <span className="num">Impact calculé en direct</span>
                  <em className={usage.actif ? "actif" : ""}>
                    {usage.actif ? "Appliqué" : "Non appliqué"}
                  </em>
                </div>

                <span className="sur">Surconsommation totale estimée</span>
                <strong
                  className={
                    pctTh > 0.5 ? "grand hausse" : pctTh < -0.5 ? "grand baisse" : "grand"
                  }
                >
                  {pctTh > 0 ? "+" : ""}
                  {fr(pctTh, 1)} %
                </strong>
                <p className="aide">
                  sur une voiture à carburant, par rapport au cycle
                  d'homologation WLTP
                </p>

                <div className="impact-elec">
                  Voiture électrique : {pctEl > 0 ? "+" : ""}
                  {fr(pctEl, 1)} %
                  {electrique.perteAutonomie > 0 &&
                    `, autonomie −${electrique.perteAutonomie} %`}
                </div>

                <span className="num decomposition">Décomposition analytique</span>
                {GROUPES.map(([code, libelle, couleur]) => {
                  const f = parGroupe(code);
                  const pct = (f - 1) * 100;
                  if (Math.abs(pct) < 0.05) return null;
                  return (
                    <div key={code} className="groupe">
                      <div className="groupe-tete">
                        <span>{libelle}</span>
                        <b className={pct > 0 ? "hausse" : "baisse"}>
                          {pct > 0 ? "+" : ""}
                          {fr(pct, 1)} %
                        </b>
                      </div>
                      <div className="piste">
                        <div
                          className="remplissage"
                          style={{
                            width: `${Math.min(Math.abs(pct) * 3, 100)}%`,
                            background: couleur,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="surcout">
                  <span className="sur">Surcoût annuel pour {fr(km)} km</span>
                  <strong>
                    {surcout > 0 ? "+" : ""}
                    {fr(surcout)} € / an
                  </strong>
                  <p>
                    Base : 6,2 L/100 km, soit environ{" "}
                    {fr(Math.abs(surcout) / 12, 2)} € par mois de carburant
                    imputables à ce profil de roulage.
                  </p>
                </div>

                <button
                  className="lancer"
                  onClick={() => {
                    maj("actif", true);
                    setPage("comparateur");
                  }}
                >
                  Enregistrer et appliquer aux comparaisons
                </button>

                <p className="note">
                  Ces coefficients ne sortent pas du modèle d'apprentissage :
                  les données d'homologation ne contiennent ni météo, ni style
                  de conduite, ni équipement. Ils proviennent de publications
                  de l'ADEME et de la physique du roulage, et s'appliquent
                  par-dessus l'estimation.
                </p>
              </aside>
            </div>
          </>
        );
      })()}

      {/* ═══════════════ MÉTHODOLOGIE ═══════════════ */}
      {page === "methodologie" && (
        <>
          <header className="entete-metho">
            <p className="kicker">
              <i />
              Comprendre en une minute
            </p>
            <h1>Pourquoi votre voiture consomme plus que prévu&nbsp;?</h1>
            <p className="chapeau">
              Les chiffres officiels sont mesurés en laboratoire. AutoConso les
              rassemble, les explique et vous aide à estimer ce que vous
              paierez vraiment à la pompe ou à la borne.
            </p>
          </header>

          {/* 1. Laboratoire contre quotidien */}
          <section className="metho-bloc">
            <div className="metho-titre">
              <span className="num">Le laboratoire face à votre quotidien</span>
              <h2>D'où vient la différence&nbsp;?</h2>
            </div>

            <div className="duo">
              <article className="carte-duo">
                <div className="duo-tete">
                  <h3>La théorie (homologation)</h3>
                  <em>En laboratoire</em>
                </div>
                <p>
                  Le cycle WLTP est mesuré sur un banc à rouleaux, à une
                  température de référence de 23&nbsp;°C, sans relief ni trafic,
                  climatisation coupée, selon un profil de vitesse normalisé
                  de trente minutes.
                </p>
                <span className="pied-duo neutre">
                  Des conditions idéales, identiques pour toutes les voitures
                </span>
              </article>

              <article className="carte-duo reel">
                <div className="duo-tete">
                  <h3>La réalité (sur la route)</h3>
                  <em>Au quotidien</em>
                </div>
                <p>
                  Météo, bouchons, autoroute, passagers et bagages, chauffage
                  ou climatisation, pneus sous-gonflés : autant de facteurs
                  absents du test, qui font tous monter la consommation.
                </p>
                <span className="pied-duo alerte">
                  De l'ordre de +20&nbsp;% de consommation pour une voiture
                  thermique
                </span>
              </article>
            </div>
          </section>

          {/* 2. Les trois causes */}
          <section className="metho-bloc">
            <div className="metho-titre">
              <span className="num">L'impact direct</span>
              <h2>Les trois causes principales</h2>
            </div>

            <div className="trio">
              <article className="carte-cause">
                <span className="icone" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 16a8 8 0 1 1 16 0" />
                    <path d="M12 16l4-5" />
                    <circle cx="12" cy="16" r="1.4" />
                  </svg>
                </span>
                <h3>1. La vitesse sur voie rapide</h3>
                <p>
                  La résistance de l'air croît avec le carré de la vitesse : à
                  130&nbsp;km/h, elle est environ 40&nbsp;% plus forte qu'à
                  110&nbsp;km/h. Le cycle WLTP ne passe que quelques secondes
                  au-delà de 120&nbsp;km/h.
                </p>
              </article>

              <article className="carte-cause">
                <span className="icone" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3v11" />
                    <path d="M9 14.5a3 3 0 1 0 6 0c0-1.2-.6-2-1.5-2.6V5a1.5 1.5 0 0 0-3 0v6.9c-.9.6-1.5 1.4-1.5 2.6z" />
                  </svg>
                </span>
                <h3>2. Le froid et le chauffage</h3>
                <p>
                  Un moteur froid consomme davantage durant ses premiers
                  kilomètres, et le chauffage puise dans la batterie d'une
                  électrique. Les trajets courts en hiver sont les plus
                  pénalisants.
                </p>
              </article>

              <article className="carte-cause">
                <span className="icone" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M6 9h12l2 11H4L6 9z" />
                    <path d="M9 9a3 3 0 0 1 6 0" />
                  </svg>
                </span>
                <h3>3. Le poids à bord</h3>
                <p>
                  Passagers, bagages et coffre de toit ajoutent de la masse à
                  déplacer à chaque accélération. Mesurez-en l'effet réel avec
                  le simulateur.
                </p>
                <button
                  className="lien-discret"
                  onClick={() => setPage("simulateur")}
                >
                  Tester +100, +250 ou +400&nbsp;kg
                </button>
              </article>
            </div>
          </section>

          {/* 3. Sources */}
          <section className="metho-bloc">
            <div className="metho-titre">
              <span className="num">Transparence</span>
              <h2>D'où viennent nos chiffres&nbsp;?</h2>
            </div>

            <div className="trio">
              <article className="carte-source">
                <span className="num">Source officielle</span>
                <h3>Agence européenne pour l'environnement</h3>
                <p>
                  Les données d'homologation de 1&nbsp;731&nbsp;737 voitures
                  neuves immatriculées en France en 2025 : masse, puissance,
                  cylindrée, carburant, CO₂ et consommation.
                </p>
              </article>

              <article className="carte-source accent">
                <span className="num">Traitement</span>
                <h3>1&nbsp;290 versions</h3>
                <p>
                  Les immatriculations sont regroupées par marque, modèle et
                  motorisation. Chaque caractéristique est résumée par sa
                  médiane, pour résister aux valeurs aberrantes.
                </p>
              </article>

              <article className="carte-source">
                <span className="num">Estimation</span>
                <h3>Apprentissage automatique</h3>
                <p>
                  Deux modèles de gradient boosting, l'un pour les voitures à
                  carburant, l'autre pour les électriques, estiment la
                  consommation à partir des caractéristiques mécaniques.
                </p>
              </article>
            </div>
          </section>

          {/* 4. Barème */}
          <section className="bareme">
            <div>
              <span className="num">Barème de référence</span>
              <p>
                Prix moyens retenus pour tous les calculs de coût. Vous pouvez
                les modifier dans le comparateur.
              </p>
            </div>
            <div className="tarifs-bareme">
              <div>
                <span>Essence</span>
                <strong>{fr(prix.essence, 2)}&nbsp;€/L</strong>
              </div>
              <div>
                <span>Gazole</span>
                <strong>{fr(prix.gazole, 2)}&nbsp;€/L</strong>
              </div>
              <div className="elec">
                <span>Électricité</span>
                <strong>{fr(prix.kwh, 2)}&nbsp;€/kWh</strong>
              </div>
            </div>
          </section>

          {/* 5. Méthode statistique */}
          <section className="metho-bloc">
            <div className="metho-titre">
              <span className="num">Pour les curieux</span>
              <h2>La précision de nos modèles</h2>
            </div>

            <div className="panneau-metho">
              <table className="fiche">
                <thead>
                  <tr>
                    <th>Modèle</th>
                    <th>Versions</th>
                    <th>Erreur moyenne</th>
                    <th>Variance expliquée</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Thermique et hybride</td>
                    <td>727</td>
                    <td>0,39 L/100 km</td>
                    <td>93 %</td>
                  </tr>
                  <tr>
                    <td>Électrique</td>
                    <td>323</td>
                    <td>1,0 kWh/100 km</td>
                    <td>73 %</td>
                  </tr>
                </tbody>
              </table>

              <div className="enseignements">
                <div>
                  <h3>Voitures à carburant</h3>
                  <p>
                    La puissance est le premier facteur, devant la masse et la
                    cylindrée : un gros moteur consomme même à allure modérée.
                  </p>
                </div>
                <div>
                  <h3>Voitures électriques</h3>
                  <p>
                    C'est la masse qui domine : le rendement d'un moteur
                    électrique variant peu, seul le poids à déplacer fait la
                    différence.
                  </p>
                </div>
              </div>

              <ul className="limites">
                <li>
                  Les hybrides rechargeables affichent une consommation
                  officielle calculée batterie pleine : sans recharge
                  régulière, leur consommation réelle est bien plus élevée.
                </li>
                <li>
                  Les données ne décrivent pas l'aérodynamisme, ce qui limite
                  la précision du modèle électrique.
                </li>
                <li>
                  Seules les voitures immatriculées neuves en France en 2025
                  figurent au registre. Photos : Wikimédia Commons.
                </li>
              </ul>
            </div>
          </section>

          {/* 6. Contact */}
          <section className="appel">
            <div>
              <h2>Une question sur la méthode&nbsp;?</h2>
              <p>Le code source et la démarche complète sont publics.</p>
            </div>
            <a
              className="bouton-principal"
              href="https://github.com/YassineBalbali/car-price-ml"
              target="_blank"
              rel="noreferrer"
            >
              Voir le code source
            </a>
          </section>
        </>
      )}

      {/* ═══════════════ SIMULATEUR ═══════════════ */}
      {page === "simulateur" && (
        <>
          <header>
            <p className="kicker">
              <i />
              Immatriculations françaises 2025 · Synthèse empirique
            </p>
            <div className="entete-grille">
              <div>
                <h1>Ce que consomme vraiment une voiture</h1>
                <p className="chapeau">
                  À partir des données d'homologation officielles (cycle mixte
                  WLTP), explorez l'impact du poids embarqué, de l'architecture
                  motrice et de la cylindrée sur la consommation des véhicules
                  immatriculés en France.
                </p>
              </div>
              <aside className="referentiel">
                <div>
                  <span>Référentiel</span>
                  <strong>Agence européenne pour l'environnement, 2025</strong>
                </div>
                <div>
                  <span>Méthode d'estimation</span>
                  <strong>Gradient boosting sur 1 050 versions</strong>
                </div>
              </aside>
            </div>
          </header>

          <section className="bande">
            <div className="bande-titre">
              <span className="num">01 · Registre homologué</span>
              <h2>Trouver un véhicule</h2>
              <span className="droite">
                {stats
                  ? `${fr(stats.total_versions)} versions · ${fr(
                      stats.total_immatriculations
                    )} immatriculations`
                  : "Données Agence européenne pour l'environnement"}
              </span>
            </div>

            <div className="recherche">
              <div className="bascule bascule-recherche">
                <button
                  className={modeRecherche === "nom" ? "actif" : ""}
                  onClick={() => {
                    setModeRecherche("nom");
                    setRequete("");
                    setResultats(null);
                    setErreurRecherche(null);
                  }}
                >
                  Par nom de modèle
                </button>
                <button
                  className={modeRecherche === "besoin" ? "actif" : ""}
                  onClick={() => {
                    setModeRecherche("besoin");
                    setRequete("");
                    setResultats(null);
                    setErreurRecherche(null);
                  }}
                >
                  Par besoin décrit
                </button>
              </div>

              <div className="barre">
                <input
                  type="search"
                  value={requete}
                  placeholder={
                    modeRecherche === "besoin"
                      ? "Décrivez votre besoin — petite citadine économique pour la ville…"
                      : "Marque ou dénomination — Clio, Golf, MG3, Tesla…"
                  }
                  onChange={(e) => setRequete(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && chercher()}
                />
                <button onClick={() => chercher()} disabled={chercheEnCours}>
                  {chercheEnCours ? "Recherche…" : "Rechercher"}
                </button>
              </div>

              <div className="rapides">
                <span>
                  {modeRecherche === "besoin" ? "Exemples" : "Suggestions rapides"}
                </span>
                {(modeRecherche === "besoin"
                  ? BESOINS
                  : SUGGESTIONS.map(([l, t]) => [l, t])
                ).map(([libelle, terme]) => (
                  <button
                    key={terme}
                    className={requete === terme ? "puce active" : "puce"}
                    onClick={() => chercher(terme)}
                  >
                    {libelle}
                  </button>
                ))}
              </div>

              {modeRecherche === "besoin" && (
                <p className="aide-semantique">
                  Chaque version du catalogue est décrite par une phrase,
                  convertie en vecteur numérique. Votre demande subit le même
                  traitement : les voitures sont classées par proximité de sens,
                  pas par mots communs.
                </p>
              )}
            </div>

            {choisi && !resultats && (
              <div className="choisi">
                <div className="vignette">
                  {images[cle(choisi)] &&
                  images[cle(choisi)] !== "chargement" ? (
                    <img
                      src={images[cle(choisi)].src}
                      alt={images[cle(choisi)].titre}
                      loading="lazy"
                    />
                  ) : (
                    <Silhouette />
                  )}
                </div>
                <div className="choisi-texte">
                  <span className="sur">Véhicule sélectionné</span>
                  <strong>
                    {choisi.marque} {choisi.modele}
                  </strong>
                  <span className="details">
                    {choisi.carburant_libelle} · {consoDe(choisi).toFixed(1)}{" "}
                    {uniteDe(choisi)} homologués
                    {choisi.masse ? ` · ${fr(choisi.masse)} kg` : ""}
                    {choisi.puissance ? ` · ${ch(choisi.puissance)} ch` : ""}
                  </span>
                </div>
                <button className="puce" onClick={() => chercher(requete)}>
                  Changer de véhicule
                </button>
              </div>
            )}

            {erreurRecherche && <p className="erreur">{erreurRecherche}</p>}

            {resultats?.length === 0 && (
              <p className="vide">
                Aucune dénomination ne correspond. Le registre ne couvre que les
                véhicules immatriculés neufs en France en 2025. Les dénominations
                sont techniques : « C 220 D » pour une Mercedes Classe C.
              </p>
            )}

            {resultats?.length > 0 && listeRecherche(resultats, selectionner)}
          </section>

          <div className="deux-colonnes">
            <section className="panneau parametres">
              <span className="num">02 · Paramètres</span>
              <h2>Ajuster les spécifications</h2>
              <p className="aide">
                Le modèle estime la consommation à partir des caractéristiques
                mécaniques. Modifiez-en une pour mesurer son effet.
              </p>

              <div className="bascule">
                <button
                  className={!electrique ? "actif" : ""}
                  onClick={() => changerMode("carburant")}
                >
                  Thermique &amp; hybride
                </button>
                <button
                  className={electrique ? "actif" : ""}
                  onClick={() => changerMode("electrique")}
                >
                  100 % électrique
                </button>
              </div>

              <label className="champ">
                <span className="etiquette">
                  Masse à vide (kg)
                  {charge > 0 && <em>+{charge} kg de charge</em>}
                </span>
                <input
                  type="number"
                  min="500"
                  max="3500"
                  value={form.masse}
                  onChange={(e) => maj("masse", e.target.value)}
                />
                <span className="sous">
                  Masse retenue pour le calcul :{" "}
                  {fr(Number(form.masse) + charge)} kg
                </span>
              </label>

              <div className="charges">
                {[0, 100, 250, 400].map((c) => (
                  <button
                    key={c}
                    className={charge === c ? "actif" : ""}
                    onClick={() => setCharge(c)}
                  >
                    {c === 0 ? "À vide" : `+${c} kg`}
                  </button>
                ))}
              </div>

              <label className="champ">
                <span className="etiquette">
                  Puissance motrice (kW)
                  <em>{ch(Number(form.puissance) || 0)} ch</em>
                </span>
                <input
                  type="number"
                  min="20"
                  max={electrique ? 1000 : 700}
                  value={form.puissance}
                  onChange={(e) => maj("puissance", e.target.value)}
                />
              </label>

              {!electrique ? (
                <>
                  <label className="champ">
                    <span className="etiquette">Cylindrée (cm³)</span>
                    <input
                      type="number"
                      min="600"
                      max="8000"
                      step="50"
                      value={form.cylindree}
                      onChange={(e) => maj("cylindree", e.target.value)}
                    />
                  </label>

                  <label className="champ">
                    <span className="etiquette">Carburant employé</span>
                    <select
                      value={form.carburant}
                      onChange={(e) => maj("carburant", e.target.value)}
                    >
                      {CARBURANTS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="champ">
                    <span className="etiquette">Architecture</span>
                    <select
                      value={form.categorie}
                      onChange={(e) => maj("categorie", e.target.value)}
                    >
                      {ARCHITECTURES.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <label className="champ">
                  <span className="etiquette">Autonomie homologuée (km)</span>
                  <input
                    type="number"
                    min="50"
                    max="900"
                    value={form.autonomie_electrique}
                    onChange={(e) => maj("autonomie_electrique", e.target.value)}
                  />
                  <span className="sous">
                    Renseigne indirectement la capacité de la batterie.
                  </span>
                </label>
              )}

              <button
                className="lancer"
                onClick={calculer}
                disabled={calculEnCours}
              >
                {calculEnCours ? "Calcul en cours…" : "Estimer la consommation"}
              </button>

              {erreurCalcul && <p className="erreur">{erreurCalcul}</p>}
            </section>

            <section className="panneau restitution">
              <span className="num">03 · Restitution analytique</span>
              <h2>Estimation &amp; écart</h2>

              {!prediction && (
                <p className="attente">
                  Sélectionnez un véhicule du registre ou saisissez des
                  caractéristiques, puis lancez l'estimation. L'écart avec la
                  valeur d'homologation s'affichera ici.
                </p>
              )}

              {prediction && (
                <>
                  <div className="profil">
                    {choisi && images[cle(choisi)] &&
                      images[cle(choisi)] !== "chargement" && (
                        <img
                          className="profil-photo"
                          src={images[cle(choisi)].src}
                          alt={images[cle(choisi)].titre}
                          loading="lazy"
                        />
                      )}
                    <span>
                      {choisi
                        ? `Profil analysé : ${choisi.marque} ${choisi.modele}`
                        : "Profil analysé : saisie libre"}
                      {charge > 0 && ` · ajusté (+${charge} kg de charge)`}
                    </span>
                  </div>

                  <div className="chiffres">
                    <div className="principal">
                      <span className="sur">Consommation estimée</span>
                      <strong>{predite}</strong>
                      <span className="u">{unite}</span>
                      {ecart != null && (
                        <span
                          className={
                            ecart > 0.05
                              ? "delta haut"
                              : ecart < -0.05
                              ? "delta bas"
                              : "delta"
                          }
                        >
                          {ecart > 0 ? "+" : ""}
                          {ecart.toFixed(2)} {unite} vs homologation (
                          {ecartPct > 0 ? "+" : ""}
                          {ecartPct.toFixed(1)} %)
                        </span>
                      )}
                    </div>

                    <div className="secondaire">
                      <span className="sur">Budget annuel estimé</span>
                      <strong>{fr(prediction.cout_annuel)} €</strong>
                      <span className="legende">
                        15 000 km · {electrique ? "0,22 €/kWh" : "1,75 €/L"}
                      </span>
                    </div>

                    <div className="secondaire">
                      <span className="sur">Émissions CO₂</span>
                      <strong>{prediction.co2_estime} g/km</strong>
                      <span className="legende">
                        {electrique
                          ? "à l'échappement"
                          : "déduit du carburant brûlé"}
                      </span>
                    </div>
                  </div>

                  <div className="fiche-vehicule">
                    <h3>Caractéristiques retenues</h3>
                    <dl>
                      <div>
                        <dt>Masse</dt>
                        <dd>
                          {fr(Number(form.masse) + charge)} kg
                          {charge > 0 && <em>dont {charge} kg de charge</em>}
                        </dd>
                      </div>
                      <div>
                        <dt>Puissance</dt>
                        <dd>
                          {form.puissance} kW
                          <em>{ch(Number(form.puissance))} chevaux</em>
                        </dd>
                      </div>
                      {!electrique ? (
                        <>
                          <div>
                            <dt>Cylindrée</dt>
                            <dd>
                              {fr(Number(form.cylindree))} cm³
                              <em>
                                {(Number(form.cylindree) / 1000).toFixed(1)}{" "}
                                litres
                              </em>
                            </dd>
                          </div>
                          <div>
                            <dt>Carburant</dt>
                            <dd>
                              {CARBURANTS.find(([v]) => v === form.carburant)?.[1]}
                            </dd>
                          </div>
                          <div>
                            <dt>Architecture</dt>
                            <dd>
                              {
                                ARCHITECTURES.find(
                                  ([v]) => v === form.categorie
                                )?.[1]
                              }
                            </dd>
                          </div>
                        </>
                      ) : (
                        <div>
                          <dt>Autonomie</dt>
                          <dd>{fr(Number(form.autonomie_electrique))} km</dd>
                        </div>
                      )}
                      <div>
                        <dt>Rapport poids / puissance</dt>
                        <dd>
                          {fr(
                            (Number(form.masse) + charge) /
                              Number(form.puissance),
                            1
                          )}{" "}
                          kg/kW
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {mesure != null && (
                    <div className="tableau">
                      <h3>Décomposition comparative</h3>
                      <table>
                        <thead>
                          <tr>
                            <th>Référentiel</th>
                            <th>Consommation</th>
                            <th>CO₂</th>
                            <th>Budget 15 000 km</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              Valeur d'homologation
                              <em>Cycle normalisé WLTP mixte</em>
                            </td>
                            <td>
                              {mesure.toFixed(1)} {unite}
                            </td>
                            <td>
                              {co2Homologue != null
                                ? `${co2Homologue} g/km`
                                : "—"}
                            </td>
                            <td>
                              {coutHomologue != null
                                ? `${fr(coutHomologue)} € / an`
                                : "—"}
                            </td>
                          </tr>
                          <tr>
                            <td>
                              Estimation du modèle
                              <em>
                                {charge > 0
                                  ? `Masse ajustée +${charge} kg`
                                  : "Caractéristiques d'origine"}
                              </em>
                            </td>
                            <td>
                              {predite} {unite}
                            </td>
                            <td>{prediction.co2_estime} g/km</td>
                            <td>{fr(prediction.cout_annuel)} € / an</td>
                          </tr>
                          <tr className="ligne-ecart">
                            <td>Écart constaté</td>
                            <td>
                              <span
                                className={
                                  ecart > 0 ? "pastille haut" : "pastille bas"
                                }
                              >
                                {ecart > 0 ? "+" : ""}
                                {ecart.toFixed(2)} {unite}
                              </span>
                            </td>
                            <td>
                              {co2Homologue != null
                                ? `${
                                    prediction.co2_estime - co2Homologue > 0
                                      ? "+"
                                      : ""
                                  }${(
                                    prediction.co2_estime - co2Homologue
                                  ).toFixed(0)} g`
                                : "—"}
                            </td>
                            <td>
                              {coutHomologue != null
                                ? `${
                                    prediction.cout_annuel - coutHomologue > 0
                                      ? "+"
                                      : ""
                                  }${fr(
                                    prediction.cout_annuel - coutHomologue
                                  )} €`
                                : "—"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  <p className="note">
                    <strong>Lecture.</strong> L'écart ci-dessus mesure la
                    différence entre la valeur officielle du véhicule et
                    l'estimation produite par le modèle à partir de ses seules
                    caractéristiques mécaniques. Le modèle est entraîné sur{" "}
                    {prediction.fiabilite.n} versions et explique{" "}
                    {Math.round(prediction.fiabilite.cv_r2 * 100)} % de la
                    variation observée en validation croisée, avec une erreur
                    moyenne de{" "}
                    {electrique
                      ? `${(prediction.fiabilite.mae / 10).toFixed(1)} kWh/100 km`
                      : `${prediction.fiabilite.mae} L/100 km`}
                    .
                  </p>
                </>
              )}
            </section>
          </div>

          {stats && (
            <section className="flotte">
              <span className="num">Analyse de flotte 2025</span>
              <div className="flotte-titre">
                <h2>Le parc immatriculé par type de motorisation</h2>
                <p>Consommations médianes du parc neuf français en 2025.</p>
              </div>

              <div className="cartes">
                {stats.categories.map((c) => (
                  <article key={c.categorie}>
                    <div className="carte-tete">
                      <span className="sur">{c.libelle}</span>
                      <em>{c.part} %</em>
                    </div>
                    <strong>
                      {c.conso_mediane} <span>{c.unite}</span>
                    </strong>
                    <p className="details">
                      {c.versions} versions · {c.co2_median} g CO₂/km
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {compteOuvert && (
        <FenetreCompte
          fermer={() => setCompteOuvert(false)}
          onConnexion={(donnees) => {
            localStorage.setItem(CLE_SESSION, JSON.stringify(donnees));
            setSession(donnees);
            setCompteOuvert(false);
          }}
        />
      )}

      <footer>
        <p>
          Données d'homologation publiées par l'Agence européenne pour
          l'environnement — immatriculations de véhicules neufs en France, année
          2025. Les valeurs WLTP sont mesurées sur banc à rouleaux et restent
          inférieures de 10 à 20 % à la consommation réelle. Photographies :
          Wikimédia Commons.
        </p>
        <p className="signature">AutoConso — projet d'analyse indépendant</p>
      </footer>
    </div>
  );
}