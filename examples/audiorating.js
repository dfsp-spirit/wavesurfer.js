// Audiorating plugin
// Graphical, multi-dimensional, continuous rating of an audio file

/*
<html>
  <div style="margin-bottom: 1em;">
    <button style="min-width: 5em" id="play">Play</button>
    <button style="margin: 0 1em" id="randomize">Randomize points</button>
    <select id="dimension-select" style="margin-right: 1em">
      <option value="valence">Valence</option>
      <option value="arousal">Arousal</option>
      <option value="energy">Energy</option>
    </select>
  </div>

  <div style="margin-bottom: 1em;">
    Current rating: <span id="current-rating">0</span>
    <span id="dimension-name" style="margin-left: 0.5em"></span>
  </div>

  <div style="margin-top: 1em;">
    <h4>Current Points (Debug):</h4>
    <textarea id="points-debug" style="width: 100%; height: 400px; font-family: monospace;"></textarea>
  </div>

  <div id="container" style="border: 1px solid #ddd;"></div>

  <p>
    <a href="https://wavesurfer.xyz/docs/classes/plugins_audiorating.AudioRatingPlugin">AudioRating plugin docs</a>
  </p>
</html>
*/

import WaveSurfer from 'wavesurfer.js'
import AudioRatingPlugin from 'wavesurfer.js/dist/plugins/audiorating.esm.js'

// Create an instance of WaveSurfer
const wavesurfer = WaveSurfer.create({
  container: '#container',
  waveColor: 'rgb(200, 0, 200)',
  progressColor: 'rgb(100, 0, 100)',
  url: '/examples/audio/audio.wav',
})

const isMobile = window.matchMedia('(max-width: 900px)').matches

// Initialize the AudioRating plugin with multiple dimensions
const audioRating = wavesurfer.registerPlugin(
  AudioRatingPlugin.create({
    dimensions: [
      {
        name: 'valence',
        lineColor: 'rgba(255, 0, 0, 0.5)',
        dragPointFill: 'rgba(0, 255, 255, 0.8)',
        dragPointStroke: 'rgba(0, 0, 0, 0.5)',
      },
      {
        name: 'arousal',
        lineColor: 'rgba(0, 200, 0, 0.5)',
        dragPointFill: 'rgba(255, 255, 0, 0.8)',
        dragPointStroke: 'rgba(0, 0, 0, 0.5)',
      },
      {
        name: 'energy',
        lineColor: 'rgba(0, 0, 255, 0.5)',
        dragPointFill: 'rgba(255, 0, 255, 0.8)',
        dragPointStroke: 'rgba(0, 0, 0, 0.5)',
      }
    ],
    activeDimension: 'valence',
    lineWidth: 4,
    dragPointSize: isMobile ? 20 : 12,
    points: {
      valence: [
        { time: 0.5, rating: 0.5 },
        { time: 0.7, rating: 0.8 },
      ],
      arousal: [
        { time: 0.2, rating: 0.3 },
        { time: 0.9, rating: 0.9 },
      ],
      energy: [
        { time: 0.7, rating: 0.7 },
        { time: 0.2, rating: 0.4 },
      ],
    },
  })
)

// Function to update the debug points display
function updatePointsDebug() {
  const currentDimension = audioRating.getActiveDimension()
  const points = audioRating.getPoints(currentDimension)
  const duration = wavesurfer.getDuration()

  const debugInfo = {
    dimension: currentDimension,
    duration: duration,
    points: points.map(p => ({
      time: p.time,
      rating: p.rating,
      timePercentage: (p.time / duration * 100).toFixed(2) + '%',
      yPosition: (1 - p.rating) * 100 + '%'
    }))
  }

  document.getElementById('points-debug').value = JSON.stringify(debugInfo, null, 2)
}

// Handle dimension selection changes
const dimensionSelect = document.getElementById('dimension-select')
dimensionSelect.addEventListener('change', (e) => {
  const dimension = e.target.value
  audioRating.setActiveDimension(dimension)
  updateDimensionName()
  updateRatingDisplay()
  updatePointsDebug()
})

// Update UI with current dimension name
function updateDimensionName() {
  document.getElementById('dimension-name').textContent =
    `(${audioRating.getActiveDimension()})`
}

// Update rating display
function updateRatingDisplay() {
  document.getElementById('current-rating').textContent =
    audioRating.getCurrentRating().toFixed(2)
}

// Randomize points for current dimension
const randomizePoints = () => {
  const points = []
  const len = 3 + Math.floor(3 * Math.random())
  for (let i = 0; i < len; i++) {
    points.push({
      time: Math.random() * wavesurfer.getDuration(),
      rating: Math.random(),
    })
  }
  audioRating.setPoints(audioRating.getActiveDimension(), points)
  updatePointsDebug()
}

document.getElementById('randomize').onclick = randomizePoints

// Event listeners
audioRating.on('points-change', (dimension, points) => {
  console.log(`Points changed for ${dimension}:`, points)
  updatePointsDebug()
})

audioRating.on('rating-change', updateRatingDisplay)

wavesurfer.on('ready', () => {
  updateDimensionName()
  updateRatingDisplay()
  updatePointsDebug()

  // Play/pause button
  const button = document.getElementById('play')
  button.onclick = () => {
    wavesurfer.playPause()
  }

})

wavesurfer.on('play', () => {
  document.getElementById('play').textContent = 'Pause'
})

wavesurfer.on('pause', () => {
  document.getElementById('play').textContent = 'Play'
})

// Also update points debug when seeking
wavesurfer.on('timeupdate', updatePointsDebug)