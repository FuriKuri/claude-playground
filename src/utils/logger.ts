// ✅ Regel 3: Strukturiertes Logging mit JSON-Format
// Alle Pflichtfelder: timestamp (ISO 8601), level, message, service, correlationId

import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }), // ISO 8601
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'todo-service',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.Console()
  ]
})

// Helper für strukturiertes Logging mit correlationId
export function createLogger(correlationId?: string) {
  return logger.child({ correlationId })
}
