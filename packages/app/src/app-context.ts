import { createContext } from 'react'

export interface AppContext {
  vw: number
  vh: number
}

export const AppContext = createContext<AppContext>({
  vw: 0,
  vh: 0,
})
