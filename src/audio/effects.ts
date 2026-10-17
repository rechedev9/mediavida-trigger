/** Stereo decaying noise that darkens over time, so the tail sounds like a warm room. */
function makeImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const predelay = Math.floor(rate * 0.012);
  const buf = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let smooth = 0;
    for (let i = predelay; i < length; i++) {
      const p = i / length;
      const coeff = 0.85 - 0.75 * p;
      smooth += coeff * (Math.random() * 2 - 1 - smooth);
      data[i] = smooth * Math.exp(-6.9 * p);
    }
  }
  return buf;
}

export function makeReverb(ctx: BaseAudioContext, opts: { seconds: number; out: AudioNode }) {
  const input = ctx.createGain();
  const conv = ctx.createConvolver();
  conv.buffer = makeImpulse(ctx, opts.seconds);
  const ret = ctx.createGain();
  ret.gain.value = 0.6;
  input.connect(conv).connect(ret).connect(opts.out);
  return input;
}

interface DelaySpec {
  seconds: number;
  feedback: number;
  mix: number;
  input: AudioNode;
  out: AudioNode;
}

/** Feedback echo with a lowpass in the loop so repeats get darker. */
export function makeDelay(ctx: BaseAudioContext, spec: DelaySpec): AudioNode[] {
  const delay = ctx.createDelay(3);
  delay.delayTime.value = spec.seconds;
  const fb = ctx.createGain();
  fb.gain.value = Math.min(spec.feedback, 0.8);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2600;
  const wet = ctx.createGain();
  wet.gain.value = spec.mix;
  spec.input.connect(delay);
  delay.connect(lp).connect(fb).connect(delay);
  lp.connect(wet).connect(spec.out);
  return [delay, fb, lp, wet];
}
