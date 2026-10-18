<template>
  <Icon :icon="name" />
</template>

<script setup>
import Icon from '@/components/Icon.vue'

defineProps({ name: { type: String, required: true } })
</script>
