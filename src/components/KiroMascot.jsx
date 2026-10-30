import { useState } from 'react'
import Icon from './Icon'

const POSES = {
  idle: '/kiro/kiro-idle.webp',
  happy: '/kiro/kiro-happy.webp',
  sleep: '/kiro/kiro-sleep.webp',
}

// A fixed square wrapper prevents layout shifts while the small pose loads.
export default function KiroMascot({ mood = 'idle', size = 120, className = '', label }) {
  const pose = POSES[mood] ? mood : 'idle'
  const src = POSES[pose]
  const [failedSrc, setFailedSrc] = useState(null)
  const failed = failedSrc === src
  const style = { width: size, height: size }

  return (
    <span
      className={`kiro-mascot kiro-${pose} ${className}`.trim()}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {failed ? (
        <Icon name="paw" size="60%" className="kiro-fallback" />
      ) : (
        <img src={src} alt="" width={size} height={size} onError={() => setFailedSrc(src)} />
      )}
    </span>
  )
}
