<template>
  <template v-if="normalActions.length && !isMobileView">
    <Button
      v-for="action in normalActions"
      :key="action.label"
      :label="action.label"
      :class="isDriveAction(action) ? driveButton.className : undefined"
      @click="action.onClick(close)"
    >
      <template v-if="action.icon || isDriveAction(action)" #prefix>
        <img
          v-if="isDriveAction(action)"
          :src="driveButton.icon"
          class="gama-drive-icon"
          width="18"
          height="18"
          alt=""
          aria-hidden="true"
        />
        <FeatherIcon v-else :name="action.icon" class="h-4 w-4" />
      </template>
    </Button>
  </template>
  <Dropdown v-if="groupedActions.length" :options="groupedActions">
    <Button icon="lucide-more-horizontal" label="" />
  </Dropdown>
  <template v-if="groupedWithLabelActions.length && !isMobileView">
    <div v-for="g in groupedWithLabelActions" :key="g.label">
      <Dropdown v-slot="{ open }" :options="g.action">
        <Button
          :label="g.label"
          :iconRight="open ? 'chevron-up' : 'chevron-down'"
        />
      </Dropdown>
    </div>
  </template>
</template>

<script setup>
import { computed, shallowRef, watch } from 'vue'
import { Dropdown } from 'frappe-ui'
import { isMobileView } from '@/composables/settings'

const props = defineProps({
  actions: { type: [Object, Array, undefined], default: () => [] },
  close: { type: Function, default: () => {} },
})

const driveButton = shallowRef(window.gama?.drive_button)
const isDriveAction = (action) => driveButton.value?.matches(action)

watch(
  () => props.actions.some((action) => action.label === 'Drive'),
  async (hasDriveAction) => {
    if (!hasDriveAction || driveButton.value) return
    const asset = '/assets/gama/js/drive_button.js?v=20261007'
    await import(/* @vite-ignore */ asset)
    driveButton.value = window.gama.drive_button
  },
  { immediate: true },
)

const normalActions = computed(() => {
  return props.actions.filter((action) => !action.group)
})

const groupedWithLabelActions = computed(() => {
  let _actions = []

  props.actions
    .filter((action) => action.buttonLabel && action.group)
    .forEach((action) => {
      let groupIndex = _actions.findIndex((a) => a.label === action.buttonLabel)

      action.items = action.items.map((item) => {
        return {
          ...item,
          onClick: () => item.onClick(props.close),
        }
      })

      if (groupIndex > -1) {
        _actions[groupIndex].action.push(action)
      } else {
        _actions.push({
          label: action.buttonLabel,
          action: [action],
        })
      }
    })
  return _actions
})

const groupedActions = computed(() => {
  let _actions = []
  let _normalActions = normalActions.value

  if (isMobileView.value && _normalActions.length) {
    _actions.push({
      group: __('Actions'),
      hideLabel: true,
      items: _normalActions.map((action) => ({
        label: action.label,
        onClick: () => action.onClick(props.close),
        icon: action.icon,
      })),
    })
  }
  if (isMobileView.value && groupedWithLabelActions.value.length) {
    groupedWithLabelActions.value.map((group) => {
      group.action.forEach((action) => _actions.push(action))
    })
  }

  props.actions
    .filter((action) => action.group && !action.buttonLabel)
    .forEach((action) => {
      action.items = action.items.map((item) => {
        return {
          ...item,
          onClick: () => item.onClick(props.close),
        }
      })
      _actions.push(action)
    })

  return _actions
})
</script>
