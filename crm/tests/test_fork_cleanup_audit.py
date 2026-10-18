"""Check retained company requirements against the official CRM release."""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

from crm.fcrm.doctype.erpnext_crm_settings.erpnext_crm_settings import (
	create_customer_from_deal,
	get_local_customer,
)
from crm.tests import CRMTestCase


class TestForkCleanupAudit(CRMTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		if "erpnext" in frappe.get_installed_apps():
			frappe.get_single("ERPNext CRM Settings").create_custom_fields_in_frappe_crm()
		if not frappe.get_meta("FCRM Settings").has_field("share_sales_records"):
			create_custom_fields(
				{
					"FCRM Settings": [
						{
							"fieldname": "share_sales_records",
							"label": "Share Sales Records",
							"fieldtype": "Check",
						}
					]
				}
			)
		# Native integration fields must survive each test's transaction rollback.
		frappe.db.commit()

	def setUp(self):
		self.token = frappe.generate_hash(length=10)
		self.salesperson = self.make_user("Sales User", "sales")
		self.colleague = self.make_user("Sales User", "colleague")
		frappe.db.set_single_value("FCRM Settings", "enable_sales_hierarchy", 0)
		frappe.db.set_single_value("FCRM Settings", "share_sales_records", 0)
		self.lead = self.make_record("CRM Lead", self.colleague.name)
		self.deal = self.make_record("CRM Deal", self.colleague.name)

	def tearDown(self):
		frappe.set_user("Administrator")
		super().tearDown()

	def make_user(self, role, label):
		return frappe.get_doc(
			{
				"doctype": "User",
				"email": f"{label}-{self.token}@fork-audit.invalid",
				"first_name": label,
				"send_welcome_email": 0,
				"roles": [{"role": role}] if role else [],
			}
		).insert(ignore_permissions=True)

	def make_record(self, doctype, owner):
		field = "lead_owner" if doctype == "CRM Lead" else "deal_owner"
		doc = frappe.get_doc(
			{
				"doctype": doctype,
				"name": f"audit-{doctype.replace(' ', '-')}-{self.token}",
				"first_name": "Audit",
				"lead_name": "Unlinked display name " + self.token,
				field: owner,
				"owner": owner,
			}
		)
		doc.db_insert()
		return doc

	def test_disabled_team_sharing_preserves_private_colleague_records(self):
		frappe.set_user(self.salesperson.name)
		for doc in [self.lead, self.deal]:
			self.assertFalse(frappe.has_permission(doc.doctype, "read", doc=doc))
			self.assertFalse(frappe.has_permission(doc.doctype, "write", doc=doc))
			self.assertEqual(frappe.get_list(doc.doctype, filters={"name": doc.name}, pluck="name"), [])

	def test_enabled_team_sharing_allows_normal_sales_user_read_write_and_list(self):
		frappe.db.set_single_value("FCRM Settings", "share_sales_records", 1)
		frappe.set_user(self.salesperson.name)
		for doc in [self.lead, self.deal]:
			self.assertTrue(frappe.has_permission(doc.doctype, "read", doc=doc))
			self.assertTrue(frappe.has_permission(doc.doctype, "write", doc=doc))
			self.assertEqual(
				frappe.get_list(doc.doctype, filters={"name": doc.name}, pluck="name"), [doc.name]
			)

	def test_team_sharing_does_not_grant_access_to_a_non_sales_user(self):
		outsider = self.make_user(None, "outside")
		frappe.db.set_single_value("FCRM Settings", "share_sales_records", 1)
		frappe.set_user(outsider.name)
		for doc in [self.lead, self.deal]:
			self.assertFalse(frappe.has_permission(doc.doctype, "read", doc=doc))
			self.assertFalse(frappe.has_permission(doc.doctype, "write", doc=doc))

	def test_team_sharing_keeps_a_managers_reporting_tree_boundary(self):
		manager = self.make_user("Sales Manager", "manager")
		frappe.get_doc(
			{
				"doctype": "CRM Sales Hierarchy",
				"user": manager.name,
				"is_group": 1,
			}
		).insert(ignore_permissions=True)
		frappe.db.set_single_value("FCRM Settings", "enable_sales_hierarchy", 1)
		frappe.db.set_single_value("FCRM Settings", "share_sales_records", 1)
		frappe.set_user(manager.name)
		for doc in [self.lead, self.deal]:
			self.assertFalse(frappe.has_permission(doc.doctype, "read", doc=doc))

	def test_a_stale_customer_link_is_not_an_existing_customer(self):
		if "erpnext" not in frappe.get_installed_apps():
			self.skipTest("This customer identity check requires ERPNext")
		self.deal.db_set("erpnext_customer", "deleted-customer-" + self.token)
		self.assertIsNone(get_local_customer(self.deal.name))

	def test_customer_creation_reuses_the_linked_identity_despite_a_different_title(self):
		if "erpnext" not in frappe.get_installed_apps():
			self.skipTest("This customer identity check requires ERPNext")
		customer = frappe.get_doc(
			{
				"doctype": "Customer",
				"customer_name": "Existing identity " + self.token,
				"customer_type": "Company",
				"customer_group": "Commercial",
				"territory": "All Territories",
			}
		).insert(ignore_permissions=True)
		self.deal.db_set("erpnext_customer", customer.name)
		frappe.db.set_single_value("CRM Settings", "enable_frappe_crm_data_synchronization", 1)
		before = frappe.db.count("Customer")
		resolved = create_customer_from_deal(self.deal, frappe._dict(is_erpnext_in_different_site=0))
		self.assertEqual(resolved, customer.name)
		self.assertEqual(frappe.db.count("Customer"), before)
		self.assertEqual(frappe.db.get_value("CRM Deal", self.deal.name, "erpnext_customer"), customer.name)
