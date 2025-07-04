
/**
 * The audio_rating plugin with multi-dimension support
 */

import BasePlugin, { type BasePluginEvents } from '../base-plugin.js'
import { makeDraggable } from '../draggable.js'
import EventEmitter from '../event-emitter.js'
import createElement from '../dom.js'

export type RatingPoint = {
  id?: string
  time: number // in seconds
  rating: number // 0 to 1
}

export type RatingDimension = {
  name: string
  lineColor?: string
  dragPointFill?: string
  dragPointStroke?: string
}

export type AudioRatingPluginOptions = {
  points?: Record<string, RatingPoint[]> // dimension name -> points
  dimensions: RatingDimension[]
  activeDimension?: string
  lineWidth?: string
  dragPointSize?: number
}

const defaultOptions = {
  points: {} as Record<string, RatingPoint[]>,
  dimensions: [] as RatingDimension[],
  lineWidth: 4,
  dragPointSize: 10,
}

type Options = AudioRatingPluginOptions & typeof defaultOptions

export type AudioRatingPluginEvents = BasePluginEvents & {
  'points-change': [dimension: string, newPoints: RatingPoint[]]
  'rating-change': [rating: number]
}

class Polyline extends EventEmitter<{
  'point-move': [point: RatingPoint, relativeX: number, relativeY: number]
  'point-dragout': [point: RatingPoint]
  'point-create': [relativeX: number, relativeY: number]
  'line-move': [relativeY: number]
}> {
  private svg: SVGSVGElement
  private options: Options
  private activeDimension: string
  private polyPoints: Map<
    RatingPoint,
    {
      polyPoint: SVGPoint
      circle: SVGEllipseElement
    }
  >
  private subscriptions: (() => void)[] = []

  constructor(options: Options, wrapper: HTMLElement, activeDimension: string) {
    super()

    this.subscriptions = []
    this.options = options
    this.activeDimension = activeDimension
    this.polyPoints = new Map()

    const width = wrapper.clientWidth
    const height = wrapper.clientHeight

    // SVG element
    const svg = createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width: '100%',
        height: '100%',
        viewBox: `0 0 ${width} ${height}`,
        preserveAspectRatio: 'none',
        style: {
          position: 'absolute',
          left: '0',
          top: '0',
          zIndex: '4',
        },
        part: 'envelope',
      },
      wrapper,
    ) as SVGSVGElement

    this.svg = svg

    this.drawActiveDimension()
  }

  public setActiveDimension(dimension: string) {
    this.activeDimension = dimension
    this.clear()
    this.drawActiveDimension()
  }

  private drawActiveDimension() {
    const dimension = this.options.dimensions.find(d => d.name === this.activeDimension)
    if (!dimension) return

    const { width, height } = this.svg.viewBox.baseVal

    // A polyline representing the envelope
    const polyline = createElement(
      'polyline',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        points: `0,${height} ${width},${height}`,
        stroke: dimension.lineColor || this.getRandomColor(),
        'stroke-width': this.options.lineWidth,
        fill: 'none',
        part: 'polyline',
        style: {
          cursor: 'row-resize',
          pointerEvents: 'stroke',
        }
      },
      this.svg,
    ) as SVGPolylineElement

    // Make the polyline draggable along the Y axis
    this.subscriptions.push(
      makeDraggable(polyline as unknown as HTMLElement, (_, dy) => {
        const { height } = this.svg.viewBox.baseVal
        const { points } = polyline
        for (let i = 1; i < points.numberOfItems - 1; i++) {
          const point = points.getItem(i)
          point.y = Math.min(height, Math.max(0, point.y + dy))
        }
        const circles = this.svg.querySelectorAll('ellipse')
        Array.from(circles).forEach((circle) => {
          const newY = Math.min(height, Math.max(0, Number(circle.getAttribute('cy')) + dy))
          circle.setAttribute('cy', newY.toString())
        })

        this.emit('line-move', dy / height)
      }),
    )

    // Add existing points
    const points = this.options.points[this.activeDimension] || []
    points.forEach(point => {
      this.addPolyPoint(point)
    })

    // Listen to double click to add a new point
    this.svg.addEventListener('dblclick', (e) => {
      const rect = this.svg.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      this.emit('point-create', x / rect.width, y / rect.height)
    })

    // Long press on touch devices
    {
      let pressTimer: number

      const clearTimer = () => clearTimeout(pressTimer)

      this.svg.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          pressTimer = window.setTimeout(() => {
            e.preventDefault()
            const rect = this.svg.getBoundingClientRect()
            const x = e.touches[0].clientX - rect.left
            const y = e.touches[0].clientY - rect.top
            this.emit('point-create', x / rect.width, y / rect.height)
          }, 500)
        } else {
          clearTimer()
        }
      })

      this.svg.addEventListener('touchmove', clearTimer)
      this.svg.addEventListener('touchend', clearTimer)
    }
  }

  private clear() {
    this.svg.querySelectorAll('polyline, ellipse').forEach(el => el.remove())
    this.polyPoints.clear()
  }

  private getRandomColor() {
    return `hsl(${Math.random() * 360}, 70%, 50%)`
  }

  private makeDraggable(draggable: SVGElement, onDrag: (x: number, y: number) => void) {
    this.subscriptions.push(
      makeDraggable(
        draggable as unknown as HTMLElement,
        onDrag,
        () => (draggable.style.cursor = 'grabbing'),
        () => (draggable.style.cursor = 'grab'),
        1,
      ),
    )
  }

  private createCircle(x: number, y: number) {
    const dimension = this.options.dimensions.find(d => d.name === this.activeDimension)
    if (!dimension) return null

    const size = this.options.dragPointSize
    const radius = size / 2
    return createElement(
      'ellipse',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        cx: x,
        cy: y,
        rx: radius,
        ry: radius,
        fill: dimension.dragPointFill || this.getRandomColor(),
        stroke: dimension.dragPointStroke || '#ffffff',
        'stroke-width': '2',
        style: {
          cursor: 'grab',
          pointerEvents: 'all',
        },
        part: 'envelope-circle',
      },
      this.svg,
    ) as SVGEllipseElement
  }

  removePolyPoint(point: RatingPoint) {
    const item = this.polyPoints.get(point)
    if (!item) return
    const { polyPoint, circle } = item
    const { points } = this.svg.querySelector('polyline') as SVGPolylineElement
    const index = Array.from(points).findIndex((p) => p.x === polyPoint.x && p.y === polyPoint.y)
    points.removeItem(index)
    circle.remove()
    this.polyPoints.delete(point)
  }

  addPolyPoint(point: RatingPoint) {
    const duration = this.wavesurfer?.getDuration() || 1
    const relX = point.time / duration
    const relY = point.rating

    const { svg } = this
    const { width, height } = svg.viewBox.baseVal
    const x = relX * width
    const y = height - relY * height
    const threshold = 0 //this.options.dragPointSize / 4

    const newPoint = svg.createSVGPoint()
    newPoint.x = x
    newPoint.y = y

    const circle = this.createCircle(x, y)
    if (!circle) return

    const { points } = svg.querySelector('polyline') as SVGPolylineElement
    const newIndex = Array.from(points).findIndex((p) => p.x >= x)
    points.insertItemBefore(newPoint, Math.max(newIndex, 1))

    this.polyPoints.set(point, { polyPoint: newPoint, circle })

    this.makeDraggable(circle, (dx, dy) => {
      const newX = newPoint.x + dx
      const newY = newPoint.y + dy

      // Prevent dragging point out of bounds
      if (newX < -threshold || newY < -threshold || newX > width + threshold || newY > height + threshold) {
        return
      }

      // Don't allow to drag past the next or previous point
      const next = Array.from(points).find((p) => p.x > newPoint.x)
      const prev = Array.from(points).findLast((p) => p.x < newPoint.x)
      if ((next && newX >= next.x) || (prev && newX <= prev.x)) {
        return
      }

      // Update the point and the circle position
      newPoint.x = newX
      newPoint.y = newY
      circle.setAttribute('cx', newX.toString())
      circle.setAttribute('cy', newY.toString())

      // Emit the event passing the point and new relative coordinates
      this.emit('point-move', point, newX / width, newY / height)
    })
  }

  update() {
    const { svg } = this
    const aspectRatioX = svg.viewBox.baseVal.width / svg.clientWidth
    const aspectRatioY = svg.viewBox.baseVal.height / svg.clientHeight
    const circles = svg.querySelectorAll('ellipse')

    circles.forEach((circle) => {
      const radius = this.options.dragPointSize / 2
      const rx = radius * aspectRatioX
      const ry = radius * aspectRatioY
      circle.setAttribute('rx', rx.toString())
      circle.setAttribute('ry', ry.toString())
    })
  }

  destroy() {
    this.subscriptions.forEach((unsubscribe) => unsubscribe())
    this.polyPoints.clear()
    this.svg.remove()
  }
}

const randomId = () => Math.random().toString(36).slice(2)

class AudioRatingPlugin extends BasePlugin<AudioRatingPluginEvents, AudioRatingPluginOptions> {
  protected options: Options
  private polyline: Polyline | null = null
  private points: Record<string, RatingPoint[]>
  private activeDimension: string
  private throttleTimeout: ReturnType<typeof setTimeout> | null = null
  private currentRating = 1

  constructor(options: AudioRatingPluginOptions) {
    super(options)

    this.points = options.points || {}
    this.activeDimension = options.activeDimension || options.dimensions[0]?.name || ''
    this.options = Object.assign({}, defaultOptions, options)
  }

  public static create(options: AudioRatingPluginOptions) {
    return new AudioRatingPlugin(options)
  }

  public setActiveDimension(dimension: string) {
    if (!this.options.dimensions.some(d => d.name === dimension)) {
      throw new Error(`Dimension ${dimension} not found`)
    }
    this.activeDimension = dimension
    this.polyline?.setActiveDimension(dimension)
    this.updateCurrentRating()
  }

  public getActiveDimension() {
    return this.activeDimension
  }

  public addPoint(point: RatingPoint) {
    if (!point.id) point.id = randomId()

    const points = this.points[this.activeDimension] || []

    // Insert the point in the correct position to keep the array sorted
    const index = points.findLastIndex((p) => p.time < point.time)
    points.splice(index + 1, 0, point)
    this.points[this.activeDimension] = points

    this.emitPoints()

    // Add the point to the polyline if the duration is available
    const duration = this.wavesurfer?.getDuration()
    if (duration && this.polyline) {
      this.polyline.addPolyPoint(point)
    }
  }

  public removePoint(point: RatingPoint) {
    const points = this.points[this.activeDimension] || []
    const index = points.indexOf(point)
    if (index > -1) {
      points.splice(index, 1)
      this.polyline?.removePolyPoint(point)
      this.emitPoints()
    }
  }

  public getPoints(dimension?: string): RatingPoint[] {
    return this.points[dimension || this.activeDimension] || []
  }

  public setPoints(dimension: string, newPoints: RatingPoint[]) {
    this.points[dimension] = [...newPoints]
    if (dimension === this.activeDimension) {
      this.polyline?.setActiveDimension(dimension)
    }
    this.emitPoints()
  }

  public destroy() {
    this.polyline?.destroy()
    super.destroy()
  }

  public getCurrentRating(): number {
    return this.currentRating
  }

  private emitPoints() {
    if (this.throttleTimeout) {
      clearTimeout(this.throttleTimeout)
    }
    this.throttleTimeout = setTimeout(() => {
      this.emit('points-change', this.activeDimension, this.getPoints())
    }, 200)
  }

  private updateCurrentRating(time?: number) {
    const currentTime = time ?? this.wavesurfer?.getCurrentTime() ?? 0
    const points = this.getPoints()

    let nextPoint = points.find((point) => point.time > currentTime)
    if (!nextPoint) {
      nextPoint = { time: this.wavesurfer?.getDuration() || 0, rating: 0, id: randomId() }
    }
    let prevPoint = points.findLast((point) => point.time <= currentTime)
    if (!prevPoint) {
      prevPoint = { time: 0, rating: 0, id: randomId() }
    }

    const timeDiff = nextPoint.time - prevPoint.time
    const ratingDiff = nextPoint.rating - prevPoint.rating
    const newRating = prevPoint.rating + (currentTime - prevPoint.time) * (ratingDiff / timeDiff)
    const clampedRating = Math.min(1, Math.max(0, newRating))
    const roundedRating = Math.round(clampedRating * 100) / 100

    if (roundedRating !== this.currentRating) {
      this.currentRating = roundedRating
      this.emit('rating-change', roundedRating)
    }
  }

  onInit() {
    if (!this.wavesurfer) {
      throw Error('WaveSurfer is not initialized')
    }

    this.subscriptions.push(
      this.wavesurfer.on('decode', (duration) => {
        this.initPolyline()
      }),

      this.wavesurfer.on('redraw', () => {
        this.polyline?.update()
      }),

      this.wavesurfer.on('timeupdate', (time) => {
        this.updateCurrentRating(time)
      }),
    )
  }

  private initPolyline() {
    if (this.polyline) this.polyline.destroy()
    if (!this.wavesurfer) return

    const wrapper = this.wavesurfer.getWrapper()
    this.polyline = new Polyline(this.options, wrapper, this.activeDimension)

    this.subscriptions.push(
      this.polyline.on('point-move', (point, relativeX, relativeY) => {
        const duration = this.wavesurfer?.getDuration() || 0
        point.time = relativeX * duration
        point.rating = 1 - relativeY

        this.emitPoints()
        this.updateCurrentRating()
      }),

      this.polyline.on('point-dragout', (point) => {
        this.removePoint(point)
      }),

      this.polyline.on('point-create', (relativeX, relativeY) => {
        this.addPoint({
          time: relativeX * (this.wavesurfer?.getDuration() || 0),
          rating: 1 - relativeY,
        })
      }),

      this.polyline.on('line-move', (relativeY) => {
        const points = this.getPoints()
        points.forEach((point) => {
          point.rating = Math.min(1, Math.max(0, point.rating - relativeY))
        })

        this.emitPoints()
        this.updateCurrentRating()
      }),
    )
  }
}

export default AudioRatingPlugin