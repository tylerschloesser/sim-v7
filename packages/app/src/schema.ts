import * as z from 'zod'

export const ZVec2 = z.strictObject({
  x: z.number(),
  y: z.number(),
})
export type ZVec2 = z.infer<typeof ZVec2>

export const EntityType = z.enum(['Belt'])
export type EntityType = z.infer<typeof EntityType>

export const Direction = z.enum([
  'North',
  'South',
  'East',
  'West',
])
export type Direction = z.infer<typeof Direction>

export const LaneType = z.enum([
  'Out',
  'InStraight',
  'InLeft',
  'InRight',
])
export type LaneType = z.infer<typeof LaneType>

export const EntityId = z.string()
export type EntityId = z.infer<typeof EntityId>

export const BeltOutput = z.strictObject({
  id: EntityId,
  laneType: LaneType,
})

export type BeltOutput = z.infer<typeof BeltOutput>

export const Lane = z.number().array()
export type Lane = z.infer<typeof Lane>

export const BeltEntity = z.strictObject({
  type: z.literal(EntityType.enum.Belt),
  id: EntityId,
  position: ZVec2,
  direction: Direction,
  output: BeltOutput.nullable(),
  lanes: z.strictObject({
    [LaneType.enum.InStraight]: Lane,
    [LaneType.enum.InLeft]: Lane,
    [LaneType.enum.InRight]: Lane,
    [LaneType.enum.Out]: Lane,
  }),
})
export type BeltEntity = z.infer<typeof BeltEntity>

export const Entity = z.discriminatedUnion('type', [
  BeltEntity,
])
export type Entity = z.infer<typeof Entity>

export const BeltPlaceholderEntity = BeltEntity.pick({
  type: true,
  position: true,
  direction: true,
})
export type BeltPlaceholderEntity = z.infer<
  typeof BeltPlaceholderEntity
>

export const PlaceholderEntity = z.discriminatedUnion(
  'type',
  [BeltPlaceholderEntity],
)
export type PlaceholderEntity = z.infer<
  typeof PlaceholderEntity
>

export const TileType = z.enum(['Coal', 'Iron'])
export type TileType = z.infer<typeof TileType>

export const TileId = z.string()
export type TileId = z.infer<typeof TileId>

export const Tile = z.strictObject({
  id: TileId,
  type: TileType,
  position: ZVec2,
})

export const World = z.strictObject({
  tick: z.number().int().nonnegative(),
  entities: z.record(EntityId, Entity),
  tiles: z.record(TileId, Tile),
})
export type World = z.infer<typeof World>
