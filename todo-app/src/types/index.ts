// Type Definitions

export interface Todo {
  id: string
  title: string
  description?: string
  status: TodoStatus
  dueDate?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export enum TodoStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}

export interface CreateTodoInput {
  title: string
  description?: string
  dueDate?: string
}

export interface UpdateTodoInput {
  title?: string
  description?: string
  status?: TodoStatus
  dueDate?: string
}

export interface GraphQLContext {
  correlationId: string
}
