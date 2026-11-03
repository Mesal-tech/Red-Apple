# Red Apple — Fertility & Women's Health Platform

Red Apple is a mobile-first fertility tracking, reproductive health education, pregnancy tracking, and telemedicine platform built for the Nigerian market with pan-African ambitions.

---

## 1. Repository Architecture

The project is structured as a **unified single-repository** workspace containing all packages:

```
red_apple/
├── mobile/       # React Native (Expo SDK 57) mobile application
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

## 3. Mobile Onboarding and Authentication

The mobile app opens with a three-slide introduction to cycle tracking, care across life stages, and personalized guidance. The final slide offers separate **Sign Up** and **Sign In** actions. New users continue through a guided health setup that collects the information needed to personalize their experience.

Sign-in and registration use the same Red Apple visual system: rounded form fields, clear primary actions, and Google and Apple sign-in options. These screens follow the app's saved light or dark theme. Dark mode uses deep neutral surfaces, readable field borders, crimson primary actions, and matching progress indicators.

Onboarding screen implementations live in `mobile/src/screens/OnboardingScreen.js` and `mobile/src/screens/OnboardingSetupScreen.js`; authentication screens live in `mobile/src/screens/LoginScreen.js` and `mobile/src/screens/SignUpScreen.js`. Shared theme colors and persistence are defined in `mobile/src/context/ThemeContext.js`.

## 4. System Documentation

Full specifications, architectural designs, and configuration guides are available in the [docs/](docs/) folder:

- [docs/SRS.md](docs/SRS.md): **Software Requirements Specification** (System scope, functional specs, priorities)
- [docs/SDD.md](docs/SDD.md): **Software Design Document** (System architecture, Express specs, PostgreSQL DDL schema)
- [docs/SCD.md](docs/SCD.md): **Software Configuration Document** (Repository layout, CI/CD, deployment rules)
- [docs/UML.md](docs/UML.md): **UML Diagrams** (Use case, class, sequence, activity, state, and ER diagrams)
- [docs/KB.md](docs/KB.md): **Internal Knowledge Base** (Glossary, coding standards, onboarding checklist, FAQs)
