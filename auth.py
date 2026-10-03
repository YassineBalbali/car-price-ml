"""
Comptes utilisateurs : inscription, connexion, session.

Deux principes non négociables :

1. Le mot de passe n'est JAMAIS stocké. Seule une empreinte bcrypt l'est,
   irréversible et salée, ce qui rend inutile le vol de la base.
2. La session est un jeton signé (JWT). Le serveur ne garde aucun état :
   il vérifie la signature à chaque requête.

Base de données : PostgreSQL si DATABASE_URL est défini, SQLite sinon.
Render efface le disque à chaque redémarrage, donc SQLite n'y conserve
rien : une base externe est indispensable en production.
"""

import os
import re
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Column, DateTime, Integer, String, create_engine, select
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# ─── Base de données ────────────────────────────────────────────────────

URL_BASE = os.getenv("DATABASE_URL", "sqlite:///data/utilisateurs.db")

# Certains hébergeurs fournissent encore l'ancien préfixe postgres://
if URL_BASE.startswith("postgres://"):
    URL_BASE = URL_BASE.replace("postgres://", "postgresql://", 1)

moteur = create_engine(
    URL_BASE,
    connect_args={"check_same_thread": False} if URL_BASE.startswith("sqlite") else {},
    pool_pre_ping=True,
)
SessionLocale = sessionmaker(bind=moteur, autoflush=False, autocommit=False)
Base = declarative_base()


class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    empreinte = Column(String(255), nullable=False)
    prenom = Column(String(80), nullable=False, default="")
    nom = Column(String(80), nullable=False, default="")
    cree_le = Column(DateTime, default=lambda: datetime.now(timezone.utc))


Base.metadata.create_all(moteur)


def session_base():
    base = SessionLocale()
    try:
        yield base
    finally:
        base.close()


# ─── Mots de passe et jetons ────────────────────────────────────────────

# bcrypt est utilisé directement plutôt que via passlib : cette couche
# d'abstraction casse à chaque version majeure de bcrypt, pour deux
# fonctions qui tiennent en quatre lignes.

LIMITE_BCRYPT = 72  # l'algorithme ignore tout octet au-delà


def hacher(mot_de_passe: str) -> str:
    octets = mot_de_passe.encode("utf-8")[:LIMITE_BCRYPT]
    return bcrypt.hashpw(octets, bcrypt.gensalt()).decode("utf-8")


def verifier(mot_de_passe: str, empreinte: str) -> bool:
    octets = mot_de_passe.encode("utf-8")[:LIMITE_BCRYPT]
    try:
        return bcrypt.checkpw(octets, empreinte.encode("utf-8"))
    except ValueError:
        return False

CLE = os.getenv("JWT_SECRET")
if not CLE:
    # Une clé tirée au hasard invalide les sessions à chaque redémarrage :
    # acceptable en développement, à proscrire en production.
    CLE = secrets.token_urlsafe(32)
    print("JWT_SECRET absent : clé temporaire générée, sessions non durables")

ALGORITHME = "HS256"
DUREE_JOURS = 30

securite = HTTPBearer(auto_error=False)


def creer_jeton(utilisateur: Utilisateur) -> str:
    charge = {
        "sub": str(utilisateur.id),
        "email": utilisateur.email,
        "prenom": utilisateur.prenom,
        "exp": datetime.now(timezone.utc) + timedelta(days=DUREE_JOURS),
    }
    return jwt.encode(charge, CLE, algorithm=ALGORITHME)


def utilisateur_courant(
    identifiants: HTTPAuthorizationCredentials = Depends(securite),
    base: Session = Depends(session_base),
) -> Utilisateur:
    """Dépendance à placer sur toute route réservée aux membres."""
    if identifiants is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Connexion requise")

    try:
        charge = jwt.decode(identifiants.credentials, CLE, algorithms=[ALGORITHME])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expirée")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session invalide")

    utilisateur = base.get(Utilisateur, int(charge["sub"]))
    if utilisateur is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Compte introuvable")

    return utilisateur


# ─── Schémas ────────────────────────────────────────────────────────────


class Identifiants(BaseModel):
    """Connexion : l'adresse et le mot de passe suffisent."""

    email: EmailStr
    mot_de_passe: str = Field(..., min_length=8, max_length=128)


class Inscription(Identifiants):
    """Création de compte : l'identité est demandée en plus."""

    prenom: str = Field(..., min_length=1, max_length=80)
    nom: str = Field(..., min_length=1, max_length=80)


class Session_(BaseModel):
    jeton: str
    email: str
    prenom: str
    nom: str


class Profil(BaseModel):
    email: str
    prenom: str
    nom: str
    cree_le: datetime


# ─── Routes ─────────────────────────────────────────────────────────────

routeur = APIRouter(prefix="/auth", tags=["comptes"])


def _session(utilisateur: Utilisateur) -> Session_:
    return Session_(
        jeton=creer_jeton(utilisateur),
        email=utilisateur.email,
        prenom=utilisateur.prenom,
        nom=utilisateur.nom,
    )


def _verifier_robustesse(mot_de_passe: str):
    if not re.search(r"[A-Za-z]", mot_de_passe) or not re.search(r"\d", mot_de_passe):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Le mot de passe doit contenir au moins une lettre et un chiffre",
        )


@routeur.post("/inscription", response_model=Session_, status_code=201)
def inscription(donnees: Inscription, base: Session = Depends(session_base)):
    email = donnees.email.lower().strip()
    _verifier_robustesse(donnees.mot_de_passe)

    existe = base.scalar(select(Utilisateur).where(Utilisateur.email == email))
    if existe:
        raise HTTPException(status.HTTP_409_CONFLICT, "Cette adresse a déjà un compte")

    utilisateur = Utilisateur(
        email=email,
        empreinte=hacher(donnees.mot_de_passe),
        prenom=donnees.prenom.strip(),
        nom=donnees.nom.strip(),
    )
    base.add(utilisateur)
    base.commit()
    base.refresh(utilisateur)

    return _session(utilisateur)


@routeur.post("/connexion", response_model=Session_)
def connexion(donnees: Identifiants, base: Session = Depends(session_base)):
    email = donnees.email.lower().strip()
    utilisateur = base.scalar(select(Utilisateur).where(Utilisateur.email == email))

    # Un message unique pour les deux cas : indiquer qu'une adresse existe
    # permettrait d'énumérer les comptes.
    if utilisateur is None or not verifier(donnees.mot_de_passe, utilisateur.empreinte):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Adresse ou mot de passe incorrect"
        )

    return _session(utilisateur)


@routeur.get("/moi", response_model=Profil)
def profil(utilisateur: Utilisateur = Depends(utilisateur_courant)):
    return Profil(
        email=utilisateur.email,
        prenom=utilisateur.prenom,
        nom=utilisateur.nom,
        cree_le=utilisateur.cree_le,
    )