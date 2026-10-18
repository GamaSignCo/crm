import { describe, expect, it } from 'vitest'
import { frameworkCompatibility } from '../../tooling/frameworkCompatibility'

describe('Frappe 16 framework icon compatibility', () => {
  it('adapts only the removed icon import and retains native components', () => {
    const source = `import { Button, FeatherIcon, toast } from 'frappe-ui'`
    const result = frameworkCompatibility().transform(
      source,
      '/bench/apps/frappe/ui/src/components/DataImport/UploadStep.vue',
    )
    expect(result.code).toContain('import FeatherIcon from')
    expect(result.code).toContain('FrameworkFeatherIcon.vue')
    expect(result.code).toContain("import { Button, toast } from 'frappe-ui'")
  })

  it('does not rewrite CRM or the installed dependency', () => {
    const source = `import { FeatherIcon } from 'frappe-ui'`
    for (const id of [
      '/crm/frontend/src/main.js',
      '/node_modules/frappe-ui/src/index.ts',
    ]) {
      expect(frameworkCompatibility().transform(source, id)).toBeNull()
    }
  })

  it('leaves updated framework imports untouched', () => {
    expect(
      frameworkCompatibility().transform(
        `import { Button } from 'frappe-ui'`,
        '/bench/apps/frappe/ui/src/components/SignupBanner.vue',
      ),
    ).toBeNull()
  })
})
