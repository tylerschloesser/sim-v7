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
import * as z from 'zod'
import { AppContext } from './app-context'
import { Vec2 } from './vec2'

const BELT_SPEED = 0.2

interface Item {
  id: string
  position: number
}

interface State {
  tick: number
  items: Record<string, Item>
  queue: Action[]
  nextItemId: number
}

interface Action {
  time: number
  name: 'add-item'
}

const ZVec2 = z.strictObject({
  x: z.number(),
  y: z.number(),
})
type ZVec2 = z.infer<typeof ZVec2>

const Camera = z.strictObject({
  position: ZVec2,
})
type Camera = z.infer<typeof Camera>

export function App() {
  const { vw, vh } = useContext(AppContext)
  const viewBox = useMemo(() => `0 0 ${vw} ${vh}`, [vw, vh])

  const [state, setState] = useImmer<State>({
    tick: 0,
    items: {},
    queue: [],
    nextItemId: 0,
  })

  const [camera, setCamera] = useImmer<Camera>({
    position: { x: 0, y: 0 },
  })

  const [pointer, setPointer] = useImmer<Vec2 | null>(null)

  const input = useRef<{
    north: boolean
    south: boolean
    east: boolean
    west: boolean
  }>({
    north: false,
    south: false,
    east: false,
    west: false,
  })

  const controller = useMemo(
    () => new AbortController(),
    [],
  )
  const { signal } = controller
  useEffect(() => {
    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    let handle: number
    function callback() {
      setCamera((draft) => {
        let v = Vec2.ZERO
        if (input.current.north) {
          v = v.add(new Vec2(0, -1))
        }
        if (input.current.south) {
          v = v.add(new Vec2(0, +1))
        }
        if (input.current.east) {
          v = v.add(new Vec2(+1, 0))
        }
        if (input.current.west) {
          v = v.add(new Vec2(-1, 0))
        }
        if (v.len() > 0) {
          const d = v.norm().mul(3)
          draft.position.x += d.x
          draft.position.y += d.y
        }
      })
      handle = self.requestAnimationFrame(callback)
    }
    handle = self.requestAnimationFrame(callback)
    return () => {
      self.cancelAnimationFrame(handle)
    }
  }, [])

  useEffect(() => {
    function handleKey(
      key: string,
      eventType: 'keydown' | 'keyup',
    ) {
      const value = eventType === 'keydown'
      switch (key) {
        case 'w': {
          input.current.north = value
          break
        }
        case 's': {
          input.current.south = value
          break
        }
        case 'a': {
          input.current.west = value
          break
        }
        case 'd': {
          input.current.east = value
          break
        }
      }
    }

    document.addEventListener(
      'keydown',
      (ev) => {
        handleKey(ev.key, 'keydown')
      },
      { signal },
    )
    document.addEventListener(
      'keyup',
      (ev) => {
        handleKey(ev.key, 'keyup')
      },
      { signal },
    )
  }, [signal])

  useEffect(() => {
    document.addEventListener(
      'pointerenter',
      (ev) => {
        setPointer(new Vec2(ev.clientX, ev.clientY))
      },
      { signal },
    )

    document.addEventListener(
      'pointermove',
      (ev) => {
        setPointer(new Vec2(ev.clientX, ev.clientY))
      },
      { signal },
    )

    document.addEventListener(
      'pointerleave',
      () => {
        setPointer(null)
      },
      { signal },
    )
  }, [signal])

  useTicker(setState)

  const addItem = useCallback(() => {
    setState((draft) => {
      draft.queue.push({
        time: performance.now(),
        name: 'add-item',
      })
    })
  }, [])

  return (
    <Fragment>
      <svg width={vw} height={vh} viewBox={viewBox}>
        <g
          transform={`translate(${vw / 2 + camera.position.x} ${vh / 2 + camera.position.y})`}
        >
          <rect
            x={0}
            y={0}
            width={100}
            height={100}
            fill="red"
          />
        </g>
        {pointer && (
          <circle
            cx={pointer.x}
            cy={pointer.y}
            fill="green"
            r="10"
          />
        )}
      </svg>
      <button onClick={addItem}>Add</button>
    </Fragment>
  )
}

function tick(draft: State): void {
  if (draft.queue.length > 0) {
    for (const action of draft.queue) {
      invariant(action.name === 'add-item')
      const item: Item = {
        id: `${draft.nextItemId++}`,
        position: 0,
      }
      draft.items[item.id] = item
    }
    draft.queue = []
  }

  for (const item of Object.values(draft.items)) {
    item.position += BELT_SPEED * (1 / 60)

    if (item.position > 1) {
      delete draft.items[item.id]
    }
  }

  draft.tick++
}

function useTicker(setState: Updater<State>) {
  useEffect(() => {
    let handler: number
    function callback() {
      setState(tick)
      handler = self.requestAnimationFrame(callback)
    }
    handler = self.requestAnimationFrame(callback)
    return () => {
      self.cancelAnimationFrame(handler)
    }
  }, [])
}
