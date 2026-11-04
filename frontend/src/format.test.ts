import { describe, expect, it } from 'vitest'
import { formatCategory, splitByRating } from './format.ts'
import type { Product } from './types.ts'

function product(id: number, rating: number): Product {
  return {
    id,
    title: `Product ${id}`,
    price: 10,
    description: 'A catalogue item',
    category: 'jewelery',
    imagePath: `/api/products/${id}/image`,
    rating: { value: rating, count: 1 },
  }
}

describe('catalogue formatting', () => {
  it('capitalises category words without changing an apostrophe', () => {
    expect(formatCategory("men's clothing")).toBe("Men's Clothing")
  })

  it('keeps the highest rated products ahead of the rest', () => {
    const result = splitByRating([
      product(1, 3),
      product(2, 4.9),
      product(3, 4.2),
      product(4, 4.5),
    ])

    expect(result.topRated.map((item) => item.id)).toEqual([2, 4, 3])
    expect(result.remaining.map((item) => item.id)).toEqual([1])
  })
})
