/**
 * Procedural sound engine — every effect is synthesized with WebAudio,
 * zero audio assets. Initialized on the first user gesture (browser
 * autoplay policy), with a master mute toggle.
 */

type SfxName = 'click' | 'send' | 'gold' | 'fail' | 'burn' | 'win' | 'hover'

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private ambientGain: GainNode | null = null
  private _muted = false
  private heartbeatTimer: number | null = null
  private growlTimer: number | null = null
  private wrath = 0

  get muted(): boolean {
    return this._muted
  }

  /** Must be called from a user gesture (click) before any sound. */
  init(): void {
    if (this.ctx) return
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = this._muted ? 0 : 0.9
    this.master.connect(this.ctx.destination)
  }

  toggleMute(): boolean {
    this._muted = !this._muted
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(
        this._muted ? 0 : 0.9,
        this.ctx.currentTime + 0.15,
      )
    }
    return this._muted
  }

  /** Cave ambience: low rumble of filtered brown noise that slowly breathes. */
  startAmbient(): void {
    if (!this.ctx || !this.master || this.ambientGain) return
    const ctx = this.ctx

    const noise = ctx.createBufferSource()
    noise.buffer = this.brownNoise(8)
    noise.loop = true

    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 140

    this.ambientGain = ctx.createGain()
    this.ambientGain.gain.value = 0

    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.015

    noise.connect(lowpass).connect(this.ambientGain).connect(this.master)
    lfo.connect(lfoGain).connect(this.ambientGain.gain)

    noise.start()
    lfo.start()
    this.ambientGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 3)
  }

  /** Low double-thump heartbeat while the player is in danger. */
  setHeartbeat(on: boolean): void {
    if (on && this.heartbeatTimer === null) {
      this.heartbeatTimer = window.setInterval(() => {
        if (!this.ctx || !this.master || this._muted) return
        const t = this.ctx.currentTime
        this.thump(t)
        this.thump(t + 0.28)
      }, 1100)
    } else if (!on && this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /** Distant growls roll through the cave more often as wrath rises. */
  setWrathLevel(level: number): void {
    this.wrath = level
    if (this.growlTimer === null) {
      this.growlTimer = window.setInterval(() => {
        if (!this.ctx || !this.master || this._muted) return
        if (Math.random() < this.wrath / 260) this.distantGrowl(this.ctx.currentTime)
      }, 9000)
    }
  }

  private thump(t: number): void {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(58, t)
    osc.frequency.exponentialRampToValueAtTime(34, t + 0.18)
    gain.gain.setValueAtTime(0.22, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
    osc.connect(gain).connect(this.master!)
    osc.start(t)
    osc.stop(t + 0.25)
  }

  private distantGrowl(t: number): void {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const lp = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(55, t)
    osc.frequency.linearRampToValueAtTime(38, t + 1.6)
    lp.type = 'lowpass'
    lp.frequency.value = 160
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.07, t + 0.5)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8)
    osc.connect(lp).connect(gain).connect(this.master!)
    osc.start(t)
    osc.stop(t + 2)
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.master || this._muted) return
    const t = this.ctx.currentTime
    switch (name) {
      case 'click':
        this.blip(620, 0.06, 0.18, t)
        break
      case 'hover':
        this.blip(880, 0.03, 0.05, t)
        break
      case 'send':
        this.whoosh(t)
        break
      case 'gold':
        this.goldChime(t)
        break
      case 'fail':
        this.growl(t)
        break
      case 'burn':
        this.fireBlast(t)
        break
      case 'win':
        this.fanfare(t)
        break
    }
  }

  // ----------------------------------------------------------------
  // Synth building blocks
  // ----------------------------------------------------------------

  private blip(freq: number, dur: number, vol: number, t: number): void {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(gain).connect(this.master!)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  }

  /** Air whoosh: bandpass-swept noise. Used when a message flies to the chain. */
  private whoosh(t: number): void {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.whiteNoise(0.5)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.2
    bp.frequency.setValueAtTime(300, t)
    bp.frequency.exponentialRampToValueAtTime(2400, t + 0.35)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.12)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    src.connect(bp).connect(gain).connect(this.master!)
    src.start(t)
  }

  /** Treasure bell: detuned sine partials with long decay + sparkle. */
  private goldChime(t: number): void {
    const ctx = this.ctx!
    const partials = [880, 1318, 1760, 2637]
    partials.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004)
      const start = t + i * 0.07
      gain.gain.setValueAtTime(0.16 / (i + 1), start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 1.4)
      osc.connect(gain).connect(this.master!)
      osc.start(start)
      osc.stop(start + 1.5)
    })
  }

  /** Dragon displeasure: descending saw + sub thump. */
  private growl(t: number): void {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(130, t)
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.5)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    gain.gain.setValueAtTime(0.28, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    osc.connect(lp).connect(gain).connect(this.master!)
    osc.start(t)
    osc.stop(t + 0.7)
    this.blip(60, 0.25, 0.3, t)
  }

  /** Incineration: roaring noise sweep + collapsing sub drop. */
  private fireBlast(t: number): void {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.whiteNoise(1.6)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(5200, t)
    lp.frequency.exponentialRampToValueAtTime(180, t + 1.4)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.45, t + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5)
    src.connect(lp).connect(gain).connect(this.master!)
    src.start(t)

    const sub = ctx.createOscillator()
    const subGain = ctx.createGain()
    sub.type = 'sine'
    sub.frequency.setValueAtTime(110, t)
    sub.frequency.exponentialRampToValueAtTime(30, t + 1.2)
    subGain.gain.setValueAtTime(0.4, t)
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.3)
    sub.connect(subGain).connect(this.master!)
    sub.start(t)
    sub.stop(t + 1.4)
  }

  /** Victory fanfare: ascending bell arpeggio. */
  private fanfare(t: number): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    notes.forEach((f, i) => {
      const start = t + i * 0.13
      const ctx = this.ctx!
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = f
      gain.gain.setValueAtTime(0.2, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 1.1)
      osc.connect(gain).connect(this.master!)
      osc.start(start)
      osc.stop(start + 1.2)
    })
  }

  // ----------------------------------------------------------------
  // Noise buffers
  // ----------------------------------------------------------------

  private whiteNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return buf
  }

  private brownNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
    return buf
  }
}

export const sfx = new SoundEngine()
