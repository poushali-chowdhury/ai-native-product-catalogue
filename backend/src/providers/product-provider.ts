import type { ProductImage, ProviderProduct } from '../domain.js'

/**
 * A catalogue source. Implementations own every call to an external API.
 * Return null when the requested product, category, or image does not exist.
 * Throw AppError when the source cannot be reached or returns an unusable payload.
 */
export interface ProductProvider {
  getAll(): Promise<ProviderProduct[]>
  getById(id: number): Promise<ProviderProduct | null>
  getCategories(): Promise<string[]>
  getByCategory(category: string): Promise<ProviderProduct[] | null>
  getImage(id: number): Promise<ProductImage | null>
}
