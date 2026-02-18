<template>
  <div>
    <div v-for="item in items" :key="item.id">
      {{ item.name }}
    </div>
    <div>{{ formattedItems }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Item {
  id: string
  name: string
  active: boolean
}

const items = ref<Item[]>([])

const formattedItems = computed(() => {
  return items.value
    .filter(x => x.active)
    .map(x => x.name)
    .join(', ')
})
</script>
