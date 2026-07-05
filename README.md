# L'Atelier Lumineux

> *« L'intelligence que vous tenez dans votre main. »*

**L'Atelier Lumineux** est une console d'orchestration IA 100% locale. Vos conversations, prompts et modèles ne quittent jamais votre machine. L'application expose un moteur de chat en streaming (SSE) branché sur LM Studio ou llama.cpp via le protocole OpenAI-compatible, avec persistance SQLite, gestion multi-modèles, onboarding guidé et tableau de bord d'observabilité en temps réel.

---

## Prérequis

| Composant | Version requise |
|-----------|----------------|
| Python | ≥ 3.12 |
| Node.js | ≥ 20 LTS |
| LM Studio | Dernière version, actif sur le port 1234 |
| **OU** Ollama / llama.cpp | Port configuré dans `.env` |

---

## Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/iamydgel/ATELIER.git
cd ATELIER

# 2. Installer les dépendances Python (via uv)
uv sync

# 3. Installer les dépendances frontend
cd web && npm install && cd ..

# 4. Configurer l'environnement
cp .env.example .env
# → Éditez .env : remplacez LOCALAI_SECRET_KEY par une clé de 32+ caractères
```

---

## Lancer en développement

```bash
python run_dev.py
```

Puis ouvrez **http://localhost:5173** dans votre navigateur.

Le backend FastAPI démarre automatiquement sur **http://127.0.0.1:8080**.

---

## Architecture

```
ATELIER/
├── app/           # Backend FastAPI (Python)
│   ├── api/v1/    # Routers : auth, chat, models, settings
│   ├── core/      # Config, Auth, DB (SQLModel + SQLite WAL)
│   └── inference/ # Driver OpenAI-compatible (LM Studio / llama.cpp)
├── web/           # Frontend Vite + React 19 + Tailwind v4
│   └── src/
│       ├── pages/ # Chat, Models, Onboarding, Settings, Observability
│       └── components/
└── tests/         # Tests smoke (pytest)
```

→ Architecture détaillée : [SPEC-TECHNIQUE](./SPEC-TECHNIQUE-Plateforme-IA-Locaux.md)

---

## Statut

**Phase 1 — MVP Solo conversationnel** *(v0.1.0, en cours de finalisation)*

- ✅ Authentification par session cookie
- ✅ Chat en streaming SSE avec annulation propre
- ✅ Catalogue de modèles + installation simulée
- ✅ Onboarding guidé 3 étapes
- ✅ Page d'observabilité en temps réel
- ✅ Sauvegarde des messages partiels (abort stream)

---

## Documentation

| Document | Description |
|---------|-------------|
| [PRD](./PRD-Plateforme-IA-Locaux.md) | Cahier des charges produit |
| [SPEC](./SPEC-TECHNIQUE-Plateforme-IA-Locaux.md) | Architecture technique détaillée |
| [DA](./DIRECTION-ARTISTIQUE-Plateforme-IA-Locaux.md) | Direction artistique & design system |
| [MERISE](./MERISE-Plateforme-IA-Locaux.md) | Modèle de données |
