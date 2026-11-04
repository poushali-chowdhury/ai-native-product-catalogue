import type { ProductImage, ProductRating, ProviderProduct } from '../domain.js'
import { upstreamTimeout, upstreamUnavailable } from '../errors.js'
import type { ProductProvider } from './product-provider.js'

const maxImageBytes = 5 * 1024 * 1024
const defaultCacheTtlMs = 60_000

interface FakeStoreProviderOptions {
  baseUrl: string
  timeoutMs: number
  fetch?: typeof fetch
  cacheTtlMs?: number
  now?: () => number
}

interface CacheEntry {
  expiresAt: number
  value: unknown
}

export class FakeStoreProductProvider implements ProductProvider {
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly fetchImpl: typeof fetch
  private readonly cacheTtlMs: number
  private readonly now: () => number
  private readonly cache = new Map<string, CacheEntry>()
  private readonly pending = new Map<string, Promise<unknown>>()

  constructor(options: FakeStoreProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.timeoutMs = options.timeoutMs
    this.fetchImpl = options.fetch ?? fetch
    this.cacheTtlMs = options.cacheTtlMs ?? defaultCacheTtlMs
    this.now = options.now ?? Date.now
  }

  async getAll(): Promise<ProviderProduct[]> {
    const payload = await this.readJson('/products')
    return parseProductList(payload)
  }

  async getById(id: number): Promise<ProviderProduct | null> {
    const raw = await this.readRawProduct(id)
    return raw ? toProviderProduct(raw) : null
  }

  async getCategories(): Promise<string[]> {
    const payload = await this.readJson('/products/categories')
    if (
      !Array.isArray(payload) ||
      payload.some((item) => typeof item !== 'string' || item.trim() === '')
    ) {
      throw upstreamUnavailable()
    }

    return [...payload]
  }

  async getByCategory(category: string): Promise<ProviderProduct[] | null> {
    const categories = await this.getCategories()
    const canonical = categories.find(
      (item) => item.toLocaleLowerCase() === category.trim().toLocaleLowerCase(),
    )

    if (!canonical) {
      return null
    }

    const payload = await this.readJson(
      `/products/category/${encodeURIComponent(canonical)}`,
    )
    return parseProductList(payload)
  }

  async getImage(id: number): Promise<ProductImage | null> {
    const raw = await this.readRawProduct(id)
    if (!raw) {
      return null
    }

    const imageUrl = assertSameOriginImage(raw.image, this.baseUrl)
    const response = await this.request(imageUrl)

    if (!response.ok) {
      throw upstreamUnavailable()
    }

    const contentType = (response.headers.get('content-type') ?? '')
      .split(';', 1)[0]
      ?.trim()
      .toLowerCase()

    if (!contentType?.startsWith('image/')) {
      throw upstreamUnavailable()
    }

    const declaredLength = Number(response.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > maxImageBytes) {
      throw upstreamUnavailable()
    }

    const data = new Uint8Array(await response.arrayBuffer())
    if (data.byteLength > maxImageBytes) {
      throw upstreamUnavailable()
    }

    return { contentType, data }
  }

  private async readRawProduct(id: number): Promise<RawProduct | null> {
    const payload = await this.readJson(`/products/${id}`)
    if (payload === null) {
      return null
    }

    return parseRawProduct(payload)
  }

  private async readJson(path: string): Promise<unknown> {
    const cached = this.readCache(path)
    if (cached) {
      return cached.value
    }

    const existing = this.pending.get(path)
    if (existing) {
      return existing
    }

    const request = this.loadJson(path).finally(() => {
      this.pending.delete(path)
    })
    this.pending.set(path, request)
    return request
  }

  private async loadJson(path: string): Promise<unknown> {
    const response = await this.request(`${this.baseUrl}${path}`)
    if (!response.ok) {
      throw upstreamUnavailable()
    }

    const text = await response.text()
    if (text.trim() === '') {
      this.writeCache(path, null)
      return null
    }

    try {
      const value = JSON.parse(text) as unknown
      this.writeCache(path, value)
      return value
    } catch {
      throw upstreamUnavailable()
    }
  }

  private async request(url: string): Promise<Response> {
    try {
      return await this.fetchImpl(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: 'manual',
      })
    } catch (error) {
      if (isTimeoutError(error)) {
        throw upstreamTimeout()
      }

      throw upstreamUnavailable()
    }
  }

  private readCache(path: string): CacheEntry | undefined {
    const entry = this.cache.get(path)
    if (!entry) {
      return undefined
    }

    if (entry.expiresAt <= this.now()) {
      this.cache.delete(path)
      return undefined
    }

    return entry
  }

  private writeCache(path: string, value: unknown): void {
    this.cache.set(path, {
      expiresAt: this.now() + this.cacheTtlMs,
      value,
    })
  }
}

interface RawProduct {
  id: number
  title: string
  price: number
  description: string
  category: string
  image: string
  rating: ProductRating
}

function parseProductList(payload: unknown): ProviderProduct[] {
  if (!Array.isArray(payload)) {
    throw upstreamUnavailable()
  }

  return payload.map((item) => toProviderProduct(parseRawProduct(item)))
}

function parseRawProduct(payload: unknown): RawProduct {
  if (!isRecord(payload)) {
    throw upstreamUnavailable()
  }

  const id = payload.id
  const price = payload.price
  const title = payload.title
  const description = payload.description
  const category = payload.category
  const image = payload.image

  if (
    typeof id !== 'number' ||
    !Number.isInteger(id) ||
    id < 1 ||
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    price < 0 ||
    typeof title !== 'string' ||
    title.trim() === '' ||
    typeof description !== 'string' ||
    description.trim() === '' ||
    typeof category !== 'string' ||
    category.trim() === '' ||
    typeof image !== 'string' ||
    image.trim() === ''
  ) {
    throw upstreamUnavailable()
  }

  return {
    id,
    title,
    price,
    description,
    category,
    image,
    rating: parseRating(payload.rating),
  }
}

function toProviderProduct(product: RawProduct): ProviderProduct {
  return {
    id: product.id,
    title: product.title,
    price: product.price,
    description: product.description,
    category: product.category,
    rating: product.rating,
  }
}

function parseRating(value: unknown): ProductRating {
  if (!isRecord(value)) {
    return { value: 0, count: 0 }
  }

  const rate = value.rate
  const count = value.count
  return {
    value: typeof rate === 'number' && Number.isFinite(rate) ? rate : 0,
    count: typeof count === 'number' && Number.isFinite(count) ? count : 0,
  }
}

function assertSameOriginImage(imageUrl: string, baseUrl: string): string {
  let image: URL
  let base: URL

  try {
    image = new URL(imageUrl)
    base = new URL(baseUrl)
  } catch {
    throw upstreamUnavailable()
  }

  if (image.origin !== base.origin || image.protocol !== base.protocol) {
    throw upstreamUnavailable()
  }

  return image.toString()
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
