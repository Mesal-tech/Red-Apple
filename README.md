# Red Apple — Fertility & Women's Health Platform

Red Apple is a mobile-first fertility tracking, reproductive health education, pregnancy tracking, and telemedicine platform built for the Nigerian market with pan-African ambitions.

---

## 1. Repository Architecture

The project is structured as a **unified single-repository** workspace containing all packages:

```
red_apple/
├── mobile/       # React Native (Expo SDK 54) mobile application
├── admin-web/    # React web admin dashboard
├── backend/      # Express.js API backend service (routes/, controllers/, middleware/)
├── infra/        # Infrastructure as Code (Terraform)
└── docs/         # Complete system documentation
```

---

## 2. Quick Start Guide

### Mobile Application (`mobile/`)
```bash
cd mobile
npm install
npx expo start --tunnel
```

### Backend API Service (`backend/`)
```bash
cd backend
npm install
npm run dev
```

### Admin Web Dashboard (`admin-web/`)
```bash
cd admin-web
npm install
npm run dev
```

---

## 3. System Documentation

Full specifications, architectural designs, and configuration guides are available in the [docs/](docs/) folder:

- [docs/SRS.md](docs/SRS.md): **Software Requirements Specification** (System scope, functional specs, priorities)
- [docs/SDD.md](docs/SDD.md): **Software Design Document** (System architecture, Express specs, PostgreSQL DDL schema)
- [docs/SCD.md](docs/SCD.md): **Software Configuration Document** (Repository layout, CI/CD, deployment rules)
- [docs/UML.md](docs/UML.md): **UML Diagrams** (Use case, class, sequence, activity, state, and ER diagrams)
- [docs/KB.md](docs/KB.md): **Internal Knowledge Base** (Glossary, coding standards, onboarding checklist, FAQs)
