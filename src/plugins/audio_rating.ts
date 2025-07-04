/**
 * The audio_rating plugin
 */

import BasePlugin, { type BasePluginEvents } from '../base-plugin.js'

export type audio_ratingPluginOptions = {
}

const defaultOptions = {
}

export type audio_ratingPluginEvents = BasePluginEvents & {
}

export class audio_ratingPlugin extends BasePlugin<audio_ratingPluginEvents, audio_ratingPluginOptions> {
  protected options: audio_ratingPluginOptions & typeof defaultOptions

  constructor(options?: audio_ratingPluginOptions) {
    super(options || {})

    this.options = Object.assign({}, defaultOptions, options)
  }

  public static create(options?: audio_ratingPluginOptions) {
    return new audio_ratingPlugin(options)
  }

  /** Called by wavesurfer, don't call manually */
  onInit() {
    if (!this.wavesurfer) {
      throw Error('WaveSurfer is not initialized')
    }
  }

  /** Unmount */
  public destroy() {
    super.destroy()
  }
}

export default audio_ratingPlugin
