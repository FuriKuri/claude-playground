// Todo Service mit Circuit Breaker, Retry und Event Publishing

import { v4 as uuidv4 } from 'uuid'
import { db } from '../infrastructure/database'
import { QueryResult } from 'pg'
import {
  publishTodoCreated,
  publishTodoUpdated,
  publishTodoCompleted,
  publishTodoDeleted
} from '../events/todoEvents'
import { withRetry, createCircuitBreaker, dbBreakerOptions } from '../infrastructure/resilience'

interface Todo {
  id: string
  title: string
  description?: string
  status: string
  dueDate?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  notes?: string // ✅ Regel 6: Deprecated field for backward compatibility
}

// ✅ Regel 10: Circuit Breaker für DB-Operationen
const dbBreaker = createCircuitBreaker<[string, any[]], QueryResult>(
  async (query: string, params: any[]) => {
    return await db.query(query, params)
  },
  dbBreakerOptions
)

class TodoService {
  async findAll(status?: string): Promise<Todo[]> {
    const query = status
      ? 'SELECT * FROM todos WHERE status = $1 ORDER BY createdAt DESC'
      : 'SELECT * FROM todos ORDER BY createdAt DESC'

    const params = status ? [status] : []

    // ✅ Regel 10: Retry + Circuit Breaker
    const result = await withRetry<QueryResult>(() => dbBreaker.fire(query, params))

    return result.rows.map(this.mapRow)
  }

  async findById(id: string): Promise<Todo | null> {
    // ✅ Regel 10: Retry + Circuit Breaker
    const result = await withRetry<QueryResult>(() =>
      dbBreaker.fire('SELECT * FROM todos WHERE id = $1', [id])
    )

    if (result.rows.length === 0) {
      return null
    }

    return this.mapRow(result.rows[0])
  }

  async create(input: any): Promise<Todo> {
    const id = uuidv4()
    const now = new Date().toISOString() // ✅ Regel 4: ISO 8601

    const result = await withRetry<QueryResult>(() =>
      dbBreaker.fire(
        `INSERT INTO todos (id, title, description, status, dueDate, createdAt, updatedAt)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [id, input.title, input.description, 'PENDING', input.dueDate, now, now]
      )
    )

    const todo = this.mapRow(result.rows[0])

    // ✅ Regel 5: CloudEvents Event Publishing
    await publishTodoCreated(todo)

    return todo
  }

  async update(id: string, input: any): Promise<Todo | null> {
    const existing = await this.findById(id)
    if (!existing) {
      return null
    }

    const now = new Date().toISOString()

    const result = await withRetry<QueryResult>(() =>
      dbBreaker.fire(
        `UPDATE todos
         SET title = COALESCE($2, title),
             description = COALESCE($3, description),
             status = COALESCE($4, status),
             dueDate = COALESCE($5, dueDate),
             updatedAt = $6
         WHERE id = $1
         RETURNING *`,
        [id, input.title, input.description, input.status, input.dueDate, now]
      )
    )

    const todo = this.mapRow(result.rows[0])

    // ✅ Regel 5: CloudEvents Event Publishing
    await publishTodoUpdated(todo)

    return todo
  }

  async delete(id: string): Promise<Todo | null> {
    const existing = await this.findById(id)
    if (!existing) {
      return null
    }

    await withRetry<QueryResult>(() =>
      dbBreaker.fire('DELETE FROM todos WHERE id = $1', [id])
    )

    // ✅ Regel 5: CloudEvents Event Publishing
    await publishTodoDeleted(existing)

    return existing
  }

  async complete(id: string): Promise<Todo | null> {
    const existing = await this.findById(id)
    if (!existing) {
      return null
    }

    const now = new Date().toISOString()

    const result = await withRetry<QueryResult>(() =>
      dbBreaker.fire(
        `UPDATE todos
         SET status = 'COMPLETED',
             completedAt = $2,
             updatedAt = $2
         WHERE id = $1
         RETURNING *`,
        [id, now]
      )
    )

    const todo = this.mapRow(result.rows[0])

    // ✅ Regel 5: CloudEvents Event Publishing
    await publishTodoCompleted(todo)

    return todo
  }

  async addTag(todoId: string, tagName: string, tagColor: string): Promise<any> {
    const tagId = uuidv4()
    const createdAt = new Date().toISOString()

    const result = await withRetry<QueryResult>(() =>
      dbBreaker.fire(
        `INSERT INTO todoTags (id, todoId, tagName, tagColor, createdAt)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [tagId, todoId, tagName, tagColor, createdAt]
      )
    )

    return {
      id: result.rows[0].id,
      tagName: result.rows[0].tagName,
      tagColor: result.rows[0].tagColor,
      createdAt: result.rows[0].createdAt
    }
  }

  private mapRow(row: any): Todo {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
      notes: row.description // ✅ Regel 6: Deprecated field mapped for backward compatibility
    }
  }
}

export const todoService = new TodoService()
