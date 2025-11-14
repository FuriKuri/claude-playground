# Architecture Rules - API Design & Quality Standards

Version 1.0 | Last Updated: 2025-11-14

## Über dieses Dokument

Diese Regeln definieren verbindliche Standards für die Entwicklung von Services in unserer Organisation. Sie basieren auf dem ISO/IEC 25010 Qualitätsmodell und sind inspiriert von bewährten Praktiken aus der HSA Makroarchitektur.

### Kategorien

- **MUSS**: Verbindliche Regel, Verstöße führen zu PR-Ablehnung
- **SOLLTE**: Empfohlene Regel, Verstöße erfordern Begründung

### Struktur jeder Regel

Jede Regel enthält:
- **Regel-ID und Name**: Zur Referenzierung
- **Schwere**: MUSS oder SOLLTE
- **Beschreibung**: Was die Regel fordert
- **ISO-Qualitätsmerkmale**: Welche Qualität wird adressiert
- **Verifikation**: Wie wird geprüft
- **Beispiele**: Gute und schlechte Implementierungen

---

## Regel 1: GraphQL Schema Design

**Schwere**: MUSS  
**ISO-Merkmale**: Usability/Learnability, Maintainability/Analyzability

### Regel

GraphQL Schemas MÜSSEN aussagekräftige Typen verwenden und folgen der Namenskonvention:
- **Types**: PascalCase (z.B. `User`, `OrderItem`, `PaymentMethod`)
- **Fields**: camelCase (z.B. `firstName`, `orderDate`, `isActive`)
- **Enums**: SCREAMING_SNAKE_CASE (z.B. `ORDER_STATUS`, `PAYMENT_TYPE`)

### Begründung

Konsistente Namenskonventionen:
- Erhöhen die Lesbarkeit und Verständlichkeit der API
- Entsprechen JavaScript/TypeScript Best Practices
- Erleichtern Code-Generierung für Clients
- Reduzieren Missverständnisse im Team

### Verifikation

- Prüfung der `.graphql` Schema-Dateien
- GraphQL Schema Linting Tools
- Code Review

### Beispiele
````graphql
# ✅ KORREKT
type User {
  userId: ID!
  firstName: String!
  lastName: String!
  emailAddress: String!
  createdAt: DateTime!
  isActive: Boolean!
  role: UserRole!
}

enum UserRole {
  ADMIN
  USER
  GUEST
}

type Query {
  user(userId: ID!): User
  users(filter: UserFilter): [User!]!
}

# ❌ FALSCH - Verschiedene Verstöße
type user {                    # ❌ lowercase Type
  UserID: ID!                  # ❌ PascalCase Field
  first_name: String!          # ❌ snake_case Field
  email_address: String!       # ❌ snake_case Field
  created_at: String!          # ❌ snake_case Field + String statt DateTime
}

enum UserRole {
  Admin                        # ❌ PascalCase Enum-Wert
  normal_user                  # ❌ lowercase mit underscore
}
````

---

## Regel 2: Fehlerbehandlung in GraphQL

**Schwere**: MUSS  
**ISO-Merkmale**: Usability/Learnability, Reliability/Maturity

### Regel

GraphQL APIs MÜSSEN strukturierte Fehler verwenden:

1. **Technische Fehler** nutzen GraphQLError mit `extensions` für maschinenlesbare Details
2. **Business-Fehler** werden als Teil des Response-Schemas modelliert (Union Types)
3. Fehler MÜSSEN eindeutige Error-Codes enthalten
4. Fehler MÜSSEN hilfreiche Beschreibungen für Entwickler enthalten

### Begründung

- Ermöglicht programmatische Fehlerbehandlung auf Client-Seite
- Unterscheidet zwischen technischen und Business-Fehlern
- Verbessert Debugging und Monitoring
- Erhöht Entwicklerfreundlichkeit der API

### Verifikation

- Schema-Review auf Union Types für Business-Operationen
- Code-Review der Resolver auf strukturierte Fehler
- Tests für verschiedene Fehlerszenarien

### Beispiele
````typescript
// ✅ KORREKT - GraphQL Schema
type Mutation {
  createUser(input: CreateUserInput!): CreateUserResult!
}

union CreateUserResult = CreateUserSuccess | ValidationError | DuplicateEmailError

type CreateUserSuccess {
  user: User!
}

type ValidationError {
  message: String!
  code: String!
  fields: [FieldError!]!
}

type FieldError {
  field: String!
  message: String!
}

type DuplicateEmailError {
  message: String!
  code: String!
  existingUserId: ID!
}

// ✅ KORREKT - Resolver Implementation
const resolvers = {
  Mutation: {
    createUser: async (_: any, { input }: { input: CreateUserInput }) => {
      // Validierung
      const validationErrors = validateUserInput(input)
      if (validationErrors.length > 0) {
        return {
          __typename: 'ValidationError',
          message: 'Input validation failed',
          code: 'VALIDATION_ERROR',
          fields: validationErrors
        }
      }

      // Business-Logik
      const existingUser = await userService.findByEmail(input.email)
      if (existingUser) {
        return {
          __typename: 'DuplicateEmailError',
          message: 'Email already registered',
          code: 'DUPLICATE_EMAIL',
          existingUserId: existingUser.id
        }
      }

      // Technischer Fehler mit Extensions
      try {
        const user = await userService.create(input)
        return {
          __typename: 'CreateUserSuccess',
          user
        }
      } catch (error) {
        throw new GraphQLError('Failed to create user', {
          extensions: {
            code: 'DATABASE_ERROR',
            originalError: error.message
          }
        })
      }
    }
  }
}

// ❌ FALSCH - Keine strukturierte Fehlerbehandlung
type Mutation {
  createUser(input: CreateUserInput!): User  # ❌ Kein Union Type
}

const resolvers = {
  Mutation: {
    createUser: async (_: any, { input }: any) => {
      if (!input.email) {
        throw new Error('Email required')  // ❌ Generischer Error ohne Code
      }
      
      const user = await userService.create(input)
      return user
    }
  }
}
````

---

## Regel 3: Strukturiertes Logging

**Schwere**: MUSS  
**ISO-Merkmale**: Maintainability/Analyzability, Usability/Operability

### Regel

Log-Ausgaben MÜSSEN im JSON-Format erfolgen und folgende Pflichtfelder enthalten:

- `timestamp` (ISO 8601 Format)
- `level` (ERROR, WARN, INFO, DEBUG, TRACE)
- `message` (kurze, aussagekräftige Beschreibung)
- `service` (Service-Name)
- `correlationId` (Request-Tracing ID)

Zusätzliche kontextuelle Felder sind erwünscht.

### Begründung

- Ermöglicht effiziente Log-Aggregation und -Analyse
- Unterstützt Distributed Tracing
- Erleichtert Fehlersuche in verteilten Systemen
- Standardisiert Logs über alle Services hinweg

### Verifikation

- Logger-Konfiguration prüfen
- Stichproben in Log-Ausgaben
- Tests der Logging-Funktionalität

### Beispiele
````typescript
// ✅ KORREKT - Winston mit JSON Format
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'user-service',
    environment: process.env.NODE_ENV 
  },
  transports: [
    new winston.transports.Console()
  ]
})

// ✅ KORREKT - Verwendung
logger.info('User created', {
  userId: user.id,
  email: user.email,
  correlationId: context.correlationId,
  duration: Date.now() - startTime
})

// Output:
// {
//   "timestamp": "2025-11-14T10:30:00.123Z",
//   "level": "info",
//   "message": "User created",
//   "service": "user-service",
//   "environment": "production",
//   "userId": "u42",
//   "email": "test@example.com",
//   "correlationId": "abc-123-def",
//   "duration": 45
// }

// ✅ KORREKT - Error Logging mit Stack Trace
logger.error('Database connection failed', {
  error: err.message,
  stack: err.stack,
  correlationId: context.correlationId,
  database: 'postgresql',
  host: config.db.host
})

// ❌ FALSCH - Console.log ohne Struktur
console.log(`User ${user.id} created at ${new Date()}`)

// ❌ FALSCH - String-basiertes Format
logger.info(`User created: ${user.id}, Email: ${user.email}`)

// ❌ FALSCH - Fehlende Pflichtfelder
logger.info('User created', { userId: user.id })  // ❌ Keine correlationId
````

---

## Regel 4: Datums- und Zeitformate

**Schwere**: MUSS  
**ISO-Merkmale**: Compatibility/Interoperability, Portability/Adaptability

### Regel

Datum- und Zeitwerte MÜSSEN ausschließlich ISO 8601 Format verwenden:

- **Date Only**: `YYYY-MM-DD` (z.B. `2025-11-14`)
- **DateTime**: RFC 3339 = `YYYY-MM-DDTHH:mm:ssZ` (z.B. `2025-11-14T10:30:00Z`)
- **DateTime mit Offset**: `YYYY-MM-DDTHH:mm:ss±HH:mm` (z.B. `2025-11-14T10:30:00+01:00`)
- **Timezone**: Bevorzugt UTC (Z suffix)

### Begründung

- Internationaler Standard, weltweit verstanden
- Eindeutige Sortierbarkeit
- Native Unterstützung in den meisten Programmiersprachen
- Verhindert Missverständnisse durch lokale Formate

### Verifikation

- GraphQL Schema prüfen auf DateTime Scalar
- API-Responses inspizieren
- Tests mit verschiedenen Datumsformaten

### Beispiele
````graphql
# ✅ KORREKT - GraphQL Schema
scalar DateTime
scalar Date

type Order {
  orderId: ID!
  orderDate: DateTime!        # "2025-11-14T10:30:00Z"
  deliveryDate: Date!         # "2025-11-20"
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Query {
  orders(
    from: DateTime!
    to: DateTime!
  ): [Order!]!
}
````
````typescript
// ✅ KORREKT - TypeScript Implementation
import { GraphQLScalarType, Kind } from 'graphql'

export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO 8601 DateTime string',
  serialize(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString()  // "2025-11-14T10:30:00.123Z"
    }
    return value
  },
  parseValue(value: string): Date {
    return new Date(value)
  },
  parseLiteral(ast): Date | null {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value)
    }
    return null
  }
})

// ✅ KORREKT - Verwendung in Code
const order = {
  orderId: '123',
  orderDate: new Date().toISOString(),  // "2025-11-14T10:30:00.123Z"
  deliveryDate: '2025-11-20'
}

// ❌ FALSCH - Verschiedene Verstöße
type Order {
  orderDate: String!          # ❌ String statt DateTime Scalar
  deliveryDate: String!       # ❌ String statt Date Scalar
}

// ❌ FALSCH - Custom Formate
const order = {
  orderDate: '14.11.2025',              // ❌ Deutsches Format
  deliveryDate: '11/20/2025',           // ❌ US-Format
  timestamp: Date.now(),                // ❌ Unix Timestamp (Millisekunden)
  createdAt: '20251114103000'           // ❌ Custom Format
}
````

---

## Regel 5: Asynchrone Event-Struktur (CloudEvents)

**Schwere**: MUSS  
**ISO-Merkmale**: Compatibility/Interoperability, Maintainability/Modularity

### Regel

Events MÜSSEN der CloudEvents v1.0 Spezifikation folgen mit Pflichtfeldern:

- `id` (String, eindeutig)
- `source` (URI, z.B. `/user-service`)
- `specversion` (String, `"1.0"`)
- `type` (String, Format: `<domain>.<entity>.<action>.v<version>`)
- `datacontenttype` (String, meist `"application/json"`)
- `time` (String, ISO 8601)
- `data` (Object, Payload)

Optional aber empfohlen: `subject`, `dataschema`

### Begründung

- Herstellerunabhängiger Standard (CNCF)
- Interoperabilität zwischen verschiedenen Event-Systemen
- Unterstützung durch viele Tools und Bibliotheken
- Klare Trennung von Metadaten und Payload

### Verifikation

- Event-Schema-Validierung
- Stichproben in Kafka/Event-Bus
- AsyncAPI Spezifikation prüfen

### Beispiele
````typescript
// ✅ KORREKT - CloudEvents konformes Event
interface CloudEvent<T = any> {
  id: string
  source: string
  specversion: '1.0'
  type: string
  datacontenttype: string
  time: string
  subject?: string
  data: T
}

const userCreatedEvent: CloudEvent = {
  id: 'a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p',
  source: '/user-service',
  specversion: '1.0',
  type: 'shop.user.created.v1',  // <domain>.<entity>.<action>.v<version>
  datacontenttype: 'application/json',
  time: '2025-11-14T10:30:00Z',
  subject: 'user/u42',
  data: {
    userId: 'u42',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    registeredAt: '2025-11-14T10:30:00Z'
  }
}

// ✅ KORREKT - Event Publisher
import { v4 as uuidv4 } from 'uuid'

export async function publishUserCreatedEvent(user: User) {
  const event: CloudEvent = {
    id: uuidv4(),
    source: '/user-service',
    specversion: '1.0',
    type: 'shop.user.created.v1',
    datacontenttype: 'application/json',
    time: new Date().toISOString(),
    subject: `user/${user.id}`,
    data: {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      registeredAt: user.createdAt
    }
  }
  
  await kafka.send({
    topic: 'shop.user.events',
    messages: [{
      key: user.id,
      value: JSON.stringify(event)
    }]
  })
}

// ❌ FALSCH - Nicht CloudEvents konform
const badEvent = {
  eventType: 'USER_CREATED',        // ❌ Nicht CloudEvents Struktur
  timestamp: Date.now(),            // ❌ Unix Timestamp statt ISO 8601
  payload: {                        // ❌ "payload" statt "data"
    userId: 'u42',
    email: 'test@example.com'
  }
}

// ❌ FALSCH - Falsches Type-Format
const badEvent2 = {
  id: 'abc',
  source: '/user-service',
  specversion: '1.0',
  type: 'UserCreated',              // ❌ Nicht konformes Format
  datacontenttype: 'application/json',
  time: '2025-11-14T10:30:00Z',
  data: { userId: 'u42' }
}
````

---

## Regel 6: API Versionierung

**Schwere**: SOLLTE  
**ISO-Merkmale**: Reliability/Maturity, Compatibility/Interoperability

### Regel

Breaking Changes SOLLTEN durch Versionierung kommuniziert werden:

1. GraphQL nutzt `@deprecated` Direktiven mit Migrationshinweisen
2. Deprecation Notice MUSS enthalten:
   - Grund der Deprecation
   - Alternative/Nachfolge-Feld
   - Zeitpunkt der Entfernung
   - Link zur Migration-Dokumentation
3. Deprecated Fields bleiben mindestens 3 Monate erhalten
4. Neue Major-Versionen bei Breaking Changes

### Begründung

- Ermöglicht sanfte Migration für API-Konsumenten
- Verhindert Breaking Changes ohne Vorwarnung
- Dokumentiert API-Evolution
- Gibt Teams Zeit zur Anpassung

### Verifikation

- Schema-Review auf @deprecated Direktiven
- Changelog prüfen
- Migration-Dokumentation vorhanden

### Beispiele
````graphql
# ✅ KORREKT - Mit aussagekräftiger Deprecation
type User {
  email: String! @deprecated(
    reason: """
    Use 'emailAddress' instead. 
    The 'email' field will be removed on 2026-02-14.
    Migration guide: https://docs.example.com/api/migration/email-to-emailAddress
    """
  )
  emailAddress: String!
  
  fullName: String! @deprecated(
    reason: """
    Use 'firstName' and 'lastName' separately for better i18n support.
    The 'fullName' field will be removed on 2026-02-14.
    """
  )
  firstName: String!
  lastName: String!
}

type Query {
  getUser(id: ID!): User @deprecated(
    reason: """
    Use 'user(userId: ID!)' instead.
    This query will be removed on 2026-02-14.
    """
  )
  user(userId: ID!): User
}

# ✅ KORREKT - Neue Version eines Types
type UserV2 {
  userId: ID!
  profile: UserProfile!
  settings: UserSettings!
}

union UserResult = User | UserV2

type Query {
  user(userId: ID!, version: Int = 1): UserResult
}

# ❌ FALSCH - Breaking Change ohne Deprecation
type User {
  # email: String!           # ❌ Einfach gelöscht
  emailAddress: String!
}

# ❌ FALSCH - Deprecation ohne Details
type User {
  email: String! @deprecated(reason: "Use emailAddress")  # ❌ Keine Timeline, kein Link
  emailAddress: String!
}
````

---

## Regel 7: Input Validierung

**Schwere**: MUSS  
**ISO-Merkmale**: Security/Integrity, Reliability/Fault Tolerance

### Regel

Alle Input-Validierung MUSS explizit erfolgen:

1. GraphQL Input Types nutzen Non-Null (`!`) für Pflichtfelder
2. Validierung erfolgt im Resolver/Service-Layer, nicht nur in Schema
3. Fehlermeldungen MÜSSEN spezifisch und hilfreich sein
4. Keine impliziten Defaults für kritische Felder
5. Whitelist-Approach: Nur explizit erlaubte Werte akzeptieren

### Begründung

- Verhindert ungültige Daten im System
- Erhöht Datensicherheit und -integrität
- Verbessert Benutzererfahrung durch klare Fehlermeldungen
- Reduziert Debugging-Aufwand

### Verifikation

- Schema-Review auf korrekte Non-Null Markierungen
- Code-Review der Validation-Logik
- Tests für Edge Cases und ungültige Inputs

### Beispiele
````graphql
# ✅ KORREKT - Klare Input-Definition
input CreateUserInput {
  email: String!              # Pflichtfeld
  firstName: String!          # Pflichtfeld
  lastName: String!           # Pflichtfeld
  age: Int!                   # Pflichtfeld
  newsletter: Boolean         # Optional, explizit
  marketingConsent: Boolean   # Optional, explizit
}

input UpdateUserInput {
  email: String               # Optional bei Update
  firstName: String
  lastName: String
  age: Int
}

enum UserRole {
  ADMIN
  USER
  GUEST
}
````
````typescript
// ✅ KORREKT - Resolver mit expliziter Validierung
import { GraphQLError } from 'graphql'
import validator from 'validator'

const resolvers = {
  Mutation: {
    createUser: async (_: any, { input }: { input: CreateUserInput }) => {
      // Email Validierung
      if (!validator.isEmail(input.email)) {
        throw new GraphQLError('Invalid email format', {
          extensions: {
            code: 'VALIDATION_ERROR',
            field: 'email',
            validationError: 'Must be a valid email address'
          }
        })
      }

      // Age Validierung
      if (input.age < 18) {
        throw new GraphQLError('User must be 18 or older', {
          extensions: {
            code: 'VALIDATION_ERROR',
            field: 'age',
            validationError: 'Minimum age is 18',
            receivedValue: input.age
          }
        })
      }

      if (input.age > 150) {
        throw new GraphQLError('Invalid age', {
          extensions: {
            code: 'VALIDATION_ERROR',
            field: 'age',
            validationError: 'Age must be realistic',
            receivedValue: input.age
          }
        })
      }

      // Name Validierung
      if (input.firstName.trim().length < 2) {
        throw new GraphQLError('First name too short', {
          extensions: {
            code: 'VALIDATION_ERROR',
            field: 'firstName',
            validationError: 'Minimum length is 2 characters'
          }
        })
      }

      // Business Validierung
      const existingUser = await userService.findByEmail(input.email)
      if (existingUser) {
        return {
          __typename: 'DuplicateEmailError',
          message: 'Email already registered',
          code: 'DUPLICATE_EMAIL',
          existingUserId: existingUser.id
        }
      }

      const user = await userService.create(input)
      return {
        __typename: 'CreateUserSuccess',
        user
      }
    }
  }
}

// ❌ FALSCH - Unklare Pflichtfelder und fehlende Validierung
input CreateUserInput {
  email: String               # ❌ Unklar ob Pflicht
  age: Int = 0               # ❌ Gefährlicher Default
  newsletter: Boolean = true  # ❌ Opt-Out statt Opt-In
}

const resolvers = {
  Mutation: {
    createUser: async (_: any, { input }: any) => {
      // ❌ Keine Validierung
      const user = await userService.create(input)
      return user
    }
  }
}
````

---

## Regel 8: Unbekannte Felder ignorieren (Robustness Principle)

**Schwere**: SOLLTE  
**ISO-Merkmale**: Reliability/Maturity, Compatibility/Interoperability

### Regel

API-Clients SOLLTEN unbekannte Felder in Responses ignorieren (Postel's Law):

> "Be conservative in what you send, liberal in what you accept"

1. Deserialisierung konfigurieren für `ignoreUnknownFields`
2. Keine Fehler bei unerwarteten Response-Feldern
3. Ermöglicht Server-seitige API-Erweiterung ohne Client-Updates

### Begründung

- Ermöglicht abwärtskompatible API-Evolution
- Reduziert Koordinationsaufwand zwischen Teams
- Services können unabhängig deployen
- Vermeidet Breaking Changes bei neuen Features

### Verifikation

- Client-Konfiguration prüfen
- Tests mit erweiterten Response-Mockups
- Integration Tests mit verschiedenen API-Versionen

### Beispiele
````typescript
// ✅ KORREKT - GraphQL Client Konfiguration
import { ApolloClient, InMemoryCache } from '@apollo/client'

const client = new ApolloClient({
  uri: 'https://api.example.com/graphql',
  cache: new InMemoryCache({
    // Apollo Client ignoriert automatisch unbekannte Felder
  })
})

// ✅ KORREKT - REST API mit axios
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://api.example.com',
  validateStatus: (status) => status < 500
})

// Interface definiert nur die Felder die wir brauchen
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  // Server kann zusätzliche Felder zurückgeben
}

const response = await api.get<User>('/users/123')
// response.data kann mehr Felder enthalten, wird aber nicht zum Fehler

// ✅ KORREKT - Zod Schema mit passthrough
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string()
}).passthrough()  // Erlaubt zusätzliche Felder

// ✅ KORREKT - JSON Deserialisierung in TypeScript
interface KnownUserFields {
  id: string
  email: string
  firstName: string
}

// TypeScript ignoriert automatisch zusätzliche Felder beim Typcasting
const userData = JSON.parse(response) as KnownUserFields

// ❌ FALSCH - Strict Mode aktiviert
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string(),
  email: z.string()
}).strict()  // ❌ Wirft Fehler bei unbekannten Feldern

// ❌ FALSCH - Validierung auf exakte Felder
function validateUser(data: any): User {
  const allowedFields = ['id', 'email', 'firstName', 'lastName']
  const receivedFields = Object.keys(data)
  
  const unknownFields = receivedFields.filter(f => !allowedFields.includes(f))
  if (unknownFields.length > 0) {
    throw new Error(`Unknown fields: ${unknownFields.join(', ')}`)  // ❌ Zu strikt
  }
  
  return data as User
}
````
````graphql
# Server kann API erweitern ohne Clients zu brechen

# Version 1
type User {
  id: ID!
  email: String!
  firstName: String!
}

# Version 2 - Neue Felder hinzugefügt
type User {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!        # NEU
  phoneNumber: String      # NEU
  avatarUrl: String        # NEU
}

# Alte Clients ignorieren lastName, phoneNumber, avatarUrl automatisch
````

---

## Regel 9: Health Check Endpunkte

**Schwere**: MUSS  
**ISO-Merkmale**: Reliability/Availability, Usability/Operability

### Regel

Services MÜSSEN zwei Health-Check Endpunkte bereitstellen:

1. **Liveness** (`/health/live`): 
   - Prüft ob Service-Prozess läuft
   - Keine Dependency-Checks
   - HTTP 200 = lebt, 503 = tot (Restart nötig)

2. **Readiness** (`/health/ready`):
   - Prüft ob Service bereit für Traffic ist
   - Checkt Abhängigkeiten (DB, Kafka, externe APIs)
   - HTTP 200 = bereit, 503 = nicht bereit

### Begründung

- Ermöglicht korrektes Load Balancing
- Kubernetes/Orchestrierung nutzt beide Probes
- Verhindert Traffic zu nicht-bereiten Services
- Erlaubt automatisches Recovery

### Verifikation

- Beide Endpunkte implementiert
- Readiness prüft tatsächlich Dependencies
- Tests für verschiedene Failure-Szenarien

### Beispiele
````typescript
// ✅ KORREKT - Express Health Checks
import express from 'express'
import { Pool } from 'pg'
import { Kafka } from 'kafkajs'

const app = express()
const db = new Pool({ /* config */ })
const kafka = new Kafka({ /* config */ })

// Liveness: Nur Prozess-Status
app.get('/health/live', (req, res) => {
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString()
  })
})

// Readiness: Prüft Dependencies
app.get('/health/ready', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    kafka: await checkKafka(),
    externalAPI: await checkExternalAPI()
  }

  const isReady = Object.values(checks).every(check => check.status === 'ok')

  if (isReady) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks
    })
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      checks
    })
  }
})

// Helper-Funktionen für Dependency Checks
async function checkDatabase(): Promise<HealthCheck> {
  try {
    const result = await db.query('SELECT 1')
    return { 
      status: 'ok', 
      responseTime: 5  // ms
    }
  } catch (error) {
    return { 
      status: 'fail', 
      error: error.message 
    }
  }
}

async function checkKafka(): Promise<HealthCheck> {
  try {
    const admin = kafka.admin()
    await admin.connect()
    await admin.listTopics()
    await admin.disconnect()
    return { status: 'ok' }
  } catch (error) {
    return { 
      status: 'fail', 
      error: error.message 
    }
  }
}

async function checkExternalAPI(): Promise<HealthCheck> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    
    const response = await fetch('https://external-api.example.com/health', {
      signal: controller.signal
    })
    
    clearTimeout(timeout)
    
    return {
      status: response.ok ? 'ok' : 'degraded',
      statusCode: response.status
    }
  } catch (error) {
    return { 
      status: 'fail', 
      error: error.message 
    }
  }
}

interface HealthCheck {
  status: 'ok' | 'fail' | 'degraded'
  responseTime?: number
  statusCode?: number
  error?: string
}

// ❌ FALSCH - Nur ein Health Endpoint ohne Differenzierung
app.get('/health', (req, res) => {
  res.send('OK')  // ❌ Zu simpel, keine Details
})

// ❌ FALSCH - Liveness prüft Dependencies
app.get('/health/live', async (req, res) => {
  const dbOk = await checkDatabase()  // ❌ Liveness sollte keine Dependencies prüfen
  res.status(dbOk ? 200 : 503).send('OK')
})
````
````yaml
# Kubernetes Deployment mit beiden Probes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  template:
    spec:
      containers:
      - name: user-service
        image: user-service:latest
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
````

---

## Regel 10: Resilienz-Patterns

**Schwere**: SOLLTE  
**ISO-Merkmale**: Reliability/Fault Tolerance, Reliability/Availability

### Regel

Services SOLLTEN folgende Resilienz-Patterns für externe Abhängigkeiten implementieren:

1. **Timeout**: Connection- und Read-Timeouts setzen
2. **Retry**: Retries mit Exponential Backoff bei transienten Fehlern
3. **Circuit Breaker**: Verhindert Kaskaden-Fehler
4. **Fallback**: Alternative Datequellen oder Graceful Degradation

### Begründung

- Verhindert kaskadierende Fehler in verteilten Systemen
- Erhöht Gesamt-Verfügbarkeit
- Schützt vor Überlastung
- Ermöglicht schnelleres Recovery

### Verifikation

- HTTP-Client Konfiguration prüfen
- Circuit Breaker Implementation
- Fallback-Strategien dokumentiert
- Chaos Engineering Tests

### Beispiele
````typescript
// ✅ KORREKT - Vollständige Resilienz mit opossum Circuit Breaker
import CircuitBreaker from 'opossum'
import axios, { AxiosInstance } from 'axios'

// 1. HTTP Client mit Timeouts
const httpClient: AxiosInstance = axios.create({
  baseURL: 'https://external-api.example.com',
  timeout: 5000,              // 5s Timeout
  headers: {
    'Content-Type': 'application/json'
  }
})

// 2. Retry mit Exponential Backoff
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1
      const isRetryable = isRetryableError(error)

      if (isLastAttempt || !isRetryable) {
        throw error
      }

      const delay = baseDelay * Math.pow(2, attempt)  // Exponential Backoff
      const jitter = Math.random() * 1000             // Jitter hinzufügen
      
      logger.warn('Retry attempt', {
        attempt: attempt + 1,
        maxRetries,
        delay: delay + jitter,
        error: error.message
      })

      await sleep(delay + jitter)
    }
  }
  throw new Error('Max retries reached')
}

function isRetryableError(error: any): boolean {
  // Retry bei Netzwerkfehlern oder 5xx Status Codes
  return (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    (error.response && error.response.status >= 500)
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 3. Circuit Breaker
const breakerOptions = {
  timeout: 5000,                    // 5s Timeout pro Request
  errorThresholdPercentage: 50,     // Öffnet bei 50% Fehlerrate
  resetTimeout: 30000,              // 30s bis Retry
  rollingCountTimeout: 10000,       // 10s Rolling Window
  rollingCountBuckets: 10,          // Buckets für Statistik
  name: 'external-api-breaker'
}

async function callExternalAPI(userId: string): Promise<User> {
  const response = await httpClient.get(`/users/${userId}`)
  return response.data
}

const breaker = new CircuitBreaker(callExternalAPI, breakerOptions)

// 4. Fallback Strategy
breaker.fallback(async (userId: string) => {
  logger.warn('Circuit breaker fallback activated', { userId })
  
  // Option A: Cache
  const cachedUser = await cache.get(`user:${userId}`)
  if (cachedUser) {
    return { ...cachedUser, fromCache: true }
  }
  
  // Option B: Degraded Response
  return {
    id: userId,
    email: 'unavailable@example.com',
    firstName: 'Unavailable',
    lastName: 'Unavailable',
    degraded: true
  }
})

// Events für Monitoring
breaker.on('open', () => {
  logger.error('Circuit breaker opened', {
    breaker: 'external-api-breaker',
    stats: breaker.stats
  })
})

breaker.on('halfOpen', () => {
  logger.warn('Circuit breaker half-open', {
    breaker: 'external-api-breaker'
  })
})

breaker.on('close', () => {
  logger.info('Circuit breaker closed', {
    breaker: 'external-api-breaker'
  })
})

// 5. Verwendung
export async function getUserFromExternalAPI(userId: string): Promise<User> {
  try {
    // Kombiniert: Circuit Breaker + Retry + Timeout + Fallback
    return await callWithRetry(() => breaker.fire(userId))
  } catch (error) {
    logger.error('Failed to fetch user after all retries', {
      userId,
      error: error.message,
      circuitBreakerState: breaker.status.name
    })
    throw error
  }
}

// ❌ FALSCH - Keine Resilienz-Patterns
export async function getUserBad(userId: string): Promise<User> {
  // ❌ Kein Timeout, kein Retry, kein Circuit Breaker, kein Fallback
  const response = await fetch(`https://external-api.example.com/users/${userId}`)
  return response.json()
}

// ❌ FALSCH - Naive Retry ohne Backoff
async function naiveRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === 2) throw error
      // ❌ Kein Backoff, immer sofort retry
    }
  }
  throw new Error('Unreachable')
}
````
````typescript
// ✅ KORREKT - Bulkhead Pattern (Ressourcen-Isolation)
import pLimit from 'p-limit'

// Limitiert parallele Requests zu externem Service
const limit = pLimit(10)  // Max 10 gleichzeitige Requests

export async function fetchUsers(userIds: string[]): Promise<User[]> {
  const promises = userIds.map(id =>
    limit(() => breaker.fire(id))  // Mit Circuit Breaker kombiniert
  )
  
  return Promise.allSettled(promises).then(results =>
    results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<User>).value)
  )
}
````

---

## Anhang: ISO/IEC 25010 Qualitätsmerkmale

### Compatibility
- **Co-existence**: Keine negativen Auswirkungen auf andere Systeme
- **Interoperability**: Informationsaustausch zwischen Systemen

### Portability
- **Adaptability**: Anpassung an verschiedene Umgebungen
- **Installability**: Einfache Installation/Deployment
- **Replaceability**: Austauschbarkeit von Komponenten

### Maintainability
- **Modularity**: Änderungen mit minimalen Auswirkungen
- **Reusability**: Wiederverwendbarkeit von Komponenten
- **Analyzability**: Auswirkungen von Änderungen einschätzbar
- **Modifiability**: Änderbarkeit ohne Qualitätsverlust
- **Testability**: Testbarkeit von Komponenten

### Performance Efficiency
- **Time Behaviour**: Response-/Processing-Times
- **Resource Utilization**: Ressourcenverbrauch
- **Capacity**: Maximale Limits

### Reliability
- **Maturity**: Zuverlässigkeit unter Normalbetrieb
- **Availability**: Verfügbarkeit bei Bedarf
- **Fault Tolerance**: Funktioniert trotz Fehlern
- **Recoverability**: Wiederherstellung nach Ausfall

### Usability
- **Learnability**: Erlernbarkeit
- **Operability**: Bedienbarkeit
- **User Error Protection**: Schutz vor Bedienfehlern
- **User Interface Aesthetics**: Ästhetik
- **Accessibility**: Barrierefreiheit

### Security
- **Confidentiality**: Vertraulichkeit
- **Integrity**: Integrität
- **Non-repudiation**: Nachweisbarkeit
- **Accountability**: Nachvollziehbarkeit
- **Authenticity**: Authentizität

---

## Regelübersicht (Quick Reference)

| ID | Regel | Schwere | Kategorie | Qualitätsmerkmal |
|----|-------|---------|-----------|------------------|
| 1 | GraphQL Schema Design | MUSS | API Design | Usability |
| 2 | Fehlerbehandlung | MUSS | API Design | Reliability |
| 3 | Strukturiertes Logging | MUSS | Observability | Maintainability |
| 4 | Datums-/Zeitformate | MUSS | Data Format | Compatibility |
| 5 | Event-Struktur (CloudEvents) | MUSS | Async | Interoperability |
| 6 | API Versionierung | SOLLTE | API Design | Maturity |
| 7 | Input Validierung | MUSS | Security | Integrity |
| 8 | Unbekannte Felder ignorieren | SOLLTE | API Client | Compatibility |
| 9 | Health Checks | MUSS | Operations | Availability |
| 10 | Resilienz-Patterns | SOLLTE | Reliability | Fault Tolerance |

---

## Änderungshistorie

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | 2025-11-14 | Initiale Version |

---

**Ansprechpartner**: Architecture Team  
**Feedback**: architecture@example.com