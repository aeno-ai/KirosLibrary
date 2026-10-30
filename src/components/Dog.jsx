import KiroMascot from './KiroMascot'

// Compatibility wrapper for code that still imports the former mascot path.
// New application code imports KiroMascot directly.
const MOODS = {
  loading: 'happy',
  peek: 'idle',
  sleep: 'sleep',
  walk: 'happy',
  wave: 'idle',
}

export default function Dog({ name, ...props }) {
  return <KiroMascot mood={MOODS[name] ?? 'idle'} {...props} />
}
