import { Link } from 'react-router'
import { formatCategory } from '../format.ts'

export function CategoryList({ categories }: { categories: string[] }) {
  return (
    <ul className="category-list">
      {categories.map((category) => (
        <li key={category}>
          <Link to={`/category/${encodeURIComponent(category)}`}>{formatCategory(category)}</Link>
        </li>
      ))}
    </ul>
  )
}
