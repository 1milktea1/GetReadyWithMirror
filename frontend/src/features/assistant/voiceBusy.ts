let depth = 0

export function isVoiceBusy(): boolean {
  return depth > 0
}

export function setVoiceBusy(next: boolean): void {
  depth += next ? 1 : -1
  if (depth < 0) depth = 0
}

export async function playAudioBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  try {
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve()
      audio.onerror = () => reject(new Error('Could not play the audio.'))
      void audio.play().catch(reject)
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
