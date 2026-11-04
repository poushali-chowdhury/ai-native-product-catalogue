import type { Product, ProviderProduct } from '../domain.js'
import { AppError } from '../errors.js'
import type { ProductProvider } from '../providers/product-provider.js'

const featuredLimit = 5

export class ProductService {
  constructor(private readonly provider: ProductProvider) {}

  async getAll(): Promise<Product[]> {
    const products = await this.provider.getAll()
    return products.map((product) => presentProduct(product))
  }

  async getFeatured(): Promise<Product[]> {
    const products = await this.provider.getAll()
    return [...products]
      .sort((left, right) => {
        if (right.rating.value !== left.rating.value) {
          return right.rating.value - left.rating.value
        }

        if (right.rating.count !== left.rating.count) {
          return right.rating.count - left.rating.count
        }

        return left.id - right.id
      })
      .slice(0, featuredLimit)
      .map((product) => presentProduct(product))
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.provider.getCategories()
    return [...categories].sort((left, right) => left.localeCompare(right, 'en'))
  }

  async getByCategory(category: string): Promise<Product[]> {
    const products = await this.provider.getByCategory(category)
    if (!products) {
      throw new AppError(404, 'NOT_FOUND', 'That category was not found.')
    }

    return products.map((product) => presentProduct(product))
  }

  async search(query: string): Promise<Product[]> {
    const needle = normalize(query)
    const products = await this.provider.getAll()

    return products
      .map((product, index) => ({
        product,
        index,
        titleMatch: normalize(product.title).includes(needle),
        descriptionMatch: normalize(product.description).includes(needle),
      }))
      .filter((match) => match.titleMatch || match.descriptionMatch)
      .sort((left, right) => {
        if (left.titleMatch !== right.titleMatch) {
          return left.titleMatch ? -1 : 1
        }

        return left.index - right.index
      })
      .map((match) => presentProduct(match.product))
  }

  async getById(id: number): Promise<Product> {
    const product = await this.provider.getById(id)
    if (!product) {
      throw new AppError(404, 'NOT_FOUND', 'That product was not found.')
    }

    return presentProduct(product)
  }

  async getImage(id: number) {
    const image = await this.provider.getImage(id)
    if (!image) {
      throw new AppError(404, 'NOT_FOUND', 'That product image was not found.')
    }

    return image
  }
}

export function productImagePath(id: number): string {
  return `/api/products/${id}/image`
}

function presentProduct(product: ProviderProduct): Product {
  return {
    ...product,
    imagePath: productImagePath(product.id),
  }
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}
