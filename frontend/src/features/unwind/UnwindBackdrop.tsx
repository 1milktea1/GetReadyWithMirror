import { useEffect, useState } from 'react'
import './unwind.css'

/** Drop these files in frontend/public/unwind/. A missing file is skipped. */
const VIDEO_SRC = '/unwind/rain.mp4'
const IMAGE_SRC = '/unwind/rain.jpg'
const MUSIC_SRC = '/unwind/music.mp3'

async function mediaExists(src: string): Promise<boolean> {
  try {
    const res = await fetch(src, { method: 'HEAD' })
    const type = res.headers.get('content-type') ?? ''
    return res.ok && !type.includes('text/html')
  } catch {
    return false
  }
}

/** Dim rain visual. Music plays only when `sound` is set, so the weather screen stays quiet. */
export function UnwindBackdrop({ sound = true }: { sound?: boolean }) {
  const [video, setVideo] = useState(false)
  const [image, setImage] = useState(false)
  const [music, setMusic] = useState(false)

  useEffect(() => {
    let cancelled = false
    void Promise.all([mediaExists(VIDEO_SRC), mediaExists(IMAGE_SRC), sound ? mediaExists(MUSIC_SRC) : Promise.resolve(false)]).then(
      ([hasVideo, hasImage, hasMusic]) => {
        if (cancelled) return
        setVideo(hasVideo)
        setImage(!hasVideo && hasImage)
        setMusic(hasMusic)
      },
    )
    return () => {
      cancelled = true
    }
  }, [sound])

  useEffect(() => {
    const playback = document.querySelector<HTMLMediaElement>(
      music ? '.unwind-backdrop__music' : '.unwind-backdrop__video',
    )
    if (!playback) return
    const start = () => {
      void playback.play().catch(() => {
        if (playback instanceof HTMLVideoElement) playback.muted = true
        void playback.play().catch(() => {})
      })
    }
    start()
    window.addEventListener('pointerdown', start)
    return () => window.removeEventListener('pointerdown', start)
  }, [video, music])

  return (
    <div className="unwind-backdrop" aria-hidden="true">
      {video ? (
        <video className="unwind-backdrop__video" src={VIDEO_SRC} autoPlay muted loop playsInline />
      ) : image ? (
        <img className="unwind-backdrop__image" src={IMAGE_SRC} alt="" />
      ) : (
        <div className="unwind-backdrop__rain" />
      )}
      {music && <audio className="unwind-backdrop__music" src={MUSIC_SRC} autoPlay loop />}
    </div>
  )
}
