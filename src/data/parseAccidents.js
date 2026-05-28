import centers from './accidentCenters.json'

function parse(txt) {
  if (!txt) return []
  const blocks = txt.replace(/\r/g, '').trim().split(/\n\n+/)
  return blocks
    .filter(b => b.trim())
    .map((block, i) => {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l)
      const m = lines[0].match(/【(.+)】/)
      if (!m) return null
      const parts = m[1].split(' ')
      const id = 'acc' + (i + 1)
      const center = centers[id]
      if (!center) return null
      return {
        id,
        date:     parts[0] + ' ' + parts[1],
        type:     parts[2],
        location: parts[3],
        parties:  lines.slice(1),
        center,
      }
    })
    .filter(Boolean)
}

// __ACCIDENT_DATA__ is injected at build time by vite.config.js define
export const ACCIDENT_SPOTS = parse(typeof __ACCIDENT_DATA__ !== 'undefined' ? __ACCIDENT_DATA__ : '')
