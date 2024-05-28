import invariant from 'tiny-invariant'
import { ZVec2 } from './schema'

export class Vec2 {
  static ZERO = new Vec2(0, 0)

  readonly x: number
  readonly y: number
  constructor(x: number = 0, y: number = 0) {
    this.x = x
    this.y = y
  }

  add(v: Vec2): Vec2 {
    return new Vec2(this.x + v.x, this.y + v.y)
  }

  sub(v: Vec2): Vec2 {
    return new Vec2(this.x - v.x, this.y - v.y)
  }

  len(): number {
    if (this === Vec2.ZERO) {
      return 0
    }
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  norm(): Vec2 {
    invariant(this.len() > 0)
    return this.div(this.len())
  }

  mul(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s)
  }

  div(s: number): Vec2 {
    return new Vec2(this.x / s, this.y / s)
  }

  toZVec2(): ZVec2 {
    return { x: this.x, y: this.y }
  }
}
