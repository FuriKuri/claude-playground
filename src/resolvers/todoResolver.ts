// ✅ Regel 2: Strukturierte Fehlerbehandlung mit Union Types und GraphQLError

import { GraphQLError } from 'graphql'
import { todoService } from '../services/todoService'
import { validateInput, CreateTodoInputSchema, UpdateTodoInputSchema } from '../utils/validation'
import { logger } from '../utils/logger'

export const todoResolvers = {
  Query: {
    todos: async (_: any, { status }: any, context: any) => {
      const log = logger.child({ correlationId: context.correlationId })

      log.info('Fetching todos', { status })

      try {
        const todos = await todoService.findAll(status)
        log.info('Todos fetched', { count: todos.length })
        return todos
      } catch (error: any) {
        log.error('Failed to fetch todos', { error: error.message, stack: error.stack })
        // ✅ Regel 2: Technischer Fehler mit extensions
        throw new GraphQLError('Failed to fetch todos', {
          extensions: {
            code: 'INTERNAL_ERROR',
            originalError: error.message
          }
        })
      }
    },

    todo: async (_: any, { id }: any, context: any) => {
      const log = logger.child({ correlationId: context.correlationId })

      log.info('Fetching todo', { todoId: id })

      try {
        const todo = await todoService.findById(id)

        if (!todo) {
          log.warn('Todo not found', { todoId: id })
          return null
        }

        return todo
      } catch (error: any) {
        log.error('Failed to fetch todo', { todoId: id, error: error.message })
        throw new GraphQLError('Failed to fetch todo', {
          extensions: {
            code: 'INTERNAL_ERROR',
            originalError: error.message
          }
        })
      }
    }
  },

  Mutation: {
    createTodo: async (_: any, { input }: any, context: any) => {
      const log = logger.child({ correlationId: context.correlationId })

      log.info('Creating todo', { input })

      // ✅ Regel 7: Explizite Validierung
      const validated = validateInput(CreateTodoInputSchema, input)
      if ('__typename' in validated) {
        log.warn('Validation failed', { errors: validated.fields })
        return validated // ✅ Regel 2: Validierungsfehler als Union Type
      }

      try {
        const todo = await todoService.create(validated)
        log.info('Todo created', { todoId: todo.id })

        // ✅ Regel 2: Erfolgsfall als Union Type
        return {
          __typename: 'CreateTodoSuccess',
          todo
        }
      } catch (error: any) {
        log.error('Failed to create todo', { error: error.message, stack: error.stack })
        throw new GraphQLError('Failed to create todo', {
          extensions: {
            code: 'INTERNAL_ERROR',
            originalError: error.message
          }
        })
      }
    },

    updateTodo: async (_: any, { id, input }: any, context: any) => {
      const log = logger.child({ correlationId: context.correlationId })

      log.info('Updating todo', { todoId: id, input })

      // ✅ Regel 7: Explizite Validierung
      const validated = validateInput(UpdateTodoInputSchema, input)
      if ('__typename' in validated) {
        return validated // ✅ Regel 2: Business Error als Union Type
      }

      try {
        const todo = await todoService.update(id, validated)

        if (!todo) {
          // ✅ Regel 2: Business Error als Union Type
          return {
            __typename: 'TodoNotFoundError',
            message: 'Todo not found',
            code: 'TODO_NOT_FOUND',
            todoId: id
          }
        }

        log.info('Todo updated', { todoId: id })
        return todo
      } catch (error: any) {
        log.error('Failed to update todo', { todoId: id, error: error.message })
        throw new GraphQLError('Failed to update todo', {
          extensions: {
            code: 'INTERNAL_ERROR',
            originalError: error.message
          }
        })
      }
    },

    deleteTodo: async (_: any, { id }: any, context: any) => {
      const log = logger.child({ correlationId: context.correlationId })

      log.info('Deleting todo', { todoId: id })

      try {
        const todo = await todoService.delete(id)

        if (!todo) {
          return {
            __typename: 'TodoNotFoundError',
            message: 'Todo not found',
            code: 'TODO_NOT_FOUND',
            todoId: id
          }
        }

        log.info('Todo deleted', { todoId: id })
        return todo
      } catch (error: any) {
        log.error('Failed to delete todo', { todoId: id, error: error.message })
        throw new GraphQLError('Failed to delete todo', {
          extensions: {
            code: 'INTERNAL_ERROR',
            originalError: error.message
          }
        })
      }
    },

    completeTodo: async (_: any, { id }: any, context: any) => {
      const log = logger.child({ correlationId: context.correlationId })

      log.info('Completing todo', { todoId: id })

      try {
        const todo = await todoService.complete(id)

        if (!todo) {
          return {
            __typename: 'TodoNotFoundError',
            message: 'Todo not found',
            code: 'TODO_NOT_FOUND',
            todoId: id
          }
        }

        log.info('Todo completed', { todoId: id })
        return todo
      } catch (error: any) {
        log.error('Failed to complete todo', { todoId: id, error: error.message })
        throw new GraphQLError('Failed to complete todo', {
          extensions: {
            code: 'INTERNAL_ERROR',
            originalError: error.message
          }
        })
      }
    },

    addTag: async (_: any, { todoId, tagName, tagColor }: any, context: any) => {
      const log = logger.child({ correlationId: context.correlationId })

      log.info('Adding tag to todo', { todoId, tagName, tagColor })

      const todo = await todoService.findById(todoId)

      if (!todo) {
        return {
          __typename: 'TodoNotFoundError',
          message: 'Todo not found',
          code: 'TODO_NOT_FOUND',
          todoId
        }
      }

      const tag = await todoService.addTag(todoId, tagName, tagColor)

      log.info('Tag added successfully', { todoId, tagId: tag.id })
      return {
        __typename: 'AddTagSuccess',
        tag
      }
    }
  },

  // ✅ Regel 2: __resolveType für Union Types
  CreateTodoResult: {
    __resolveType: (obj: any) => obj.__typename
  },

  UpdateTodoResult: {
    __resolveType: (obj: any) => obj.__typename || 'Todo'
  },

  DeleteTodoResult: {
    __resolveType: (obj: any) => obj.__typename || 'Todo'
  },

  AddTagResult: {
    __resolveType: (obj: any) => obj.__typename
  }
}
