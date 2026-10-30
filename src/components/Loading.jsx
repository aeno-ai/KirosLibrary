import KiroMascot from './KiroMascot'

export default function Loading({ text = 'Loading…' }) {
  return (
    <div className="empty">
      <KiroMascot mood="happy" size={90} />
      <p className="muted small">{text}</p>
    </div>
  )
}
