export function App() {
  const width = window.innerWidth
  const height = window.innerHeight

  const viewBox = `0 0 ${width} ${height}`

  return (
    <svg width={width} height={height} viewBox={viewBox}>
      <circle
        cx={width / 2}
        cy={height / 2}
        r={Math.min(width, height) * 0.2}
        fill="blue"
      />
    </svg>
  )
}
