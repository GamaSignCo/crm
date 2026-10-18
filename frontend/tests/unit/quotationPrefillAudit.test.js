import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

describe('company quotation prefill ownership', () => {
  it('does not replace richer company rows when a native response arrives late', async () => {
    const callbacks = []
    const rows = new Map()
    let handlers
    const source = readFileSync(
      resolve(process.cwd(), '../crm/public/js/erpnext_quotation_prefill.js'),
      'utf8',
    )
    const frappe = {
      ui: { form: { on: (_doctype, value) => (handlers = value) } },
      call: (request) => callbacks.push(request.callback),
      model: {
        set_value: async (_doctype, name, field, value) => {
          rows.get(name)[field] = value
        },
      },
    }
    runInNewContext(source, { frappe })
    const form = {
      doc: { crm_deal: 'AUDIT-DEAL', currency: 'TRY', items: [] },
      set_value: async (field, value) => (form.doc[field] = value),
      clear_table: () => (form.doc.items = []),
      add_child: () => {
        const row = {
          doctype: 'Quotation Item',
          name: `audit-row-${rows.size}`,
        }
        rows.set(row.name, row)
        form.doc.items.push(row)
        return row
      },
      refresh_field: () => {},
    }
    handlers.onload?.(form)
    const companyRows = [
      {
        item_code: 'SIGN',
        qty: 2,
        item_rate: 120,
        installation_rate: 30,
        description: 'Company specification',
        abbr: 'AUDIT',
      },
    ]
    form.doc.items = structuredClone(companyRows)
    for (const callback of callbacks) {
      await callback({
        message: [{ item_code: 'SIGN', qty: 2, price_list_rate: 100 }],
      })
    }
    expect(form.doc.items).toEqual(companyRows)
  })
})
