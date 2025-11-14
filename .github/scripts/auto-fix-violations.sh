#!/bin/bash
#Auto-fix architecture violations

set -e

echo "🤖 Auto-fixing architecture violations..."

# Fix src/schema/todo.graphql
echo "Fixing src/schema/todo.graphql..."

# Rule 1: Rename todo_priority to TodoPriority
sed -i '' 's/enum todo_priority {/enum TodoPriority {/g' src/schema/todo.graphql

# Rule 1: Fix enum values to SCREAMING_SNAKE_CASE
sed -i '' 's/  low$/  LOW/g' src/schema/todo.graphql
sed -i '' 's/  medium$/  MEDIUM/g' src/schema/todo.graphql
sed -i '' 's/  high$/  HIGH/g' src/schema/todo.graphql
sed -i '' 's/  urgent$/  URGENT/g' src/schema/todo.graphql

# Rule 1: Rename priority_level to priorityLevel
sed -i '' 's/priority_level: todo_priority/priorityLevel: TodoPriority/g' src/schema/todo.graphql
sed -i '' 's/priority_level: TodoPriority/priorityLevel: TodoPriority/g' src/schema/todo.graphql

# Rule 1: Rename priority_set_at to prioritySetAt
sed -i '' 's/priority_set_at: Int/prioritySetAt: DateTime/g' src/schema/todo.graphql

# Rule 2: Add Union type for setPriority and update inputs
sed -i '' '/input UpdateTodoInput {/i\
\
"""\\
Success result for setPriority mutation\\
"""\\
type SetPrioritySuccess {\\
  todo: Todo!\\
}\\
\
"""\\
Result type for setPriority mutation\\
"""\\
union SetPriorityResult = SetPrioritySuccess | TodoNotFoundError\\

' src/schema/todo.graphql

# Update setPriority mutation return type
sed -i '' 's/setPriority(id: ID!, priority: todo_priority!): Todo/setPriority(id: ID!, priority: TodoPriority!): SetPriorityResult!/g' src/schema/todo.graphql
sed -i '' 's/setPriority(id: ID!, priority: TodoPriority!): Todo/setPriority(id: ID!, priority: TodoPriority!): SetPriorityResult!/g' src/schema/todo.graphql

# Fix input types to use TodoPriority
sed -i '' 's/priority_level: todo_priority/priorityLevel: TodoPriority/g' src/schema/todo.graphql

echo "✓ Fixed src/schema/todo.graphql"

# Fix src/resolvers/todoResolver.ts
echo "Fixing src/resolvers/todoResolver.ts..."

# Rule 3: Replace console.log with logger
sed -i '' "s/console.log('Setting priority for todo:', id, priority)/log.info('Setting priority for todo', { todoId: id, priority })/g" src/resolvers/todoResolver.ts
sed -i '' "s/console.log('Priority set successfully')/log.info('Priority set successfully', { todoId: id })/g" src/resolvers/todoResolver.ts

# Rule 2: Return union type from setPriority
sed -i '' '/setPriority: async (_: any, { id, priority }: any, context: any) => {/,/return todo/c\
    setPriority: async (_: any, { id, priority }: any, context: any) => {\
      const log = logger.child({ correlationId: context.correlationId })\
\
      log.info('\''Setting priority for todo'\'', { todoId: id, priority })\
\
      const todo = await todoService.setPriority(id, priority)\
\
      if (!todo) {\
        return {\
          __typename: '\''TodoNotFoundError'\'',\
          message: '\''Todo not found'\'',\
          code: '\''TODO_NOT_FOUND'\'',\
          todoId: id\
        }\
      }\
\
      log.info('\''Priority set successfully'\'', { todoId: id })\
      return {\
        __typename: '\''SetPrioritySuccess'\'',\
        todo\
      }
' src/resolvers/todoResolver.ts

echo "✓ Fixed src/resolvers/todoResolver.ts"

# Fix src/services/todoService.ts
echo "Fixing src/services/todoService.ts..."

# Rule 4: Replace Date.now() with new Date().toISOString()
sed -i '' 's/const priorityTimestamp = input.priority_level ? Date.now() : null/const priorityTimestamp = input.priority_level ? new Date().toISOString() : null/g' src/services/todoService.ts
sed -i '' 's/const timestamp = Date.now()/const timestamp = new Date().toISOString()/g' src/services/todoService.ts

# Rule 1: Update field names in mapRow
sed -i '' 's/priority_level: row.priority_level/priorityLevel: row.priority_level/g' src/services/todoService.ts
sed -i '' 's/priority_set_at: row.priority_set_at/prioritySetAt: row.priority_set_at/g' src/services/todoService.ts

echo "✓ Fixed src/services/todoService.ts"

# Fix src/infrastructure/database.ts
echo "Fixing src/infrastructure/database.ts..."

# Update database column types
sed -i '' 's/priority_set_at INTEGER/priority_set_at TIMESTAMP/g' src/infrastructure/database.ts

echo "✓ Fixed src/infrastructure/database.ts"

echo "✅ All architecture violations fixed!"
