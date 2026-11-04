import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

export function SearchBar({ initialQuery = '' }: { initialQuery?: string }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState(initialQuery)
  const [notice, setNotice] = useState('')

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = query.trim()

    if (!term) {
      setNotice('Enter a search term.')
      return
    }

    setNotice('')
    navigate(`/search?q=${encodeURIComponent(term)}`)
  }

  return (
    <form className="search-form" role="search" onSubmit={onSubmit}>
      <label htmlFor="product-search">
        Search products
        <input
          id="product-search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <button type="submit">Search</button>
      {notice ? (
        <p className="field-error" role="alert">
          {notice}
        </p>
      ) : null}
    </form>
  )
}
