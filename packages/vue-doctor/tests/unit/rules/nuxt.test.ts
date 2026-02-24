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
        'if (process.client) { console.log(window.innerWidth) }',
        'if (import.meta.client) { console.log(document.title) }',
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

  describe('require-define-page-meta', () => {
    const rule = nuxtRules['require-define-page-meta']

    ruleTester.run('require-define-page-meta', rule, {
      valid: [
        {
          code: 'definePageMeta({ layout: "default" })',
          filename: '/project/pages/index.vue',
        },
        {
          code: 'const x = 1',
          filename: '/project/components/app-card.vue',
        },
      ],
      invalid: [
        {
          code: 'const pageTitle = "Home"',
          filename: '/project/pages/index.vue',
          errors: [{ messageId: 'addPageMeta' }],
        },
      ],
    })
  })

  describe('no-server-only-import-in-client', () => {
    const rule = nuxtRules['no-server-only-import-in-client']

    ruleTester.run('no-server-only-import-in-client', rule, {
      valid: [
        {
          code: 'import { defineEventHandler } from "h3"',
          filename: '/project/server/api/users.ts',
        },
        {
          code: 'import { ref } from "vue"',
          filename: '/project/pages/index.vue',
        },
      ],
      invalid: [
        {
          code: 'import { defineEventHandler } from "h3"',
          filename: '/project/pages/index.vue',
          errors: [{ messageId: 'noServerImport' }],
        },
      ],
    })
  })

  describe('no-client-composable-in-server-route', () => {
    const rule = nuxtRules['no-client-composable-in-server-route']

    ruleTester.run('no-client-composable-in-server-route', rule, {
      valid: [
        {
          code: 'const route = useRoute()',
          filename: '/project/pages/index.vue',
        },
        {
          code: 'const eventHandler = defineEventHandler(() => "ok")',
          filename: '/project/server/api/ping.ts',
        },
      ],
      invalid: [
        {
          code: 'const route = useRoute()',
          filename: '/project/server/api/users.ts',
          errors: [{ messageId: 'noClientComposable' }],
        },
      ],
    })
  })
})
