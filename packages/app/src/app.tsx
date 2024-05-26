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

interface Item {
  id: string
  position: number
}

interface State {
  tick: number
  items: Record<string, Item>
  nextItemId: number
}

interface Action {
  time: number
  name: 'add-item'
}

export function App() {
  const { vw, vh } = useContext(AppContext)
  const viewBox = useMemo(() => `0 0 ${vw} ${vh}`, [vw, vh])

  const queue = useRef<Action[]>([])

  const [tickState, setTickState] = useImmer<State>({
    tick: 0,
    items: {},
    nextItemId: 0,
  })

  useTicker(queue, setTickState)

  const addItem = useCallback(() => {
    queue.current.push({
      time: performance.now(),
      name: 'add-item',
    })
  }, [])

  return (
    <Fragment>
      <svg width={vw} height={vh} viewBox={viewBox}>
        <text fill="hsla(0, 0%, 50%, .5)" y="16">
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
      <button onClick={addItem}>Add</button>
    </Fragment>
  )
}

function useTicker(
  queue: React.MutableRefObject<Action[]>,
  setTickState: Updater<State>,
) {
  useEffect(() => {
    let handler: number
    function callback() {
      setTickState((draft) => {
        if (queue.current.length > 0) {
          for (const action of queue.current) {
            invariant(action.name === 'add-item')
            const item: Item = {
              id: `${draft.nextItemId++}`,
              position: 0,
            }
            draft.items[item.id] = item
          }
          queue.current = []
        }

        for (const item of Object.values(draft.items)) {
          item.position += BELT_SPEED * (1 / 60)

          if (item.position > 1) {
            delete draft.items[item.id]
          }
        }

        draft.tick++
      })

      handler = self.requestAnimationFrame(callback)
    }
    handler = self.requestAnimationFrame(callback)
    return () => {
      self.cancelAnimationFrame(handler)
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
