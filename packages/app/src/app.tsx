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

interface Item {
  position: number
  speed: number
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
        for (const item of draft.items) {
          item.position += item.speed
        }
        draft.items = draft.items.filter(
          (item) => item.position <= 1,
        )

        while (queue.current.length > 0) {
          const next = queue.current.shift()
          invariant(next)

          draft.items.unshift({ position: 0, speed: 0.2 })
        }
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
  return (
    <rect
      x={vw * 0.2 + vw * 0.6 * position}
      y={vh / 2}
      width={Math.min(vw, vh) * 0.1}
      height={Math.min(vw, vh) * 0.1}
      fill="red"
    />
  )
}
