import { RuleTester } from 'eslint'
import { securityRules } from '../../../src/plugin/rules/security.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

describe('security rules', () => {
  describe('no-eval', () => {
    const rule = securityRules['no-eval']

    ruleTester.run('no-eval', rule, {
      valid: [
        'const obj = JSON.parse(str)',
        'const fn = () => {}',
      ],
      invalid: [
        {
          code: 'eval("console.log(1)")',
          errors: [{ messageId: 'noEval' }],
        },
        {
          code: 'new Function("return 1")',
          errors: [{ messageId: 'noEval' }],
        },
      ],
    })
  })

  describe('no-secrets-in-client', () => {
    const rule = securityRules['no-secrets-in-client']

    ruleTester.run('no-secrets-in-client', rule, {
      valid: [
        'const API_KEY = process.env.API_KEY',
        'const name = "john"',
        'const token = "short"',
      ],
      invalid: [
        {
          code: 'const API_KEY = "sk-proj-abc123def456ghi789"',
          errors: [{ messageId: 'noSecret' }],
        },
        {
          code: 'const password = "my-super-secret-password-123"',
          errors: [{ messageId: 'noSecret' }],
        },
      ],
    })
  })
})
