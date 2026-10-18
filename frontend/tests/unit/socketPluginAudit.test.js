import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createApp } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'

const { io } = vi.hoisted(() => ({ io: vi.fn(() => ({ on: vi.fn() })) }))
vi.mock('socket.io-client', () => ({ io }))
vi.mock('frappe-ui', () => ({
  getCachedListResource: vi.fn(),
  getCachedResource: vi.fn(),
}))

// Use the installed plugin, not the mocked public resource exports above.
import plugin from '../../node_modules/frappe-ui/src/utils/plugin.ts'
import { initSocket } from '../../src/socket'

afterEach(() => vi.clearAllMocks())

it('the actual app plugin configuration and app socket open one connection', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/main.js'), 'utf8')
  const installation = source.match(/app\.use\(FrappeUI(?:,\s*\{[^}]*\})?\)/)
  expect(installation).not.toBeNull()
  const app = createApp({ render: () => null })
  // This opt-in probe checks whether the installed plugin still needs our option.
  const statement = process.env.AUDIT_NATIVE_PLUGIN_DEFAULT
    ? 'app.use(FrappeUI)'
    : installation[0]
  new Function('app', 'FrappeUI', statement)(app, plugin)
  app.config.globalProperties.$socket = initSocket()
  expect(io).toHaveBeenCalledOnce()
})
