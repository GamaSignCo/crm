"""Sales-team access to colleagues' CRM records is explicit and role-scoped."""

import unittest
from unittest.mock import patch

import frappe

from crm.permissions import org_hierarchy


class TestSalesCollaboration(unittest.TestCase):
	def test_site_without_the_setting_keeps_existing_visibility(self):
		with (
			patch.object(org_hierarchy.frappe, "get_meta") as meta,
			patch.object(org_hierarchy.frappe.db, "get_single_value") as get_value,
		):
			meta.return_value.has_field.return_value = False
			self.assertFalse(org_hierarchy.sales_team_shares_records())
		get_value.assert_not_called()

	def test_enabled_setting_allows_sales_user_list_read_and_write(self):
		doc = frappe._dict(name="ANOTHER-SALESPERSON-RECORD")
		with (
			patch.object(org_hierarchy, "sales_team_shares_records", return_value=True),
			patch.object(org_hierarchy.frappe, "get_roles", return_value=["Sales User"]),
		):
			self.assertEqual(org_hierarchy.get_lead_permission_query_conditions("rep@example.com"), "")
			self.assertEqual(org_hierarchy.get_deal_permission_query_conditions("rep@example.com"), "")
			for check in (org_hierarchy.has_lead_permission, org_hierarchy.has_deal_permission):
				self.assertTrue(check(doc, "read", "rep@example.com"))
				self.assertTrue(check(doc, "write", "rep@example.com"))

	def test_disabled_setting_keeps_hierarchy_filter(self):
		with (
			patch.object(org_hierarchy, "sales_team_shares_records", return_value=False),
			patch.object(org_hierarchy, "hierarchy_enabled", return_value=False),
			patch.object(org_hierarchy.frappe, "get_roles", return_value=["Sales User"]),
		):
			self.assertTrue(org_hierarchy.get_lead_permission_query_conditions("rep@example.com"))

	def test_unrestricted_sales_user_other_permission_checks_do_not_query_empty_condition(self):
		doc = frappe._dict(name="ANOTHER-SALESPERSON-RECORD")
		with (
			patch.object(org_hierarchy, "sales_team_shares_records", return_value=True),
			patch.object(org_hierarchy.frappe, "get_roles", return_value=["Sales User"]),
		):
			for permission in ("print", "email", "delete"):
				self.assertTrue(org_hierarchy.has_deal_permission(doc, permission, "rep@example.com"))
				self.assertTrue(org_hierarchy.has_lead_permission(doc, permission, "rep@example.com"))
