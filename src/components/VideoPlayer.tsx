import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface Marker { at: number; label: string }

/**
 * 9:16 player. Plays the real file when one was uploaded in this tab;
 * otherwise simulates playback so the scrubber and markers still work.
 * `seek` is a { t } object so the same timestamp can be clicked twice.
 */
export function VideoPlayer({ src, duration, markers = [], seek, caption }: {
  src?: string; duration: number; markers?: Marker[]; seek?: { t: number }; caption?: string
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [len, setLen] = useState(duration)

  useEffect(() => {
    if (!seek) return
    setT(seek.t)
    if (video.current) video.current.currentTime = seek.t
  }, [seek])

  useEffect(() => {
    if (src || !playing) return
    const iv = setInterval(() => setT(x => { if (x + 0.1 >= len) { setPlaying(false); return len } return x + 0.1 }), 100)
    return () => clearInterval(iv)
  }, [playing, src, len])

  const toggle = () => {
    if (src && video.current) { if (video.current.paused) void video.current.play(); else video.current.pause() }
    else { if (t >= len) setT(0); setPlaying(p => !p) }
  }
  const scrub = (v: number) => { setT(v); if (video.current) video.current.currentTime = v }
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div>
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-xl border border-line bg-[#0d0d0d]">
        {src ? (
          <video ref={video} src={src} className="h-full w-full object-cover" playsInline
            onTimeUpdate={e => setT(e.currentTarget.currentTime)} onLoadedMetadata={e => setLen(e.currentTarget.duration || duration)}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#2a2a2a] to-[#0d0d0d]">
            <div className="absolute left-1/2 top-[24%] -translate-x-1/2">
              <div className="mx-auto h-20 w-20 rounded-full bg-[#5a5a5a]" />
              <div className="-mt-3 h-36 w-40 rounded-t-[48px] bg-[#3a3a3a]" />
            </div>
            {caption && <div className="absolute inset-x-4 bottom-16 text-center"><span className="rounded-md bg-black/60 px-2.5 py-1 text-[13px] font-medium text-white">{caption}</span></div>}
          </div>
        )}
        <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}
          className="absolute bottom-4 left-1/2 grid h-11 w-11 -translate-x-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30">
          {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
      </div>

      <div className="mx-auto mt-4 max-w-[320px]">
        <div className="relative h-5">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-track" />
          <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary" style={{ width: `${(t / len) * 100}%` }} />
          <input type="range" min={0} max={len} step={0.1} value={t} onChange={e => scrub(+e.target.value)} aria-label="Scrub video"
            className="absolute inset-0 w-full cursor-pointer opacity-0" />
          {markers.map(m => (
            <button key={m.at + m.label} onClick={() => scrub(m.at)} title={`${fmt(m.at)} · ${m.label}`} aria-label={`Jump to ${fmt(m.at)}: ${m.label}`}
              className="absolute z-10 top-1/2 h-3 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-danger" style={{ left: `${(m.at / len) * 100}%` }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[12px] tabular-nums text-faint"><span>{fmt(t)}</span><span>{fmt(len)}</span></div>
      </div>
    </div>
  )
}
