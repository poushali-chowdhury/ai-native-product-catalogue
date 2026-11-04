import type { EnquiryDetails, Product } from './types.ts'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001').replace(
  /\/$/,
  '',
)

export class ApiError extends Error {
  readonly fields?: Record<string, string>

  constructor(message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.fields = fields
  }
}

export function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`
}

export function productImageUrl(imagePath: string): string {
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return apiUrl(path)
}

export function getFeaturedProducts(): Promise<Product[]> {
  return request<Product[]>('/api/products/featured')
}

export function getCategories(): Promise<string[]> {
  return request<string[]>('/api/products/categories')
}

export function getProductsByCategory(category: string): Promise<Product[]> {
  return request<Product[]>(`/api/products/category/${encodeURIComponent(category)}`)
}

export function searchProducts(query: string): Promise<Product[]> {
  return request<Product[]>(`/api/products/search?q=${encodeURIComponent(query)}`)
}

export function getProduct(id: string): Promise<Product> {
  return request<Product>(`/api/products/${encodeURIComponent(id)}`)
}

export function submitEnquiry(enquiry: EnquiryDetails): Promise<{ id: string }> {
  return request<{ id: string }>('/api/enquiries', {
    method: 'POST',
    body: JSON.stringify(enquiry),
  })
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError('The catalogue is unavailable. Check your connection and try again.')
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    if (isErrorPayload(payload)) {
      throw new ApiError(payload.error.message, payload.error.fields)
    }

    throw new ApiError('Something went wrong. Please try again.')
  }

  if (!isDataPayload<T>(payload)) {
    throw new ApiError('The catalogue returned an unexpected response.')
  }

  return payload.data
}

function isErrorPayload(
  value: unknown,
): value is { error: { message: string; fields?: Record<string, string> } } {
  if (!isRecord(value) || !isRecord(value.error) || typeof value.error.message !== 'string') {
    return false
  }

  return value.error.fields === undefined || isStringRecord(value.error.fields)
}

function isDataPayload<T>(value: unknown): value is { data: T } {
  return isRecord(value) && 'data' in value
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
