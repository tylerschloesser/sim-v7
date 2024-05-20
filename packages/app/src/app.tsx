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
  id: string
  position: number
}

interface State {
  items: Record<string, Item>
  nextItemId: number
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
  const [state, setState] = useImmer<State>({
    items: {},
    nextItemId: 0,
  })
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
        {Object.values(state.items).map((item) => (
          <Fragment key={item.id}>
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
      setState((draft) => {
        if (queue.current.length > 0) {
          const next = queue.current.shift()
          invariant(next.name === 'add-item')
          const item: Item = {
            id: `${draft.nextItemId++}`,
            position: 0,
          }
          draft.items[item.id] = item
        }

        for (const item of Object.values(draft.items)) {
          item.position += BELT_SPEED
          if (item.position > 1) {
            delete draft.items[item.id]
          }
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

  const { x, y, width, height } = useMemo(() => {
    const size = Math.min(vw, vh) * 0.1
    return {
      x: vw * 0.2 - size / 2,
      y: vh / 2 - size / 2,
      width: size,
      height: size,
    }
  }, [vw, vh])

  return (
    <rect
      transform={`translate(${vw * 0.6 * position} 0)`}
      x={x}
      y={y}
      width={width}
      height={height}
      fill="red"
    />
  )
}
