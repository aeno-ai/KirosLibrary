import { lazy, Suspense, useEffect, useMemo, useState } from 'react'

// lazy(): the Lottie player is split into its own file and only downloaded
// the first time a cat is shown, so the login screen loads fast.
// lazy() wants a module whose *default* export is the component; lottie-react
// only has named exports, so .then() reshapes it into { default: ... }.
// LottieLight = the smaller player without the rarely-used expression engine.
const Lottie = lazy(() => import('lottie-react').then((m) => ({ default: m.LottieLight })))

// Shown until the animation is ready, or forever if its file is missing.
const EMOJI = {
    peek: '🐶',
  wave: '🐕',
  sleep: '🐶',
  walk: '🦮',
  loading: '🐾',
  love: '🐶',
}

// Reads the OS/phone "Reduce motion" accessibility setting once.
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// One fetch per animation, shared by every <Cat> that uses it. The Map
// stores the *promise*, so two cats mounting at once still fetch only once.
const animations = new Map()
function loadAnimation(name) {
  if (!animations.has(name)) {
    animations.set(
      name,
      // A missing file comes back as index.html (the SPA fallback), so
      // r.json() throws, and that counts as "missing" too.
      fetch(`/cats/${name}.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error('missing')))),
    )
  }
  return animations.get(name)
}

// <Cat name="sleep" size={140} />. The animation file is public/cats/<name>.json.
export default function Cat({ name, size = 120, label }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    let ignore = false
    loadAnimation(name).then(
      (json) => !ignore && setData(json),
      () => {}, // missing or broken: just keep showing the emoji
    )
    return () => {
      ignore = true
    }
  }, [name])

  // lottie-web edits the animation data while playing it, so two cats sharing
  // one object can glitch. Each <Cat> gets its own deep copy (structuredClone).
  const ownCopy = useMemo(() => data && structuredClone(data), [data])

  const fallback = (
    <span className="cat-fallback" style={{ fontSize: size * 0.6 }}>
      {EMOJI[name] ?? '🐱'}
    </span>
  )

  return (
    <span className="cat" style={{ width: size, height: size }} role="img" aria-label={label ?? 'cute cat'}>
      {ownCopy ? (
        // Suspense shows the fallback while the lazy Lottie chunk downloads.
        <Suspense fallback={fallback}>
          <Lottie
            src={ownCopy}
            loop={!reducedMotion}
            autoplay={!reducedMotion} // reduced motion: a still first frame
            style={{ width: size, height: size }}
          />
        </Suspense>
      ) : (
        fallback
      )}
    </span>
  )
}
