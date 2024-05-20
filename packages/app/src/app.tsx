export function App() {
  const width = window.innerWidth
  const height = window.innerHeight

  const viewBox = `0 0 ${width} ${height}`

  return (
    <svg width={width} height={height} viewBox={viewBox} />
  )
}
