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
  outputId: string | null
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

function isOpposite(a: Direction, b: Direction) {
  switch (a) {
    case 'north':
      return b === 'south'
    case 'south':
      return b === 'north'
    case 'east':
      return b === 'west'
    case 'west':
      return b === 'east'
  }
}

function updateOutputIds(draft: State): void {
  for (const entity of Object.values(draft.entities)) {
    let d: Vec2
    switch (entity.direction) {
      case 'north':
        d = new Vec2(0, -1)
        break
      case 'south':
        d = new Vec2(0, +1)
        break
      case 'east':
        d = new Vec2(+1, 0)
        break
      case 'west':
        d = new Vec2(-1, 0)
        break
    }
    const neighborPosition = new Vec2(
      entity.position.x,
      entity.position.y,
    ).add(d)
    const neighborId = `${neighborPosition.x}.${neighborPosition.y}`
    const neighbor = draft.entities[neighborId]
    if (
      neighbor &&
      !isOpposite(entity.direction, neighbor.direction)
    ) {
      entity.outputId = neighborId
    }
  }
}

function addEntity(
  draft: State,
  entity: Omit<Entity, 'id' | 'outputId'>,
): void {
  const id = `${entity.position.x}.${entity.position.y}`
  const existing = draft.entities[id]
  if (existing) {
    if (
      existing.color === entity.color &&
      existing.direction === entity.direction
    ) {
      delete draft.entities[id]
    } else {
      existing.color = entity.color
      existing.direction = entity.direction
    }
  } else {
    draft.entities[id] = { id, outputId: null, ...entity }
  }
  updateOutputIds(draft)
}

function initialState(): State {
  const state: State = {
    tick: 0,
    entities: {},
  }
  addEntity(state, {
    position: { x: 0, y: 0 },
    color: 'red',
    direction: 'east',
  })
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

export function useDirection(): [
  Direction,
  React.Dispatch<React.SetStateAction<Direction>>,
  React.MutableRefObject<Direction>,
] {
  const [direction, setDirection] =
    useState<Direction>('east')
  const directionRef = useRef<Direction>(direction)
  useEffect(() => {
    directionRef.current = direction
  }, [direction])
  return [direction, setDirection, directionRef]
}

export function App() {
  const { vw, vh } = useContext(AppContext)
  const vmin = useMemo(() => Math.min(vw, vh), [vw, vh])
  const viewBox = useMemo(() => `0 0 ${vw} ${vh}`, [vw, vh])

  const [color, setColor, colorRef] = useColor()
  const svg = useRef<SVGSVGElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)

  const viewportRef = useViewportRef()

  const [state, setState] = useImmer<State>(initialState)

  const [camera, setCamera, cameraRef] = useCamera()
  const [direction, setDirection, directionRef] =
    useDirection()

  const [ghost, setGhost] = useImmer<Omit<
    Entity,
    'id'
  > | null>(null)

  const [pointer, setPointer] = useImmer<Vec2 | null>(null)

  useEffect(() => {
    setGhost((draft) => {
      if (!pointer) {
        return null
      }
      const world = pointerToWorld(
        pointer,
        viewportRef.current,
        cameraRef.current,
      )
      if (!draft) {
        return {
          position: {
            x: world.x,
            y: world.y,
          },
          color,
          direction,
        }
      } else {
        draft.position.x = world.x
        draft.position.y = world.y
        draft.color = color
        draft.direction = direction
      }
    })
  }, [color, pointer, direction])

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
    function handleKeyboardEvent(ev: KeyboardEvent) {
      invariant(
        ev.type === 'keydown' || ev.type === 'keyup',
      )

      const isKeydown = ev.type === 'keydown'
      const isKeyup = ev.type === 'keyup'

      switch (ev.key.toLowerCase()) {
        case 'w': {
          input.current.north = isKeydown
          break
        }
        case 's': {
          input.current.south = isKeydown
          break
        }
        case 'a': {
          input.current.west = isKeydown
          break
        }
        case 'd': {
          input.current.east = isKeydown
          break
        }
        case 'e': {
          if (isKeyup) {
            setMenuOpen((value) => !value)
          }
          break
        }
        case 'r': {
          if (isKeyup) {
            setDirection((prev) => {
              if (ev.shiftKey) {
                switch (prev) {
                  case 'north':
                    return 'west'
                  case 'west':
                    return 'south'
                  case 'south':
                    return 'east'
                  case 'east':
                    return 'north'
                }
              } else {
                switch (prev) {
                  case 'north':
                    return 'east'
                  case 'east':
                    return 'south'
                  case 'south':
                    return 'west'
                  case 'west':
                    return 'north'
                }
              }
            })
          }
          break
        }
      }
    }

    document.addEventListener(
      'keydown',
      (ev) => {
        handleKeyboardEvent(ev)
      },
      { signal },
    )
    document.addEventListener(
      'keyup',
      (ev) => {
        handleKeyboardEvent(ev)
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
          addEntity(draft, {
            position: world,
            color: colorRef.current,
            direction: directionRef.current,
          })
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
              <RenderEntity
                entity={entity}
                layer={RenderEntityLayer.Layer1}
              />
            </Fragment>
          ))}
          {Object.values(state.entities).map((entity) => (
            <Fragment key={entity.id}>
              <RenderEntity
                entity={entity}
                layer={RenderEntityLayer.Layer2}
              />
            </Fragment>
          ))}
          {ghost && (
            <RenderEntity
              entity={ghost}
              layer={RenderEntityLayer.All}
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

enum RenderEntityLayer {
  Layer1 = 'layer-1',
  Layer2 = 'layer-2',
  All = 'all',
}

interface RenderEntityProps {
  entity: Omit<Entity, 'id'>
  layer: RenderEntityLayer
}
function RenderEntity({
  entity,
  layer,
}: RenderEntityProps) {
  const transform = useMemo(() => {
    let rotate: number
    switch (entity.direction) {
      case 'north':
        rotate = -90
        break
      case 'south':
        rotate = 90
        break
      case 'east':
        rotate = 0
        break
      case 'west':
        rotate = 180
        break
    }
    return `translate(${entity.position.x * TILE_SIZE} ${entity.position.y * TILE_SIZE}) rotate(${rotate}, ${TILE_SIZE / 2}, ${TILE_SIZE / 2})`
  }, [entity])
  return (
    <g transform={transform}>
      {(layer === RenderEntityLayer.All ||
        layer === RenderEntityLayer.Layer1) && (
        <rect
          width={TILE_SIZE}
          height={TILE_SIZE}
          fill={entity.color}
        />
      )}
      {(layer === RenderEntityLayer.All ||
        layer === RenderEntityLayer.Layer2) && (
        <>
          <circle
            cx={TILE_SIZE}
            cy={TILE_SIZE / 2}
            r={TILE_SIZE * 0.1}
            fill="green"
          />
          {entity.outputId && (
            <>
              <circle
                cx={TILE_SIZE / 2}
                cy={TILE_SIZE / 2}
                r={TILE_SIZE * 0.1}
                fill="cyan"
              />
              <circle
                cx={TILE_SIZE + TILE_SIZE / 2}
                cy={TILE_SIZE / 2}
                r={TILE_SIZE * 0.1}
                fill="cyan"
              />
              <line
                x1={TILE_SIZE / 2}
                y1={TILE_SIZE / 2}
                x2={TILE_SIZE + TILE_SIZE / 2}
                y2={TILE_SIZE / 2}
                stroke="cyan"
                strokeWidth="2"
              />
            </>
          )}
        </>
      )}
    </g>
  )
}
