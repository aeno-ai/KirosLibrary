import { Link } from 'react-router-dom'

export default function Breadcrumbs({ path }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <Link to="/">Library</Link>
      {path.map((c, i) => (
        <span key={c.id}>
          {' / '}
          {/* The last crumb is the page you're on, so it isn't a link. */}
          {i === path.length - 1 ? c.name : <Link to={`/c/${c.id}`}>{c.name}</Link>}
        </span>
      ))}
    </nav>
  )
}
