import { useEffect, useRef } from 'react'
import { Updater, useImmer } from 'use-immer'

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

  const queue = useRef<'add-item'[]>([])
  const [state, setState] = useImmer<State>({ items: [] })
  useTicker(setState)

  return (
    <>
      <svg width={vw} height={vh} viewBox={viewBox}>
        <line
          x1={vw * 0.2}
          y1={vh / 2}
          x2={vw * 0.8}
          y2={vh / 2}
          stroke="blue"
          strokeWidth={2}
        />
      </svg>
      <button>Add</button>
    </>
  )
}

function useTicker(setState: Updater<State>) {
  useEffect(() => {
    const interval = self.setInterval(() => {
      console.log('TODO tick')
    }, 1000)

    return () => {
      self.clearInterval(interval)
    }
  }, [setState])
}
