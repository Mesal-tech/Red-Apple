# Internal Knowledge Base (KB)
## Red Apple — Fertility & Women's Health Platform

---

## 1. Glossary

| Term | Meaning in Red Apple Context |
|---|---|
| **Cycle Log** | A single user-entered record of a menstrual period (dates, flow, symptoms). |
| **Fertile Window** | System-predicted days of highest conception likelihood in a cycle. |
| **Pregnancy Mode** | Application state unlocking gestational tracking and antenatal visit reminders. |
| **Antenatal Reminder** | Scheduled notification prompting a pregnancy-related medical appointment. |
| **Clinic Partner** | A gynecological clinic with formal partnership enabling in-app virtual booking. |
| **Booking** | A scheduled virtual consultation between a user and a doctor at a partner clinic. |
| **Campaign** | A time-boxed educational outreach initiative or partner program. |

---

## 2. Document Architecture Map

| Document | Purpose & Scope |
|---|---|
| [docs/SRS.md](file:///c:/Users/HP/Documents/red_apple/docs/SRS.md) | **Functional Requirements**: System scope, feature specifications, priorities. |
| [docs/SDD.md](file:///c:/Users/HP/Documents/red_apple/docs/SDD.md) | **System Design**: Architecture, component specs, PostgreSQL schema DDL. |
| [docs/SCD.md](file:///c:/Users/HP/Documents/red_apple/docs/SCD.md) | **Configuration & CI/CD**: Repository layout, environment policies, deployment rules. |
| [docs/UML.md](file:///c:/Users/HP/Documents/red_apple/docs/UML.md) | **Behavior Diagrams**: Use case, class, sequence, activity, and ER diagrams. |
| [docs/KB.md](file:///c:/Users/HP/Documents/red_apple/docs/KB.md) | **Team Reference**: Glossary, coding standards, onboarding guide, and FAQs. |

---

## 3. Coding & Engineering Standards

- **Language**: TypeScript across frontend (`mobile/`, `admin-web/`) and backend (`backend/`).
- **Self-Contained Modules**: Each package contains its own local domain models, color tokens, and utility functions.
- **Naming Conventions**:
  - Files: `kebab-case.ts`
  - Classes & Types: `PascalCase`
  - Variables & Functions: `camelCase`
  - DB Tables & Columns: `snake_case`
- **Commit Messages**: Conventional Commits format (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- **Quality Assurance**: Unit tests for shared utilities and cycle prediction logic prior to merging.

---

## 4. Onboarding Checklist for Developers

1. Read [docs/KB.md](file:///c:/Users/HP/Documents/red_apple/docs/KB.md), [docs/SRS.md](file:///c:/Users/HP/Documents/red_apple/docs/SRS.md), and [docs/SDD.md](file:///c:/Users/HP/Documents/red_apple/docs/SDD.md).
2. Open target repository root (`mobile/`, `admin-web/`, `backend/`, `infra/`, or `docs/`).
3. Set up `.env` from `.env.example` templates.
4. Run `npm install` within the target package root.
5. Execute `npx tsc --noEmit` to verify type safety.

---

## 5. Frequently Asked Questions (FAQ)

**Q: Where is the database schema defined?**  
A: [docs/SDD.md](file:///c:/Users/HP/Documents/red_apple/docs/SDD.md) Section 3 contains the complete PostgreSQL DDL schema.

**Q: How does offline cycle logging work?**  
A: The mobile client generates a `client_uuid` and stores log entries locally, automatically synchronizing via background cloud sync when online.

**Q: What is the policy on health data privacy?**  
A: Per SRS NFR-2, real user health data (cycle logs, symptoms, pregnancy logs) is strictly protected with zero-knowledge local encryption options and is never shared with third parties without explicit user consent.

**Q: Where are cycle prediction algorithms located?**  
A: Pure calculation functions are located in `mobile/src/utils/cycleCalculators.ts` and `backend/src/utils/cycleCalculators.ts`.

---

## 6. Open Architecture Decisions

| Decision Item | Status | Target |
|---|---|---|
| Video SDK Vendor Selection (Twilio vs Agora) | Pending Phase 2 | Technical Lead |
| Payment Gateway Provider | Pending Phase 2 | Product Lead |
| NDPA Legal Compliance Review | Active | Legal Counsel |
