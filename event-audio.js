// A user-enabled soundtrack that plays continuously across all scenes.
// Event buffers play through the already-unlocked AudioContext on mobile.
class EventSoundtrack {
  constructor(onChange) {
    this.onChange = onChange;
    this.enabled = false;
    this.scene = "welcome";
    this.currentScene = null;
    this.loading = false;
    this.failed = false;
    this.revision = 0;
    this.voices = new Map();
    this.buffers = new Map();
    const configuredMusic = window.WEDDING_CONFIG?.backgroundMusic;
    this.backgroundMusic = configuredMusic?.src
      ? configuredMusic
      : { src: "./assets/rsvp-sajni-re.mp3" };
    this.welcomeAudio = new Audio(this.backgroundMusic.src);
    this.welcomeAudio.loop = true;
    this.welcomeAudio.preload = "none";
  }
  async enable() {
    this.enabled = true;
    this.failed = false;
    this.onChange();
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!this.context) {
        this.context = new AudioContextClass();
        this.welcomeSource = this.context.createMediaElementSource(
          this.welcomeAudio,
        );
      }
      // Resume is invoked directly by the visitor's click, before loading files.
      await this.context.resume();
      if (this.enabled) await this.transition(this.scene);
    } catch {
      this.stop();
      this.failed = true;
      this.onChange();
    }
  }
  setScene(scene) {
    if (this.scene === scene) return;
    this.scene = scene;
    this.onChange();
    if (this.enabled) this.transition(scene);
  }
  async buffer(scene) {
    if (!this.buffers.has(scene)) {
      const filename = { sajni: "rsvp-sajni-re.mp3" }[scene];
      const promise = fetch(`./assets/${filename}`)
        .then((response) => {
          if (!response.ok) throw new Error("Audio unavailable");
          return response.arrayBuffer();
        })
        .then((data) => this.context.decodeAudioData(data))
        .catch((error) => {
          this.buffers.delete(scene);
          throw error;
        });
      this.buffers.set(scene, promise);
    }
    return this.buffers.get(scene);
  }
  ramp(voice, value, seconds) {
    const gain = voice.gain.gain,
      now = this.context.currentTime;
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
    else {
      const present = gain.value;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(present, now);
    }
    gain.linearRampToValueAtTime(value, now + seconds);
  }
  dispose(scene, voice) {
    clearTimeout(voice.timer);
    if (scene === "welcome") {
      this.welcomeAudio.pause();
      this.welcomeSource.disconnect(voice.gain);
    } else {
      try {
        voice.source.stop();
      } catch {}
      voice.source.disconnect();
    }
    voice.gain.disconnect();
    if (this.voices.get(scene) === voice) this.voices.delete(scene);
  }
  async transition(scene) {
    // Keep one voice per recording so adjacent slides never restart the music.
    const audioScene = this.backgroundMusic?.src || ["welcome", "haldi"].includes(scene)
      ? "welcome"
      : "sajni";
    const revision = ++this.revision;
    this.loading = true;
    this.failed = false;
    this.onChange();
    try {
      let voice = this.voices.get(audioScene);
      const buffer =
        audioScene === "welcome" || voice ? null : await this.buffer(audioScene);
      if (revision !== this.revision || !this.enabled) return;
      if (!voice) {
        const gain = this.context.createGain();
        gain.gain.value = 0;
        gain.connect(this.context.destination);
        const source =
          audioScene === "welcome"
            ? this.welcomeSource
            : this.context.createBufferSource();
        if (audioScene !== "welcome") {
          source.buffer = buffer;
          source.loop = true;
        }
        source.connect(gain);
        voice = { gain, source, timer: null };
        this.voices.set(audioScene, voice);
        if (audioScene !== "welcome") source.start();
      }
      clearTimeout(voice.timer);
      if (audioScene === "welcome") await this.welcomeAudio.play();
      if (revision !== this.revision || !this.enabled) {
        // A later transition or mute owns cleanup of an existing voice.
        if (!this.enabled && this.voices.get(audioScene) === voice)
          this.dispose(audioScene, voice);
        return;
      }
      const duration = 1.8;
      this.ramp(voice, 0.7, duration);
      for (const [key, other] of this.voices) {
        if (key === audioScene) continue;
        clearTimeout(other.timer);
        this.ramp(other, 0, duration);
        other.timer = setTimeout(
          () => this.dispose(key, other),
          duration * 1000 + 80,
        );
      }
      this.currentScene = scene;
      this.loading = false;
      this.onChange();
    } catch {
      if (revision !== this.revision) return;
      this.stop();
      this.failed = true;
      this.onChange();
    }
  }
  stop() {
    this.enabled = false;
    this.loading = false;
    this.revision++;
    for (const [key, voice] of this.voices) this.dispose(key, voice);
    this.welcomeAudio.pause();
    this.currentScene = null;
    this.onChange();
  }
}
window.EventSoundtrack = EventSoundtrack;
