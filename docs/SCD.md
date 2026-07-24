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

### 3.1 Repository Layout
Red Apple uses a **split-repo (polyrepo)** structure. Top-level repositories:
- `mobile/`: iOS & Android React Native app
- `admin-web/`: Web admin dashboard
- `backend/`: Express.js API backend service
- `infra/`: Terraform Infrastructure as Code
- `docs/`: System documentation

```
red_apple/
├── mobile/       # iOS & Android React Native app
├── admin-web/    # Web admin dashboard
├── backend/      # Express.js API service
├── infra/        # Terraform infrastructure
└── docs/         # System documentation
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
| **CI/CD Orchestration** | GitHub Actions |
| **Static Analysis & Linting** | ESLint, Prettier, TypeScript |
| **Testing** | Jest |
| **Infrastructure as Code** | Terraform |
| **Container Runtime** | Docker + AWS ECS/Fargate |
| **Mobile Distribution** | Fastlane + App Store Connect / Google Play Console |
