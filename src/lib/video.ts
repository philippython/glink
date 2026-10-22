// Reads a video file in the browser: duration, dimensions and (optionally)
// a few JPEG frames for the AI pre-flight review. Nothing leaves the device
// until the creator presses "Run pre-flight check".

export interface VideoInfo { duration: number; width: number; height: number }

function load(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'auto'
    v.muted = true
    v.playsInline = true
    v.onloadedmetadata = () => resolve(v)
    v.onerror = () => reject(new Error('This browser can’t read that video. You can still enter the length by hand.'))
    v.src = URL.createObjectURL(file)
  })
}

export async function readVideo(file: File): Promise<VideoInfo> {
  const v = await load(file)
  const info = { duration: Math.round(v.duration * 10) / 10, width: v.videoWidth, height: v.videoHeight }
  URL.revokeObjectURL(v.src)
  return info
}

const seek = (v: HTMLVideoElement, t: number) => new Promise<void>(resolve => {
  const done = () => { v.removeEventListener('seeked', done); resolve() }
  v.addEventListener('seeked', done)
  v.currentTime = t
  setTimeout(done, 3000) // don't hang on files the browser can't seek
})

/** Samples up to `count` evenly spaced frames as base64 JPEG (no data: prefix). */
export async function sampleFrames(file: File, count = 6, maxWidth = 384): Promise<{ t: number; data: string }[]> {
  const v = await load(file)
  if (!isFinite(v.duration) || !v.videoWidth) { URL.revokeObjectURL(v.src); return [] }
  const scale = Math.min(1, maxWidth / v.videoWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(v.videoWidth * scale)
  canvas.height = Math.round(v.videoHeight * scale)
  const ctx = canvas.getContext('2d')
  const frames: { t: number; data: string }[] = []
  for (let i = 0; i < count && ctx; i++) {
    const t = Math.min(v.duration - 0.1, (v.duration * (i + 0.5)) / count)
    await seek(v, t)
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
    frames.push({ t: Math.round(t * 10) / 10, data: canvas.toDataURL('image/jpeg', 0.7).split(',')[1] })
  }
  URL.revokeObjectURL(v.src)
  return frames
}
