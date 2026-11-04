import { ProductCard } from './ProductCard.tsx'
import type { Product } from '../types.ts'

export function ProductList({ products }: { products: Product[] }) {
  return (
    <ul className="product-grid">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  )
}
