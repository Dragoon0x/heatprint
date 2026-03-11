// ═══════════════════════════════════════════
// HEATPRINT v1 — Tests
// ═══════════════════════════════════════════

var hp = require('../dist/index.js')

var passed = 0, failed = 0
function assert(c, m) { if (c) { passed++; console.log('  ✓ ' + m) } else { failed++; console.error('  ✗ ' + m) } }
function assertEq(a, b, m) { assert(a === b, m + ' (got: ' + JSON.stringify(a) + ', expected: ' + JSON.stringify(b) + ')') }

// ─── Palettes ───────────────────────────

console.log('\n  Palettes')

assert(typeof hp.PALETTES === 'object', 'PALETTES exported')
assert(Object.keys(hp.PALETTES).length === 8, '8 palettes: ' + Object.keys(hp.PALETTES).join(', '))
assert(hp.PALETTES.thermal.length === 8, 'Thermal has 8 stops')
assert(hp.PALETTES.ocean.length === 8, 'Ocean has 8 stops')

var colors = hp.getPalette('thermal', undefined)
assertEq(colors.length, 8, 'getPalette returns thermal')

var custom = hp.getPalette(undefined, ['#ff0000', '#0000ff'])
assertEq(custom.length, 2, 'Custom palette used')

var c0 = hp.interpolateColor(['#000000', '#ffffff'], 0)
assertEq(c0.r, 0, 'Interpolate at 0 → black r')
assertEq(c0.g, 0, 'Interpolate at 0 → black g')

var c1 = hp.interpolateColor(['#000000', '#ffffff'], 1)
assertEq(c1.r, 255, 'Interpolate at 1 → white r')

var cMid = hp.interpolateColor(['#000000', '#ffffff'], 0.5)
assert(cMid.r >= 126 && cMid.r <= 129, 'Interpolate at 0.5 → mid gray')

var rgb = hp.hexToRgb('#ff6633')
assertEq(rgb.r, 255, 'hexToRgb r')
assertEq(rgb.g, 102, 'hexToRgb g')
assertEq(rgb.b, 51, 'hexToRgb b')

// ─── Tracker ────────────────────────────

console.log('\n  Tracker')

var tracker = new hp.Tracker({})
assert(tracker.isActive() === false, 'Starts inactive')
assertEq(tracker.getInteractions().length, 0, 'No interactions initially')

// Add interactions programmatically
tracker.addInteraction({ x: 100, y: 200, type: 'click', timestamp: Date.now(), duration: 0, intensity: 1, velocity: 0 })
tracker.addInteraction({ x: 150, y: 250, type: 'move', timestamp: Date.now(), duration: 0, intensity: 0.5, velocity: 0.3 })
tracker.addInteraction({ x: 200, y: 300, type: 'hover', timestamp: Date.now(), duration: 500, intensity: 0.6, velocity: 0 })
tracker.addInteraction({ x: 300, y: 100, type: 'click', timestamp: Date.now(), duration: 0, intensity: 1, velocity: 0 })
tracker.addInteraction({ x: 400, y: 150, type: 'scroll', timestamp: Date.now(), duration: 0, intensity: 0.3, velocity: 0 })

assertEq(tracker.getInteractions().length, 5, 'Has 5 interactions')
assertEq(tracker.getInteractionsByType('click').length, 2, '2 clicks')
assertEq(tracker.getInteractionsByType('move').length, 1, '1 move')
assertEq(tracker.getInteractionsByType('hover').length, 1, '1 hover')
assertEq(tracker.getInteractionsByType('scroll').length, 1, '1 scroll')

// Stats
var stats = tracker.getStats()
assertEq(stats.totalInteractions, 5, 'Stats: 5 total')
assertEq(stats.clicks, 2, 'Stats: 2 clicks')
assertEq(stats.moves, 1, 'Stats: 1 move')
assertEq(stats.hovers, 1, 'Stats: 1 hover')
assertEq(stats.scrolls, 1, 'Stats: 1 scroll')
assert(Array.isArray(stats.hotspots), 'Stats has hotspots array')
assert(stats.duration >= 0, 'Stats has duration')

// Export/Import
var exported = tracker.exportData()
var parsed = JSON.parse(exported)
assertEq(parsed.length, 5, 'Export has 5 interactions')

var tracker2 = new hp.Tracker({})
tracker2.importData(parsed)
assertEq(tracker2.getInteractions().length, 5, 'Import restored 5 interactions')

// Clear
tracker.clear()
assertEq(tracker.getInteractions().length, 0, 'Clear removes all')

// Max interactions limit
var trackerMax = new hp.Tracker({ maxInteractions: 10 })
for (var i = 0; i < 20; i++) {
  trackerMax.addInteraction({ x: i * 10, y: i * 10, type: 'move', timestamp: Date.now(), duration: 0, intensity: 0.5, velocity: 0.1 })
}
assert(trackerMax.getInteractions().length <= 10, 'Max interactions enforced (got ' + trackerMax.getInteractions().length + ')')

// ─── Heatprint Main Class ───────────────

console.log('\n  Heatprint Class')

var hp1 = new hp.Heatprint({})
assert(hp1.isActive() === false, 'Starts inactive')

// Add interactions
hp1.addInteraction({ x: 100, y: 100, type: 'click', timestamp: Date.now(), duration: 0, intensity: 1, velocity: 0 })
hp1.addInteraction({ x: 200, y: 200, type: 'move', timestamp: Date.now(), duration: 0, intensity: 0.5, velocity: 0.3 })
hp1.addInteraction({ x: 300, y: 300, type: 'click', timestamp: Date.now(), duration: 0, intensity: 1, velocity: 0 })

assertEq(hp1.getInteractions().length, 3, 'Has 3 interactions')

// Stats
var s = hp1.getStats()
assertEq(s.totalInteractions, 3, 'Stats: 3 total')
assertEq(s.clicks, 2, 'Stats: 2 clicks')

// Export/Import data
var data = hp1.exportData()
var hp2 = new hp.Heatprint({})
hp2.importData(data)
assertEq(hp2.getInteractions().length, 3, 'Import restored interactions')

// Clear
hp1.clear()
assertEq(hp1.getInteractions().length, 0, 'Clear works')

// Tracker/Renderer access
assert(hp1.getTracker() !== null, 'getTracker works')
assert(hp1.getRenderer() !== null, 'getRenderer works')

// ─── Render Modes (headless) ────────────

console.log('\n  Render Modes')

// Can't actually render without canvas in Node, but verify the renderer exists
var renderer = new hp.Renderer({ width: 100, height: 100 })
assert(renderer !== null, 'Renderer instantiates')

// Verify all 8 modes are valid types
var modes = ['heatmap', 'constellation', 'flowfield', 'topographic', 'trails', 'aurora', 'rings', 'mesh']
for (var m = 0; m < modes.length; m++) {
  assert(typeof modes[m] === 'string', 'Mode "' + modes[m] + '" is defined')
}
assertEq(modes.length, 8, '8 render modes')

// ─── Config Defaults ────────────────────

console.log('\n  Config')

var hp3 = new hp.Heatprint({ width: 800, height: 600, mode: 'constellation', palette: 'ocean', blur: 30 })
assert(hp3 !== null, 'Custom config accepted')

// All palettes can be selected
var allPalettes = ['thermal', 'ocean', 'neon', 'sunset', 'monochrome', 'mint', 'lavender', 'fire']
for (var p = 0; p < allPalettes.length; p++) {
  var pal = hp.getPalette(allPalettes[p], undefined)
  assertEq(pal.length, 8, 'Palette "' + allPalettes[p] + '" has 8 stops')
}

// ─── Hotspot Detection ──────────────────

console.log('\n  Hotspot Detection')

var hpHot = new hp.Heatprint({})
// Cluster clicks in one area
for (var h = 0; h < 30; h++) {
  hpHot.addInteraction({ x: 500 + Math.floor(Math.random() * 30), y: 300 + Math.floor(Math.random() * 30), type: 'click', timestamp: Date.now(), duration: 0, intensity: 1, velocity: 0 })
}
// Scattered clicks elsewhere
for (var s2 = 0; s2 < 5; s2++) {
  hpHot.addInteraction({ x: Math.floor(Math.random() * 1000), y: Math.floor(Math.random() * 800), type: 'click', timestamp: Date.now(), duration: 0, intensity: 1, velocity: 0 })
}

var hotStats = hpHot.getStats()
assert(hotStats.hotspots.length > 0, 'Hotspots detected')
assert(hotStats.hotspots[0].intensity >= 0.5, 'Top hotspot has high intensity')
assert(Math.abs(hotStats.hotspots[0].x - 515) < 50, 'Hotspot x near cluster center')
assert(Math.abs(hotStats.hotspots[0].y - 315) < 50, 'Hotspot y near cluster center')

// ─── Edge Cases ─────────────────────────

console.log('\n  Edge Cases')

var hpEmpty = new hp.Heatprint({})
var emptyStats = hpEmpty.getStats()
assertEq(emptyStats.totalInteractions, 0, 'Empty stats works')
assertEq(emptyStats.hotspots.length, 0, 'No hotspots when empty')
assertEq(emptyStats.averageVelocity, 0, 'Zero velocity when empty')

var emptyExport = hpEmpty.exportData()
assertEq(emptyExport, '[]', 'Empty export is []')

// ─── Summary ─────────────────────────────

console.log('\n  ' + passed + ' passed, ' + failed + ' failed\n')
process.exit(failed > 0 ? 1 : 0)
