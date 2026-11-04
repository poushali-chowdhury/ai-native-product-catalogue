import type { Product, ProductRating } from './types.ts'

export function formatCategory(category: string): string {
  return category
    .split(' ')
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ')
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

export function formatRating(rating: ProductRating): string {
  const reviews = rating.count === 1 ? '1 review' : `${rating.count} reviews`
  return `${rating.value.toFixed(1)} out of 5, ${reviews}`
}

export function splitByRating(
  products: Product[],
  topCount = 3,
): { topRated: Product[]; remaining: Product[] } {
  const ranked = [...products].sort((left, right) => {
    if (right.rating.value !== left.rating.value) {
      return right.rating.value - left.rating.value
    }

    if (right.rating.count !== left.rating.count) {
      return right.rating.count - left.rating.count
    }

    return left.id - right.id
  })

  if (ranked.length <= topCount) {
    return { topRated: ranked, remaining: [] }
  }

  return {
    topRated: ranked.slice(0, topCount),
    remaining: ranked.slice(topCount),
  }
}
