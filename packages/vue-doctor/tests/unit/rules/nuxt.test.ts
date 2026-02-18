import { RuleTester } from 'eslint'
import { nuxtRules } from '../../../src/plugin/rules/nuxt.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

describe('nuxt rules', () => {
  describe('use-usefetch-over-fetch', () => {
    const rule = nuxtRules['use-usefetch-over-fetch']

    ruleTester.run('use-usefetch-over-fetch', rule, {
      valid: [
        'const { data } = await useFetch("/api/users")',
        'fetch("/api/data").then(r => r.json())',
      ],
      invalid: [
        {
          code: 'const data = await fetch("/api/users")',
          errors: [{ messageId: 'useNuxtFetch' }],
        },
      ],
    })
  })

  describe('no-window-in-ssr', () => {
    const rule = nuxtRules['no-window-in-ssr']

    ruleTester.run('no-window-in-ssr', rule, {
      valid: [
        'onMounted(() => { console.log(window.innerWidth) })',
        'function check() { if (typeof window === "undefined") return }',
      ],
      invalid: [
        {
          code: 'const width = window.innerWidth',
          errors: [{ messageId: 'wrapInOnMounted' }],
        },
        {
          code: 'document.querySelector(".foo")',
          errors: [{ messageId: 'wrapInOnMounted' }],
        },
      ],
    })
  })

  describe('no-process-env-in-client', () => {
    const rule = nuxtRules['no-process-env-in-client']

    ruleTester.run('no-process-env-in-client', rule, {
      valid: [
        {
          code: 'const config = useRuntimeConfig()',
          filename: '/project/pages/index.vue',
        },
        {
          code: 'const apiKey = process.env.API_KEY',
          filename: '/project/server/api/data.ts',
        },
      ],
      invalid: [
        {
          code: 'const apiKey = process.env.API_KEY',
          filename: '/project/pages/index.vue',
          errors: [{ messageId: 'useRuntimeConfig' }],
        },
      ],
    })
  })
})
