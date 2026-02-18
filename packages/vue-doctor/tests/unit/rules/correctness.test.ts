import { RuleTester } from 'eslint'
import { correctnessRules } from '../../../src/plugin/rules/correctness.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

describe('correctness rules', () => {
  describe('no-direct-dom-manipulation', () => {
    const rule = correctnessRules['no-direct-dom-manipulation']

    ruleTester.run('no-direct-dom-manipulation', rule, {
      valid: [
        'const el = useTemplateRef("myEl")',
        'element.focus()',
      ],
      invalid: [
        {
          code: 'document.querySelector(".foo")',
          errors: [{ messageId: 'useTemplateRef' }],
        },
        {
          code: 'document.getElementById("bar")',
          errors: [{ messageId: 'useTemplateRef' }],
        },
      ],
    })
  })

  describe('no-async-setup-without-note', () => {
    const rule = correctnessRules['no-async-setup-without-note']

    ruleTester.run('no-async-setup-without-note', rule, {
      valid: [
        'const obj = { setup() { return {} } }',
        'const obj = { setup: () => {} }',
      ],
      invalid: [
        {
          code: 'const obj = { async setup() { return {} } }',
          errors: [{ messageId: 'needsSuspense' }],
        },
        {
          code: 'const obj = { setup: async () => {} }',
          errors: [{ messageId: 'needsSuspense' }],
        },
      ],
    })
  })

  describe('no-this-in-setup', () => {
    const rule = correctnessRules['no-this-in-setup']

    ruleTester.run('no-this-in-setup', rule, {
      valid: [
        {
          code: 'const x = props.value',
          filename: 'test.vue',
        },
        {
          code: 'class Foo { method() { return this.bar } }',
          filename: 'test.ts',
        },
      ],
      invalid: [
        {
          code: 'console.log(this)',
          filename: 'test.vue',
          errors: [{ messageId: 'noThis' }],
        },
      ],
    })
  })

  describe('require-defineprops-types', () => {
    const rule = correctnessRules['require-defineprops-types']

    ruleTester.run('require-defineprops-types', rule, {
      valid: [
        {
          code: 'const props = defineProps({ title: String })',
          filename: 'test.vue',
        },
      ],
      invalid: [
        {
          code: 'const props = defineProps()',
          filename: 'test.vue',
          errors: [{ messageId: 'addTypes' }],
        },
      ],
    })
  })
})
