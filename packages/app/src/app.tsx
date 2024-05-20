import { useRef } from 'react'

interface Item {
  position: number
  speed: number
}

interface State {
  items: Item[]
}

export function App() {
  const vw = window.innerWidth
  const vh = window.innerHeight

  const viewBox = `0 0 ${vw} ${vh}`

  const state = useRef<State>({ items: [] })

  return (
    <>
      <svg width={vw} height={vh} viewBox={viewBox}>
        <circle
          cx={vw / 2}
          cy={vh / 2}
          r={Math.min(vw, vh) * 0.2}
          fill="blue"
        />
      </svg>
      <button>Add</button>
    </>
  )
}
