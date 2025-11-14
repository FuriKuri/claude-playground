// ✅ Regel 9: Health Check Endpunkte
// Liveness: Nur Prozess-Status (keine Dependencies)
// Readiness: Prüft alle Dependencies (DB, etc.)

import { Request, Response } from 'express'
import { db } from '../infrastructure/database'
import { logger } from './logger'

interface HealthCheck {
  status: 'ok' | 'fail' | 'degraded'
  responseTime?: number
  error?: string
}

// Liveness: Nur Prozess-Status - keine Dependency-Checks
export async function livenessCheck(req: Request, res: Response) {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(), // ✅ ISO 8601
    uptime: process.uptime()
  })
}

// Readiness: Prüft Dependencies - DB, externe APIs, etc.
export async function readinessCheck(req: Request, res: Response) {
  const checks = {
    database: await checkDatabase()
  }

  const isReady = Object.values(checks).every(check => check.status === 'ok')

  if (isReady) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks
    })
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      checks
    })
  }
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    await db.query('SELECT 1')
    return {
      status: 'ok',
      responseTime: Date.now() - start
    }
  } catch (error: any) {
    logger.error('Database health check failed', { error: error.message })
    return {
      status: 'fail',
      error: error.message
    }
  }
}
