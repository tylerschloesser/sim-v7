import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import invariant from 'tiny-invariant'
import { Updater, useImmer } from 'use-immer'

const BELT_SPEED = 0.2

interface Item {
  position: number
}

interface State {
  items: Item[]
}

interface IAppContext {
  vw: number
  vh: number
}

const AppContext = createContext<IAppContext>({
  vw: 0,
  vh: 0,
})

interface Action {
  time: number
  name: 'add-item'
}

export function App() {
  const vw = window.innerWidth
  const vh = window.innerHeight

  const viewBox = `0 0 ${vw} ${vh}`

  const queue = useRef<Action[]>([])
  const [state, setState] = useImmer<State>({ items: [] })
  useTicker(queue, setState)

  const context = useMemo(() => ({ vw, vh }), [vw, vh])

  return (
    <AppContext.Provider value={context}>
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
            <Rect position={item.position} />
          </Fragment>
        ))}
      </svg>
      <button
        onClick={() => {
          queue.current.push({
            time: performance.now(),
            name: 'add-item',
          })
        }}
      >
        Add
      </button>
    </AppContext.Provider>
  )
}

function useTicker(
  queue: React.MutableRefObject<Action[]>,
  setState: Updater<State>,
) {
  useEffect(() => {
    const interval = self.setInterval(() => {
      setState((draft: State) => {
        if (queue.current.length > 0) {
          const next = queue.current.shift()
          invariant(next.name === 'add-item')

          draft.items.unshift({ position: 0 })
        }

        for (const item of draft.items) {
          item.position += BELT_SPEED
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
  position: number
}

function Rect({ position }: RectProps) {
  const { vw, vh } = useContext(AppContext)

  const size = Math.min(vw, vh) * 0.1

  return (
    <rect
      x={vw * 0.2 + vw * 0.6 * position - size / 2}
      y={vh / 2 - size / 2}
      width={size}
      height={size}
      fill="red"
    />
  )
}
