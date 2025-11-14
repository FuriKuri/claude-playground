// Datenbank-Infrastruktur mit PostgreSQL Connection Pool

import { Pool } from 'pg'
import { logger } from '../utils/logger'

export const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'todo_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
})

db.on('error', (err) => {
  logger.error('Database connection error', { error: err.message })
})

db.on('connect', () => {
  logger.info('Database connection established')
})

export async function initDatabase() {
  try {
    // Create todos table
    await db.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        due_date DATE,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        priority_level VARCHAR(10),
        priority_set_at TIMESTAMP,
        CONSTRAINT valid_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'))
      )
    `)

    // Create indexes for better query performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)
    `)

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at DESC)
    `)

    logger.info('Database initialized successfully')
  } catch (error: any) {
    logger.error('Database initialization failed', { error: error.message })
    throw error
  }
}
