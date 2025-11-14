// Basic tests for Todo Resolver

import { todoResolvers } from '../src/resolvers/todoResolver'
import { todoService } from '../src/services/todoService'

// Mock the todo service
jest.mock('../src/services/todoService')

describe('Todo Resolver', () => {
  const mockContext = { correlationId: 'test-123' }

  describe('Query.todos', () => {
    it('should return all todos', async () => {
      const mockTodos = [
        {
          id: '1',
          title: 'Test Todo',
          status: 'PENDING',
          createdAt: '2025-11-14T10:00:00Z',
          updatedAt: '2025-11-14T10:00:00Z'
        }
      ]

      ;(todoService.findAll as jest.Mock).mockResolvedValue(mockTodos)

      const result = await todoResolvers.Query.todos(null, {}, mockContext)

      expect(result).toEqual(mockTodos)
      expect(todoService.findAll).toHaveBeenCalledWith(undefined)
    })

    it('should filter todos by status', async () => {
      const mockTodos = [
        {
          id: '1',
          title: 'Test Todo',
          status: 'COMPLETED',
          createdAt: '2025-11-14T10:00:00Z',
          updatedAt: '2025-11-14T10:00:00Z'
        }
      ]

      ;(todoService.findAll as jest.Mock).mockResolvedValue(mockTodos)

      const result = await todoResolvers.Query.todos(
        null,
        { status: 'COMPLETED' },
        mockContext
      )

      expect(result).toEqual(mockTodos)
      expect(todoService.findAll).toHaveBeenCalledWith('COMPLETED')
    })
  })

  describe('Mutation.createTodo', () => {
    it('should create a todo with valid input', async () => {
      const input = {
        title: 'New Todo',
        description: 'Test description'
      }

      const mockTodo = {
        id: '1',
        ...input,
        status: 'PENDING',
        createdAt: '2025-11-14T10:00:00Z',
        updatedAt: '2025-11-14T10:00:00Z'
      }

      ;(todoService.create as jest.Mock).mockResolvedValue(mockTodo)

      const result = await todoResolvers.Mutation.createTodo(
        null,
        { input },
        mockContext
      )

      expect(result.__typename).toBe('CreateTodoSuccess')
      expect(result.todo).toEqual(mockTodo)
    })

    it('should return validation error for invalid input', async () => {
      const input = {
        title: 'ab' // Too short (minimum 3 characters)
      }

      const result = await todoResolvers.Mutation.createTodo(
        null,
        { input },
        mockContext
      )

      expect(result.__typename).toBe('ValidationError')
      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.fields).toBeDefined()
    })
  })

  describe('Mutation.completeTodo', () => {
    it('should complete an existing todo', async () => {
      const mockTodo = {
        id: '1',
        title: 'Test Todo',
        status: 'COMPLETED',
        completedAt: '2025-11-14T10:00:00Z',
        createdAt: '2025-11-14T09:00:00Z',
        updatedAt: '2025-11-14T10:00:00Z'
      }

      ;(todoService.complete as jest.Mock).mockResolvedValue(mockTodo)

      const result = await todoResolvers.Mutation.completeTodo(
        null,
        { id: '1' },
        mockContext
      )

      expect(result).toEqual(mockTodo)
      expect(todoService.complete).toHaveBeenCalledWith('1')
    })

    it('should return error for non-existent todo', async () => {
      ;(todoService.complete as jest.Mock).mockResolvedValue(null)

      const result = await todoResolvers.Mutation.completeTodo(
        null,
        { id: 'non-existent' },
        mockContext
      )

      expect(result.__typename).toBe('TodoNotFoundError')
      expect(result.code).toBe('TODO_NOT_FOUND')
      expect(result.todoId).toBe('non-existent')
    })
  })
})
