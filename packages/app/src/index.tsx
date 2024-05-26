import { createRoot } from 'react-dom/client'
import invariant from 'tiny-invariant'
import { App } from './app'
import { AppContext } from './app-context'

const container = document.getElementById('app')
invariant(container)

const root = createRoot(container)

const ro = new ResizeObserver((entries) => {
  invariant(entries.length === 1)
  const { contentRect: rect } = entries.at(0)
  const context: AppContext = {
    vw: rect.width,
    vh: rect.height,
  }
  root.render(
    <AppContext.Provider value={context}>
      <App />
    </AppContext.Provider>,
  )
})

ro.observe(container)
