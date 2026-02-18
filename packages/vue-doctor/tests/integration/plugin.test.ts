import { describe, it, expect } from 'vitest'
import { vueDoctorPlugin } from '../../src/plugin/index.js'

describe('vueDoctorPlugin', () => {
  it('exports the plugin object', () => {
    expect(vueDoctorPlugin).toBeDefined()
    expect(vueDoctorPlugin.rules).toBeDefined()
  })

  it('contains all expected rule categories', () => {
    const ruleIds = Object.keys(vueDoctorPlugin.rules)

    expect(ruleIds.length).toBeGreaterThan(20)
  })

  it('contains composition-api rules', () => {
    const ruleIds = Object.keys(vueDoctorPlugin.rules)

    expect(ruleIds).toContain('no-watch-as-computed')
    expect(ruleIds).toContain('no-async-watcheffect')
    expect(ruleIds).toContain('prefer-ref-over-reactive-primitive')
    expect(ruleIds).toContain('no-mutation-in-computed')
    expect(ruleIds).toContain('no-watch-immediate-fetch')
    expect(ruleIds).toContain('no-reactive-destructure')
    expect(ruleIds).toContain('no-ref-in-computed')
  })

  it('contains security rules', () => {
    const ruleIds = Object.keys(vueDoctorPlugin.rules)

    expect(ruleIds).toContain('no-v-html')
    expect(ruleIds).toContain('no-eval')
    expect(ruleIds).toContain('no-secrets-in-client')
  })

  it('contains performance rules', () => {
    const ruleIds = Object.keys(vueDoctorPlugin.rules)

    expect(ruleIds).toContain('no-index-as-key')
    expect(ruleIds).toContain('no-expensive-inline-expression')
    expect(ruleIds).toContain('require-key-for-v-for')
    expect(ruleIds).toContain('no-deep-watch')
    expect(ruleIds).toContain('no-template-method-call')
    expect(ruleIds).toContain('no-giant-component')
  })

  it('contains architecture rules', () => {
    const ruleIds = Object.keys(vueDoctorPlugin.rules)

    expect(ruleIds).toContain('no-prop-mutation')
    expect(ruleIds).toContain('require-emits-declaration')
    expect(ruleIds).toContain('require-component-key')
  })

  it('contains correctness rules', () => {
    const ruleIds = Object.keys(vueDoctorPlugin.rules)

    expect(ruleIds).toContain('no-direct-dom-manipulation')
    expect(ruleIds).toContain('no-async-setup-without-note')
    expect(ruleIds).toContain('no-this-in-setup')
    expect(ruleIds).toContain('no-v-if-with-v-for')
    expect(ruleIds).toContain('require-defineprops-types')
  })

  it('contains bundle-size rules', () => {
    const ruleIds = Object.keys(vueDoctorPlugin.rules)

    expect(ruleIds).toContain('no-barrel-import')
    expect(ruleIds).toContain('no-full-lodash-import')
    expect(ruleIds).toContain('no-moment-import')
    expect(ruleIds).toContain('prefer-async-component')
    expect(ruleIds).toContain('no-heavy-library')
  })

  it('contains nuxt rules', () => {
    const ruleIds = Object.keys(vueDoctorPlugin.rules)

    expect(ruleIds).toContain('use-usefetch-over-fetch')
    expect(ruleIds).toContain('require-server-route-error-handling')
    expect(ruleIds).toContain('no-window-in-ssr')
    expect(ruleIds).toContain('require-seo-meta')
    expect(ruleIds).toContain('no-process-env-in-client')
  })

  it('all rules have required meta properties', () => {
    for (const [ruleId, rule] of Object.entries(vueDoctorPlugin.rules)) {
      expect(rule.meta, `Rule ${ruleId} should have meta`).toBeDefined()
      expect(rule.meta.type, `Rule ${ruleId} should have meta.type`).toBeDefined()
      expect(rule.meta.docs, `Rule ${ruleId} should have meta.docs`).toBeDefined()
      expect(rule.meta.messages, `Rule ${ruleId} should have meta.messages`).toBeDefined()
      expect(rule.create, `Rule ${ruleId} should have create function`).toBeDefined()
    }
  })

  it('all rules have valid type values', () => {
    const validTypes = ['problem', 'suggestion', 'layout']

    for (const [ruleId, rule] of Object.entries(vueDoctorPlugin.rules)) {
      expect(validTypes, `Rule ${ruleId} should have valid type`).toContain(rule.meta.type)
    }
  })
})
