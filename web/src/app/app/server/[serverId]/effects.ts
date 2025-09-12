export default function addPostProcessing(
  stream: MediaStream,
  volume: number,
  postProcessing: number
): {
  track: MediaStreamTrack
  adjustPostProcessing(amount: number): void
  adjustVolume(amount: number): void
} {
  const workaround = new Audio()
  workaround.srcObject = stream
  workaround.muted = true
  requestAnimationFrame(() => workaround.remove())

  const context = new window.AudioContext()
  const source = context.createMediaStreamSource(stream)

  const bandpass = context.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = 1500
  bandpass.Q.value = postProcessing

  const highpass = context.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.value = 300 * postProcessing

  const highshelf = context.createBiquadFilter()
  highshelf.type = 'highshelf'
  highshelf.frequency.value = 4000
  highshelf.gain.value = -17.9 * postProcessing

  const lowshelf = context.createBiquadFilter()
  lowshelf.type = 'lowshelf'
  lowshelf.frequency.value = 400
  lowshelf.gain.value = -17.9 * postProcessing

  function makeDistortionCurve(amount = 20): Float32Array<ArrayBuffer> {
    const n_samples = 44100
    const curve = new Float32Array(n_samples)
    const deg = Math.PI / 180
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
    }
    return curve
  }

  const distortion = context.createWaveShaper()
  distortion.curve = makeDistortionCurve(50)
  distortion.oversample = '4x'

  const wetGain = context.createGain()
  wetGain.gain.value = postProcessing

  const dryGain = context.createGain()
  dryGain.gain.value = 1 - postProcessing

  source.connect(bandpass)
  bandpass.connect(highpass)
  highpass.connect(highshelf)
  highshelf.connect(lowshelf)
  lowshelf.connect(distortion)
  distortion.connect(wetGain)

  source.connect(dryGain)

  const finalGain = context.createGain()
  finalGain.gain.value = volume

  dryGain.connect(finalGain)
  wetGain.connect(finalGain)

  const final = context.createMediaStreamDestination()
  finalGain.connect(final)

  return {
    track: final.stream.getAudioTracks()[0],
    adjustPostProcessing(amount: number) {
      bandpass.Q.value = amount
      highpass.frequency.value = 300 * amount
      highshelf.gain.value = -17.9 * amount
      lowshelf.gain.value = -17.9 * amount

      dryGain.gain.value = 1 - amount
      wetGain.gain.value = amount
    },
    adjustVolume(amount: number) {
      finalGain.gain.value = amount
    }
  }
}
