// Server Setup mit Apollo Server, Express, Health Checks

import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import express from 'express'
import http from 'http'
import { readFileSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { DateTimeResolver, DateResolver } from 'graphql-scalars'
import dotenv from 'dotenv'

import { todoResolvers } from './resolvers/todoResolver'
import { initDatabase } from './infrastructure/database'
import { livenessCheck, readinessCheck } from './utils/health'
import { logger } from './utils/logger'

dotenv.config()

// ✅ Regel 1: GraphQL Schema laden
const typeDefs = readFileSync(join(__dirname, 'schema/todo.graphql'), 'utf-8')

// ✅ Regel 4: DateTime und Date Scalars registrieren
const resolvers = {
  DateTime: DateTimeResolver,
  Date: DateResolver,
  ...todoResolvers
}

async function startServer() {
  const app = express()
  const httpServer = http.createServer(app)

  // ✅ Regel 9: Health Check Endpunkte
  app.get('/health/live', livenessCheck)
  app.get('/health/ready', readinessCheck)

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (formattedError, error) => {
      // ✅ Regel 3: Strukturiertes Error Logging
      logger.error('GraphQL error', {
        message: formattedError.message,
        code: formattedError.extensions?.code,
        path: formattedError.path
      })
      return formattedError
    }
  })

  await server.start()

  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({
        // ✅ Regel 3: CorrelationId für Request Tracing
        correlationId: req.headers['x-correlation-id'] || uuidv4()
      })
    })
  )

  // Initialize database
  await initDatabase()

  const PORT = process.env.PORT || 4000

  await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve))

  // ✅ Regel 3: Strukturiertes Logging beim Start
  logger.info('Server started successfully', {
    port: PORT,
    graphql: `http://localhost:${PORT}/graphql`,
    healthLive: `http://localhost:${PORT}/health/live`,
    healthReady: `http://localhost:${PORT}/health/ready`,
    environment: process.env.NODE_ENV || 'development'
  })
}

startServer().catch((error) => {
  logger.error('Failed to start server', {
    error: error.message,
    stack: error.stack
  })
  process.exit(1)
})
