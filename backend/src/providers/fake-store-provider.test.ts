import { describe, expect, it } from 'vitest'
import { AppError, upstreamMessages } from '../errors.js'
import { FakeStoreProductProvider } from './fake-store-provider.js'

const baseUrl = 'https://catalogue.example'
const rawProduct = {
  id: 1,
  title: 'Backpack',
  price: 109.95,
  description: 'A padded laptop sleeve',
  category: "men's clothing",
  image: `${baseUrl}/img/backpack.png`,
  rating: { rate: 3.9, count: 120 },
}

function provider(
  fetchImpl: typeof fetch,
  options: { now?: () => number; cacheTtlMs?: number } = {},
) {
  return new FakeStoreProductProvider({
    baseUrl,
    timeoutMs: 1000,
    fetch: fetchImpl,
    cacheTtlMs: options.cacheTtlMs ?? 0,
    now: options.now,
  })
}

describe('FakeStoreProductProvider', () => {
  it('maps catalogue products without keeping the upstream address', async () => {
    const calls: string[] = []
    const catalogue = provider(async (input) => {
      calls.push(String(input))
      return Response.json([rawProduct])
    })

    const products = await catalogue.getAll()

    expect(calls).toEqual([`${baseUrl}/products`])
    expect(products).toEqual([
      {
        id: 1,
        title: 'Backpack',
        price: 109.95,
        description: 'A padded laptop sleeve',
        category: "men's clothing",
        rating: { value: 3.9, count: 120 },
      },
    ])
    expect(JSON.stringify(products)).not.toContain(baseUrl)
  })

  it('treats an empty product response as not found', async () => {
    const catalogue = provider(async () => new Response('', { status: 200 }))

    await expect(catalogue.getById(99)).resolves.toBeNull()
  })

  it('returns null for an unknown category without requesting that category', async () => {
    const calls: string[] = []
    const catalogue = provider(async (input) => {
      calls.push(String(input))
      return Response.json(['jewelery'])
    })

    await expect(catalogue.getByCategory('tools')).resolves.toBeNull()
    expect(calls).toEqual([`${baseUrl}/products/categories`])
  })

  it('requests the canonical category from the upstream list', async () => {
    const calls: string[] = []
    const catalogue = provider(async (input) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/products/categories')) {
        return Response.json(["men's clothing"])
      }

      return Response.json([rawProduct])
    })

    await expect(catalogue.getByCategory("MEN'S CLOTHING")).resolves.toHaveLength(1)
    expect(calls[1]).toBe(`${baseUrl}/products/category/men's%20clothing`)
  })

  it('turns an upstream failure into a message that does not name the source', async () => {
    const catalogue = provider(async () => new Response('upstream failed', { status: 500 }))

    await expect(catalogue.getAll()).rejects.toMatchObject({
      statusCode: 502,
      message: upstreamMessages.unavailable,
    })
    await expect(catalogue.getAll()).rejects.not.toThrow(/catalogue\.example/)
  })

  it('reports a timed-out upstream call separately', async () => {
    const catalogue = provider(async () => {
      throw Object.assign(new Error('https://catalogue.example timed out'), {
        name: 'TimeoutError',
      })
    })

    await expect(catalogue.getAll()).rejects.toMatchObject({
      statusCode: 504,
      message: upstreamMessages.timeout,
    } satisfies Partial<AppError>)
  })

  it('loads an image only when it stays on the upstream origin', async () => {
    const calls: string[] = []
    const catalogue = provider(async (input) => {
      calls.push(String(input))
      if (String(input).endsWith('/img/backpack.png')) {
        return new Response(Uint8Array.from([9, 8, 7]), {
          headers: { 'content-type': 'image/png' },
        })
      }

      return Response.json(rawProduct)
    })

    await expect(catalogue.getImage(1)).resolves.toEqual({
      contentType: 'image/png',
      data: Uint8Array.from([9, 8, 7]),
    })
    expect(calls).toEqual([`${baseUrl}/products/1`, `${baseUrl}/img/backpack.png`])
  })

  it('does not fetch an image hosted on another origin', async () => {
    const calls: string[] = []
    const catalogue = provider(async (input) => {
      calls.push(String(input))
      return Response.json({
        ...rawProduct,
        image: 'https://evil.example/backpack.png',
      })
    })

    await expect(catalogue.getImage(1)).rejects.toBeInstanceOf(AppError)
    expect(calls).toEqual([`${baseUrl}/products/1`])
  })

  it('reuses a catalogue response until the cache expires', async () => {
    let now = 1_000
    let fetches = 0
    const catalogue = provider(
      async () => {
        fetches += 1
        return Response.json([rawProduct])
      },
      { now: () => now, cacheTtlMs: 1_000 },
    )

    await catalogue.getAll()
    await catalogue.getAll()
    now += 1_001
    await catalogue.getAll()

    expect(fetches).toBe(2)
  })
})
