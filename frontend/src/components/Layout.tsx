import { Link, Outlet, useSearchParams } from 'react-router'
import { SearchBar } from './SearchBar.tsx'

export function Layout() {
  const [params] = useSearchParams()

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/">
            AI-Native Product Catalogue
          </Link>
          <SearchBar initialQuery={params.get('q') ?? ''} />
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
