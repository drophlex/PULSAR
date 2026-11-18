/* bridge.js — the engine runs as WebAssembly in an AudioWorklet (web) or natively in the plug-in (JUCE).
   The page talks to it with the same small set of messages either way. */
const WORKLET_CODE = `
class PulsarProc extends AudioWorkletProcessor {
  constructor(o) {
    super({});
    const mod = new WebAssembly.Module(o.processorOptions.wasm);
    this.X = new WebAssembly.Instance(mod, {}).exports; this.X.__wasm_call_ctors(); this.X.px_init(sampleRate);
    this.n = 0; this.rec = false; this.recL = []; this.recR = []; this.recN = 0;
    this.port.onmessage = e => this.msg(e.data);
  }
  mem() { return this.X.memory.buffer; }
  msg(d) {
    const X = this.X;
    switch (d.t) {
      case 'param': X.px_param(d.id, d.v); break;
      case 'params': { const p = new Float32Array(this.mem(), X.px_params(), X.px_param_count()); for (const [id, v] of d.list) X.px_param(id, v); break; }
      case 'play': X.px_play(); break;
      case 'stop': X.px_stop(); break;
      case 'select': X.px_select(d.p, d.now ? 1 : 0); break;
      case 'rec': X.px_rec(d.on ? 1 : 0); break;
      case 'fx': X.px_fx(d.mask); break;
      case 'fill': X.px_fill(d.on ? 1 : 0); break;
      case 'pad': X.px_pad(d.t2, d.vel); break;
      case 'host': X.px_host(d.playing ? 1 : 0, d.bpm, d.sync ? 1 : 0); break;
      case 'getPats': { const sz = X.px_pattern_size(), out = new Uint8Array(sz * 16); for (let p = 0; p < 16; p++) out.set(new Uint8Array(this.mem(), X.px_pattern(p), sz), p * sz); this.port.postMessage({ t: 'pats', id: d.id, bytes: out, size: sz }, [out.buffer]); break; }
      case 'getPat': { const sz = X.px_pattern_size(); const b = new Uint8Array(this.mem(), X.px_pattern(d.p), sz).slice(); this.port.postMessage({ t: 'pat', id: d.id, p: d.p, bytes: b }, [b.buffer]); break; }
      case 'setPat': { const sz = X.px_pattern_size(); new Uint8Array(this.mem(), X.px_pattern(d.p), sz).set(d.bytes.subarray(0, sz)); break; }
      case 'song': { new Uint8Array(this.mem(), X.px_song(), 128).set(d.bytes); X.px_song_set(d.n, d.on ? 1 : 0); break; }
      case 'sample': { const free = X.px_pool_free(); let idx = -1; if (d.data.length <= free) { new Float32Array(this.mem(), X.px_pool_write(), d.data.length).set(d.data); idx = X.px_add_sample(d.data.length, d.sr, d.bpm || 0, d.slices || 16); } this.port.postMessage({ t: 'sampleIdx', id: d.id, idx }); break; }
      case 'resetSamples': X.px_reset_samples(d.keep); break;
      case 'recAudio': this.rec = d.on; if (!d.on) { this.port.postMessage({ t: 'recdata', L: this.recL, R: this.recR }); this.recL = []; this.recR = []; this.recN = 0; } break;
    }
  }
  process(inputs, outputs) {
    const X = this.X, o = outputs[0], n = o[0].length;
    X.px_process(n);
    const L = new Float32Array(this.mem(), X.px_out_l(), n), R = new Float32Array(this.mem(), X.px_out_r(), n);
    o[0].set(L); if (o[1]) o[1].set(R);
    if (this.rec) { this.recL.push(L.slice()); this.recR.push(R.slice()); }
    if (++this.n % 6 === 0) {
      const tele = new Float32Array(this.mem(), X.px_tele(), 64).slice();
      const sw = X.px_scope_w(), sc = new Float32Array(this.mem(), X.px_scope(), 512), scope = new Float32Array(256);
      for (let k = 0; k < 256; k++) scope[k] = sc[(sw - 256 + k + 512) & 511];
      this.port.postMessage({ t: 'tele', tele, scope }, [tele.buffer, scope.buffer]);
    }
    return true;
  }
}
registerProcessor('pulsar', PulsarProc);`;

const Bridge = {
  kind: 'web', ready: false, onTele: null, _id: 1, _wait: {}, node: null, ctx: null, recCb: null, sampleRate: 48000, patSize: 0,
  async start() {
    if (window.__JUCE__ && window.__JUCE__.backend) return this.startPlugin();
    const AC = window.AudioContext || window.webkitAudioContext;
    try { this.ctx = new AC({ latencyHint: 'interactive', sampleRate: 48000 }); } catch (e) { this.ctx = new AC({ latencyHint: 'interactive' }); }
    const url = URL.createObjectURL(new Blob([WORKLET_CODE], { type: 'application/javascript' }));
    await this.ctx.audioWorklet.addModule(url);
    const wasm = Uint8Array.from(atob(WASM_B64), c => c.charCodeAt(0));
    this.node = new AudioWorkletNode(this.ctx, 'pulsar', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { wasm } });
    this.node.connect(this.ctx.destination);
    this.node.port.onmessage = e => this._msg(e.data);
    this.sampleRate = this.ctx.sampleRate; this.ready = true;
    if (this.ctx.state !== 'running') await this.ctx.resume();
  },
  _msg(d) {
    if (d.t === 'tele') this.onTele && this.onTele(d.tele, d.scope);
    else if (d.t === 'recdata') this.recCb && this.recCb(d.L, d.R);
    else { const f = this._wait[d.id]; delete this._wait[d.id]; f && f(d); }
  },
  _ask(msg, transfer) { return new Promise(res => { const id = this._id++; this._wait[id] = res; msg.id = id; this.node.port.postMessage(msg, transfer || []); }); },
  post(msg, transfer) { if (this.kind === 'plugin') return this._call('msg', [JSON.stringify(msg, (k, v) => v instanceof Uint8Array ? { u8: btoa(String.fromCharCode(...v)) } : v)]); this.node && this.node.port.postMessage(msg, transfer || []); },
  param(id, v) { this.post({ t: 'param', id, v }); },
  params(list) { this.post({ t: 'params', list }); },
  async getPats() { if (this.kind === 'plugin') { const r = await this._call('getPats', []); return { bytes: Uint8Array.from(atob(r.bytes), c => c.charCodeAt(0)), size: r.size }; } return this._ask({ t: 'getPats' }); },
  async getPat(p) { if (this.kind === 'plugin') { const r = await this._call('getPat', [p]); return { bytes: Uint8Array.from(atob(r), c => c.charCodeAt(0)) }; } return this._ask({ t: 'getPat', p }); },
  setPat(p, bytes) { if (this.kind === 'plugin') return this._call('setPat', [p, btoa(String.fromCharCode(...bytes))]); this.node.port.postMessage({ t: 'setPat', p, bytes: bytes.slice() }); },
  async addSample(data, sr, bpm, slices, name) {
    if (this.kind === 'plugin') { const b = new Uint8Array(data.buffer.slice(0)); let s = ''; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return this._call('addSample', [btoa(s), sr, bpm || 0, slices || 16, name || 'sample']); }
    const r = await this._ask({ t: 'sample', data, sr, bpm, slices }, [data.buffer]); return r.idx; },
  record(on, cb) { this.recCb = cb; this.post({ t: 'recAudio', on }); },
  // ---- plug-in side (JUCE 8 WebBrowserComponent native functions + events)
  async startPlugin() {
    this.kind = 'plugin'; const B = window.__JUCE__.backend;
    B.addEventListener('tele', d => this.onTele && this.onTele(Float32Array.from(d.tele), Float32Array.from(d.scope)));
    this.ready = true; this.sampleRate = await this._call('sampleRate', []);
  },
  _call(name, args) {
    const B = window.__JUCE__.backend, id = this._id++;
    return new Promise(res => { const h = e => { if (e.promiseId === id) { B.removeEventListener('__juce__complete', tok); res(e.result); } }; const tok = B.addEventListener('__juce__complete', h); B.emitEvent('__juce__invoke', { name, params: args, resultId: id }); });
  },
};
