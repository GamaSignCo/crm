import { describe, expect, it, vi } from 'vitest'

vi.mock('frappe-ui', () => ({ call: vi.fn(), toast: { error: vi.fn() } }))
vi.mock('@/utils', () => ({ copyToClipboard: vi.fn() }))
vi.mock('@/stores/users', () => ({
  usersStore: () => ({ getUser: () => null }),
}))

import { recordCommands } from '@/components/CommandPalette/recordCommands'

function context(values = {}) {
  return {
    group: 'Deal',
    doctype: 'CRM Deal',
    docname: 'DEAL-1',
    hasEmail: () => false,
    tabs: { value: [] },
    ...values,
  }
}

describe('record attachment commands', () => {
  it('does not offer a removed file uploader', () => {
    const commands = recordCommands(context())
    expect(commands.some((command) => command.id === 'deal-attach')).toBe(false)
    expect(commands.some((command) => command.id === 'deal-comment')).toBe(true)
  })

  it('preserves the native upload command for contexts with an uploader', () => {
    const openFileUploader = vi.fn()
    const command = recordCommands(
      context({ group: 'Lead', openFileUploader }),
    ).find((command) => command.id === 'lead-attach')
    command.perform()
    expect(openFileUploader).toHaveBeenCalledOnce()
  })
})
