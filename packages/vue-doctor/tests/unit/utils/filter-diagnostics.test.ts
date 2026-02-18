import { describe, expect, it } from 'vitest'
import { filterIgnoredDiagnostics } from '../../../src/utils/filter-diagnostics.js'
import type { Diagnostic, VueDoctorConfig } from '../../../src/types.js'

const createDiagnostic = (overrides: Partial<Diagnostic> = {}): Diagnostic => ({
  filePath: '/test/file.vue',
  plugin: 'vue-doctor',
  rule: 'no-v-html',
  severity: 'error',
  message: 'Test message',
  help: 'Test help',
  line: 1,
  column: 1,
  category: 'security',
  ...overrides,
})

describe('filterIgnoredDiagnostics', () => {
  describe('no ignore config', () => {
    it('returns original array when config is empty', () => {
      const diagnostics = [createDiagnostic()]
      const result = filterIgnoredDiagnostics(diagnostics, {})
      expect(result).toEqual(diagnostics)
    })

    it('returns original array when ignore object is empty', () => {
      const diagnostics = [createDiagnostic()]
      const result = filterIgnoredDiagnostics(diagnostics, { ignore: {} })
      expect(result).toEqual(diagnostics)
    })
  })

  describe('rule filtering', () => {
    it('filters by full rule ID (plugin/rule)', () => {
      const diagnostics = [
        createDiagnostic({ rule: 'no-v-html' }),
        createDiagnostic({ rule: 'no-eval' }),
      ]
      const config: VueDoctorConfig = {
        ignore: { rules: ['vue-doctor/no-v-html'] },
      }
      const result = filterIgnoredDiagnostics(diagnostics, config)
      expect(result).toHaveLength(1)
      expect(result[0].rule).toBe('no-eval')
    })

    it('filters by short rule ID', () => {
      const diagnostics = [
        createDiagnostic({ rule: 'no-v-html' }),
        createDiagnostic({ rule: 'no-eval' }),
      ]
      const config: VueDoctorConfig = {
        ignore: { rules: ['no-v-html'] },
      }
      const result = filterIgnoredDiagnostics(diagnostics, config)
      expect(result).toHaveLength(1)
      expect(result[0].rule).toBe('no-eval')
    })

    it('filters multiple rules', () => {
      const diagnostics = [
        createDiagnostic({ rule: 'no-v-html' }),
        createDiagnostic({ rule: 'no-eval' }),
        createDiagnostic({ rule: 'no-index-as-key' }),
      ]
      const config: VueDoctorConfig = {
        ignore: { rules: ['no-v-html', 'no-eval'] },
      }
      const result = filterIgnoredDiagnostics(diagnostics, config)
      expect(result).toHaveLength(1)
      expect(result[0].rule).toBe('no-index-as-key')
    })
  })

  describe('file filtering', () => {
    it('filters by exact file path', () => {
      const diagnostics = [
        createDiagnostic({ filePath: '/src/components/Bad.vue' }),
        createDiagnostic({ filePath: '/src/components/Good.vue' }),
      ]
      const config: VueDoctorConfig = {
        ignore: { files: ['/src/components/Bad.vue'] },
      }
      const result = filterIgnoredDiagnostics(diagnostics, config)
      expect(result).toHaveLength(1)
      expect(result[0].filePath).toBe('/src/components/Good.vue')
    })

    it('filters with glob pattern **', () => {
      const diagnostics = [
        createDiagnostic({ filePath: '/src/components/Bad.vue' }),
        createDiagnostic({ filePath: '/src/views/Bad.vue' }),
        createDiagnostic({ filePath: '/src/components/Good.vue' }),
      ]
      const config: VueDoctorConfig = {
        ignore: { files: ['**/Bad.vue'] },
      }
      const result = filterIgnoredDiagnostics(diagnostics, config)
      expect(result).toHaveLength(1)
      expect(result[0].filePath).toBe('/src/components/Good.vue')
    })

    it('filters with single * pattern', () => {
      const diagnostics = [
        createDiagnostic({ filePath: '/src/test.vue' }),
        createDiagnostic({ filePath: '/src/components/test.vue' }),
      ]
      const config: VueDoctorConfig = {
        ignore: { files: ['/src/*.vue'] },
      }
      const result = filterIgnoredDiagnostics(diagnostics, config)
      expect(result).toHaveLength(1)
      expect(result[0].filePath).toBe('/src/components/test.vue')
    })

    it('filters directory pattern', () => {
      const diagnostics = [
        createDiagnostic({ filePath: '/src/generated/one.vue' }),
        createDiagnostic({ filePath: '/src/components/two.vue' }),
      ]
      const config: VueDoctorConfig = {
        ignore: { files: ['/src/generated/**'] },
      }
      const result = filterIgnoredDiagnostics(diagnostics, config)
      expect(result).toHaveLength(1)
      expect(result[0].filePath).toBe('/src/components/two.vue')
    })
  })

  describe('combined filtering', () => {
    it('filters both rules and files', () => {
      const diagnostics = [
        createDiagnostic({ filePath: '/src/a.vue', rule: 'no-v-html' }),
        createDiagnostic({ filePath: '/src/a.vue', rule: 'no-eval' }),
        createDiagnostic({ filePath: '/src/b.vue', rule: 'no-v-html' }),
      ]
      const config: VueDoctorConfig = {
        ignore: {
          rules: ['no-v-html'],
          files: ['/src/b.vue'],
        },
      }
      const result = filterIgnoredDiagnostics(diagnostics, config)
      expect(result).toHaveLength(1)
      expect(result[0].rule).toBe('no-eval')
      expect(result[0].filePath).toBe('/src/a.vue')
    })
  })

  describe('edge cases', () => {
    it('handles empty diagnostics array', () => {
      const result = filterIgnoredDiagnostics([], { ignore: { rules: ['no-v-html'] } })
      expect(result).toEqual([])
    })

    it('handles non-matching filters', () => {
      const diagnostics = [createDiagnostic()]
      const config: VueDoctorConfig = {
        ignore: { rules: ['non-existent-rule'] },
      }
      const result = filterIgnoredDiagnostics(diagnostics, config)
      expect(result).toEqual(diagnostics)
    })
  })
})
