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

interface TickItem {
  id: string
  position: number
}

interface TickState {
  tick: number
  items: Record<string, TickItem>
  nextItemId: number
}

interface RenderItem {
  id: string
  tick: number
  position: number
}

interface RenderState {
  items: Record<string, RenderItem[]>
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
  const [tickState, setTickState] = useImmer<TickState>({
    tick: 0,
    items: {},
    nextItemId: 0,
  })

  useTicker(queue, setTickState)

  const context = useMemo(() => ({ vw, vh }), [vw, vh])

  useRenderLoop()

  return (
    <AppContext.Provider value={context}>
      <svg width={vw} height={vh} viewBox={viewBox}>
        <text
          fill="hsla(0, 0%, 50%, .5)"
          y="16"
          textRendering="optimizeLegibility"
        >
          Tick: {tickState.tick}
        </text>
        <line
          x1={vw * 0.2}
          y1={vh / 2}
          x2={vw * 0.8}
          y2={vh / 2}
          stroke="blue"
          strokeWidth={2}
        />
        {Object.values(tickState.items).map((item) => (
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
  setTickState: Updater<TickState>,
) {
  useEffect(() => {
    const interval = self.setInterval(() => {
      setTickState((draft) => {
        draft.tick++

        if (queue.current.length > 0) {
          const next = queue.current.shift()
          invariant(next.name === 'add-item')
          const item: TickItem = {
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
  }, [setTickState])
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

function useRenderLoop() {
  useEffect(() => {
    let handle: number
    const callback: FrameRequestCallback = () => {
      handle = self.requestAnimationFrame(callback)
    }
    handle = self.requestAnimationFrame(callback)

    return () => {
      self.cancelAnimationFrame(handle)
    }
  }, [])
}
