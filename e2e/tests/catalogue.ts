import { apiBaseUrl } from '../env.ts'

export interface Product {
  id: number
  title: string
  price: number
  description: string
  category: string
  imagePath: string
  rating: { value: number; count: number }
}

export async function getData<T>(path: string): Promise<T> {
  let lastStatus = 0

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${apiBaseUrl}${path}`)
    if (response.ok) {
      const body = (await response.json()) as { data: T }
      return body.data
    }

    lastStatus = response.status
    if (response.status !== 502 && response.status !== 504) {
      break
    }

    await new Promise((resolve) => setTimeout(resolve, 750))
  }

  throw new Error(`GET ${path} returned ${lastStatus}`)
}

export function getProducts(path: string): Promise<Product[]> {
  return getData<Product[]>(path)
}

export function formatCategory(category: string): string {
  return category
    .split(' ')
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ')
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
}

export function formatRating(rating: Product['rating']): string {
  const reviews = rating.count === 1 ? '1 review' : `${rating.count} reviews`
  return `${rating.value.toFixed(1)} out of 5, ${reviews}`
}

export function rankByRating(products: Product[]): Product[] {
  return [...products].sort((left, right) => {
    if (right.rating.value !== left.rating.value) {
      return right.rating.value - left.rating.value
    }

    if (right.rating.count !== left.rating.count) {
      return right.rating.count - left.rating.count
    }

    return left.id - right.id
  })
}

export function visibleTitle(title: string): string {
  return title.trim()
}
