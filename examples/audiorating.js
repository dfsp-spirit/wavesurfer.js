// Audiorating plugin
// Graphical, multi-dimensional, continuous rating of an audio file

/*
<html>
  <button style="min-width: 5em" id="play">Play</button>
  <button style="margin: 0 1em 2em" id="randomize">Randomize rating points</button>

  Rating: <label>0</label>
  <div id="container" style="border: 1px solid #ddd;"></div>
  <p>
    📖 <a href="https://wavesurfer.xyz/docs/classes/plugins_audiorating.AudioRatingPlugin">AudioRating plugin docs</a>
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

const isMobile = top.matchMedia('(max-width: 900px)').matches

// Initialize the Envelope plugin
const audiorating = wavesurfer.registerPlugin(
  AudioRatingPlugin.create({
    rating: 0.5,
    lineColor: 'rgba(255, 0, 0, 0.5)',
    lineWidth: 4,
    dragPointSize: isMobile ? 20 : 12,
    dragLine: !isMobile,
    dragPointFill: 'rgba(0, 255, 255, 0.8)',
    dragPointStroke: 'rgba(0, 0, 0, 0.5)',

    points: [
      { time: 11.2, rating: 0.5 },
      { time: 15.5, rating: 0.8 },
    ],
  }),
)

audiorating.on('points-change', (points) => {
  console.log('AudioRating points changed', points)
})

audiorating.addPoint({ time: 1, rating: 0.9 })

// Randomize points
const randomizePoints = () => {
  const points = []
  const len = 5 * Math.random()
  for (let i = 0; i < len; i++) {
    points.push({
      time: Math.random() * wavesurfer.getDuration(),
      rating: Math.random(),
    })
  }
  audiorating.setPoints(points)
}

document.querySelector('#randomize').onclick = randomizePoints

// Show the current volume
const ratingLabel = document.querySelector('label')
const showRating = () => {
  ratingLabel.textContent = audiorating.getCurrentRating().toFixed(2)
}
audiorating.on('rating-change', showRating)
wavesurfer.on('ready', showRating)

// Play/pause button
const button = document.querySelector('#play')
wavesurfer.once('ready', () => {
  button.onclick = () => {
    wavesurfer.playPause()
  }
})
wavesurfer.on('play', () => {
  button.textContent = 'Pause'
})
wavesurfer.on('pause', () => {
  button.textContent = 'Play'
})
