import { describe, expect, it } from 'vitest'
import type { ProviderProduct } from '../domain.js'
import { AppError } from '../errors.js'
import type { ProductProvider } from '../providers/product-provider.js'
import { ProductService } from './product-service.js'

function product(overrides: Partial<ProviderProduct> & Pick<ProviderProduct, 'id'>): ProviderProduct {
  return {
    title: `Product ${overrides.id}`,
    price: 10,
    description: 'A catalogue item',
    category: 'jewelery',
    rating: { value: 1, count: 1 },
    ...overrides,
  }
}

function providerWith(products: ProviderProduct[], categories = ['jewelery', "men's clothing"]): ProductProvider {
  return {
    getAll: async () => products,
    getById: async (id) => products.find((item) => item.id === id) ?? null,
    getCategories: async () => categories,
    getByCategory: async (category) => {
      const known = categories.some(
        (item) => item.toLocaleLowerCase() === category.toLocaleLowerCase(),
      )
      if (!known) {
        return null
      }

      return products.filter(
        (item) => item.category.toLocaleLowerCase() === category.toLocaleLowerCase(),
      )
    },
    getImage: async (id) =>
      products.some((item) => item.id === id)
        ? { contentType: 'image/png', data: Uint8Array.from([1]) }
        : null,
  }
}

describe('ProductService', () => {
  const products = [
    product({ id: 1, rating: { value: 1, count: 1 } }),
    product({ id: 2, title: 'Silver pack', rating: { value: 5, count: 10 } }),
    product({ id: 3, title: 'Gold ring', rating: { value: 5, count: 20 } }),
    product({ id: 4, description: 'Comes in a travel pack', rating: { value: 5, count: 20 } }),
    product({ id: 5, category: "men's clothing", rating: { value: 4, count: 100 } }),
    product({ id: 6, rating: { value: 3, count: 1 } }),
  ]
  const service = new ProductService(providerWith(products))

  it('adds a backend image path and leaves provider data unchanged', async () => {
    const result = await service.getAll()

    expect(result[0]).toMatchObject({
      id: 1,
      imagePath: '/api/products/1/image',
    })
    expect(result[0]).not.toHaveProperty('image')
  })

  it('returns the five highest rated products', async () => {
    const featured = await service.getFeatured()

    expect(featured.map((item) => item.id)).toEqual([3, 4, 2, 5, 6])
  })

  it('sorts categories for display', async () => {
    await expect(service.getCategories()).resolves.toEqual(['jewelery', "men's clothing"])
  })

  it('returns products in a known category without treating the name as case sensitive', async () => {
    const result = await service.getByCategory("MEN'S CLOTHING")

    expect(result.map((item) => item.id)).toEqual([5])
  })

  it('reports an unknown category as not found', async () => {
    await expect(service.getByCategory('not-a-category')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    })
  })

  it('ranks title matches ahead of description matches', async () => {
    const result = await service.search('PACK')

    expect(result.map((item) => item.id)).toEqual([2, 4])
  })

  it('does not search the category name', async () => {
    await expect(service.search('jewelery')).resolves.toEqual([])
  })

  it('treats a search for punctuation as text', async () => {
    await expect(service.search('(')).resolves.toEqual([])
  })

  it('reports a missing product as not found', async () => {
    await expect(service.getById(99)).rejects.toBeInstanceOf(AppError)
  })

  it('reports a missing image as not found', async () => {
    await expect(service.getImage(99)).rejects.toMatchObject({ statusCode: 404 })
  })
})
