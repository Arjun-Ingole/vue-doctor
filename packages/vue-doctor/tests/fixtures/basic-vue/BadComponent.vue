<template>
  <!-- Bad: v-for without :key -->
  <div v-for="item in items">{{ item.name }}</div>

  <!-- Bad: v-html XSS risk -->
  <div v-html="userContent"></div>

  <!-- Bad: v-if with v-for on same element -->
  <li v-for="user in users" v-if="user.active" :key="user.id">{{ user.name }}</li>

  <!-- Bad: index as key -->
  <span v-for="(item, index) in list" :key="index">{{ item }}</span>

  <!-- Bad: expensive inline expression -->
  <p>{{ items.filter(x => x.active).map(x => x.name).join(', ') }}</p>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, watchEffect } from 'vue'
import _ from 'lodash'
import moment from 'moment'

// Bad: reactive with single primitive
const state = reactive({ count: 0 })

// Bad: destructuring reactive loses reactivity
const { count } = reactive({ count: 0, name: 'test' })

// Bad: watch as computed
const doubled = ref(0)
watch(state, (val) => {
  doubled.value = val.count * 2
})

// Bad: async watchEffect
watchEffect(async () => {
  const data = await fetch('/api/data')
})

// Bad: mutation in computed
const items = ref([1, 2, 3])
const total = computed(() => {
  items.value.push(4) // mutation!
  return items.value.reduce((a, b) => a + b, 0)
})

// Bad: hardcoded secret
const API_KEY = "sk-proj-abc123def456ghi789jkl012mno345"

// Bad: using this
console.log(this)

// Bad: direct DOM
document.querySelector('.my-element')
</script>
