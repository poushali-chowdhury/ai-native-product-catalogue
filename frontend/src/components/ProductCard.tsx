import { Link } from 'react-router'
import { productImageUrl } from '../api.ts'
import { formatPrice, formatRating } from '../format.ts'
import type { Product } from '../types.ts'

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link className="product-link" to={`/products/${product.id}`}>
        <img src={productImageUrl(product.imagePath)} alt="" />
        <h3>{product.title}</h3>
      </Link>
      <p className="price">{formatPrice(product.price)}</p>
      <p className="rating">{formatRating(product.rating)}</p>
    </article>
  )
}
