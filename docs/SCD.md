# Software Configuration Document (SCD)
## Red Apple — Fertility & Women's Health Platform

---

## 1. Purpose
This document defines configuration management standards, repository structure, environment specifications, CI/CD pipeline, and release procedures for the Red Apple platform.

---

## 2. Environments & Data Privacy
Target environments are Local, Development, Staging, and Production. Real user health data must never be used in non-production environments.

---

## 3. Source Code Control & Layout

### 3.1 Repository Layout & Structure
Red Apple uses a **unified single-repository (monorepo)** structure. All project packages reside within a single Git repository:

```
red_apple/
├── .github/
│   └── workflows/
│       ├── backend-ci.yml     # Express.js API build, test, & Docker ECR push
│       ├── mobile-ci.yml      # React Native type checks & EAS build triggers
│       └── admin-web-ci.yml   # Admin dashboard build & bundle checks
├── mobile/                    # iOS & Android React Native app (Expo SDK 54)
│   ├── App.js                 # Clean root entry point
│   ├── assets/                # App icons, splash screens, & character art
│   └── src/
│       ├── navigation/        # AppNavigator router & persistent state manager
│       ├── screens/           # Modular screen components (Privacy, Onboarding, Login, Docs)
│       ├── theme/             # Centralized design tokens (colors.js)
│       └── utils/             # Resilient AsyncStorage storage helpers
├── admin-web/                 # Web admin dashboard (React + Vite)
├── backend/                   # Express.js API backend service
│   └── src/
│       ├── controllers/       # Route request controllers
│       ├── routes/            # Express router definitions
│       ├── middleware/        # Authentication & error middleware
│       ├── server.ts          # Express app configuration & middleware bootstrap
│       └── index.ts           # Server process listener
├── infra/                     # Terraform Infrastructure as Code
└── docs/                      # Complete system documentation (SRS, SDD, SCD, UML, KB)
```

### 3.2 Branching & Versioning
- **Main Branch (`main`)**: Always production-ready; tagged releases only.
- **Development Branch (`develop`)**: Integration branch for completed features.
- **Feature Branches (`feature/*`)**: Work branches created off `develop`.
- **Release Branches (`release/*`)**: Pre-release stabilization.
- **Versioning Scheme**: Semantic Versioning (`MAJOR.MINOR.PATCH`).

---

## 4. CI/CD Pipeline & Tooling

| Stage | Tool |
|---|---|
| **CI/CD Orchestration** | GitHub Actions (`.github/workflows/`) |
| **Static Analysis & Linting** | ESLint, Prettier, TypeScript |
| **Testing** | Jest |
| **Infrastructure as Code** | Terraform |
| **Container Runtime** | Docker + AWS ECS/Fargate |
| **Mobile Distribution** | Expo Application Services (EAS) + Fastlane |
