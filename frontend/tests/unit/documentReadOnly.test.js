import { describe, expect, it } from 'vitest'
import { isDocumentReadOnly } from '../../src/utils/fieldTransforms'

describe('saved document edit permission', () => {
  it('does not mount editable controls before permission lookup completes', () => {
    expect(isDocumentReadOnly({ name: 'DEAL-1' }, undefined)).toBe(true)
  })

  it('keeps a read-only reader out of editor controls', () => {
    expect(
      isDocumentReadOnly({ name: 'DEAL-1' }, { permissions: { read: 1, write: 0 } }),
    ).toBe(true)
  })

  it('lets native write permission enable controls', () => {
    expect(
      isDocumentReadOnly({ name: 'DEAL-1' }, { permissions: { write: 1 } }),
    ).toBe(false)
  })

  it('does not block an unsaved document or creation dialog', () => {
    expect(isDocumentReadOnly({}, undefined)).toBe(false)
    expect(isDocumentReadOnly({ name: 'new-deal', __newDocument: true }, undefined)).toBe(false)
  })
})
