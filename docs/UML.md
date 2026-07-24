# UML Diagrams & Behavior Specifications
## Red Apple — Fertility & Women's Health Platform

---

## 1. Use Case Diagram

```mermaid
graph TB
    User((User))
    Admin((Admin))
    Doctor((Partner Clinic Staff))

    subgraph Red Apple System
        UC1[Register / Login]
        UC2[Log Cycle Data]
        UC3[View Fertility Predictions]
        UC4[Browse Education Content]
        UC5[Track Pregnancy]
        UC6[Receive Reminders]
        UC7[Book Consultation]
        UC8[Manage Clinic Listings]
        UC9[Publish Education Content]
        UC10[Manage Campaigns]
        UC11[View Health Results]
    end

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC11

    Admin --> UC8
    Admin --> UC9
    Admin --> UC10

    Doctor --> UC8
    UC7 -.-> Doctor
```

---

## 2. Class Diagram

```mermaid
classDiagram
    class User {
        +String userId
        +String name
        +String email
        +Date dateOfBirth
        +Boolean pregnancyMode
        +register()
        +login()
        +updateProfile()
    }

    class CycleLog {
        +String logId
        +String userId
        +Date startDate
        +Date endDate
        +String flowIntensity
        +List~String~ symptoms
        +addEntry()
        +editEntry()
    }

    class FertilityPredictor {
        +predictNextPeriod(userId) Date
        +predictFertileWindow(userId) DateRange
        +predictOvulation(userId) Date
    }

    class PregnancyTracker {
        +String trackerId
        +String userId
        +Date conceptionDate
        +Int currentWeek
        +getMilestone() String
        +scheduleAntenatalReminder()
    }

    class EducationArticle {
        +String articleId
        +String title
        +String category
        +String content
        +Date lastUpdated
        +publish()
        +update()
    }

    class Clinic {
        +String clinicId
        +String name
        +String location
        +List~Doctor~ doctors
        +getAvailability()
    }

    class Doctor {
        +String doctorId
        +String name
        +String specialty
        +List~TimeSlot~ availability
    }

    class Booking {
        +String bookingId
        +String userId
        +String clinicId
        +String doctorId
        +DateTime scheduledTime
        +String status
        +confirm()
        +cancel()
        +reschedule()
    }

    class Reminder {
        +String reminderId
        +String userId
        +String type
        +DateTime triggerTime
        +send()
    }

    User "1" --> "many" CycleLog
    User "1" --> "0..1" PregnancyTracker
    User "1" --> "many" Booking
    User "1" --> "many" Reminder
    CycleLog --> FertilityPredictor : feeds data to
    Clinic "1" --> "many" Doctor
    Booking --> Clinic
    Booking --> Doctor
```

---

## 3. Sequence Diagrams

### 3.1 Cycle Logging & Fertility Prediction

```mermaid
sequenceDiagram
    actor U as User
    participant App as Mobile App
    participant API as Backend API
    participant DB as Database
    participant Pred as Prediction Engine

    U->>App: Enter cycle data (dates, symptoms)
    App->>API: POST /cycles {userId, data}
    API->>DB: Save CycleLog
    DB-->>API: Success
    API->>Pred: Request updated prediction(userId)
    Pred->>DB: Fetch historical cycle logs
    DB-->>Pred: Cycle history
    Pred-->>API: Predicted fertile window & next period
    API-->>App: 200 OK {prediction}
    App-->>U: Display fertility calendar
```

### 3.2 Telemedicine Consultation Booking

```mermaid
sequenceDiagram
    actor U as User
    participant App as Mobile App
    participant API as Backend API
    participant DB as Database
    participant Clinic as Partner Clinic System

    U->>App: Search specialists near me
    App->>API: GET /clinics?location=X
    API->>DB: Query clinics & doctor availability
    DB-->>API: List of clinics/doctors
    API-->>App: Available slots
    U->>App: Select doctor + time slot
    App->>API: POST /bookings {userId, doctorId, time}
    API->>DB: Create Booking (status: requested)
    API->>Clinic: Notify clinic of booking request
    Clinic-->>API: Confirm/Reject
    API->>DB: Update Booking status
    API-->>App: Booking confirmation
    App-->>U: Show confirmed appointment + set reminder
```

### 3.3 Session Authentication

```mermaid
sequenceDiagram
    actor U as User
    participant App as Mobile App
    participant API as Auth Module
    participant DB as Database

    U->>App: Enter email + password
    App->>API: POST /auth/login
    API->>DB: Verify credentials
    DB-->>API: User record
    API-->>App: accessToken + refreshToken
    App-->>U: Logged in
    Note over App,API: Token refresh upon expiry
    App->>API: POST /auth/refresh {refreshToken}
    API-->>App: New accessToken
```

---

## 4. Behavior & State Diagrams

### 4.1 Activity Diagram — Pregnancy Mode Onboarding

```mermaid
flowchart TD
    Start([User enables Pregnancy Mode]) --> A[Enter conception/LMP date]
    A --> B[System calculates current week & due date]
    B --> C[Generate pregnancy milestone timeline]
    C --> D[Schedule antenatal visit reminders]
    D --> E[Schedule doctor check-in reminders]
    E --> F{Risk factors entered?}
    F -- Yes --> G[Prompt to book consultation]
    F -- No --> H[Show weekly pregnancy content]
    G --> H
    H --> End([Continue tracking through pregnancy])
```

### 4.2 State Diagram — Booking Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Requested
    Requested --> Confirmed: Clinic accepts
    Requested --> Rejected: Clinic declines
    Confirmed --> Completed: Appointment occurs
    Confirmed --> Cancelled: User/Clinic cancels
    Confirmed --> Rescheduled: User reschedules
    Rescheduled --> Confirmed
    Rejected --> [*]
    Completed --> [*]
    Cancelled --> [*]
```

---

## 5. Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ CYCLE_LOG : logs
    USER ||--o| PREGNANCY_TRACKER : has
    USER ||--o{ BOOKING : makes
    USER ||--o{ REMINDER : receives
    CLINIC ||--o{ DOCTOR : employs
    CLINIC ||--o{ BOOKING : receives
    DOCTOR ||--o{ BOOKING : fulfills
    EDUCATION_ARTICLE }o--|| CATEGORY : belongs_to

    USER {
        string userId PK
        string name
        string email
        date dateOfBirth
        boolean pregnancyMode
    }
    CYCLE_LOG {
        string logId PK
        string userId FK
        date startDate
        date endDate
        string flowIntensity
    }
    PREGNANCY_TRACKER {
        string trackerId PK
        string userId FK
        date conceptionDate
        int currentWeek
    }
    CLINIC {
        string clinicId PK
        string name
        string location
    }
    DOCTOR {
        string doctorId PK
        string clinicId FK
        string name
        string specialty
    }
    BOOKING {
        string bookingId PK
        string userId FK
        string clinicId FK
        string doctorId FK
        datetime scheduledTime
        string status
    }
    EDUCATION_ARTICLE {
        string articleId PK
        string title
        string categoryId FK
        date lastUpdated
    }
    CATEGORY {
        string categoryId PK
        string name
    }
    REMINDER {
        string reminderId PK
        string userId FK
        string type
        datetime triggerTime
        boolean sent
    }
```
