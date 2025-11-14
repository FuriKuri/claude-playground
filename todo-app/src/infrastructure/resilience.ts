// ✅ Regel 10: Resilienz-Patterns
// - Timeout
// - Retry mit Exponential Backoff
// - Circuit Breaker
// - Fallback

// @ts-ignore - opossum doesn't have types but works fine
import CircuitBreaker from 'opossum'
import { logger } from '../utils/logger'

// Circuit Breaker Options für Datenbank-Operationen
export const dbBreakerOptions = {
  timeout: 5000,                    // 5s Timeout pro Request
  errorThresholdPercentage: 50,     // Öffnet bei 50% Fehlerrate
  resetTimeout: 30000,              // 30s bis Retry
  rollingCountTimeout: 10000,       // 10s Rolling Window
  rollingCountBuckets: 10,          // Buckets für Statistik
  name: 'database-breaker'
}

// Retry mit Exponential Backoff und Jitter
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1
      const isRetryable = error.code === 'ECONNRESET' ||
                          error.code === 'ETIMEDOUT' ||
                          error.code === 'ECONNREFUSED'

      if (isLastAttempt || !isRetryable) {
        throw error
      }

      // Exponential Backoff mit Jitter
      const delay = baseDelay * Math.pow(2, attempt)
      const jitter = Math.random() * 1000

      logger.warn('Retry attempt', {
        attempt: attempt + 1,
        maxRetries,
        delay: delay + jitter,
        error: error.message
      })

      await new Promise(resolve => setTimeout(resolve, delay + jitter))
    }
  }
  throw new Error('Max retries reached')
}

// Circuit Breaker Factory
export function createCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: any
): CircuitBreaker<T, R> {
  const breaker = new CircuitBreaker(fn, options)

  // Event Handlers für Monitoring
  breaker.on('open', () => {
    logger.error('Circuit breaker opened', {
      breaker: options.name,
      stats: breaker.stats
    })
  })

  breaker.on('halfOpen', () => {
    logger.warn('Circuit breaker half-open', { breaker: options.name })
  })

  breaker.on('close', () => {
    logger.info('Circuit breaker closed', { breaker: options.name })
  })

  return breaker
}
