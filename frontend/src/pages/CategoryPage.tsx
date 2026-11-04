import { useParams } from 'react-router'
import { getProductsByCategory } from '../api.ts'
import { ProductList } from '../components/ProductList.tsx'
import { EmptyStatus, ErrorStatus, LoadingStatus } from '../components/Status.tsx'
import { formatCategory, splitByRating } from '../format.ts'
import { useCatalogueRequest } from '../hooks/useCatalogueRequest.ts'

export function CategoryPage() {
  const { category = '' } = useParams()
  const selectedCategory = decodeURIComponent(category)
  const { state, reload } = useCatalogueRequest(
    () => getProductsByCategory(selectedCategory),
    [selectedCategory],
  )
  const title = formatCategory(selectedCategory)

  return (
    <>
      <h1>{title}</h1>
      {state.status === 'loading' ? <LoadingStatus label={`Loading ${title} products.`} /> : null}
      {state.status === 'error' ? <ErrorStatus message={state.message} onRetry={reload} /> : null}
      {state.status === 'success' && state.data.length === 0 ? (
        <EmptyStatus message={`No products are listed in ${title} right now.`} />
      ) : null}
      {state.status === 'success' && state.data.length > 0 ? (
        <CategorySections products={state.data} />
      ) : null}
    </>
  )
}

function CategorySections({ products }: { products: Parameters<typeof splitByRating>[0] }) {
  const { topRated, remaining } = splitByRating(products)

  return (
    <>
      <section className="panel" aria-labelledby="top-rated-heading">
        <h2 id="top-rated-heading">Top rated</h2>
        <ProductList products={topRated} />
      </section>
      {remaining.length > 0 ? (
        <section className="panel" aria-labelledby="remaining-heading">
          <h2 id="remaining-heading">Remaining products</h2>
          <ProductList products={remaining} />
        </section>
      ) : null}
    </>
  )
}
