import { describe, expect, it } from 'vitest'
import { calculateScore } from '../../../src/utils/calculate-score.js'
import type { Diagnostic } from '../../../src/types.js'

const createDiagnostic = (severity: 'error' | 'warning'): Diagnostic => ({
  filePath: '/test/file.vue',
  plugin: 'vue-doctor',
  rule: 'test-rule',
  severity,
  message: 'Test message',
  help: 'Test help',
  line: 1,
  column: 1,
  category: 'test',
})

describe('calculateScore', () => {
  describe('empty diagnostics', () => {
    it('returns perfect score (100) for empty array', () => {
      const result = calculateScore([])
      expect(result.score).toBe(100)
      expect(result.label).toBe('Perfect')
    })
  })

  describe('error-only diagnostics', () => {
    it('returns score 96 for 1 error (100 - 4)', () => {
      const result = calculateScore([createDiagnostic('error')])
      expect(result.score).toBe(96)
      expect(result.label).toBe('Good')
    })

    it('returns score 84 for 4 errors (100 - 16)', () => {
      const result = calculateScore(Array(4).fill(null).map(() => createDiagnostic('error')))
      expect(result.score).toBe(84)
      expect(result.label).toBe('Good')
    })

    it('caps penalty at 100', () => {
      const result = calculateScore(Array(30).fill(null).map(() => createDiagnostic('error')))
      expect(result.score).toBe(0)
      expect(result.label).toBe('Critical')
    })
  })

  describe('warning-only diagnostics', () => {
    it('returns score 98.5 rounded to 99 for 1 warning', () => {
      const result = calculateScore([createDiagnostic('warning')])
      expect(result.score).toBe(99)
      expect(result.label).toBe('Good')
    })

    it('returns score 85 for 10 warnings (100 - 15)', () => {
      const result = calculateScore(Array(10).fill(null).map(() => createDiagnostic('warning')))
      expect(result.score).toBe(85)
      expect(result.label).toBe('Good')
    })
  })

  describe('mixed errors and warnings', () => {
    it('calculates combined penalty correctly', () => {
      const diagnostics = [
        createDiagnostic('error'),
        createDiagnostic('error'),
        createDiagnostic('warning'),
      ]
      const result = calculateScore(diagnostics)
      expect(result.score).toBe(91)
      expect(result.label).toBe('Good')
    })
  })

  describe('score thresholds', () => {
    it('returns "Good" label for score >= 75', () => {
      const result = calculateScore(Array(5).fill(null).map(() => createDiagnostic('error')))
      expect(result.score).toBe(80)
      expect(result.label).toBe('Good')
    })

    it('returns "OK" label for score >= 50 and < 75', () => {
      const result = calculateScore(Array(8).fill(null).map(() => createDiagnostic('error')))
      expect(result.score).toBe(68)
      expect(result.label).toBe('OK')
    })

    it('returns "Critical" label for score < 50', () => {
      const result = calculateScore(Array(15).fill(null).map(() => createDiagnostic('error')))
      expect(result.score).toBe(40)
      expect(result.label).toBe('Critical')
    })

    it('returns "Critical" for score 0', () => {
      const result = calculateScore(Array(25).fill(null).map(() => createDiagnostic('error')))
      expect(result.score).toBe(0)
      expect(result.label).toBe('Critical')
    })
  })

  describe('edge cases', () => {
    it('score never goes below 0', () => {
      const diagnostics = Array(100).fill(null).map(() => createDiagnostic('error'))
      const result = calculateScore(diagnostics)
      expect(result.score).toBeGreaterThanOrEqual(0)
    })

    it('score is always an integer', () => {
      const diagnostics = [createDiagnostic('warning')]
      const result = calculateScore(diagnostics)
      expect(Number.isInteger(result.score)).toBe(true)
    })
  })
})
