// Tiny Web Audio chime — no audio file to download.
let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
      const AC = w.AudioContext || w.webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Browsers only allow sound after a tap; call once at startup. */
export function unlockAudioOnFirstTap(): void {
  const handler = () => {
    getCtx()
    window.removeEventListener('pointerdown', handler)
    window.removeEventListener('keydown', handler)
  }
  window.addEventListener('pointerdown', handler)
  window.addEventListener('keydown', handler)
}

export function chime(times = 2): void {
  const c = getCtx()
  if (!c) return
  const notes = [880, 1320]
  for (let r = 0; r < times; r++) {
    notes.forEach((freq, i) => {
      const t = c.currentTime + r * 0.45 + i * 0.14
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
      osc.connect(gain).connect(c.destination)
      osc.start(t)
      osc.stop(t + 0.32)
    })
  }
}

export function vibrate(pattern: number[] = [200, 100, 200]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* not supported */
  }
}
