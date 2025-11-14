// ✅ Regel 5: CloudEvents v1.0 konforme Event-Struktur
// Alle Pflichtfelder: id, source, specversion, type, datacontenttype, time, data

import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'

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

// In-Memory Event Bus (simuliert Kafka)
class EventBus {
  private handlers: Map<string, Array<(event: CloudEvent) => void>> = new Map()

  subscribe(eventType: string, handler: (event: CloudEvent) => void) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType)!.push(handler)
  }

  async publish(event: CloudEvent) {
    const handlers = this.handlers.get(event.type) || []

    logger.info('Event published', {
      eventId: event.id,
      eventType: event.type,
      subject: event.subject,
      subscriberCount: handlers.length
    })

    for (const handler of handlers) {
      try {
        await handler(event)
      } catch (error: any) {
        logger.error('Event handler failed', {
          eventId: event.id,
          eventType: event.type,
          error: error.message
        })
      }
    }
  }
}

export const eventBus = new EventBus()

// Event Publishers mit CloudEvents v1.0 Format

export async function publishTodoCreated(todo: any) {
  const event: CloudEvent = {
    id: uuidv4(),
    source: '/todo-service',
    specversion: '1.0',
    type: 'todos.todo.created.v1', // ✅ Format: <domain>.<entity>.<action>.v<version>
    datacontenttype: 'application/json',
    time: new Date().toISOString(), // ✅ ISO 8601
    subject: `todo/${todo.id}`,
    data: {
      todoId: todo.id,
      title: todo.title,
      status: todo.status,
      createdAt: todo.createdAt
    }
  }

  await eventBus.publish(event)
}

export async function publishTodoUpdated(todo: any) {
  const event: CloudEvent = {
    id: uuidv4(),
    source: '/todo-service',
    specversion: '1.0',
    type: 'todos.todo.updated.v1',
    datacontenttype: 'application/json',
    time: new Date().toISOString(),
    subject: `todo/${todo.id}`,
    data: {
      todoId: todo.id,
      title: todo.title,
      status: todo.status,
      updatedAt: todo.updatedAt
    }
  }

  await eventBus.publish(event)
}

export async function publishTodoCompleted(todo: any) {
  const event: CloudEvent = {
    id: uuidv4(),
    source: '/todo-service',
    specversion: '1.0',
    type: 'todos.todo.completed.v1',
    datacontenttype: 'application/json',
    time: new Date().toISOString(),
    subject: `todo/${todo.id}`,
    data: {
      todoId: todo.id,
      title: todo.title,
      completedAt: todo.completedAt
    }
  }

  await eventBus.publish(event)
}

export async function publishTodoDeleted(todo: any) {
  const event: CloudEvent = {
    id: uuidv4(),
    source: '/todo-service',
    specversion: '1.0',
    type: 'todos.todo.deleted.v1',
    datacontenttype: 'application/json',
    time: new Date().toISOString(),
    subject: `todo/${todo.id}`,
    data: {
      todoId: todo.id,
      title: todo.title
    }
  }

  await eventBus.publish(event)
}
