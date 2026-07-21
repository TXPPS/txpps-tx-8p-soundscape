/**
 * TX-8P Factory Preset Bank
 *
 * 30 factory patches authored as SPARSE overrides against the parameter
 * registry defaults (see ./params/registry.ts). Every key is a real param id
 * and every value is a raw value inside that param's [min, max]. Enum/toggle
 * values are option indices (e.g. `osc2.shape: 2` = Saw, `drive.on: 1` = ON).
 *
 * Anything not listed inherits the registry default, so each patch only
 * carries what makes it distinct.
 */

export interface FactoryPreset {
  id: string; // stable slug, e.g. "fat-analog-bass"
  name: string; // <= 16 chars, LCD-friendly, e.g. "Fat Analog"
  category:
    | "BASS"
    | "LEAD"
    | "PAD"
    | "KEYS"
    | "PLUCK"
    | "BRASS"
    | "STRINGS"
    | "FX"
    | "ARP"
    | "INIT";
  tags: string[];
  params: Record<string, number>; // sparse overrides
}

export const FACTORY_PRESETS: FactoryPreset[] = [
  // ---- BASS ----

  // Fat detuned mono analog bass with sub weight and a tight amp env.
  {
    id: "fat-analog-bass",
    name: "Fat Analog",
    category: "BASS",
    tags: ["bass", "analog", "mono", "fat"],
    params: {
      "osc1.table": 12, // Vintage Hybrid
      "osc1.pos": 0.2,
      "osc1.level": 0.9,
      "osc2.shape": 2, // Saw
      "osc2.fine": -9,
      "osc2.level": 0.7,
      "mixer.osc2": 0.7,
      "sub.wave": 3, // Square -1
      "sub.level": 0.85,
      "mixer.sub": 0.9,
      "filter.mode": 0,
      "filter.cutoff": 520,
      "filter.resonance": 0.22,
      "filter.envAmt": 0.55,
      "filter.keytrack": 0.4,
      "amp.attack": 2,
      "amp.decay": 220,
      "amp.sustain": 0.55,
      "amp.release": 140,
      "modenv.attack": 1,
      "modenv.decay": 180,
      "voice.mode": 1, // Mono
      "voice.glide": 40,
      "drive.on": 1,
      "drive.amount": 0.35,
    },
  },

  // Squelchy resonant acid bass, LFO1 wobble on cutoff via mod matrix.
  {
    id: "acid-303-bass",
    name: "Acid 303",
    category: "BASS",
    tags: ["bass", "acid", "resonant", "mono"],
    params: {
      "osc1.table": 2, // Saw Harm
      "osc1.pos": 0.1,
      "osc2.shape": 2,
      "osc2.level": 0,
      "mixer.osc2": 0,
      "sub.wave": 1,
      "sub.level": 0.4,
      "filter.mode": 0,
      "filter.cutoff": 320,
      "filter.resonance": 0.82,
      "filter.envAmt": 0.7,
      "filter.envVel": 0.5,
      "amp.attack": 1,
      "amp.decay": 400,
      "amp.sustain": 0.3,
      "amp.release": 120,
      "modenv.attack": 1,
      "modenv.decay": 260,
      "modenv.sustain": 0,
      "lfo1.shape": 0,
      "lfo1.rate": 3.2,
      "lfo1.depth": 0.6,
      "matrix.s1.src": 1, // LFO 1
      "matrix.s1.dst": 7, // Cutoff
      "matrix.s1.amt": 0.45,
      "matrix.s1.on": 1,
      "voice.mode": 1,
      "voice.glide": 70,
      "voice.legato": 1,
      "drive.on": 1,
      "drive.amount": 0.5,
    },
  },

  // Clean deep sub-focused sine bass for hip-hop / trap.
  {
    id: "deep-sub-bass",
    name: "Deep Sub",
    category: "BASS",
    tags: ["bass", "sub", "clean", "808"],
    params: {
      "osc1.table": 1, // Sine Harm
      "osc1.pos": 0,
      "osc1.level": 0.7,
      "osc2.shape": 0, // Sine
      "osc2.level": 0,
      "mixer.osc2": 0,
      "sub.wave": 2, // Sine -2
      "sub.level": 1,
      "mixer.sub": 1,
      "filter.mode": 0,
      "filter.cutoff": 900,
      "filter.resonance": 0.08,
      "amp.attack": 3,
      "amp.decay": 900,
      "amp.sustain": 0.4,
      "amp.release": 260,
      "voice.mode": 1,
      "voice.glide": 20,
      "eq.on": 1,
      "eq.low": 5,
      "eq.high": -3,
    },
  },

  // Gritty FM-ish reese bass, dense unison detune, band-pass bite.
  {
    id: "reese-bass",
    name: "Reese",
    category: "BASS",
    tags: ["bass", "reese", "unison", "dnb"],
    params: {
      "osc1.table": 3, // Square Harm
      "osc1.pos": 0.35,
      "osc1.level": 0.85,
      "osc2.shape": 2,
      "osc2.fine": -14,
      "osc2.level": 0.85,
      "mixer.osc2": 0.85,
      "sub.wave": 1,
      "sub.level": 0.5,
      "filter.mode": 0,
      "filter.cutoff": 680,
      "filter.resonance": 0.3,
      "filter.envAmt": 0.3,
      "amp.attack": 4,
      "amp.decay": 500,
      "amp.sustain": 0.7,
      "amp.release": 200,
      "voice.mode": 2, // Unison
      "voice.uniCount": 2, // 5
      "voice.uniDetune": 0.55,
      "voice.uniSpread": 0.4,
      "drive.on": 1,
      "drive.amount": 0.45,
      "chorus.on": 1,
      "chorus.mode": 2,
    },
  },

  // Plucky pluck-bass with mod-env cutoff snap and light glide.
  {
    id: "pluck-mono-bass",
    name: "Pluck Bass",
    category: "BASS",
    tags: ["bass", "pluck", "punchy", "mono"],
    params: {
      "osc1.table": 6, // Bright
      "osc1.pos": 0.45,
      "osc2.shape": 3, // Square
      "osc2.pw": 0.35,
      "osc2.level": 0.5,
      "mixer.osc2": 0.6,
      "sub.wave": 3,
      "sub.level": 0.6,
      "filter.mode": 0,
      "filter.cutoff": 400,
      "filter.resonance": 0.35,
      "filter.envAmt": 0.8,
      "amp.attack": 1,
      "amp.decay": 300,
      "amp.sustain": 0.25,
      "amp.release": 120,
      "modenv.attack": 1,
      "modenv.decay": 130,
      "modenv.sustain": 0,
      "matrix.s1.src": 3, // Mod Env
      "matrix.s1.dst": 7, // Cutoff
      "matrix.s1.amt": 0.6,
      "matrix.s1.on": 1,
      "voice.mode": 1,
      "voice.glide": 30,
    },
  },

  // ---- LEAD ----

  // Screaming saw lead, unison stack, delay + reverb tail.
  {
    id: "super-saw-lead",
    name: "Super Saw",
    category: "LEAD",
    tags: ["lead", "supersaw", "unison", "trance"],
    params: {
      "osc1.table": 2, // Saw Harm
      "osc1.pos": 0.5,
      "osc1.level": 0.9,
      "osc2.shape": 2,
      "osc2.fine": 11,
      "osc2.level": 0.8,
      "mixer.osc2": 0.8,
      "filter.mode": 0,
      "filter.cutoff": 6500,
      "filter.resonance": 0.2,
      "filter.envAmt": 0.3,
      "amp.attack": 8,
      "amp.decay": 400,
      "amp.sustain": 0.85,
      "amp.release": 350,
      "voice.mode": 2, // Unison
      "voice.uniCount": 3, // 7
      "voice.uniDetune": 0.45,
      "voice.uniSpread": 0.7,
      "delay.on": 1,
      "delay.time": 375,
      "delay.feedback": 0.4,
      "delay.mix": 0.3,
      "reverb.on": 1,
      "reverb.mix": 0.25,
    },
  },

  // Expressive mono glide solo lead with vibrato from LFO2.
  {
    id: "mono-solo-lead",
    name: "Solo Lead",
    category: "LEAD",
    tags: ["lead", "solo", "mono", "glide", "vibrato"],
    params: {
      "osc1.table": 6, // Bright
      "osc1.pos": 0.6,
      "osc2.shape": 2,
      "osc2.fine": 4,
      "osc2.level": 0.5,
      "mixer.osc2": 0.55,
      "filter.mode": 0,
      "filter.cutoff": 5200,
      "filter.resonance": 0.28,
      "filter.envAmt": 0.25,
      "amp.attack": 12,
      "amp.decay": 300,
      "amp.sustain": 0.9,
      "amp.release": 260,
      "lfo2.shape": 0,
      "lfo2.rate": 5.5,
      "lfo2.depth": 0.4,
      "lfo2.fade": 600,
      "matrix.s1.src": 7, // Mod Wheel
      "matrix.s1.dst": 12, // LFO2 Rate
      "matrix.s1.amt": 0.3,
      "matrix.s1.on": 1,
      "matrix.s2.src": 2, // LFO 2
      "matrix.s2.dst": 1, // Pitch
      "matrix.s2.amt": 0.12,
      "matrix.s2.on": 1,
      "voice.mode": 1,
      "voice.glide": 120,
      "voice.legato": 1,
      "delay.on": 1,
      "delay.mix": 0.22,
    },
  },

  // Bright glassy digital lead, FM-flavored, plate reverb sheen.
  {
    id: "glass-digital-lead",
    name: "Glass Lead",
    category: "LEAD",
    tags: ["lead", "digital", "glass", "bright"],
    params: {
      "osc1.table": 7, // Glass
      "osc1.pos": 0.4,
      "osc1.warp": 0.7,
      "osc2.shape": 0,
      "osc2.oct": 1,
      "osc2.level": 0.4,
      "mixer.osc2": 0.5,
      "filter.mode": 0,
      "filter.cutoff": 9000,
      "filter.resonance": 0.15,
      "amp.attack": 4,
      "amp.decay": 350,
      "amp.sustain": 0.75,
      "amp.release": 300,
      "chorus.on": 1,
      "chorus.mode": 1,
      "reverb.on": 1,
      "reverb.mode": 2, // Plate
      "reverb.mix": 0.3,
    },
  },

  // Aggressive hard-sync style square lead with drive and resonant bite.
  {
    id: "square-sync-lead",
    name: "Sync Lead",
    category: "LEAD",
    tags: ["lead", "sync", "square", "aggressive"],
    params: {
      "osc1.table": 4, // Pulse Harm
      "osc1.pos": 0.3,
      "osc2.shape": 4, // Pulse
      "osc2.pw": 0.25,
      "osc2.pwm": 0.4,
      "osc2.semi": 7,
      "osc2.level": 0.7,
      "mixer.osc2": 0.75,
      "filter.mode": 0,
      "filter.cutoff": 4200,
      "filter.resonance": 0.45,
      "filter.envAmt": 0.5,
      "amp.attack": 3,
      "amp.decay": 250,
      "amp.sustain": 0.7,
      "amp.release": 180,
      "modenv.attack": 1,
      "modenv.decay": 200,
      "lfo1.shape": 1,
      "lfo1.rate": 4,
      "matrix.s1.src": 1, // LFO 1
      "matrix.s1.dst": 5, // Osc2 PW
      "matrix.s1.amt": 0.4,
      "matrix.s1.on": 1,
      "voice.mode": 1,
      "drive.on": 1,
      "drive.amount": 0.55,
    },
  },

  // Soft whistle sine lead, gentle, with slow tremolo and long delay.
  {
    id: "whistle-sine-lead",
    name: "Whistle",
    category: "LEAD",
    tags: ["lead", "sine", "soft", "whistle"],
    params: {
      "osc1.table": 1, // Sine Harm
      "osc1.pos": 0.15,
      "osc2.shape": 0,
      "osc2.level": 0,
      "mixer.osc2": 0,
      "filter.mode": 0,
      "filter.cutoff": 7000,
      "filter.resonance": 0.05,
      "amp.attack": 40,
      "amp.decay": 300,
      "amp.sustain": 0.9,
      "amp.release": 500,
      "lfo1.shape": 0,
      "lfo1.rate": 4.8,
      "lfo1.depth": 0.25,
      "lfo1.fade": 800,
      "matrix.s1.src": 1, // LFO 1
      "matrix.s1.dst": 9, // Amp
      "matrix.s1.amt": 0.2,
      "matrix.s1.on": 1,
      "voice.mode": 1,
      "voice.glide": 60,
      "delay.on": 1,
      "delay.time": 500,
      "delay.feedback": 0.5,
      "delay.mix": 0.35,
      "reverb.on": 1,
      "reverb.mix": 0.3,
    },
  },

  // ---- PAD ----

  // Lush warm analog pad, slow swell, chorus + hall reverb.
  {
    id: "warm-analog-pad",
    name: "Warm Pad",
    category: "PAD",
    tags: ["pad", "warm", "analog", "lush"],
    params: {
      "osc1.table": 5, // Hollow
      "osc1.pos": 0.4,
      "osc1.level": 0.8,
      "osc2.shape": 2,
      "osc2.fine": -8,
      "osc2.level": 0.7,
      "mixer.osc2": 0.75,
      "sub.wave": 1,
      "sub.level": 0.3,
      "filter.mode": 0,
      "filter.cutoff": 2200,
      "filter.resonance": 0.15,
      "filter.envAmt": 0.2,
      "amp.attack": 1200,
      "amp.decay": 800,
      "amp.sustain": 0.9,
      "amp.release": 2500,
      "modenv.attack": 900,
      "modenv.decay": 1500,
      "lfo1.shape": 0,
      "lfo1.rate": 0.3,
      "lfo1.depth": 0.3,
      "matrix.s1.src": 1, // LFO 1
      "matrix.s1.dst": 7, // Cutoff
      "matrix.s1.amt": 0.15,
      "matrix.s1.on": 1,
      "chorus.on": 1,
      "chorus.mode": 2,
      "chorus.mix": 0.6,
      "reverb.on": 1,
      "reverb.mode": 1, // Hall
      "reverb.size": 0.8,
      "reverb.mix": 0.4,
    },
  },

  // Shimmering glassy digital pad, bright and airy, plate verb.
  {
    id: "glass-shimmer-pad",
    name: "Shimmer Pad",
    category: "PAD",
    tags: ["pad", "shimmer", "glass", "airy"],
    params: {
      "osc1.table": 7, // Glass
      "osc1.pos": 0.55,
      "osc1.warp": 0.6,
      "osc2.shape": 1, // Triangle
      "osc2.oct": 1,
      "osc2.level": 0.5,
      "mixer.osc2": 0.6,
      "filter.mode": 0,
      "filter.cutoff": 6000,
      "filter.resonance": 0.1,
      "amp.attack": 1500,
      "amp.decay": 1000,
      "amp.sustain": 0.85,
      "amp.release": 3500,
      "lfo1.shape": 0,
      "lfo1.rate": 0.2,
      "lfo1.depth": 0.4,
      "matrix.s1.src": 1,
      "matrix.s1.dst": 6, // Osc1 Position
      "matrix.s1.amt": 0.3,
      "matrix.s1.on": 1,
      "chorus.on": 1,
      "chorus.mode": 3,
      "reverb.on": 1,
      "reverb.mode": 2, // Plate
      "reverb.size": 0.9,
      "reverb.mix": 0.45,
    },
  },

  // Dark evolving formant pad, slow S&H motion, dark reverb.
  {
    id: "dark-formant-pad",
    name: "Dark Pad",
    category: "PAD",
    tags: ["pad", "dark", "formant", "evolving"],
    params: {
      "osc1.table": 9, // Formant
      "osc1.pos": 0.3,
      "osc1.warp": 0.4,
      "osc2.shape": 2,
      "osc2.oct": -1,
      "osc2.level": 0.6,
      "mixer.osc2": 0.65,
      "noise.type": 2, // Dark
      "noise.level": 0.15,
      "mixer.noise": 0.3,
      "filter.mode": 0,
      "filter.cutoff": 1400,
      "filter.resonance": 0.25,
      "amp.attack": 2000,
      "amp.decay": 1200,
      "amp.sustain": 0.8,
      "amp.release": 4000,
      "lfo1.shape": 5, // S&H
      "lfo1.rate": 0.5,
      "lfo1.depth": 0.5,
      "matrix.s1.src": 1,
      "matrix.s1.dst": 6, // Osc1 Position
      "matrix.s1.amt": 0.35,
      "matrix.s1.on": 1,
      "chorus.on": 1,
      "reverb.on": 1,
      "reverb.mode": 3, // Dark
      "reverb.size": 0.85,
      "reverb.mix": 0.5,
    },
  },

  // Wide sweeping synth-string pad, motion from LFO on position.
  {
    id: "sweep-motion-pad",
    name: "Sweep Pad",
    category: "PAD",
    tags: ["pad", "sweep", "motion", "wide"],
    params: {
      "osc1.table": 11, // Sweep
      "osc1.pos": 0.2,
      "osc2.shape": 2,
      "osc2.fine": 12,
      "osc2.level": 0.7,
      "mixer.osc2": 0.75,
      "filter.mode": 0,
      "filter.cutoff": 3000,
      "filter.resonance": 0.18,
      "filter.envAmt": 0.35,
      "amp.attack": 900,
      "amp.decay": 1000,
      "amp.sustain": 0.85,
      "amp.release": 2800,
      "modenv.attack": 1500,
      "modenv.decay": 2000,
      "matrix.s1.src": 3, // Mod Env
      "matrix.s1.dst": 6, // Osc1 Position
      "matrix.s1.amt": 0.7,
      "matrix.s1.on": 1,
      "lfo1.shape": 1,
      "lfo1.rate": 0.25,
      "matrix.s2.src": 1, // LFO 1
      "matrix.s2.dst": 10, // Pan
      "matrix.s2.amt": 0.5,
      "matrix.s2.on": 1,
      "chorus.on": 1,
      "chorus.mode": 2,
      "reverb.on": 1,
      "reverb.mix": 0.4,
    },
  },

  // Choir-like vocal pad using formant table, breathy noise layer.
  {
    id: "vocal-choir-pad",
    name: "Choir Pad",
    category: "PAD",
    tags: ["pad", "choir", "vocal", "soft"],
    params: {
      "osc1.table": 9, // Formant
      "osc1.pos": 0.65,
      "osc2.shape": 1,
      "osc2.fine": -6,
      "osc2.level": 0.6,
      "mixer.osc2": 0.65,
      "noise.type": 1, // Pink
      "noise.tone": 0.7,
      "noise.level": 0.1,
      "mixer.noise": 0.25,
      "filter.mode": 0,
      "filter.cutoff": 3200,
      "filter.resonance": 0.2,
      "amp.attack": 800,
      "amp.decay": 900,
      "amp.sustain": 0.9,
      "amp.release": 2200,
      "lfo1.shape": 0,
      "lfo1.rate": 4.5,
      "lfo1.depth": 0.2,
      "lfo1.fade": 1200,
      "matrix.s1.src": 1,
      "matrix.s1.dst": 1, // Pitch (subtle vibrato/chorus feel)
      "matrix.s1.amt": 0.06,
      "matrix.s1.on": 1,
      "chorus.on": 1,
      "chorus.mode": 2,
      "chorus.mix": 0.55,
      "reverb.on": 1,
      "reverb.mode": 1,
      "reverb.mix": 0.4,
    },
  },

  // ---- KEYS ----

  // Warm electric piano, bell-ish attack, chorus + short reverb.
  {
    id: "electric-piano",
    name: "E.Piano",
    category: "KEYS",
    tags: ["keys", "epiano", "rhodes", "warm"],
    params: {
      "osc1.table": 1, // Sine Harm
      "osc1.pos": 0.3,
      "osc2.shape": 0,
      "osc2.oct": 1,
      "osc2.level": 0.35,
      "mixer.osc2": 0.4,
      "filter.mode": 0,
      "filter.cutoff": 4500,
      "filter.resonance": 0.1,
      "filter.envAmt": 0.3,
      "filter.envVel": 0.6,
      "amp.attack": 2,
      "amp.decay": 1400,
      "amp.sustain": 0.35,
      "amp.release": 500,
      "amp.velocity": 0.8,
      "modenv.attack": 1,
      "modenv.decay": 400,
      "chorus.on": 1,
      "chorus.mode": 0,
      "reverb.on": 1,
      "reverb.mode": 0, // Room
      "reverb.mix": 0.2,
    },
  },

  // Percussive FM digital tine/keys, bright bell tone.
  {
    id: "fm-digital-keys",
    name: "FM Keys",
    category: "KEYS",
    tags: ["keys", "fm", "digital", "bell"],
    params: {
      "osc1.table": 10, // Digital
      "osc1.pos": 0.5,
      "osc1.warp": 0.6,
      "osc2.shape": 0,
      "osc2.semi": 7,
      "osc2.level": 0.5,
      "mixer.osc2": 0.55,
      "filter.mode": 0,
      "filter.cutoff": 6000,
      "filter.resonance": 0.12,
      "amp.attack": 1,
      "amp.decay": 1200,
      "amp.sustain": 0.25,
      "amp.release": 400,
      "amp.velocity": 0.7,
      "delay.on": 1,
      "delay.time": 250,
      "delay.feedback": 0.3,
      "delay.mix": 0.2,
      "reverb.on": 1,
      "reverb.mix": 0.2,
    },
  },

  // Bright clav / harpsichord style plucked keys with band-pass edge.
  {
    id: "clav-keys",
    name: "Clavi",
    category: "KEYS",
    tags: ["keys", "clav", "funk", "bright"],
    params: {
      "osc1.table": 3, // Square Harm
      "osc1.pos": 0.4,
      "osc2.shape": 3,
      "osc2.pw": 0.4,
      "osc2.level": 0.5,
      "mixer.osc2": 0.55,
      "filter.mode": 1, // Band Pass
      "filter.cutoff": 2400,
      "filter.resonance": 0.4,
      "filter.envAmt": 0.5,
      "filter.envVel": 0.7,
      "amp.attack": 1,
      "amp.decay": 350,
      "amp.sustain": 0.2,
      "amp.release": 150,
      "modenv.attack": 1,
      "modenv.decay": 180,
      "matrix.s1.src": 3, // Mod Env
      "matrix.s1.dst": 7, // Cutoff
      "matrix.s1.amt": 0.4,
      "matrix.s1.on": 1,
      "drive.on": 1,
      "drive.amount": 0.3,
    },
  },

  // Classic hollow organ, drawbar-ish with subtle vibrato.
  {
    id: "hollow-organ",
    name: "Organ",
    category: "KEYS",
    tags: ["keys", "organ", "hollow", "vibrato"],
    params: {
      "osc1.table": 5, // Hollow
      "osc1.pos": 0.5,
      "osc2.shape": 0,
      "osc2.oct": 1,
      "osc2.level": 0.6,
      "mixer.osc2": 0.65,
      "sub.wave": 1,
      "sub.level": 0.4,
      "filter.mode": 0,
      "filter.cutoff": 5000,
      "filter.resonance": 0.08,
      "amp.attack": 2,
      "amp.decay": 100,
      "amp.sustain": 1,
      "amp.release": 60,
      "lfo1.shape": 0,
      "lfo1.rate": 6.5,
      "lfo1.depth": 0.3,
      "lfo1.fade": 400,
      "matrix.s1.src": 1,
      "matrix.s1.dst": 1, // Pitch
      "matrix.s1.amt": 0.05,
      "matrix.s1.on": 1,
      "chorus.on": 1,
      "chorus.mode": 2,
      "reverb.on": 1,
      "reverb.mix": 0.18,
    },
  },

  // ---- PLUCK ----

  // Bright synth pluck with fast mod-env cutoff snap and delay.
  {
    id: "synth-pluck",
    name: "Synth Pluck",
    category: "PLUCK",
    tags: ["pluck", "bright", "poly", "delay"],
    params: {
      "osc1.table": 6, // Bright
      "osc1.pos": 0.5,
      "osc2.shape": 2,
      "osc2.fine": 6,
      "osc2.level": 0.5,
      "mixer.osc2": 0.55,
      "filter.mode": 0,
      "filter.cutoff": 800,
      "filter.resonance": 0.4,
      "filter.envAmt": 0.85,
      "amp.attack": 1,
      "amp.decay": 350,
      "amp.sustain": 0,
      "amp.release": 200,
      "modenv.attack": 1,
      "modenv.decay": 160,
      "modenv.sustain": 0,
      "matrix.s1.src": 3, // Mod Env
      "matrix.s1.dst": 7, // Cutoff
      "matrix.s1.amt": 0.7,
      "matrix.s1.on": 1,
      "delay.on": 1,
      "delay.time": 300,
      "delay.feedback": 0.35,
      "delay.pingpong": 1,
      "delay.mix": 0.3,
      "reverb.on": 1,
      "reverb.mix": 0.2,
    },
  },

  // Plucked-string / koto style with metallic table and short decay.
  {
    id: "koto-pluck",
    name: "Koto",
    category: "PLUCK",
    tags: ["pluck", "koto", "metallic", "ethnic"],
    params: {
      "osc1.table": 8, // Metallic
      "osc1.pos": 0.35,
      "osc2.shape": 0,
      "osc2.oct": 1,
      "osc2.level": 0.3,
      "mixer.osc2": 0.4,
      "filter.mode": 0,
      "filter.cutoff": 3800,
      "filter.resonance": 0.25,
      "filter.envAmt": 0.5,
      "filter.envVel": 0.6,
      "amp.attack": 1,
      "amp.decay": 600,
      "amp.sustain": 0,
      "amp.release": 300,
      "modenv.attack": 1,
      "modenv.decay": 200,
      "reverb.on": 1,
      "reverb.mode": 2,
      "reverb.mix": 0.28,
    },
  },

  // Soft mellow triangle pluck / mallet, gentle and round.
  {
    id: "mallet-pluck",
    name: "Mallet",
    category: "PLUCK",
    tags: ["pluck", "mallet", "soft", "mellow"],
    params: {
      "osc1.table": 1, // Sine Harm
      "osc1.pos": 0.2,
      "osc2.shape": 1, // Triangle
      "osc2.oct": 1,
      "osc2.level": 0.4,
      "mixer.osc2": 0.45,
      "filter.mode": 0,
      "filter.cutoff": 2600,
      "filter.resonance": 0.12,
      "filter.envAmt": 0.4,
      "amp.attack": 1,
      "amp.decay": 700,
      "amp.sustain": 0,
      "amp.release": 350,
      "amp.velocity": 0.75,
      "modenv.attack": 1,
      "modenv.decay": 250,
      "chorus.on": 1,
      "chorus.mode": 0,
      "reverb.on": 1,
      "reverb.mix": 0.25,
    },
  },

  // ---- BRASS ----

  // Fat analog synth brass section, slow-ish attack swell, drive.
  {
    id: "analog-brass",
    name: "Ana Brass",
    category: "BRASS",
    tags: ["brass", "analog", "poly", "fat"],
    params: {
      "osc1.table": 2, // Saw Harm
      "osc1.pos": 0.4,
      "osc1.level": 0.9,
      "osc2.shape": 2,
      "osc2.fine": -7,
      "osc2.level": 0.85,
      "mixer.osc2": 0.85,
      "filter.mode": 0,
      "filter.cutoff": 1800,
      "filter.resonance": 0.2,
      "filter.envAmt": 0.6,
      "filter.envVel": 0.5,
      "amp.attack": 60,
      "amp.decay": 500,
      "amp.sustain": 0.8,
      "amp.release": 250,
      "modenv.attack": 40,
      "modenv.decay": 400,
      "modenv.sustain": 0.3,
      "matrix.s1.src": 3, // Mod Env
      "matrix.s1.dst": 7, // Cutoff
      "matrix.s1.amt": 0.4,
      "matrix.s1.on": 1,
      "drive.on": 1,
      "drive.amount": 0.3,
      "chorus.on": 1,
      "chorus.mode": 0,
    },
  },

  // Bright stab brass for house/funk, quick and punchy.
  {
    id: "brass-stab",
    name: "Brass Stab",
    category: "BRASS",
    tags: ["brass", "stab", "punchy", "house"],
    params: {
      "osc1.table": 12, // Vintage Hybrid
      "osc1.pos": 0.55,
      "osc2.shape": 2,
      "osc2.fine": 9,
      "osc2.level": 0.8,
      "mixer.osc2": 0.8,
      "sub.wave": 1,
      "sub.level": 0.35,
      "filter.mode": 0,
      "filter.cutoff": 2600,
      "filter.resonance": 0.3,
      "filter.envAmt": 0.7,
      "filter.envVel": 0.6,
      "amp.attack": 5,
      "amp.decay": 350,
      "amp.sustain": 0.5,
      "amp.release": 180,
      "modenv.attack": 1,
      "modenv.decay": 220,
      "matrix.s1.src": 3,
      "matrix.s1.dst": 7,
      "matrix.s1.amt": 0.5,
      "matrix.s1.on": 1,
      "drive.on": 1,
      "drive.amount": 0.4,
      "reverb.on": 1,
      "reverb.mix": 0.18,
    },
  },

  // ---- STRINGS ----

  // Lush ensemble strings, big chorus + hall, slow bow attack.
  {
    id: "ensemble-strings",
    name: "Ensemble",
    category: "STRINGS",
    tags: ["strings", "ensemble", "lush", "chorus"],
    params: {
      "osc1.table": 2, // Saw Harm
      "osc1.pos": 0.3,
      "osc1.level": 0.85,
      "osc2.shape": 2,
      "osc2.fine": -10,
      "osc2.level": 0.8,
      "mixer.osc2": 0.8,
      "filter.mode": 0,
      "filter.cutoff": 3400,
      "filter.resonance": 0.14,
      "amp.attack": 350,
      "amp.decay": 800,
      "amp.sustain": 0.85,
      "amp.release": 1200,
      "lfo1.shape": 0,
      "lfo1.rate": 0.4,
      "lfo1.depth": 0.2,
      "matrix.s1.src": 1,
      "matrix.s1.dst": 7,
      "matrix.s1.amt": 0.12,
      "matrix.s1.on": 1,
      "chorus.on": 1,
      "chorus.mode": 2,
      "chorus.mix": 0.65,
      "reverb.on": 1,
      "reverb.mode": 1, // Hall
      "reverb.size": 0.75,
      "reverb.mix": 0.35,
    },
  },

  // Solo bowed string with vibrato and mono glide for expression.
  {
    id: "solo-strings",
    name: "Solo Str",
    category: "STRINGS",
    tags: ["strings", "solo", "vibrato", "mono"],
    params: {
      "osc1.table": 12, // Vintage Hybrid
      "osc1.pos": 0.25,
      "osc2.shape": 2,
      "osc2.fine": 3,
      "osc2.level": 0.5,
      "mixer.osc2": 0.55,
      "filter.mode": 0,
      "filter.cutoff": 3000,
      "filter.resonance": 0.18,
      "amp.attack": 220,
      "amp.decay": 600,
      "amp.sustain": 0.85,
      "amp.release": 700,
      "lfo1.shape": 0,
      "lfo1.rate": 5.5,
      "lfo1.depth": 0.35,
      "lfo1.fade": 900,
      "matrix.s1.src": 1, // LFO 1
      "matrix.s1.dst": 1, // Pitch
      "matrix.s1.amt": 0.08,
      "matrix.s1.on": 1,
      "voice.mode": 1,
      "voice.glide": 90,
      "voice.legato": 1,
      "reverb.on": 1,
      "reverb.mode": 1,
      "reverb.mix": 0.3,
    },
  },

  // ---- FX ----

  // Sci-fi noise sweep riser, LFO + noise, huge dark reverb.
  {
    id: "noise-riser-fx",
    name: "Riser FX",
    category: "FX",
    tags: ["fx", "riser", "noise", "sweep"],
    params: {
      "osc1.table": 11, // Sweep
      "osc1.pos": 0,
      "osc1.level": 0.5,
      "osc2.shape": 4,
      "osc2.level": 0.3,
      "mixer.osc2": 0.4,
      "noise.type": 0, // White
      "noise.level": 0.6,
      "mixer.noise": 0.7,
      "filter.mode": 1, // Band Pass
      "filter.cutoff": 600,
      "filter.resonance": 0.6,
      "filter.envAmt": 0.9,
      "amp.attack": 3000,
      "amp.decay": 500,
      "amp.sustain": 1,
      "amp.release": 800,
      "modenv.attack": 4000,
      "modenv.decay": 2000,
      "modenv.sustain": 1,
      "matrix.s1.src": 3, // Mod Env
      "matrix.s1.dst": 7, // Cutoff
      "matrix.s1.amt": 0.9,
      "matrix.s1.on": 1,
      "lfo1.shape": 6, // Random
      "lfo1.rate": 8,
      "matrix.s2.src": 1,
      "matrix.s2.dst": 8, // Resonance
      "matrix.s2.amt": 0.3,
      "matrix.s2.on": 1,
      "delay.on": 1,
      "delay.feedback": 0.6,
      "delay.mix": 0.4,
      "reverb.on": 1,
      "reverb.mode": 3, // Dark
      "reverb.size": 1,
      "reverb.mix": 0.6,
    },
  },

  // Metallic ring-mod drone / soundscape, evolving S&H texture.
  {
    id: "ringmod-drone-fx",
    name: "Drone FX",
    category: "FX",
    tags: ["fx", "drone", "ringmod", "texture"],
    params: {
      "osc1.table": 8, // Metallic
      "osc1.pos": 0.4,
      "osc1.warp": 0.7,
      "osc2.shape": 3,
      "osc2.semi": 5,
      "osc2.level": 0.7,
      "mixer.osc2": 0.7,
      "mixer.ring": 0.7,
      "filter.mode": 3, // Notch
      "filter.cutoff": 1200,
      "filter.resonance": 0.4,
      "amp.attack": 1500,
      "amp.decay": 2000,
      "amp.sustain": 0.9,
      "amp.release": 3000,
      "lfo1.shape": 5, // S&H
      "lfo1.rate": 1.2,
      "lfo1.depth": 0.6,
      "matrix.s1.src": 1, // LFO 1
      "matrix.s1.dst": 2, // Osc2 Pitch
      "matrix.s1.amt": 0.4,
      "matrix.s1.on": 1,
      "lfo2.shape": 6, // Random
      "lfo2.rate": 0.6,
      "matrix.s2.src": 2, // LFO 2
      "matrix.s2.dst": 7, // Cutoff
      "matrix.s2.amt": 0.5,
      "matrix.s2.on": 1,
      "delay.on": 1,
      "delay.feedback": 0.55,
      "delay.pingpong": 1,
      "delay.mix": 0.4,
      "reverb.on": 1,
      "reverb.mode": 3,
      "reverb.mix": 0.5,
    },
  },

  // ---- ARP ----

  // Tempo-synced arp stab, tight envelope, synced delay + LFO gate.
  {
    id: "sync-arp",
    name: "Arp Seq",
    category: "ARP",
    tags: ["arp", "sync", "sequence", "pluck"],
    params: {
      "osc1.table": 4, // Pulse Harm
      "osc1.pos": 0.45,
      "osc2.shape": 4, // Pulse
      "osc2.pw": 0.3,
      "osc2.level": 0.6,
      "mixer.osc2": 0.6,
      "sub.wave": 1,
      "sub.level": 0.4,
      "filter.mode": 0,
      "filter.cutoff": 1600,
      "filter.resonance": 0.4,
      "filter.envAmt": 0.7,
      "amp.attack": 1,
      "amp.decay": 200,
      "amp.sustain": 0.2,
      "amp.release": 120,
      "modenv.attack": 1,
      "modenv.decay": 140,
      "modenv.sustain": 0,
      "matrix.s1.src": 3, // Mod Env
      "matrix.s1.dst": 7, // Cutoff
      "matrix.s1.amt": 0.6,
      "matrix.s1.on": 1,
      "lfo1.shape": 4, // Square
      "lfo1.sync": 1,
      "lfo1.div": 6, // 1/16
      "matrix.s2.src": 1, // LFO 1
      "matrix.s2.dst": 9, // Amp
      "matrix.s2.amt": 0.3,
      "matrix.s2.on": 1,
      "delay.on": 1,
      "delay.sync": 1,
      "delay.div": 4, // 1/8
      "delay.feedback": 0.45,
      "delay.pingpong": 1,
      "delay.mix": 0.3,
      "reverb.on": 1,
      "reverb.mix": 0.2,
    },
  },

  // ---- INIT ----

  // Clean initialized patch — all registry defaults, no overrides.
  {
    id: "init-patch",
    name: "Init",
    category: "INIT",
    tags: ["init", "default", "template"],
    params: {},
  },
];
