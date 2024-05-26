import {
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { Updater, useImmer } from 'use-immer'
import * as z from 'zod'
import { AppContext } from './app-context'
import { Vec2 } from './vec2'

interface Viewport {
  vw: number
  vh: number
}

const ZVec2 = z.strictObject({
  x: z.number(),
  y: z.number(),
})
type ZVec2 = z.infer<typeof ZVec2>

interface Entity {
  id: string
  position: ZVec2
}

interface State {
  tick: number
  entities: Record<string, Entity>
  nextEntityId: number
}

const Camera = z.strictObject({
  position: ZVec2,
})
type Camera = z.infer<typeof Camera>

function useCamera(): [
  Camera,
  Updater<Camera>,
  React.MutableRefObject<Camera>,
] {
  const [camera, setCamera] = useImmer<Camera>({
    position: { x: 0, y: 0 },
  })
  const cameraRef = useRef(camera)
  useEffect(() => {
    cameraRef.current = camera
  }, [camera])
  return [camera, setCamera, cameraRef]
}

function useViewportRef() {
  const context = useContext(AppContext)
  const viewportRef = useRef({
    vw: context.vw,
    vh: context.vh,
  })
  useEffect(() => {
    viewportRef.current = { vw: context.vw, vh: context.vh }
  }, [context])
  return viewportRef
}

function initialState(): State {
  const state: State = {
    tick: 0,
    entities: {},
    nextEntityId: 0,
  }
  const entity: Entity = {
    id: `${state.nextEntityId++}`,
    position: { x: 0, y: 0 },
  }
  state.entities[entity.id] = entity
  return state
}

export function App() {
  const { vw, vh } = useContext(AppContext)
  const vmin = useMemo(() => Math.min(vw, vh), [vw, vh])
  const viewBox = useMemo(() => `0 0 ${vw} ${vh}`, [vw, vh])

  const viewportRef = useViewportRef()

  const [state, setState] = useImmer<State>(initialState)

  const [camera, setCamera, cameraRef] = useCamera()

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
          const speed = vmin / 2 / 60
          const d = v.norm().mul(speed)
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
  }, [vmin])

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

    document.addEventListener(
      'pointerup',
      (ev) => {
        const world = pointerToWorld(
          new Vec2(ev.clientX, ev.clientY),
          viewportRef.current,
          cameraRef.current,
        )
        console.log('TODO', world)
      },
      { signal },
    )
  }, [signal])

  useTicker(setState)

  return (
    <Fragment>
      <svg width={vw} height={vh} viewBox={viewBox}>
        <g
          transform={`translate(${vw / 2 - camera.position.x} ${vh / 2 - camera.position.y})`}
        >
          {Object.values(state.entities).map((entity) => (
            <Fragment key={entity.id}>
              <rect
                x={entity.position.x * 100}
                y={entity.position.y * 100}
                width={100}
                height={100}
                fill="red"
              />
            </Fragment>
          ))}
          {pointer && (
            <RenderPointer
              pointer={pointer}
              camera={camera}
            />
          )}
        </g>
      </svg>
    </Fragment>
  )
}

interface RenderPointerProps {
  pointer: Vec2
  camera: Camera
}

function pointerToWorld(
  pointer: Vec2,
  viewport: Viewport,
  camera: Camera,
): Vec2 {
  const { vw, vh } = viewport
  const x = Math.floor(
    (pointer.x - vw / 2 + camera.position.x) / 100,
  )
  const y = Math.floor(
    (pointer.y - vh / 2 + camera.position.y) / 100,
  )
  return new Vec2(x, y)
}

function RenderPointer({
  pointer,
  camera,
}: RenderPointerProps) {
  const context = useContext(AppContext)
  const { x, y } = pointerToWorld(
    pointer,
    context,
    camera,
  ).mul(100)
  return (
    <rect
      x={x}
      y={y}
      width={100}
      height={100}
      fill="pink"
    />
  )
}

function tick(draft: State): void {
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
