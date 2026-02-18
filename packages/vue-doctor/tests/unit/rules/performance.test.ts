import { RuleTester } from 'eslint'
import { performanceRules } from '../../../src/plugin/rules/performance.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

describe('performance rules', () => {
  describe('no-deep-watch', () => {
    const rule = performanceRules['no-deep-watch']

    ruleTester.run('no-deep-watch', rule, {
      valid: [
        'watch(obj, handler)',
        'watch(obj, handler, { immediate: true })',
      ],
      invalid: [
        {
          code: 'watch(obj, handler, { deep: true })',
          errors: [{ messageId: 'preferShallow' }],
        },
      ],
    })
  })

  describe('no-giant-component', () => {
    const rule = performanceRules['no-giant-component']

    const largeCode = '\n'.repeat(301)
    const smallCode = '\n'.repeat(100)

    ruleTester.run('no-giant-component', rule, {
      valid: [{ code: smallCode }],
      invalid: [
        {
          code: largeCode,
          errors: [{ messageId: 'splitComponent' }],
        },
      ],
    })
  })
})
