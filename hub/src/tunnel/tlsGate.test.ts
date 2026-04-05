import { describe, expect, it } from 'bun:test'
import { waitForTunnelTlsReady } from './tlsGate'

describe('waitForTunnelTlsReady', () => {
    it('returns immediately for non-https tunnels', async () => {
        const result = await waitForTunnelTlsReady('http://localhost:3006', {
            isConnected: () => true
        })

        expect(result).toBe(true)
    })

    it('stops once the certificate becomes trusted', async () => {
        let attempts = 0
        let currentTime = 0

        const result = await waitForTunnelTlsReady('https://example.com', {
            isConnected: () => true
        }, {
            checkCertificate: async () => {
                attempts += 1
                return attempts >= 3
            },
            sleep: async (ms) => {
                currentTime += ms
            },
            now: () => currentTime,
            pollIntervalMs: 10,
            requestTimeoutMs: 5,
            logIntervalMs: 1000,
            maxWaitMs: 100
        })

        expect(result).toBe(true)
        expect(attempts).toBe(3)
    })

    it('stops polling after the max wait window', async () => {
        let attempts = 0
        let currentTime = 0
        const warnings: string[] = []
        const originalWarn = console.warn

        console.warn = ((message?: unknown) => {
            warnings.push(String(message))
        }) as typeof console.warn

        try {
            const result = await waitForTunnelTlsReady('https://example.com', {
                isConnected: () => true
            }, {
                checkCertificate: async () => {
                    attempts += 1
                    return false
                },
                sleep: async (ms) => {
                    currentTime += ms
                },
                now: () => currentTime,
                pollIntervalMs: 10,
                requestTimeoutMs: 5,
                logIntervalMs: 1000,
                maxWaitMs: 25
            })

            expect(result).toBe(false)
            expect(attempts).toBe(4)
            expect(warnings).toEqual([
                '[Tunnel] Timed out waiting for trusted TLS certificate after 25ms.'
            ])
        } finally {
            console.warn = originalWarn
        }
    })
})
