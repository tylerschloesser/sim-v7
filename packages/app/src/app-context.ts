import { createContext } from 'react'

export interface IAppContext {
  vw: number
  vh: number
}

export const AppContext = createContext<IAppContext>({
  vw: 0,
  vh: 0,
})
