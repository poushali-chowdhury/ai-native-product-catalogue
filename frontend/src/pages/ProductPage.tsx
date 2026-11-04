import { Link, useParams } from 'react-router'
import { getProduct, productImageUrl } from '../api.ts'
import { ErrorStatus, LoadingStatus } from '../components/Status.tsx'
import { formatCategory, formatPrice, formatRating } from '../format.ts'
import { useCatalogueRequest } from '../hooks/useCatalogueRequest.ts'

export function ProductPage() {
  const { id = '' } = useParams()
  const { state, reload } = useCatalogueRequest(() => getProduct(id), [id])

  if (state.status === 'loading') {
    return <LoadingStatus label="Loading product details." />
  }

  if (state.status === 'error') {
    return <ErrorStatus message={state.message} onRetry={reload} />
  }

  const product = state.data

  return (
    <article className="product-detail">
      <img src={productImageUrl(product.imagePath)} alt={product.title} />
      <div>
        <p className="eyebrow">{formatCategory(product.category)}</p>
        <h1>{product.title}</h1>
        <p className="price">{formatPrice(product.price)}</p>
        <p className="rating">{formatRating(product.rating)}</p>
        <p>{product.description}</p>
        <Link className="button" to={`/products/${product.id}/enquire`}>
          Enquire
        </Link>
      </div>
    </article>
  )
}
