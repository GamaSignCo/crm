import { call, createResource, toast } from 'frappe-ui'

export function useOrganizationContacts(organization) {
  const contacts = createResource({
    url: 'crm.api.organization.get_contacts',
    cache: ['organization-party-contacts', organization],
    params: { organization },
    auto: true,
  })

  async function addContact(contact) {
    if (!contact) return
    try {
      await call('crm.api.organization.link_contact', {
        organization,
        contact,
      })
      await contacts.reload()
    } catch (error) {
      toast.error(error.messages?.[0] || __('Could not link the contact'))
    }
  }

  return { contacts, addContact }
}
