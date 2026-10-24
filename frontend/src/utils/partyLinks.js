export function withOrganizationLink(doc, organization) {
  if (!organization) return doc
  const links = [...(doc.links || [])]
  if (
    !links.some(
      (row) =>
        row.link_doctype === 'CRM Organization' &&
        row.link_name === organization,
    )
  ) {
    links.push({ link_doctype: 'CRM Organization', link_name: organization })
  }
  return { ...doc, links }
}
