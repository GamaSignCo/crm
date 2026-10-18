import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { compile } from '@vue/compiler-dom'
import * as Vue from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/FieldLayout/Field.vue'),
  'utf8',
)
const template = parse(source).descriptor.template.content
const compiled = compile(template, {
  mode: 'function',
  prefixIdentifiers: true,
})
const render = new Function('Vue', compiled.code)(Vue)
const mounted = []

afterEach(() => {
  for (const [app, target] of mounted.splice(0)) {
    app.unmount()
    target.remove()
  }
})

function mountCheckbox(disabled = false) {
  const data = Vue.reactive({ audit_check: false })
  const field = {
    visible: true,
    fieldtype: 'Check',
    fieldname: 'audit_check',
    label: 'Audit checkbox',
    disabled,
  }
  const fieldChange = vi.fn((value) => {
    data.audit_check = value
  })
  const app = Vue.createApp({
    setup: () => ({
      data,
      field,
      fieldChange,
      isEnriched: false,
      isNote: false,
    }),
    render,
  })
  for (const name of compiled.ast.components) {
    app.component(name, {
      props: { modelValue: Boolean, disabled: Boolean },
      setup: (props) => () =>
        name === 'FormControl'
          ? Vue.h('input', {
              type: 'checkbox',
              checked: props.modelValue,
              disabled: props.disabled,
            })
          : null,
    })
  }
  app.config.globalProperties.__ = (value) => value
  const target = document.createElement('div')
  document.body.append(target)
  app.mount(target)
  mounted.push([app, target])
  return { target, data, fieldChange }
}

describe('checkbox label document-change routing', () => {
  it('updates the value and dispatches the document change once', async () => {
    const { target, data, fieldChange } = mountCheckbox()
    target.querySelector('label').click()
    await Vue.nextTick()
    expect(data.audit_check).toBe(true)
    expect(fieldChange).toHaveBeenCalledOnce()
  })

  it('does not change a disabled field or dispatch a script event', async () => {
    const { target, data, fieldChange } = mountCheckbox(true)
    target.querySelector('label').click()
    await Vue.nextTick()
    expect(data.audit_check).toBe(false)
    expect(fieldChange).not.toHaveBeenCalled()
  })
})
