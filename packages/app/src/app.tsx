import { Fragment, useEffect, useRef } from 'react'
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
        {state.items.map((item, key) => (
          <Fragment key={key}>
            <Rect
              x={vw * 0.2 + vw * 0.6 * item.position}
              y={vh / 2}
            />
          </Fragment>
        ))}
      </svg>
      <button
        onClick={() => {
          setState((draft: State) => {
            draft.items.unshift({ position: 0, speed: 0.2 })
          })
        }}
      >
        Add
      </button>
    </>
  )
}

function useTicker(setState: Updater<State>) {
  useEffect(() => {
    const interval = self.setInterval(() => {
      setState((draft: State) => {
        for (const item of draft.items) {
          item.position += item.speed
        }
        draft.items = draft.items.filter(
          (item) => item.position <= 1,
        )
      })
    }, 1000)

    return () => {
      self.clearInterval(interval)
    }
  }, [setState])
}

interface RectProps {
  x: number
  y: number
}

function Rect({ x, y }: RectProps) {
  const vw = window.innerWidth
  const vh = window.innerHeight

  return (
    <rect
      x={x}
      y={y}
      width={Math.min(vw, vh) * 0.1}
      height={Math.min(vw, vh) * 0.1}
      fill="red"
    />
  )
}
