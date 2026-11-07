# Red Apple

Red Apple is a women's health platform for cycle and fertility tracking, pregnancy support, menopause care, health education, and telemedicine. This repository contains the mobile client, API, public landing site, admin dashboard, and infrastructure configuration.

## Contents

- [Repository structure](#repository-structure)
- [Technology](#technology)
- [Prerequisites](#prerequisites)
- [Local development setup](#local-development-setup)
- [Environment configuration](#environment-configuration)
- [Common commands](#common-commands)
- [API overview](#api-overview)
- [Testing and CI](#testing-and-ci)
- [Data and security](#data-and-security)
- [Project documentation](#project-documentation)

## Repository structure

| Directory | Purpose | Main technologies |
| --- | --- | --- |
| `mobile/` | iOS, Android, and web client for users | React Native, Expo SDK 57, NativeWind |
| `backend/` | REST API and real-time voice proxy | Node.js, Express, TypeScript, Prisma, PostgreSQL |
| `landing/` | Public marketing and information website | React, TypeScript, Vite, Tailwind CSS |
| `admin-web/` | Internal operations dashboard | React, TypeScript, Vite, Tailwind CSS |
| `infra/` | Terraform infrastructure configuration | Terraform, AWS provider |
| `docs/` | Product, system design, configuration, and UML documentation | Markdown |
| `.github/workflows/` | Package-specific CI/CD workflows | GitHub Actions |

Each app has its own `package.json` and lockfile. Install dependencies from the package directory you are working in; the repository root is not an npm workspace.

### Key source locations

- Mobile navigation: `mobile/src/navigation/`
- Mobile screens and components: `mobile/src/screens/`, `mobile/src/components/`
- Mobile API and authentication services: `mobile/src/services/`
- Backend routes, controllers, and middleware: `backend/src/routes/`, `backend/src/controllers/`, `backend/src/middleware/`
- Prisma schema and CLI configuration: `backend/prisma/schema.prisma`, `backend/prisma.config.ts`
- Landing pages and sections: `landing/src/pages/`, `landing/src/components/`
- Admin dashboard: `admin-web/src/`

## Technology

- Node.js 20.19+ or 22.12+ and npm (Node 22 LTS is recommended; CI currently uses Node 20)
- PostgreSQL for backend data
- Expo SDK 57 / React Native 0.86 for the mobile client
- React 19 and Vite for the landing and admin web apps
- Prisma 7 for backend database access and schema management

For local native mobile builds, install Android Studio and a supported JDK. Building or running the iOS app locally requires macOS and Xcode. Expo Go can be used for supported development flows; features that require custom native modules need a development build.

## Prerequisites

1. Install Node.js and npm. Use the same major Node version as the CI workflows where practical.
2. Clone the repository and open a terminal at its root.
3. Create or obtain a PostgreSQL database for local development.
4. Configure the package environment files described below. Third-party integration credentials are optional unless you are working on those integrations.

Do not use production credentials or real user health data in a local development environment.

## Local development setup

### 1. Start the backend

In a terminal at the repository root:

```bash
cd backend
npm ci
```

Copy `backend/.env.example` to `backend/.env`, then set `DATABASE_URL` to the PostgreSQL connection string for your development database. If your provider gives separate pooled and direct connection strings, use the pooled URL for `DATABASE_URL` and the direct URL for `DIRECT_URL` (used by Prisma CLI commands).

For a new, empty development database, create and apply the initial Prisma migration:

```bash
npx prisma migrate dev --name init
```

Then start the API:

```bash
npm run dev
```

The API listens on port `5001` by default. Check that it is responding at [http://localhost:5001/health](http://localhost:5001/health).

### 2. Start the mobile app

In a second terminal:

```bash
cd mobile
npm ci
npx expo start
```

Press `a` to open an Android emulator, `i` for an iOS simulator (macOS only), or scan the QR code with a compatible development client. To run the mobile web target, use `npm run web`.

During Expo development, the API client derives the backend host from the Metro connection when available and otherwise uses platform defaults. In builds without Metro host information, set `EXPO_PUBLIC_API_URL` in `mobile/.env` to the API base URL:

| Client | Example URL |
| --- | --- |
| Android emulator | `http://10.0.2.2:5001/api` |
| iOS simulator | `http://localhost:5001/api` |
| Physical device | `http://<computer-lan-ip>:5001/api` |

For a physical device, the phone and computer must be on the same network, and the computer firewall must allow the API port.

### 3. Start the public landing site

The landing page is a separate Vite app. In another terminal:

```bash
cd landing
npm ci
npm run dev
```

Vite prints the local URL, usually [http://localhost:5173](http://localhost:5173). The site contains the marketing homepage, About, Newsroom, article, Terms of Use, and Privacy Policy pages.

### 4. Start the admin dashboard

In another terminal:

```bash
cd admin-web
npm ci
npm run dev
```

Vite prints the dashboard URL. The development server proxies `/api` requests to `http://localhost:5001`; start the backend first for API-backed features. If the landing site is already using port 5173, Vite will choose another available port or you can pass one explicitly, for example `npm run dev -- --port 5174`.

## Environment configuration

Keep local credentials in ignored `.env` files. Never commit real keys, passwords, signing files, or production connection strings. The example files are templates and should contain placeholders only.

### Backend (`backend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection used by the API |
| `DIRECT_URL` | For Prisma CLI when using a pooler | Direct PostgreSQL connection for migrations; falls back to `DATABASE_URL` |
| `PORT` | No | API port; defaults to `5001` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Yes for deployed environments | Signing keys; replace all example values with unique, strong secrets |
| `GEMINI_API_KEY` | For AI features | Gemini API access for the health assistant |
| `STREAM_API_KEY`, `STREAM_API_SECRET` | For telemedicine | Stream video credentials |
| `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY` | For payments | Paystack credentials |
| `GOOGLE_CLIENT_ID`, `APPLE_CLIENT_ID` | For corresponding OAuth flows | Provider client identifiers |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | For Azure speech output | Optional speech synthesis configuration |
| `RESEND_API_KEY` | For backend email delivery | Optional email provider key |

The Prisma runtime reads `DATABASE_URL`; `backend/prisma.config.ts` reads `DIRECT_URL` first and falls back to `DATABASE_URL` for CLI operations.

When you change `backend/prisma/schema.prisma`, create and commit a migration from a development database with `npx prisma migrate dev --name <short-description>`. Production deployments should apply committed migrations with `npx prisma migrate deploy`; do not use `db push` against shared or production databases.

### Mobile (`mobile/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Usually optional | API base URL used when Expo host information is unavailable; include the `/api` suffix |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | For Google auth | Google OAuth web client ID used by the current mobile auth flow |

Values prefixed with `EXPO_PUBLIC_` are bundled into the client and must not contain private secrets.

### Admin dashboard

The admin Vite config proxies `/api` to the local backend. Resend credentials can be entered in the dashboard's email settings for local/internal use. The dashboard keeps that key in browser storage and sends it from the browser, so do not treat a Vite environment variable or a browser-stored key as a protected production secret.

## Common commands

Run commands from the relevant package directory.

| Package | Command | Description |
| --- | --- | --- |
| Backend | `npm run dev` | Start API with nodemon and ts-node |
| Backend | `npm run build` | Generate Prisma client and compile TypeScript to `dist/` |
| Backend | `npm test` | Run auth, telemedicine, payment, and notification tests |
| Backend | `npm run test:ai` | Run AI agent tests |
| Backend | `npm run test:p0_p1` | Run P0/P1 integration tests |
| Mobile | `npx expo start` | Start Expo development server |
| Mobile | `npm run android` / `npm run ios` | Build and run the native app locally |
| Mobile | `npm run web` | Run the mobile web target |
| Mobile | `npm run build:web` | Export the web target |
| Mobile | `npm run build:apk` | Build an Android release APK |
| Mobile | `npm run build:apk:arm64` | Build an ARM64 Android release APK |
| Mobile | `npm run build:bundle` | Build an Android App Bundle |
| Mobile | `npm run build:ios:preview` / `npm run build:ios:prod` | Create iOS preview or production build with EAS |
| Landing | `npm run dev` | Start the Vite development server |
| Landing | `npm run build` | Type-check and build the production site |
| Landing | `npm run lint` | Run ESLint |
| Landing | `npm run preview` | Preview the production build locally |
| Admin | `npm run dev` | Start the dashboard development server |
| Admin | `npm run build` | Type-check and build the dashboard |
| Admin | `npm run lint` | Run ESLint |
| Admin | `npm run preview` | Preview the production build locally |

The mobile package currently does not define an npm `test` or `lint` script. Check its package scripts before relying on a command not listed above.

## API overview

The API is served from `http://localhost:5001` by default. The health check is `GET /health`. Main route groups are mounted under `/api`:

| Route prefix | Area |
| --- | --- |
| `/api/auth` | Registration, login, OAuth, profiles, and account access |
| `/api/cycles` | Cycle logs and tracking |
| `/api/pregnancy` | Pregnancy tracking |
| `/api/education` | Health education content |
| `/api/telemedicine` | Doctors, clinics, and consultation bookings |
| `/api/notifications` | Notification and reminder operations |
| `/api/payments` | Payment workflows |
| `/api/ai` | Health assistant and real-time voice endpoints |
| `/api/partner` | Partner and clinic integrations |
| `/api/campaigns`, `/api/emails` | Campaign and email operations |

See the route files under `backend/src/routes/` for the available endpoints, request validation, and authentication requirements.

## Testing and CI

Package-specific GitHub Actions workflows are in `.github/workflows/`. The backend workflow type-checks the API and has a Docker/ECR deployment job. The mobile workflow type-checks the client and supports EAS builds. The admin workflow builds the dashboard. Run the package checks locally before opening a pull request.

The backend test scripts may require a reachable development database and configured third-party services. Use test accounts and synthetic data only.

## Data and security

- Never commit `.env` files, API secrets, database credentials, OAuth private keys, Android keystores, or provisioning files.
- Generate unique JWT secrets for each environment; do not use the values in an example file in staging or production.
- Avoid real health information in local, test, and staging environments.
- Keep `EXPO_PUBLIC_` variables limited to values that are safe to ship in a client application.
- Review the applicable privacy and data handling requirements before adding analytics, external APIs, or new health-data flows.

## Project documentation

- [Software Requirements Specification](docs/SRS.md)
- [Software Design Document](docs/SDD.md)
- [Software Configuration Document](docs/SCD.md)
- [UML diagrams](docs/UML.md)
- [Internal Knowledge Base](docs/KB.md)

## Contributing

1. Create a focused branch for your change.
2. Install dependencies and run the relevant package checks.
3. Keep changes scoped to the package or system area being updated.
4. Do not include generated builds, local caches, credentials, or personal data in commits.
5. Update the relevant documentation when configuration, APIs, or developer workflows change.
