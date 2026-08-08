frappe.ui.form.on('Quotation', {
	refresh(frm) {
		const field = frm.get_field('crm_deal')
		if (!field) return
		// Render as a link only works for read only display an editable data
		field.df.read_only = 1
		field.df.formatter = (value) =>
			value
				? `<a href="${window.location.origin}/crm/deals/${encodeURIComponent(value)}" target="_blank" rel="noopener">${frappe.utils.escape_html(value)}</a>`
				: value
		field.refresh()
	},
	// onload's item-prefill (native prefill_quotation_items, item_code/qty/
	// price_list_rate/discount_percentage only) is intentionally removed
	// here - gama's own quotation.js refresh handler races against this
	// same onload for the same items table (both async, both triggered by
	// crm_deal being set), and gama's version carries item_rate/
	// installation_rate/description/abbr this one doesn't know about.
	// Whichever finished last used to win, and this one's frm.clear_table
	// could wipe out gama's richer prefill. Local-only removal (not
	// upstream-worthy - stock crm has no competing prefill to race
	// against), see gama.overrides.crm_deal.prefill_quotation_items.
})
