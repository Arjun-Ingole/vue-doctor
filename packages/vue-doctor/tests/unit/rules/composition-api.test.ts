import { RuleTester } from 'eslint'
import { compositionApiRules } from '../../../src/plugin/rules/composition-api.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

describe('composition-api rules', () => {
  describe('no-watch-as-computed', () => {
    const rule = compositionApiRules['no-watch-as-computed']

    ruleTester.run('no-watch-as-computed', rule, {
      valid: [
        'watch(state, (val) => { fetch(val); doubled.value = val * 2 })',
        'watch(state, () => { console.log("side effect") })',
        'const x = computed(() => state.count * 2)',
      ],
      invalid: [
        {
          code: 'watch(state, (val) => { doubled.value = val * 2 })',
          errors: [{ messageId: 'useComputed' }],
        },
        {
          code: 'watch(state, (val) => { a.value = val.x; b.value = val.y })',
          errors: [{ messageId: 'useComputed' }],
        },
      ],
    })
  })

  describe('no-async-watcheffect', () => {
    const rule = compositionApiRules['no-async-watcheffect']

    ruleTester.run('no-async-watcheffect', rule, {
      valid: [
        'watchEffect(() => { console.log("sync") })',
        'watch(async () => { await fetch() })',
      ],
      invalid: [
        {
          code: 'watchEffect(async () => { await fetch("/api") })',
          errors: [{ messageId: 'useWatchWithCleanup' }],
        },
        {
          code: 'watchEffect(async () => { const data = await getData() })',
          errors: [{ messageId: 'useWatchWithCleanup' }],
        },
      ],
    })
  })

  describe('prefer-ref-over-reactive-primitive', () => {
    const rule = compositionApiRules['prefer-ref-over-reactive-primitive']

    ruleTester.run('prefer-ref-over-reactive-primitive', rule, {
      valid: [
        'const count = ref(0)',
        'const state = reactive({ count: 0, name: "test" })',
        'const state = reactive({ items: [] })',
      ],
      invalid: [
        {
          code: 'const state = reactive({ count: 0 })',
          errors: [{ messageId: 'useRef' }],
        },
        {
          code: 'const state = reactive({ name: "" })',
          errors: [{ messageId: 'useRef' }],
        },
      ],
    })
  })

  describe('no-mutation-in-computed', () => {
    const rule = compositionApiRules['no-mutation-in-computed']

    ruleTester.run('no-mutation-in-computed', rule, {
      valid: [
        'const total = computed(() => items.value.reduce((a, b) => a + b, 0))',
        'const names = computed(() => items.value.map(i => i.name))',
      ],
      invalid: [
        {
          code: 'const total = computed(() => { items.value.push(4); return items.value.length })',
          errors: [{ messageId: 'noSideEffects' }],
        },
        {
          code: 'const x = computed(() => { count.value = 5; return count.value })',
          errors: [{ messageId: 'noSideEffects' }],
        },
      ],
    })
  })

  describe('no-watch-immediate-fetch', () => {
    const rule = compositionApiRules['no-watch-immediate-fetch']

    ruleTester.run('no-watch-immediate-fetch', rule, {
      valid: [
        'watch(id, (newId) => { fetch(newId) })',
        'watch(id, (newId) => { fetch(newId) }, { immediate: false })',
      ],
      invalid: [
        {
          code: 'watch(id, async (newId) => { await fetch(newId) }, { immediate: true })',
          errors: [{ messageId: 'useDataFetcher' }],
        },
      ],
    })
  })

  describe('no-reactive-destructure', () => {
    const rule = compositionApiRules['no-reactive-destructure']

    ruleTester.run('no-reactive-destructure', rule, {
      valid: [
        'const state = reactive({ count: 0 })',
        'const { count } = toRefs(state)',
      ],
      invalid: [
        {
          code: 'const { count } = reactive({ count: 0 })',
          errors: [{ messageId: 'useToRefs' }],
        },
        {
          code: 'const { x, y } = reactive({ x: 1, y: 2 })',
          errors: [{ messageId: 'useToRefs' }],
        },
      ],
    })
  })

  describe('no-ref-in-computed', () => {
    const rule = compositionApiRules['no-ref-in-computed']

    ruleTester.run('no-ref-in-computed', rule, {
      valid: [
        'const x = computed(() => props.value * 2)',
        'const localRef = ref(0); const x = computed(() => localRef.value)',
      ],
      invalid: [
        {
          code: 'const x = computed(() => { const local = ref(0); return local.value })',
          errors: [{ messageId: 'noNewRef' }],
        },
      ],
    })
  })
})
