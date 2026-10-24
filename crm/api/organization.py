"""Explicit organization contacts with native record permissions."""

import frappe
from frappe import _
from frappe.utils import cint


@frappe.whitelist(methods=["POST"])
def link_contact(organization: str, contact: str):
	party = _organization(organization, "write")
	_validate_name(contact)
	frappe.db.get_value("Contact", contact, "name", for_update=True)
	record = frappe.get_doc("Contact", contact)
	record.check_permission("read")
	missing = [
		(dt, name)
		for dt, name in _targets(party)
		if not any(row.link_doctype == dt and row.link_name == name for row in record.links)
	]
	if missing:
		record.check_permission("write")
		for doctype, name in missing:
			record.append("links", {"link_doctype": doctype, "link_name": name})
		record.save()
	return contact


@frappe.whitelist()
def get_contacts(organization: str, limit: int = 20):
	party = _organization(organization, "read")
	linked = set()
	for doctype, name in _targets(party):
		linked.update(
			frappe.get_all(
				"Dynamic Link",
				filters={
					"parenttype": "Contact",
					"link_doctype": doctype,
					"link_name": name,
				},
				pluck="parent",
			)
		)
	rows = frappe.get_list(
		"Contact",
		or_filters={
			"name": ["in", sorted(linked) or [""]],
			"company_name": party.name,
		},
		fields=["name", "full_name", "image", "email_id", "mobile_no", "company_name", "modified"],
		order_by="modified desc",
		limit_page_length=min(max(cint(limit), 1), 200),
	)
	for row in rows:
		row["link_missing"] = row.name not in linked
	return rows


def _targets(party):
	targets = [("CRM Organization", party.name)]
	if party.get("erpnext_customer"):
		targets.append(("Customer", party.erpnext_customer))
	return targets


def _organization(name, permission):
	_validate_name(name)
	party = frappe.get_doc("CRM Organization", name)
	party.check_permission(permission)
	return party


def _validate_name(value):
	if not isinstance(value, str) or not value:
		frappe.throw(_("A record name is required."))
