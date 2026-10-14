import { afterEach, describe, expect, it, vi } from 'vitest'

const { io } = vi.hoisted(() => ({ io: vi.fn(() => ({ on: vi.fn() })) }))
vi.mock('socket.io-client', () => ({ io }))
vi.mock('frappe-ui', () => ({
  getCachedListResource: vi.fn(),
  getCachedResource: vi.fn(),
}))

import { initSocket } from '../../src/socket'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('socket connection protocol', () => {
  it.each([
    ['http:', 'develop.example.local', '', 'http://develop.example.local/site'],
    ['https:', 'erp.example.com', '', 'https://erp.example.com/site'],
    ['http:', 'localhost', '8080', 'http://localhost:9000/site'],
  ])('uses the page protocol %s', (protocol, hostname, port, expected) => {
    vi.stubGlobal('window', {
      location: { protocol, hostname, port },
      site_name: 'site',
    })

    initSocket()

    expect(io).toHaveBeenCalledWith(expected, {
      withCredentials: true,
      reconnectionAttempts: 5,
    })
  })
})
