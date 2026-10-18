import path from 'node:path'

export function frameworkCompatibility() {
  const adapter = path.resolve(
    import.meta.dirname,
    '../src/components/FrameworkFeatherIcon.vue',
  )
  return {
    name: 'crm-framework-feather-compatibility',
    enforce: 'pre',
    transform(source, id) {
      if (!id.includes('/frappe/ui/src/') || !source.includes('FeatherIcon')) {
        return null
      }
      let replaced = false
      const code = source.replace(
        /import\s*\{([^}]+)\}\s*from\s*(['"])frappe-ui\2/g,
        (statement, names, quote) => {
          const imports = names.split(',').map((name) => name.trim())
          if (!imports.includes('FeatherIcon')) return statement
          replaced = true
          const remaining = imports.filter((name) => name !== 'FeatherIcon')
          const legacy = `import FeatherIcon from ${JSON.stringify(adapter)};`
          return remaining.length
            ? `${legacy}\nimport { ${remaining.join(', ')} } from ${quote}frappe-ui${quote}`
            : legacy
        },
      )
      return replaced ? { code, map: null } : null
    },
  }
}
