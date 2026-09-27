let depth = 0

export function isVoiceBusy(): boolean {
  return depth > 0
}

export function setVoiceBusy(next: boolean): void {
  depth += next ? 1 : -1
  if (depth < 0) depth = 0
}

export interface PrimedSpeech {
  play: () => Promise<void>
}

/** Decode the reply so playback can start in the same frame as the UI shift. */
export async function primeAudioBlob(blob: Blob): Promise<PrimedSpeech> {
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.preload = 'auto'
  const cleanup = () => URL.revokeObjectURL(url)
  await new Promise<void>((resolve, reject) => {
    const ok = () => resolve()
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      ok()
      return
    }
    audio.oncanplaythrough = ok
    audio.onloadeddata = ok
    audio.onerror = () => reject(new Error('Could not play the audio.'))
    try {
      audio.load()
    } catch {
      ok()
    }
  })
  return {
    play: () =>
      new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          cleanup()
          resolve()
        }
        audio.onerror = () => {
          cleanup()
          reject(new Error('Could not play the audio.'))
        }
        void audio.play().then(undefined, (err) => {
          cleanup()
          reject(err)
        })
      }),
  }
}

export async function playAudioBlob(blob: Blob): Promise<void> {
  const primed = await primeAudioBlob(blob)
  await primed.play()
}
