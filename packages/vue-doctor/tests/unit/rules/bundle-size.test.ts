import { RuleTester } from 'eslint'
import { bundleSizeRules } from '../../../src/plugin/rules/bundle-size.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

describe('bundle-size rules', () => {
  describe('no-full-lodash-import', () => {
    const rule = bundleSizeRules['no-full-lodash-import']

    ruleTester.run('no-full-lodash-import', rule, {
      valid: [
        'import debounce from "lodash/debounce"',
        'import { debounce } from "lodash-es"',
      ],
      invalid: [
        {
          code: 'import _ from "lodash"',
          errors: [{ messageId: 'useEsmLodash' }],
        },
        {
          code: 'import { debounce, throttle } from "lodash"',
          errors: [{ messageId: 'useEsmLodash' }],
        },
      ],
    })
  })

  describe('no-moment-import', () => {
    const rule = bundleSizeRules['no-moment-import']

    ruleTester.run('no-moment-import', rule, {
      valid: [
        'import { format } from "date-fns"',
        'import dayjs from "dayjs"',
      ],
      invalid: [
        {
          code: 'import moment from "moment"',
          errors: [{ messageId: 'useDateFns' }],
        },
        {
          code: 'import moment from "moment-timezone"',
          errors: [{ messageId: 'useDateFns' }],
        },
      ],
    })
  })

  describe('no-barrel-import', () => {
    const rule = bundleSizeRules['no-barrel-import']

    ruleTester.run('no-barrel-import', rule, {
      valid: [
        'import Button from "./components/Button.vue"',
        'import { utility } from "some-package"',
      ],
      invalid: [
        {
          code: 'import { Button } from "./components"',
          errors: [{ messageId: 'directImport' }],
        },
        {
          code: 'import { Button } from "./components/index"',
          errors: [{ messageId: 'directImport' }],
        },
      ],
    })
  })

  describe('no-heavy-library', () => {
    const rule = bundleSizeRules['no-heavy-library']

    ruleTester.run('no-heavy-library', rule, {
      valid: [
        'import { something } from "light-lib"',
      ],
      invalid: [
        {
          code: 'import $ from "jquery"',
          errors: 1,
        },
        {
          code: 'import _ from "underscore"',
          errors: 1,
        },
      ],
    })
  })

  describe('prefer-async-component', () => {
    const rule = bundleSizeRules['prefer-async-component']

    ruleTester.run('prefer-async-component', rule, {
      valid: [
        'import MyComponent from "./MyComponent.vue"',
      ],
      invalid: [
        {
          code: 'import Editor from "./Editor.vue"',
          errors: [{ messageId: 'useAsyncComponent' }],
        },
        {
          code: 'import Chart from "./Chart.vue"',
          errors: [{ messageId: 'useAsyncComponent' }],
        },
      ],
    })
  })
})
