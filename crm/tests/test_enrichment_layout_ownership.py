"""Release migrations must not rewrite administrator-owned CRM layouts."""

from unittest import TestCase
from unittest.mock import Mock, patch

import frappe

from crm.patches.v1_0 import add_enrichment_fields_to_layouts


class TestEnrichmentLayoutOwnership(TestCase):
	def test_existing_layouts_are_unchanged_without_explicit_opt_in(self):
		with (
			patch.object(add_enrichment_fields_to_layouts.frappe, "conf", {}),
			patch.object(add_enrichment_fields_to_layouts.frappe, "get_doc") as get_doc,
		):
			add_enrichment_fields_to_layouts.execute()
		get_doc.assert_not_called()

	def test_explicit_opt_in_keeps_existing_fields_and_adds_missing_fields(self):
		doc = frappe._dict(dt="CRM Lead", layout='[{"columns": [{"fields": ["custom_company_field"]}]}]')
		doc.save = Mock()
		with (
			patch.object(
				add_enrichment_fields_to_layouts.frappe, "conf", {"crm_update_existing_enrichment_layouts": 1}
			),
			patch.object(add_enrichment_fields_to_layouts, "TARGET_LAYOUTS", ["CRM Lead-Side Panel"]),
			patch.object(add_enrichment_fields_to_layouts.frappe.db, "exists", return_value=True),
			patch.object(add_enrichment_fields_to_layouts.frappe, "get_doc", return_value=doc),
			patch.object(add_enrichment_fields_to_layouts.frappe, "get_meta") as meta,
		):
			meta.return_value.has_field.return_value = True
			add_enrichment_fields_to_layouts.execute()
		self.assertIn("custom_company_field", doc.layout)
		for field in add_enrichment_fields_to_layouts.ENRICHMENT_FIELDS:
			self.assertIn(field, doc.layout)
		doc.save.assert_called_once()
