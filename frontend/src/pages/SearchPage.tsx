import { useSearchParams } from 'react-router'
import { searchProducts } from '../api.ts'
import { ProductList } from '../components/ProductList.tsx'
import { EmptyStatus, ErrorStatus, LoadingStatus } from '../components/Status.tsx'
import { useCatalogueRequest } from '../hooks/useCatalogueRequest.ts'

export function SearchPage() {
  const [params] = useSearchParams()
  const query = params.get('q')?.trim() ?? ''
  const { state, reload } = useCatalogueRequest(
    () => (query ? searchProducts(query) : Promise.resolve([])),
    [query],
  )

  return (
    <>
      <h1>Search results</h1>
      {!query ? <EmptyStatus message="Enter a search term to find products." /> : null}
      {query && state.status === 'loading' ? (
        <LoadingStatus label={`Searching for ${query}.`} />
      ) : null}
      {query && state.status === 'error' ? (
        <ErrorStatus message={state.message} onRetry={reload} />
      ) : null}
      {query && state.status === 'success' && state.data.length === 0 ? (
        <EmptyStatus message={`No products match "${query}". Try another search.`} />
      ) : null}
      {query && state.status === 'success' && state.data.length > 0 ? (
        <ProductList products={state.data} />
      ) : null}
    </>
  )
}
