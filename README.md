# Vue Doctor

**Diagnose and fix performance, security, and correctness issues in your Vue/Nuxt app.**

```bash
npx vue-doctor@latest .
```

Vue Doctor scans your codebase and produces a 0–100 health score with actionable diagnostics across 7 categories and 42+ rules.

---

## What it checks

### Composition API
| Rule | Description |
|------|-------------|
| `no-watch-as-computed` | `watch()` that only sets derived state → use `computed()` |
| `no-async-watcheffect` | `async watchEffect()` without cleanup → race conditions |
| `prefer-ref-over-reactive-primitive` | `reactive({ count: 0 })` → use `ref(0)` |
| `no-mutation-in-computed` | Side effects in `computed()` getter |
| `no-watch-immediate-fetch` | `watch(..., fetch, { immediate: true })` → use `useFetch()` |
| `no-reactive-destructure` | Destructuring `reactive()` loses reactivity |
| `no-ref-in-computed` | Creating `ref()` inside `computed()` (memory leak) |
| `no-async-computed` | `computed(async () => ...)` creates Promise-based reactive state |
| `no-conditional-composable-call` | Calling `useXxx()` conditionally can break stable setup behavior |

### Performance
| Rule | Description |
|------|-------------|
| `no-index-as-key` | `v-for` with index as `:key` breaks reordering |
| `require-key-for-v-for` | `v-for` without `:key` |
| `no-expensive-inline-expression` | `{{ items.filter().map() }}` → use `computed` |
| `no-deep-watch` | `watch(..., { deep: true })` traverses entire object tree |
| `no-template-method-call` | Method calls inside `v-for` re-run on every render |
| `no-giant-component` | Components > 300 lines |

### Security
| Rule | Description |
|------|-------------|
| `no-v-html` | `v-html` enables XSS attacks |
| `no-eval` | `eval()` / `new Function()` execute arbitrary code |
| `no-secrets-in-client` | API keys / tokens hardcoded in client code |

### Architecture
| Rule | Description |
|------|-------------|
| `no-prop-mutation` | Direct prop mutation breaks one-way data flow |
| `require-emits-declaration` | `emit()` without `defineEmits()` |
| `require-component-key` | Component in `v-for` without `:key` |

### Correctness
| Rule | Description |
|------|-------------|
| `no-direct-dom-manipulation` | `document.querySelector()` → use template refs |
| `no-this-in-setup` | `this` is undefined in `<script setup>` |
| `no-v-if-with-v-for` | `v-if` + `v-for` on same element (priority issue) |
| `require-defineprops-types` | `defineProps()` without TypeScript types |

### Nuxt
| Rule | Description |
|------|-------------|
| `use-usefetch-over-fetch` | Raw `fetch()` in setup → use `useFetch()` |
| `require-server-route-error-handling` | Server routes without try/catch |
| `no-window-in-ssr` | `window`/`document` access during SSR |
| `require-seo-meta` | Pages without `useSeoMeta()` or `useHead()` |
| `no-process-env-in-client` | `process.env` in client code → use `useRuntimeConfig()` |
| `require-define-page-meta` | Pages should define route/page metadata via `definePageMeta()` |
| `no-server-only-import-in-client` | Prevent server-only imports in client-rendered files |
| `no-client-composable-in-server-route` | Prevent client-only composables in Nuxt server routes |

### Bundle Size
| Rule | Description |
|------|-------------|
| `no-barrel-import` | Barrel imports prevent tree-shaking |
| `no-full-lodash-import` | Full lodash adds ~70kb |
| `no-moment-import` | moment.js adds ~230kb |
| `prefer-async-component` | Heavy components that could be async-loaded |
| `no-heavy-library` | Importing jQuery, Underscore, Ramda |

### Accessibility
| Rule | Description |
|------|-------------|
| `require-reduced-motion` | Motion libraries without `prefers-reduced-motion` support (WCAG 2.3.3) |
| `no-autofocus` | `autofocus` can disrupt keyboard and screen-reader users |
| `no-positive-tabindex` | Positive tabindex breaks natural keyboard navigation |
| `require-button-type` | `<button>` without `type` can trigger unintended form submits |
| `require-img-alt` | `<img>` must include an `alt` attribute |
| `require-accessible-form-control-name` | Form controls need an accessible name (`aria-label`/`aria-labelledby`/label) |
| `no-click-without-keyboard-handler` | Clickable non-interactive elements must support keyboard interaction |
| `require-media-captions` | `<video>` should include captions/subtitles tracks |
| `no-aria-hidden-on-focusable` | Prevent `aria-hidden=\"true\"` on focusable controls |

---

## CLI Usage

```bash
# Scan current directory
npx vue-doctor@latest .

# Scan specific directory
npx vue-doctor@latest ./my-app

# Show verbose file details per rule
npx vue-doctor@latest . --verbose

# Output only the health score (0-100)
npx vue-doctor@latest . --score

# Scan only files changed vs main branch
npx vue-doctor@latest . --diff

# Scan only files changed vs a specific branch
npx vue-doctor@latest . --diff main

# Skip prompts (CI mode)
npx vue-doctor@latest . -y

# Disable dead code detection
npx vue-doctor@latest . --no-dead-code

# Select a specific workspace project
npx vue-doctor@latest . --project my-app

# Copy scan output to clipboard for AI assistants
npx vue-doctor@latest . --prompt

# Open AI assistant to auto-fix issues
npx vue-doctor@latest . --fix
```

---

## AI Integration

Vue Doctor integrates with AI coding assistants to help fix issues automatically.

### Using --fix

```bash
npx vue-doctor@latest . --fix
```

Opens your AI assistant (Claude Code or Cursor) with a pre-built prompt to fix all detected issues.

### Using --prompt

```bash
npx vue-doctor@latest . --prompt
```

Copies the scan output and a fix prompt to your clipboard. Paste it into any AI assistant.

### fix command

```bash
npx vue-doctor@latest fix
```

Opens your AI assistant to fix issues without running a scan first.

---

## Install as a Skill

Add Vue Doctor's rules as a [skill](https://skills.sh) for your AI coding agent:

```bash
npx skills add Arjun-Ingole/vue-doctor
```

This gives AI agents like Cursor, Claude Code, Copilot, and others access to all 30+ Vue best practice rules. The CLI will also prompt to install the skill after scanning.

---

## GitHub Actions

Use Vue Doctor in your CI/CD pipeline:

```yaml
# .github/workflows/vue-doctor.yml
name: Vue Doctor

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Run Vue Doctor
        uses: Arjun-Ingole/vue-doctor@main
        with:
          directory: '.'
          verbose: 'true'
```

### Action Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `directory` | `.` | Project directory to scan |
| `verbose` | `true` | Show file details per rule |
| `project` | - | Workspace project(s) to scan |
| `node-version` | `20` | Node.js version |

### Action Outputs

| Output | Description |
|--------|-------------|
| `score` | Health score (0-100) |

---

## Configuration

Create `vue-doctor.config.json` in your project root, or add a `vueDoctor` key to `package.json`:

```json
{
  "ignore": {
    "rules": ["vue-doctor/no-v-html"],
    "files": ["src/generated/**", "src/legacy/**"]
  },
  "lint": true,
  "deadCode": true,
  "verbose": false,
  "diff": false
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ignore.rules` | `string[]` | `[]` | Rule IDs to ignore |
| `ignore.files` | `string[]` | `[]` | Glob patterns for files to ignore |
| `lint` | `boolean` | `true` | Run lint checks |
| `deadCode` | `boolean` | `true` | Run dead code detection |
| `verbose` | `boolean` | `false` | Show file paths per diagnostic |
| `diff` | `boolean\|string` | `false` | Scan only changed files |

---

## Programmatic API

```ts
import { diagnose } from 'vue-doctor/api'

const result = await diagnose('./my-vue-app', {
  lint: true,
  deadCode: true,
})

console.log(result.score)          // { score: 84, label: 'Good' }
console.log(result.diagnostics)    // Diagnostic[]
console.log(result.project)        // { framework: 'nuxt', vueVersion: '^3.4.0', ... }
console.log(result.elapsedMilliseconds)
```

---

## ESLint Plugin

Use the rules standalone in your ESLint config:

```js
// eslint.config.js
import vueDoctorPlugin from 'vue-doctor/eslint-plugin'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: { parser: vueParser },
    plugins: { 'vue-doctor': vueDoctorPlugin },
    rules: {
      'vue-doctor/no-v-html': 'error',
      'vue-doctor/no-prop-mutation': 'error',
      'vue-doctor/no-index-as-key': 'warn',
      'vue-doctor/no-barrel-import': 'warn',
    },
  },
]
```

---

## Score

The health score (0–100) is calculated based on the number and severity of diagnostics found:

| Score | Label | Meaning |
|-------|-------|---------|
| 75–100 | Good | Healthy codebase |
| 50–74 | OK | Some issues to address |
| 0–49 | Critical | Significant problems |

---

## Monorepo Support

Vue Doctor automatically detects monorepos (pnpm workspaces, npm workspaces) and lets you scan individual packages:

```bash
# Scan all packages
npx vue-doctor@latest . -y

# Scan a specific package
npx vue-doctor@latest . --project my-nuxt-app
```

---

## Inspired by

- [react-doctor](https://github.com/millionco/react-doctor) — the original diagnostic tool for React
- [eslint-plugin-vue](https://eslint.vuejs.org/) — official Vue ESLint plugin

---

MIT License
