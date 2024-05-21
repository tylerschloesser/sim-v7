import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import invariant from 'tiny-invariant'
import { Updater, useImmer } from 'use-immer'
import { AppContext } from './app-context'

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
  position: number
}

interface RenderState {
  tick: number
  items: Record<string, RenderItem>
}

interface Action {
  time: number
  name: 'add-item'
}

export function App() {
  const { vw, vh } = useContext(AppContext)
  const viewBox = useMemo(() => `0 0 ${vw} ${vh}`, [vw, vh])

  const queue = useRef<Action[]>([])

  const tickState = useRef<TickState>({
    tick: 0,
    items: {},
    nextItemId: 0,
  })

  const [renderState, setRenderState] =
    useImmer<RenderState>({
      tick: 0,
      items: {},
    })

  useTicker(queue, tickState)

  useRenderLoop(tickState, setRenderState)

  const addItem = useCallback(() => {
    queue.current.push({
      time: performance.now(),
      name: 'add-item',
    })
  }, [])

  return (
    <Fragment>
      <svg width={vw} height={vh} viewBox={viewBox}>
        <text
          fill="hsla(0, 0%, 50%, .5)"
          y="16"
          textRendering="optimizeLegibility"
        >
          Tick: {renderState.tick}
        </text>
        <line
          x1={vw * 0.2}
          y1={vh / 2}
          x2={vw * 0.8}
          y2={vh / 2}
          stroke="blue"
          strokeWidth={2}
        />
        {Object.values(renderState.items).map((item) => (
          <Fragment key={item.id}>
            <Rect position={item.position} />
          </Fragment>
        ))}
      </svg>
      <button onClick={addItem}>Add</button>
    </Fragment>
  )
}

function useTicker(
  queue: React.MutableRefObject<Action[]>,
  tickState: React.MutableRefObject<TickState>,
) {
  useEffect(() => {
    const interval = self.setInterval(() => {
      tickState.current.tick++

      if (queue.current.length > 0) {
        const next = queue.current.shift()
        invariant(next.name === 'add-item')
        const item: TickItem = {
          id: `${tickState.current.nextItemId++}`,
          position: 0,
        }
        tickState.current.items[item.id] = item
      }

      for (const item of Object.values(
        tickState.current.items,
      )) {
        item.position += BELT_SPEED
        if (item.position > 1) {
          delete tickState.current.items[item.id]
        }
      }
    }, 1000)

    return () => {
      self.clearInterval(interval)
    }
  }, [])
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

function useRenderLoop(
  tickState: React.MutableRefObject<TickState>,
  setRenderState: Updater<RenderState>,
) {
  useEffect(() => {
    let handle: number
    const callback: FrameRequestCallback = () => {
      handle = self.requestAnimationFrame(callback)

      setRenderState((renderState) => {
        renderState.tick = tickState.current.tick

        const itemIds = new Set<string>([
          ...Object.keys(renderState.items),
          ...Object.keys(tickState.current.items),
        ])

        for (const itemId of itemIds) {
          const tickItem = tickState.current.items[itemId]
          if (!tickItem) {
            invariant(renderState.items[itemId])
            delete renderState.items[itemId]
            continue
          }

          const renderItem = renderState.items[itemId]
          if (!renderItem) {
            renderState.items[itemId] = {
              id: itemId,
              position: tickItem.position,
            }
          } else {
            renderItem.position = tickItem.position
          }
        }
      })
    }
    handle = self.requestAnimationFrame(callback)

    return () => {
      self.cancelAnimationFrame(handle)
    }
  }, [])
}
