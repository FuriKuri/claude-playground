# Todo App - Architecture Compliant

✅ **Fully compliant with all 10 Architecture Rules**

Eine minimalistische aber vollständige Todo-App, die alle Architecture Rules perfekt umsetzt und als Referenzimplementierung dient.

## Features

- **GraphQL API** mit Apollo Server
- **PostgreSQL** Datenbank
- **Strukturiertes JSON Logging** mit Winston
- **Health Checks** (Liveness/Readiness)
- **Circuit Breaker & Retry** mit exponential backoff
- **CloudEvents v1.0** konforme Event-Struktur
- **Input Validation** mit Zod
- **ISO 8601** Date/Time Handling

## Architecture Compliance

| Rule | Status | Implementation | Code Location |
|------|--------|----------------|---------------|
| **1. GraphQL Schema Design** | ✅ | PascalCase types, camelCase fields, SCREAMING_SNAKE_CASE enums | `src/schema/todo.graphql:1` |
| **2. Error Handling** | ✅ | Union types, structured errors with extensions | `src/resolvers/todoResolver.ts:1` |
| **3. Structured Logging** | ✅ | Winston with JSON format, all required fields | `src/utils/logger.ts:1` |
| **4. Date/Time Formats** | ✅ | ISO 8601, DateTime/Date scalars | `src/schema/todo.graphql:6` |
| **5. Event Structure** | ✅ | CloudEvents v1.0 compliant | `src/events/todoEvents.ts:1` |
| **6. API Versioning** | ✅ | @deprecated directives with migration info | `src/schema/todo.graphql:37` |
| **7. Input Validation** | ✅ | Explicit Zod validation, helpful errors | `src/utils/validation.ts:1` |
| **8. Unknown Fields** | ✅ | GraphQL client ignores unknown fields by default | Built-in |
| **9. Health Checks** | ✅ | /health/live and /health/ready endpoints | `src/utils/health.ts:1` |
| **10. Resilience** | ✅ | Circuit breaker, retry, exponential backoff | `src/infrastructure/resilience.ts:1` |

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Setup PostgreSQL database
createdb todo_db

# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials
```

### Development

```bash
# Start development server
npm run dev

# Server runs on http://localhost:4000
# GraphQL Playground: http://localhost:4000/graphql
```

### Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## Health Checks

- **Liveness**: `http://localhost:4000/health/live`
  - Prüft ob Service-Prozess läuft
  - Keine Dependency-Checks

- **Readiness**: `http://localhost:4000/health/ready`
  - Prüft ob Service bereit für Traffic ist
  - Checkt Abhängigkeiten (DB, etc.)

## Example GraphQL Queries

### Create Todo

```graphql
mutation {
  createTodo(input: {
    title: "Learn GraphQL"
    description: "Study Apollo Server documentation"
    dueDate: "2025-12-31"
  }) {
    ... on CreateTodoSuccess {
      todo {
        id
        title
        status
        createdAt
      }
    }
    ... on ValidationError {
      message
      code
      fields {
        field
        message
      }
    }
  }
}
```

### Get All Todos

```graphql
query {
  todos {
    id
    title
    status
    dueDate
    createdAt
    updatedAt
  }
}
```

### Get Todos by Status

```graphql
query {
  todos(status: IN_PROGRESS) {
    id
    title
    status
    dueDate
  }
}
```

### Get Single Todo

```graphql
query {
  todo(id: "todo-id") {
    id
    title
    description
    status
    dueDate
    createdAt
    updatedAt
  }
}
```

### Update Todo

```graphql
mutation {
  updateTodo(id: "todo-id", input: {
    title: "Updated Title"
    status: IN_PROGRESS
  }) {
    ... on Todo {
      id
      title
      status
      updatedAt
    }
    ... on TodoNotFoundError {
      message
      code
      todoId
    }
    ... on ValidationError {
      message
      fields {
        field
        message
      }
    }
  }
}
```

### Complete Todo

```graphql
mutation {
  completeTodo(id: "todo-id") {
    ... on Todo {
      id
      status
      completedAt
    }
    ... on TodoNotFoundError {
      message
      code
    }
  }
}
```

### Delete Todo

```graphql
mutation {
  deleteTodo(id: "todo-id") {
    ... on Todo {
      id
      title
    }
    ... on TodoNotFoundError {
      message
      code
    }
  }
}
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## Project Structure

```
todo-app/
├── .claude/
│   └── architecture-rules.md        # Architecture Rules
├── src/
│   ├── schema/
│   │   └── todo.graphql             # ✅ Rule 1: Schema Design
│   ├── resolvers/
│   │   └── todoResolver.ts          # ✅ Rule 2: Error Handling
│   ├── services/
│   │   └── todoService.ts
│   ├── events/
│   │   └── todoEvents.ts            # ✅ Rule 5: CloudEvents
│   ├── utils/
│   │   ├── logger.ts                # ✅ Rule 3: JSON Logging
│   │   ├── validation.ts            # ✅ Rule 7: Input Validation
│   │   └── health.ts                # ✅ Rule 9: Health Checks
│   ├── infrastructure/
│   │   ├── database.ts
│   │   └── resilience.ts            # ✅ Rule 10: Circuit Breaker
│   ├── types/
│   │   └── index.ts
│   └── server.ts
├── tests/
│   └── todoResolver.test.ts
├── docs/
│   └── API.md
├── package.json
├── tsconfig.json
└── README.md
```

## Architecture Documentation

Die vollständigen Architecture Rules finden Sie in `.claude/architecture-rules.md`.

## Event System

Die App publiziert folgende CloudEvents v1.0 konforme Events:

- `todos.todo.created.v1` - Todo wurde erstellt
- `todos.todo.updated.v1` - Todo wurde aktualisiert
- `todos.todo.completed.v1` - Todo wurde abgeschlossen
- `todos.todo.deleted.v1` - Todo wurde gelöscht

Alle Events enthalten:
- `id` - Eindeutige Event-ID (UUID)
- `source` - `/todo-service`
- `specversion` - `1.0`
- `type` - Event-Typ im Format `<domain>.<entity>.<action>.v<version>`
- `datacontenttype` - `application/json`
- `time` - ISO 8601 Timestamp
- `subject` - Resource Identifier (z.B. `todo/123`)
- `data` - Event Payload

## Logging

Alle Logs werden im strukturierten JSON-Format ausgegeben:

```json
{
  "timestamp": "2025-11-14T10:30:00.123Z",
  "level": "info",
  "message": "Todo created",
  "service": "todo-service",
  "environment": "development",
  "correlationId": "abc-123-def",
  "todoId": "u42"
}
```

Pflichtfelder:
- `timestamp` (ISO 8601)
- `level` (ERROR, WARN, INFO, DEBUG)
- `message`
- `service`
- `correlationId`

## Resilience

Die App implementiert folgende Resilience-Patterns:

1. **Timeout**: Connection- und Read-Timeouts (5s)
2. **Retry**: Retries mit Exponential Backoff bei transienten Fehlern
3. **Circuit Breaker**: Verhindert Kaskaden-Fehler bei DB-Ausfällen
   - Öffnet bei 50% Fehlerrate
   - Reset-Timeout: 30s
4. **Jitter**: Zufällige Verzögerung um Retry-Storms zu vermeiden

## Environment Variables

```env
NODE_ENV=development
PORT=4000
LOG_LEVEL=info

DB_HOST=localhost
DB_PORT=5432
DB_NAME=todo_db
DB_USER=postgres
DB_PASSWORD=postgres
```

## License

MIT

## Contributing

Contributions welcome! Bitte stellen Sie sicher, dass alle Architecture Rules eingehalten werden.
