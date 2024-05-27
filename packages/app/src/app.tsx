import {
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as React from 'react'
import invariant from 'tiny-invariant'
import { Updater, useImmer } from 'use-immer'
import * as z from 'zod'
import { AppContext } from './app-context'
import {
  BeltEntity,
  Direction,
  Entity,
  EntityType,
  LaneType,
  PlaceholderEntity,
  TileType,
  World,
  ZVec2,
} from './schema'
import { Vec2 } from './vec2'

const BELT_SPEED = 0.5
const TILE_SIZE = 50
const ITEM_SIZE = TILE_SIZE * 0.5

interface Viewport {
  vw: number
  vh: number
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

function getOutputLaneType(
  entity: BeltEntity,
  neighbor: BeltEntity,
):
  | typeof LaneType.enum.InStraight
  | typeof LaneType.enum.InLeft
  | typeof LaneType.enum.InRight
  | null {
  switch (entity.direction) {
    case Direction.enum.North:
      switch (neighbor.direction) {
        case Direction.enum.North:
          return LaneType.enum.InStraight
        case Direction.enum.South:
          return null
        case Direction.enum.East:
          return LaneType.enum.InRight
        case Direction.enum.West:
          return LaneType.enum.InLeft
      }
    case Direction.enum.South:
      switch (neighbor.direction) {
        case Direction.enum.North:
          return null
        case Direction.enum.South:
          return LaneType.enum.InStraight
        case Direction.enum.East:
          return LaneType.enum.InLeft
        case Direction.enum.West:
          return LaneType.enum.InRight
      }
    case Direction.enum.East:
      switch (neighbor.direction) {
        case Direction.enum.North:
          return LaneType.enum.InLeft
        case Direction.enum.South:
          return LaneType.enum.InRight
        case Direction.enum.East:
          return LaneType.enum.InStraight
        case Direction.enum.West:
          return null
      }
    case Direction.enum.West:
      switch (neighbor.direction) {
        case Direction.enum.North:
          return LaneType.enum.InRight
        case Direction.enum.South:
          return LaneType.enum.InLeft
        case Direction.enum.East:
          return null
        case Direction.enum.West:
          return LaneType.enum.InStraight
      }
  }
}

function updateOutputs(draft: World): void {
  for (const entity of Object.values(draft.entities)) {
    entity.output = null

    let d: Vec2
    switch (entity.direction) {
      case Direction.enum.North:
        d = new Vec2(0, -1)
        break
      case Direction.enum.South:
        d = new Vec2(0, +1)
        break
      case Direction.enum.East:
        d = new Vec2(+1, 0)
        break
      case Direction.enum.West:
        d = new Vec2(-1, 0)
        break
    }
    const neighborPosition = new Vec2(
      entity.position.x,
      entity.position.y,
    ).add(d)
    const neighborId = `${neighborPosition.x}.${neighborPosition.y}`
    const neighbor = draft.entities[neighborId]
    if (neighbor) {
      const laneType = getOutputLaneType(entity, neighbor)
      if (laneType) {
        entity.output = { id: neighborId, laneType }
      }
    }
  }
}

function addTile(
  draft: World,
  position: ZVec2,
  type: TileType,
): void {
  const id = `${position.x}.${position.y}`
  invariant(!draft.tiles[id])
  draft.tiles[id] = { id, type, position }
}

function addBeltEntity(
  draft: World,
  entity: Omit<
    BeltEntity,
    'type' | 'id' | 'output' | 'lanes'
  >,
): void {
  const id = `${entity.position.x}.${entity.position.y}`
  const existing = draft.entities[id]
  if (existing) {
    if (existing.direction === entity.direction) {
      delete draft.entities[id]
    } else {
      existing.direction = entity.direction
    }
  } else {
    draft.entities[id] = {
      type: EntityType.enum.Belt,
      id,
      output: null, // will be set later
      lanes: {
        [LaneType.enum.Out]: [0],
        [LaneType.enum.InStraight]: [],
        [LaneType.enum.InLeft]: [],
        [LaneType.enum.InRight]: [],
      },
      ...entity,
    }
  }
  updateOutputs(draft)
}

function initialWorld(): World {
  const world: World = {
    tick: 0,
    entities: {},
    tiles: {},
  }
  addTile(world, new Vec2(-2, -2), TileType.enum.Coal)
  addBeltEntity(world, {
    position: { x: 0, y: 0 },
    direction: Direction.enum.East,
  })
  return world
}

export function useDirection(): [
  Direction,
  React.Dispatch<React.SetStateAction<Direction>>,
  React.MutableRefObject<Direction>,
] {
  const [direction, setDirection] = useState<Direction>(
    Direction.enum.East,
  )
  const directionRef = useRef<Direction>(direction)
  useEffect(() => {
    directionRef.current = direction
  }, [direction])
  return [direction, setDirection, directionRef]
}

function usePlaceholder(): [
  PlaceholderEntity | null,
  (placeholder: PlaceholderEntity | null) => void,
  React.MutableRefObject<PlaceholderEntity | null>,
] {
  const [placeholder, setPlaceholder] =
    useState<PlaceholderEntity | null>(null)
  const placeholderRef = useRef<PlaceholderEntity | null>(
    placeholder,
  )
  useEffect(() => {
    placeholderRef.current = placeholder
  }, [placeholder])
  return [placeholder, setPlaceholder, placeholderRef]
}

export function App() {
  const { vw, vh } = useContext(AppContext)
  const vmin = useMemo(() => Math.min(vw, vh), [vw, vh])
  const viewBox = useMemo(() => `0 0 ${vw} ${vh}`, [vw, vh])

  const svg = useRef<SVGSVGElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)

  const viewportRef = useViewportRef()

  const [world, setWorld] = useImmer<World>(initialWorld)

  const [camera, setCamera, cameraRef] = useCamera()
  const [direction, setDirection] = useDirection()

  const [pointer, setPointer] = useImmer<Vec2 | null>(null)

  const [placeholder, setPlaceholder, placeholderRef] =
    usePlaceholder()

  const [placeholderType, setPlaceholderType] =
    useState<EntityType | null>(EntityType.enum.Belt)

  useEffect(() => {
    if (!pointer || placeholderType === null) {
      setPlaceholder(null)
      return
    }
    const world = pointerToWorld(
      pointer,
      viewportRef.current,
      cameraRef.current,
    )
    switch (placeholderType) {
      case EntityType.enum.Belt: {
        setPlaceholder({
          type: EntityType.enum.Belt,
          direction,
          position: world,
        })
        break
      }
      default: {
        invariant(false)
      }
    }
  }, [pointer, direction, placeholderType])

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
        case 'q': {
          if (isKeyup) {
            setPlaceholderType(null)
          }
          break
        }
        case 'r': {
          if (isKeyup) {
            setDirection((prev) => {
              if (ev.shiftKey) {
                switch (prev) {
                  case Direction.enum.North:
                    return Direction.enum.West
                  case Direction.enum.West:
                    return Direction.enum.South
                  case Direction.enum.South:
                    return Direction.enum.East
                  case Direction.enum.East:
                    return Direction.enum.North
                }
              } else {
                switch (prev) {
                  case Direction.enum.North:
                    return Direction.enum.East
                  case Direction.enum.East:
                    return Direction.enum.South
                  case Direction.enum.South:
                    return Direction.enum.West
                  case Direction.enum.West:
                    return Direction.enum.North
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
      () => {
        setWorld((draft) => {
          if (placeholderRef.current === null) {
            return
          }
          invariant(
            placeholderRef.current.type ===
              EntityType.enum.Belt,
          )
          addBeltEntity(draft, placeholderRef.current)
        })
      },
      { signal },
    )
  }, [signal])

  useTicker(setWorld)

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
          <RenderTiles tiles={world.tiles} />
          <RenderEntities entities={world.entities} />
          {placeholder && (
            <RenderPlaceholderEntity entity={placeholder} />
          )}
        </g>
      </svg>
      {menuOpen && (
        <Menu
          setPlaceholderType={setPlaceholderType}
          setMenuOpen={setMenuOpen}
        />
      )}
    </Fragment>
  )
}

function getStrokeForTileType(type: TileType) {
  switch (type) {
    case TileType.enum.Coal:
      return 'white'
    case TileType.enum.Iron:
      return 'gray'
  }
}

interface RenderTilesProps {
  tiles: World['tiles']
}
const RenderTiles = React.memo(function RenderTiles({
  tiles,
}: RenderTilesProps) {
  return (
    <>
      {Object.values(tiles).map((tile) => (
        <Fragment key={tile.id}>
          <g
            transform={`translate(${tile.position.x * TILE_SIZE} ${tile.position.y * TILE_SIZE})`}
          >
            <rect
              width={TILE_SIZE}
              height={TILE_SIZE}
              stroke={getStrokeForTileType(tile.type)}
              strokeWidth="4"
            />
          </g>
        </Fragment>
      ))}
    </>
  )
})

interface RenderEntitiesProps {
  entities: World['entities']
}
const RenderEntities = React.memo(function RenderEntities({
  entities,
}: RenderEntitiesProps) {
  return (
    <>
      {Object.values(entities).map((entity) => (
        <Fragment key={entity.id}>
          <RenderEntity
            entity={entity}
            layer={RenderEntityLayer.Layer1}
          />
        </Fragment>
      ))}
      {Object.values(entities).map((entity) => (
        <Fragment key={entity.id}>
          <RenderEntity
            entity={entity}
            layer={RenderEntityLayer.Layer2}
          />
        </Fragment>
      ))}
      {Object.values(entities).map((entity) => (
        <Fragment key={entity.id}>
          <RenderEntity
            entity={entity}
            layer={RenderEntityLayer.Layer3}
          />
        </Fragment>
      ))}
    </>
  )
})

interface MenuProps {
  setPlaceholderType(
    placeholderType: EntityType | null,
  ): void
  setMenuOpen(menuOpen: boolean): void
}
function Menu({
  setPlaceholderType,
  setMenuOpen,
}: MenuProps) {
  return (
    <div id="menu">
      <button
        onClick={() => {
          setPlaceholderType(null)
          setMenuOpen(false)
        }}
      >
        Clear
      </button>
      {Object.values(EntityType.Values).map(
        (placeholderType) => (
          <Fragment key={placeholderType}>
            <button
              onClick={() => {
                setPlaceholderType(placeholderType)
                setMenuOpen(false)
              }}
            >
              {placeholderType}
            </button>
          </Fragment>
        ),
      )}
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

function tick(draft: World): void {
  for (const entity of Object.values(draft.entities)) {
    for (const lane of Object.values(entity.lanes)) {
      for (let i = 0; i < lane.length; i++) {
        lane[i] += BELT_SPEED * (1 / 60)
      }
    }
  }

  for (const entity of Object.values(draft.entities)) {
    invariant(entity.type === EntityType.enum.Belt)

    const inputToOutput: number[] = []

    for (const laneType of [
      LaneType.enum.InStraight,
      LaneType.enum.InLeft,
      LaneType.enum.InRight,
    ]) {
      const lane = entity.lanes[laneType]

      for (let i = 0; i < lane.length; i++) {
        if (lane.at(-i - 1)! >= 0.5) {
          const tail = lane.pop()! - 0.5
          invariant(tail >= 0)
          invariant(tail < 0.5) // shouldn't happen unless things are moving fast

          inputToOutput.push(tail)
        } else {
          break
        }
      }
    }

    const out = entity.lanes[LaneType.enum.Out]
    if (inputToOutput.length) {
      inputToOutput.sort().reverse()
      for (const tail of inputToOutput) {
        const head = out.at(0)
        if (head) {
          invariant(head >= tail)
        }
        out.unshift(tail)
      }
    }

    let outputLane: number[] | null = null
    if (entity.output) {
      const neighbor = draft.entities[entity.output.id]
      invariant(neighbor)
      outputLane = neighbor.lanes[entity.output.laneType]
      invariant(outputLane)
    }

    for (let i = 0; i < out.length; i++) {
      if (out.at(-i - 1)! >= 0.5) {
        const tail = out.pop()! - 0.5
        invariant(tail >= 0)
        invariant(tail < 0.5)

        if (outputLane) {
          const head = outputLane.at(0)
          if (head) {
            invariant(head >= tail)
          }
          outputLane.unshift(tail)
        }
      }
    }
  }

  draft.tick++
}

function useTicker(setWorld: Updater<World>) {
  useEffect(() => {
    let handler: number
    function callback() {
      setWorld(tick)
      handler = self.requestAnimationFrame(callback)
    }
    handler = self.requestAnimationFrame(callback)
    return () => {
      self.cancelAnimationFrame(handler)
    }
  }, [])
}

function useEntityTransform(entity: {
  position: ZVec2
  direction: Direction
}) {
  return useMemo(() => {
    let rotate: number
    switch (entity.direction) {
      case Direction.enum.North:
        rotate = -90
        break
      case Direction.enum.South:
        rotate = 90
        break
      case Direction.enum.East:
        rotate = 0
        break
      case Direction.enum.West:
        rotate = 180
        break
    }
    return `translate(${entity.position.x * TILE_SIZE} ${entity.position.y * TILE_SIZE}) rotate(${rotate}, ${TILE_SIZE / 2}, ${TILE_SIZE / 2})`
  }, [entity])
}

interface RenderPlaceholderEntityProps {
  entity: PlaceholderEntity
}
function RenderPlaceholderEntity({
  entity,
}: RenderPlaceholderEntityProps) {
  const transform = useEntityTransform(entity)
  return (
    <g transform={transform}>
      <rect
        width={TILE_SIZE}
        height={TILE_SIZE}
        fill="red"
      />
      <circle
        cx={TILE_SIZE}
        cy={TILE_SIZE / 2}
        r={TILE_SIZE * 0.1}
        fill="green"
      />
    </g>
  )
}

enum RenderEntityLayer {
  Layer1 = 'layer-1',
  Layer2 = 'layer-2',
  Layer3 = 'layer-3',
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
  const transform = useEntityTransform(entity)
  return (
    <g transform={transform}>
      {(layer === RenderEntityLayer.All ||
        layer === RenderEntityLayer.Layer1) && (
        <rect
          width={TILE_SIZE}
          height={TILE_SIZE}
          fill="red"
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
          {entity.output && (
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
      {(layer === RenderEntityLayer.All ||
        layer === RenderEntityLayer.Layer3) && (
        <>
          {Object.entries(entity.lanes).map(
            ([laneType, lane]) => (
              <Fragment key={laneType}>
                <RenderLane
                  laneType={laneType as LaneType}
                  lane={lane}
                />
              </Fragment>
            ),
          )}
        </>
      )}
    </g>
  )
}

interface RenderLaneProps {
  laneType: LaneType
  lane: number[]
}
function RenderLane({ laneType, lane }: RenderLaneProps) {
  const transform = useMemo(() => {
    switch (laneType) {
      case LaneType.enum.Out:
        return `translate(${TILE_SIZE / 2} ${TILE_SIZE / 2})`
      case LaneType.enum.InStraight:
        return `translate(0 ${TILE_SIZE / 2})`
      case LaneType.enum.InLeft:
        return `translate(${TILE_SIZE / 2} 0) rotate(90)`
      case LaneType.enum.InRight:
        return `translate(${TILE_SIZE / 2} ${TILE_SIZE}) rotate(-90)`
    }
  }, [laneType])

  return (
    <g transform={transform}>
      {lane.map((position, i) => (
        <Fragment key={i}>
          <rect
            x={position * TILE_SIZE - ITEM_SIZE / 2}
            y={-ITEM_SIZE / 2}
            width={ITEM_SIZE}
            height={ITEM_SIZE}
            fill="purple"
          />
        </Fragment>
      ))}
    </g>
  )
}
