import {
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import invariant from 'tiny-invariant'
import { Updater, useImmer } from 'use-immer'
import * as z from 'zod'
import { AppContext } from './app-context'
import { Vec2 } from './vec2'

const TILE_SIZE = 50

interface Viewport {
  vw: number
  vh: number
}

const ZVec2 = z.strictObject({
  x: z.number(),
  y: z.number(),
})
type ZVec2 = z.infer<typeof ZVec2>

type Direction = 'north' | 'south' | 'east' | 'west'

interface Entity {
  id: string
  position: ZVec2
  color: string
  direction: Direction
}

interface State {
  tick: number
  entities: Record<string, Entity>
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
  }
  const entity: Entity = {
    id: '0.0',
    position: { x: 0, y: 0 },
    color: 'red',
    direction: 'east',
  }
  state.entities[entity.id] = entity
  return state
}

function useColor(): [
  string,
  (color: string) => void,
  React.MutableRefObject<string>,
] {
  const [color, setColor] = useState<string>('red')
  const colorRef = useRef<string>(color)
  useEffect(() => {
    colorRef.current = color
  }, [color])
  return [color, setColor, colorRef]
}

export function App() {
  const { vw, vh } = useContext(AppContext)
  const vmin = useMemo(() => Math.min(vw, vh), [vw, vh])
  const viewBox = useMemo(() => `0 0 ${vw} ${vh}`, [vw, vh])

  const [_color, setColor, colorRef] = useColor()
  const svg = useRef<SVGSVGElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)

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
        case 'e': {
          if (eventType === 'keyup') {
            setMenuOpen((value) => !value)
          }
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
    invariant(svg.current)
    svg.current.addEventListener(
      'pointerenter',
      (ev) => {
        setPointer(new Vec2(ev.clientX, ev.clientY))
      },
      { signal },
    )

    svg.current.addEventListener(
      'pointermove',
      (ev) => {
        setPointer(new Vec2(ev.clientX, ev.clientY))
      },
      { signal },
    )

    svg.current.addEventListener(
      'pointerleave',
      () => {
        setPointer(null)
      },
      { signal },
    )

    svg.current.addEventListener(
      'pointerup',
      (ev) => {
        const world = pointerToWorld(
          new Vec2(ev.clientX, ev.clientY),
          viewportRef.current,
          cameraRef.current,
        )
        setState((draft) => {
          const id = `${world.x}.${world.y}`
          if (
            draft.entities[id]?.color === colorRef.current
          ) {
            delete draft.entities[id]
            return
          }
          const entity: Entity = {
            id,
            position: { x: world.x, y: world.y },
            color: colorRef.current,
            direction: 'east',
          }
          draft.entities[id] = entity
        })
      },
      { signal },
    )
  }, [signal])

  useTicker(setState)

  return (
    <Fragment>
      <svg
        width={vw}
        height={vh}
        viewBox={viewBox}
        ref={svg}
      >
        <g
          transform={`translate(${vw / 2 - camera.position.x} ${vh / 2 - camera.position.y})`}
        >
          {Object.values(state.entities).map((entity) => (
            <Fragment key={entity.id}>
              <g
                transform={`translate(${entity.position.x * TILE_SIZE} ${entity.position.y * TILE_SIZE})`}
              >
                <rect
                  width={TILE_SIZE}
                  height={TILE_SIZE}
                  fill={entity.color}
                />
              </g>
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
      {menuOpen && (
        <Menu
          setColor={setColor}
          setMenuOpen={setMenuOpen}
        />
      )}
    </Fragment>
  )
}

interface MenuProps {
  setColor(color: string): void
  setMenuOpen(menuOpen: boolean): void
}
function Menu({ setColor, setMenuOpen }: MenuProps) {
  return (
    <div id="menu">
      <button
        onClick={() => {
          setColor('red')
          setMenuOpen(false)
        }}
      >
        Red
      </button>
      <button
        onClick={() => {
          setColor('blue')
          setMenuOpen(false)
        }}
      >
        Blue
      </button>
    </div>
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
    (pointer.x - vw / 2 + camera.position.x) / TILE_SIZE,
  )
  const y = Math.floor(
    (pointer.y - vh / 2 + camera.position.y) / TILE_SIZE,
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
  ).mul(TILE_SIZE)
  return (
    <rect
      x={x}
      y={y}
      width={TILE_SIZE}
      height={TILE_SIZE}
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
