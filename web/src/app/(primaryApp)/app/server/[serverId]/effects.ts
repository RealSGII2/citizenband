function lerp(a: number, b: number, x: number) {
  return a + (b - a) * x;
}

const n_samples = 44100;
const distortionIdentity = new Float32Array(n_samples);

for (let i = 0; i < n_samples; ++i)
  distortionIdentity[i] = (i / (n_samples - 1)) * 2 - 1;

function makeDistortionCurve(
  amount: number,
  multiplier: number,
): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] =
      ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve.map((x, i) => lerp(distortionIdentity[i], x, multiplier));
}

export default function addPostProcessing(
  stream: MediaStream,
  volume: number,
  postProcessing: number,
): {
  track: MediaStreamTrack;
  adjustPostProcessing(amount: number): void;
  adjustVolume(amount: number): void;
} {
  const workaround = new Audio();
  workaround.srcObject = stream;
  workaround.muted = true;
  requestAnimationFrame(() => workaround.remove());

  const context = new window.AudioContext();
  const source = context.createMediaStreamSource(stream);

  const bandpass = context.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 1500;
  bandpass.Q.value = postProcessing;

  const preBandPassGain = context.createGain();
  preBandPassGain.gain.value = 1 - postProcessing;

  const postBandPassGain = context.createGain();
  postBandPassGain.gain.value = postProcessing;

  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 300 * postProcessing;

  const highshelf = context.createBiquadFilter();
  highshelf.type = "highshelf";
  highshelf.frequency.value = 4000;
  highshelf.gain.value = -17.9 * postProcessing;

  const lowshelf = context.createBiquadFilter();
  lowshelf.type = "lowshelf";
  lowshelf.frequency.value = 400;
  lowshelf.gain.value = -17.9 * postProcessing;

  const distortion = context.createWaveShaper();
  distortion.curve = makeDistortionCurve(50, postProcessing);
  distortion.oversample = "4x";

  const wetGain = context.createGain();
  // wetGain.gain.value = postProcessing
  wetGain.gain.value = postProcessing * 0.25 + 0.75;

  const dryGain = context.createGain();
  // dryGain.gain.value = 1 - postProcessing
  dryGain.gain.value = 0;

  source.connect(preBandPassGain);

  source.connect(bandpass);
  bandpass.connect(highpass);
  // bandpass.connect(postBandPassGain)
  //
  // preBandPassGain.connect(highpass)
  // postBandPassGain.connect(highpass)

  highpass.connect(highshelf);
  highshelf.connect(lowshelf);
  lowshelf.connect(distortion);
  distortion.connect(wetGain);

  source.connect(dryGain);

  const finalGain = context.createGain();
  finalGain.gain.value = volume;

  dryGain.connect(finalGain);
  wetGain.connect(finalGain);

  const final = context.createMediaStreamDestination();
  finalGain.connect(final);

  return {
    track: final.stream.getAudioTracks()[0],
    adjustPostProcessing(amount: number) {
      bandpass.Q.value = amount;
      highpass.frequency.value = 300 * amount;
      highshelf.gain.value = -17.9 * amount;
      lowshelf.gain.value = -17.9 * amount;

      distortion.curve = makeDistortionCurve(50, amount);

      // dryGain.gain.value = 1 - amount
      wetGain.gain.value = amount * 0.25 + 0.75;
      preBandPassGain.gain.value = 1 - amount;
      postBandPassGain.gain.value = amount;
    },
    adjustVolume(amount: number) {
      finalGain.gain.value = amount;
    },
  };
}
