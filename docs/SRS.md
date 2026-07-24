# Software Requirements Specification (SRS)
## Red Apple — Fertility & Women's Health Platform

## 1. System Overview
Red Apple is a mobile-first fertility, health education, pregnancy tracking, and telemedicine platform.

- **Mobile App**: Cycle & fertility tracking, symptom logging, health insights, pregnancy mode, virtual consultations.
- **Admin Dashboard**: Content administration, clinic partner onboarding, and campaign analytics.
- **Backend Platform**: Services for cycle predictions, authentication, push notifications, and telemedicine booking.

---

## 2. Functional Requirements

### 2.1 User Accounts & Health Profiles
- **FR-1.1**: Account registration via email or phone number.
- **FR-1.2**: Secure session authentication via encrypted tokens.
- **FR-1.3**: Health profile configuration (cycle length, average period duration, reproductive goal).
- **FR-1.4**: Password reset and OTP verification.

### 2.2 Cycle & Fertility Tracking
- **FR-2.1**: Log cycle start/end dates, flow intensity, symptoms, and basal body temperature (BBT).
- **FR-2.2**: Automated prediction of next period start date.
- **FR-2.3**: Fertile window and estimated ovulation date calculation.
- **FR-2.4**: Offline symptom logging with background cloud sync.

### 2.3 Educational Library
- **FR-3.1**: Categorized health library (Fertility, Nutrition, Cycle Science, Mental Health).
- **FR-3.2**: Admin creation, publishing, and archiving of medical articles.
- **FR-3.3**: Medical review attribution for published content.

### 2.4 Pregnancy Tracking
- **FR-4.1**: Pregnancy Mode toggle with Last Menstrual Period (LMP) or conception date input.
- **FR-4.2**: Gestational week and estimated due date calculation.
- **FR-4.3**: Automated reminders for antenatal checkups.

### 2.5 Telemedicine Booking
- **FR-5.1**: Doctor specialist search by location, rating, and specialty.
- **FR-5.2**: Doctor availability slot viewing and virtual session booking.
- **FR-5.3**: Appointment confirmation notifications and encrypted video session generation.

### 2.6 Notifications & Reminders
- **FR-6.1**: Push notifications for period alerts, ovulation warnings, and appointments.
- **FR-6.2**: User-configurable notification privacy settings and discreet alert titles.

---

## 3. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| **NFR-1** | Security | End-to-end encryption for all health data at rest (AES-256) and in transit (TLS 1.3). |
| **NFR-2** | Privacy | Zero-knowledge local encryption option; no user data shared without explicit opt-in. |
| **NFR-3** | Compliance | Compliance with Nigeria Data Protection Act (NDPA 2023). |
| **NFR-4** | Performance | Core screens load under 2 seconds on 3G network connections. |
| **NFR-5** | Availability | 99.5% service uptime target for telemedicine booking APIs. |
| **NFR-6** | Offline Support | Complete offline symptom logging with local SQLite/AsyncStorage persistence. |
