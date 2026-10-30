import Cat from './Dog'

export default function Loading({ text = 'Loading…' }) {
  return (
    <div className="empty">
      <Cat name="loading" size={90} label="" />
      <p className="muted small">{text}</p>
    </div>
  )
}
