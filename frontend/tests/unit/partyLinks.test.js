import { withOrganizationLink } from '@/utils/partyLinks'

describe('explicit organization context', () => {
  it('adds a real link without replacing the company display text', () => {
    const doc = { first_name: 'Person', company_name: 'Display name' }
    expect(withOrganizationLink(doc, 'ORG-1')).toEqual({
      ...doc,
      links: [{ link_doctype: 'CRM Organization', link_name: 'ORG-1' }],
    })
    expect(doc.links).toBeUndefined()
  })

  it('does not infer a relationship from company-name text', () => {
    const doc = { company_name: 'ORG-1' }
    expect(withOrganizationLink(doc, '')).toBe(doc)
  })

  it('preserves other parties and does not add duplicate links', () => {
    const doc = {
      links: [
        { link_doctype: 'Customer', link_name: 'CUSTOMER-1' },
        { link_doctype: 'CRM Organization', link_name: 'ORG-1' },
      ],
    }
    expect(
      withOrganizationLink(withOrganizationLink(doc, 'ORG-1'), 'ORG-1'),
    ).toEqual(doc)
  })
})
