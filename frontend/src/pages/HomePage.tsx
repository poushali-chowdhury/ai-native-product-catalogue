import { getCategories, getFeaturedProducts } from '../api.ts'
import { CategoryList } from '../components/CategoryList.tsx'
import { ProductList } from '../components/ProductList.tsx'
import { EmptyStatus, ErrorStatus, LoadingStatus } from '../components/Status.tsx'
import { useCatalogueRequest } from '../hooks/useCatalogueRequest.ts'

export function HomePage() {
  const featured = useCatalogueRequest(getFeaturedProducts, [])
  const categories = useCatalogueRequest(getCategories, [])

  return (
    <>
      <h1>Find a product</h1>
      <p className="intro">Browse featured products, choose a category, or search the catalogue.</p>

      <section className="panel" aria-labelledby="featured-heading">
        <h2 id="featured-heading">Featured products</h2>
        {featured.state.status === 'loading' ? (
          <LoadingStatus label="Loading featured products." />
        ) : null}
        {featured.state.status === 'error' ? (
          <ErrorStatus message={featured.state.message} onRetry={featured.reload} />
        ) : null}
        {featured.state.status === 'success' && featured.state.data.length === 0 ? (
          <EmptyStatus message="No featured products are available right now." />
        ) : null}
        {featured.state.status === 'success' && featured.state.data.length > 0 ? (
          <ProductList products={featured.state.data} />
        ) : null}
      </section>

      <section className="panel" aria-labelledby="categories-heading">
        <h2 id="categories-heading">Categories</h2>
        {categories.state.status === 'loading' ? (
          <LoadingStatus label="Loading categories." />
        ) : null}
        {categories.state.status === 'error' ? (
          <ErrorStatus message={categories.state.message} onRetry={categories.reload} />
        ) : null}
        {categories.state.status === 'success' && categories.state.data.length === 0 ? (
          <EmptyStatus message="No categories are available right now." />
        ) : null}
        {categories.state.status === 'success' && categories.state.data.length > 0 ? (
          <CategoryList categories={categories.state.data} />
        ) : null}
      </section>
    </>
  )
}
