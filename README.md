# 🏛️ AidesPubliques

> Plateforme digitale de gestion et suivi des dossiers d'aides publiques

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 📋 Description

**AidesPubliques** est une plateforme web complète permettant aux citoyens de découvrir, déposer et suivre leurs demandes d'aides publiques. Elle offre des espaces dédiés pour chaque profil utilisateur : demandeur, instructeur et administrateur.

---

## ✨ Fonctionnalités

### 👤 Demandeur
- Consulter le catalogue des aides disponibles
- Déposer une demande de dossier
- Suivre l'état de ses dossiers en temps réel
- Recevoir des notifications email à chaque changement de statut

### 🔵 Instructeur
- Consulter uniquement les dossiers qui lui sont affectés
- Changer le statut des dossiers (Accepter / Refuser / Instruire)
- Tableau de bord avec statistiques personnelles

### 🔴 Administrateur
- Gérer tous les dossiers
- Gérer le catalogue des aides
- Gérer les utilisateurs et leurs rôles
- Affecter les dossiers aux instructeurs
- Tableau de bord global avec graphiques

---

## 🛠️ Technologies

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, Tailwind CSS, Recharts |
| Backend | FastAPI, Python 3.11 |
| Base de données | PostgreSQL 15 |
| ORM | SQLAlchemy + Alembic |
| Auth | JWT (JSON Web Tokens) |
| Cache / Broker | Redis |
| Tâches async | Celery |
| Emails | FastAPI-Mail + Gmail SMTP |
| Conteneurs | Docker + Docker Compose |

---

## 🚀 Installation

### Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 18+](https://nodejs.org/)
- [Python 3.11+](https://www.python.org/)

### 1. Cloner le projet

```bash
git clone https://github.com/votre-username/aides-publiques.git
cd aides-publiques
```

### 2. Lancer la base de données et Redis

```bash
docker compose up db redis -d
```

### 3. Installer et lancer le backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 4. Installer et lancer le frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Lancer le worker Celery (emails)

```bash
cd backend
venv\Scripts\activate
celery -A app.celery_app worker --loglevel=info --pool=solo
```

---

## 🌐 URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Documentation API | http://localhost:8000/docs |

---

## 👥 Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | belbeliyassine2004@gmail.com | votre_mdp |
| Instructeur | belbeliyassine12345@gmail.com | votre_mdp |
| Demandeur | test@gmail.com | votre_mdp |

---

## 📁 Structure du projet

```
aides-publiques/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # Endpoints FastAPI
│   │   ├── core/            # Config, database
│   │   ├── models/          # Modèles SQLAlchemy
│   │   ├── schemas/         # Schémas Pydantic
│   │   ├── celery_app.py    # Config Celery
│   │   ├── tasks.py         # Tâches async (emails)
│   │   └── main.py          # Point d'entrée
│   ├── alembic/             # Migrations BDD
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # Pages React
│   │   └── main.jsx
│   └── package.json
└── docker-compose.yml
```

---

## 📧 Notifications email

Chaque changement de statut d'un dossier déclenche automatiquement un email au demandeur via **Celery + Redis + Gmail SMTP**.

Statuts disponibles :
- 📤 Déposé
- 📋 En instruction
- 📎 Complément demandé
- ✅ Accepté
- ❌ Refusé

---

## 👨‍💻 Auteur

**Yassine Belbeli**  
📧 belbeliyassine2004@gmail.com  
🔗 [GitHub](https://github.com/votre-username)

---

© 2026 AidesPubliques — Tous droits réservés
