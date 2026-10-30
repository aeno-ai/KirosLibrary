const PATHS = {
  arrowUp: (
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  document: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  external: (
    <>
      <path d="M14 5h5v5M19 5l-8 8" />
      <path d="M19 14v5H5V5h5" />
    </>
  ),
  fileImage: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5M9 15l2.5-2.5 2 2 1.5-1.5L18 16M9.5 10.5h.01" />
    </>
  ),
  folder: <path d="M3 6h7l2 2h9v10H3z" />,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m3 16 5-5 4 4 3-3 6 6M8.5 8.5h.01" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
    </>
  ),
  note: (
    <>
      <path d="M5 3h14v18H5z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  paw: (
    <>
      <ellipse cx="12" cy="15" rx="5" ry="4" />
      <circle cx="6" cy="9" r="2" />
      <circle cx="10" cy="6" r="2" />
      <circle cx="14" cy="6" r="2" />
      <circle cx="18" cy="9" r="2" />
    </>
  ),
  pin: (
    <>
      <path d="m9 3 6 6-2 2 4 4-2 2-4-4-5 1 3-5-2-2z" />
      <path d="m12 17-5 5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  signOut: (
    <>
      <path d="M10 5H5v14h5" />
      <path d="M13 8l4 4-4 4M17 12H8" />
    </>
  ),
}

export default function Icon({ name, size = '1em', className = '', label, filled = false }) {
  const path = PATHS[name] ?? PATHS.document
  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {label && <title>{label}</title>}
      {path}
    </svg>
  )
}
