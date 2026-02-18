import { describe, it, expect } from 'vitest'
import { diagnose } from '../../src/index.js'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('diagnose API', () => {
  const fixturesDir = join(__dirname, '../fixtures/basic-vue')

  it('returns diagnostics for a Vue project', async () => {
    const result = await diagnose(fixturesDir, {
      lint: true,
      deadCode: false,
    })

    expect(result).toHaveProperty('diagnostics')
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('project')
    expect(result).toHaveProperty('elapsedMilliseconds')
    expect(Array.isArray(result.diagnostics)).toBe(true)
    expect(result.elapsedMilliseconds).toBeGreaterThan(0)
  })

  it('returns project info', async () => {
    const result = await diagnose(fixturesDir, {
      lint: false,
      deadCode: false,
    })

    expect(result.project).toHaveProperty('rootDirectory')
    expect(result.project).toHaveProperty('framework')
    expect(result.project).toHaveProperty('hasTypeScript')
  })

  it('can disable lint checks', async () => {
    const result = await diagnose(fixturesDir, {
      lint: false,
      deadCode: false,
    })

    expect(result.diagnostics).toHaveLength(0)
    expect(result.score?.score).toBe(100)
    expect(result.score?.label).toBe('Perfect')
  })

  it('detects Vue files with issues', async () => {
    const result = await diagnose(fixturesDir, {
      lint: true,
      deadCode: false,
    })

    const ruleIds = result.diagnostics.map((d) => d.rule)

    expect(ruleIds.length).toBeGreaterThan(0)
  })

  it('returns valid score structure', async () => {
    const result = await diagnose(fixturesDir, {
      lint: true,
      deadCode: false,
    })

    if (result.score) {
      expect(result.score.score).toBeGreaterThanOrEqual(0)
      expect(result.score.score).toBeLessThanOrEqual(100)
      expect(['Perfect', 'Good', 'OK', 'Critical']).toContain(result.score.label)
    }
  })

  it('each diagnostic has required fields', async () => {
    const result = await diagnose(fixturesDir, {
      lint: true,
      deadCode: false,
    })

    for (const diagnostic of result.diagnostics) {
      expect(diagnostic).toHaveProperty('filePath')
      expect(diagnostic).toHaveProperty('plugin')
      expect(diagnostic).toHaveProperty('rule')
      expect(diagnostic).toHaveProperty('severity')
      expect(diagnostic).toHaveProperty('message')
      expect(diagnostic).toHaveProperty('line')
      expect(['error', 'warning']).toContain(diagnostic.severity)
    }
  })
})
