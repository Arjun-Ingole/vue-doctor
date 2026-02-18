import { RuleTester } from 'eslint'
import { architectureRules } from '../../../src/plugin/rules/architecture.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

describe('architecture rules', () => {
  describe('no-prop-mutation', () => {
    const rule = architectureRules['no-prop-mutation']

    ruleTester.run('no-prop-mutation', rule, {
      valid: [
        'const props = defineProps({ title: String }); emit("update:title", newValue)',
        'const props = defineProps({ count: Number }); const local = ref(props.count)',
      ],
      invalid: [
        {
          code: 'const props = defineProps({ title: String }); props.title = "new"',
          errors: [{ messageId: 'noPropMutation' }],
        },
      ],
    })
  })

  describe('require-emits-declaration', () => {
    const rule = architectureRules['require-emits-declaration']

    ruleTester.run('require-emits-declaration', rule, {
      valid: [
        'const emit = defineEmits(["update"]); emit("update", value)',
      ],
      invalid: [
        {
          code: 'emit("update", value)',
          errors: [{ messageId: 'declareEmits' }],
        },
      ],
    })
  })
})
