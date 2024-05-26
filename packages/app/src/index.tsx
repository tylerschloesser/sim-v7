import { createRoot } from 'react-dom/client'
import invariant from 'tiny-invariant'
import { App } from './app'
import { AppContext } from './app-context'

const container = document.getElementById('app')
invariant(container)

const root = createRoot(container)

const context: AppContext = {
  vw: window.innerWidth,
  vh: window.innerHeight,
}

root.render(
  <AppContext.Provider value={context}>
    <App />
  </AppContext.Provider>,
)
