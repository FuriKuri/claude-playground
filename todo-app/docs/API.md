# Todo App - GraphQL API Documentation

## Overview

This is the GraphQL API documentation for the Todo App. The API follows all Architecture Rules and implements best practices for error handling, validation, and resilience.

## Endpoint

```
POST http://localhost:4000/graphql
```

## Authentication

Currently, no authentication is required. This is a demo application.

## Correlation ID

For request tracing, you can provide a correlation ID in the request headers:

```
X-Correlation-ID: your-correlation-id
```

If not provided, a UUID will be automatically generated.

## Types

### Todo

```graphql
type Todo {
  id: ID!
  title: String!
  description: String
  status: TodoStatus!
  dueDate: Date
  createdAt: DateTime!
  updatedAt: DateTime!
  completedAt: DateTime
  notes: String @deprecated(reason: "Use 'description' field instead. Will be removed on 2026-05-01.")
}
```

### TodoStatus

```graphql
enum TodoStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  ARCHIVED
}
```

### Input Types

#### CreateTodoInput

```graphql
input CreateTodoInput {
  title: String!        # Required, 3-200 characters
  description: String   # Optional, max 1000 characters
  dueDate: Date        # Optional, ISO 8601 format (YYYY-MM-DD)
}
```

#### UpdateTodoInput

```graphql
input UpdateTodoInput {
  title: String         # Optional, 3-200 characters
  description: String   # Optional, max 1000 characters
  status: TodoStatus   # Optional
  dueDate: Date        # Optional, ISO 8601 format (YYYY-MM-DD)
}
```

## Queries

### todos

Fetch all todos, optionally filtered by status.

**Arguments:**
- `status: TodoStatus` (optional) - Filter by status

**Returns:** `[Todo!]!`

**Example:**

```graphql
query {
  todos {
    id
    title
    status
  }
}
```

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

### todo

Fetch a single todo by ID.

**Arguments:**
- `id: ID!` (required) - Todo ID

**Returns:** `Todo` (nullable)

**Example:**

```graphql
query {
  todo(id: "123") {
    id
    title
    description
    status
    dueDate
    createdAt
  }
}
```

## Mutations

### createTodo

Create a new todo item.

**Arguments:**
- `input: CreateTodoInput!` (required)

**Returns:** `CreateTodoResult!` (Union type)

**Possible Returns:**
- `CreateTodoSuccess` - Todo was created successfully
- `ValidationError` - Input validation failed

**Example:**

```graphql
mutation {
  createTodo(input: {
    title: "Learn GraphQL"
    description: "Study Apollo Server docs"
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

### updateTodo

Update an existing todo.

**Arguments:**
- `id: ID!` (required) - Todo ID
- `input: UpdateTodoInput!` (required)

**Returns:** `UpdateTodoResult!` (Union type)

**Possible Returns:**
- `Todo` - Updated todo
- `ValidationError` - Input validation failed
- `TodoNotFoundError` - Todo not found

**Example:**

```graphql
mutation {
  updateTodo(id: "123", input: {
    status: IN_PROGRESS
    dueDate: "2025-12-15"
  }) {
    ... on Todo {
      id
      status
      dueDate
      updatedAt
    }
    ... on TodoNotFoundError {
      message
      todoId
    }
  }
}
```

### completeTodo

Mark a todo as completed.

**Arguments:**
- `id: ID!` (required) - Todo ID

**Returns:** `UpdateTodoResult!` (Union type)

**Example:**

```graphql
mutation {
  completeTodo(id: "123") {
    ... on Todo {
      id
      status
      completedAt
    }
    ... on TodoNotFoundError {
      message
      todoId
    }
  }
}
```

### deleteTodo

Delete a todo.

**Arguments:**
- `id: ID!` (required) - Todo ID

**Returns:** `DeleteTodoResult!` (Union type)

**Possible Returns:**
- `Todo` - Deleted todo
- `TodoNotFoundError` - Todo not found

**Example:**

```graphql
mutation {
  deleteTodo(id: "123") {
    ... on Todo {
      id
      title
    }
    ... on TodoNotFoundError {
      message
      todoId
    }
  }
}
```

## Error Handling

### Validation Errors

Validation errors are returned as part of the response, not as GraphQL errors:

```json
{
  "data": {
    "createTodo": {
      "__typename": "ValidationError",
      "message": "Input validation failed",
      "code": "VALIDATION_ERROR",
      "fields": [
        {
          "field": "title",
          "message": "Title must be at least 3 characters"
        }
      ]
    }
  }
}
```

### Business Errors

Business errors (e.g., Todo not found) are also returned as typed responses:

```json
{
  "data": {
    "deleteTodo": {
      "__typename": "TodoNotFoundError",
      "message": "Todo not found",
      "code": "TODO_NOT_FOUND",
      "todoId": "123"
    }
  }
}
```

### Technical Errors

Technical errors (e.g., database errors) are returned in the `errors` array:

```json
{
  "errors": [
    {
      "message": "Failed to fetch todos",
      "extensions": {
        "code": "INTERNAL_ERROR",
        "originalError": "Connection timeout"
      }
    }
  ]
}
```

## Date/Time Format

All date and time values use ISO 8601 format:

- **Date**: `YYYY-MM-DD` (e.g., `2025-11-14`)
- **DateTime**: `YYYY-MM-DDTHH:mm:ss.SSSZ` (e.g., `2025-11-14T10:30:00.123Z`)

## Health Checks

### Liveness Probe

```
GET http://localhost:4000/health/live
```

Response:
```json
{
  "status": "alive",
  "timestamp": "2025-11-14T10:30:00.123Z",
  "uptime": 123.456
}
```

### Readiness Probe

```
GET http://localhost:4000/health/ready
```

Response (ready):
```json
{
  "status": "ready",
  "timestamp": "2025-11-14T10:30:00.123Z",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 5
    }
  }
}
```

Response (not ready):
```json
{
  "status": "not ready",
  "timestamp": "2025-11-14T10:30:00.123Z",
  "checks": {
    "database": {
      "status": "fail",
      "error": "Connection refused"
    }
  }
}
```
