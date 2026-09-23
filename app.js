const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let language = "en";
let translations = {};
const textBindings = [];
fetch("./translations.json")
  .then((r) => r.json())
  .then((data) => {
    translations = data;
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest("[data-i18n]")) continue;
      const key = Object.keys(data).find(
        (k) => data[k].en === node.textContent.replace(/\s+/g, " ").trim(),
      );
      if (key) textBindings.push({ node, key });
    }
  })
  .catch(console.error);
const languageButtons = $$(".fixed.top-4 button");
languageButtons.forEach((button, index) =>
  button.addEventListener("click", () => {
    language = index ? "hi" : "en";
    document.documentElement.lang = language;
    for (const { node, key } of textBindings)
      node.textContent = translations[key][language];
    $$("[data-i18n]").forEach((el) => {
      const entry = translations[el.dataset.i18n];
      if (entry) el.textContent = entry[language];
    });
    languageButtons.forEach((b, i) => {
      b.setAttribute("aria-pressed", String(index === i));
      b.style.background = index === i ? "#1E2A4F" : "transparent";
      b.style.color = index === i ? "#FFFFFF" : "#1E2A4F";
    });
    const labels =
      language === "hi" ? ["जनवरी", "३१", "२०२७"] : ["January", "31", "2027"];
    $$("canvas").forEach((c, i) => {
      $("span", c.parentElement).textContent = labels[i];
    });
    $("footer .eyebrow").textContent =
      language === "hi"
        ? "लैंसडाउन · ३०–३१ जनवरी २०२७"
        : "Lansdowne · 30–31 January 2027";
    updateMusicLabel();
    updateRsvpAvailability();
    renderRsvpState();
  }),
);
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 },
);
$$(".reveal").forEach((el) => observer.observe(el));
const eventChapters = $$(".event-chapter");
const rsvpSection = $("#rsvp");
const musicButton = $("#music-toggle");
const musicDock = $("#music-dock");
const musicContext = $("#music-context");
const soundtrack = new EventSoundtrack(updateMusicLabel);
function updateMusicLabel() {
  const playing = soundtrack.enabled;
  const labels =
    language === "hi"
      ? {
          welcome: "निमंत्रण",
          haldi: "हल्दी · वे कमलेया",
          sangeet: "संगीत · पियानो",
          wedding: "विवाह · हार्प",
          rsvp: "उपस्थिति · ओ सजनी रे",
        }
      : {
          welcome: "Invitation",
          haldi: "Haldi · Ve Kamleya",
          sangeet: "Sangeet · Piano",
          wedding: "Wedding · Harps",
          rsvp: "RSVP · O Sajni Re",
        };
  musicButton.setAttribute(
    "aria-label",
    language === "hi"
      ? playing
        ? "संगीत रोकें"
        : "संगीत चलाएँ"
      : playing
        ? "Pause music"
        : "Play music",
  );
  musicButton.setAttribute("aria-pressed", String(playing));
  musicButton.innerHTML = playing
    ? '<span aria-hidden="true">Ⅱ</span>'
    : '<span aria-hidden="true" style="font-size:20px">♫</span>';
  musicContext.textContent = soundtrack.failed
    ? language === "hi"
      ? "फिर से चलाएँ"
      : "Tap to retry"
    : !playing
      ? language === "hi"
        ? "संगीत बंद"
        : "Music off"
      : soundtrack.loading
        ? language === "hi"
          ? "संगीत लोड हो रहा है…"
          : "Loading music…"
        : soundtrack.backgroundMusic?.title || labels[soundtrack.scene];
  musicDock.dataset.scene = soundtrack.scene;
  musicDock.dataset.playing = String(playing);
  musicDock.dataset.loading = String(soundtrack.loading);
}
function playMusic() {
  return soundtrack.enable();
}
musicButton.addEventListener("click", () =>
  soundtrack.enabled ? soundtrack.stop() : playMusic(),
);
updateMusicLabel();
let sceneFrame = false;
function updateActiveScene() {
  const middle = innerHeight * 0.5;
  let active = null;
  eventChapters.forEach((chapter) => {
    const rect = chapter.getBoundingClientRect();
    const visible =
      rect.top < innerHeight * 0.75 && rect.bottom > innerHeight * 0.25;
    chapter.classList.toggle("in-view", visible);
    if (rect.top <= middle && rect.bottom > middle) active = chapter;
  });
  document.documentElement.classList.toggle("snap-events", Boolean(active));
  let scene = active?.id || "welcome";
  if (!active && eventChapters.at(-1).getBoundingClientRect().bottom <= middle)
    scene = "wedding";
  if (!active && rsvpSection.getBoundingClientRect().top <= middle)
    scene = "rsvp";
  soundtrack.setScene(scene);
  sceneFrame = false;
}
function requestSceneUpdate() {
  if (!sceneFrame) {
    sceneFrame = true;
    requestAnimationFrame(updateActiveScene);
  }
}
window.addEventListener("scroll", requestSceneUpdate, { passive: true });
window.addEventListener("resize", requestSceneUpdate);
window.addEventListener("pageshow", requestSceneUpdate);
updateActiveScene();
const hero = $("section");
const doorButton = $("button", hero);
doorButton.addEventListener("click", async () => {
  doorButton.disabled = true;
  hero.classList.add("door-open");
  doorButton.style.opacity = 0;
  doorButton.style.pointerEvents = "none";
  const video = $("video", hero);
  video.style.opacity = 1;
  $("img", hero).style.opacity = 0;
  playMusic();
  let failed = false;
  try {
    await video.play();
  } catch {
    failed = true;
    $("img", hero).style.opacity = 1;
  }
  setTimeout(
    () => {
      $$(".z-25, .z-30", hero).forEach((el) => {
        el.style.opacity = 1;
        el.style.transform = "none";
      });
    },
    reducedMotion || failed ? 0 : 6000,
  );
  setTimeout(
    () => {
      if (window.scrollY < hero.clientHeight / 2)
        $("#intro").scrollIntoView({
          behavior: reducedMotion ? "instant" : "smooth",
        });
    },
    reducedMotion || failed ? 1200 : 11000,
  );
});
const countdown = $("#countdown");
function tick() {
  const total = Math.max(
    0,
    Math.floor((new Date("2027-01-30T12:00:00-05:00") - Date.now()) / 1000),
  );
  const values = [
    Math.floor(total / 86400),
    Math.floor(total / 3600) % 24,
    Math.floor(total / 60) % 60,
    total % 60,
  ];
  $$(".tabular-nums", countdown).forEach(
    (el, i) => (el.textContent = String(values[i]).padStart(2, "0")),
  );
}
tick();
setInterval(tick, 1000);
let revealed = 0;
$$("canvas").forEach((canvas, index) => {
  const size = 116,
    ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = canvas.height = size * ratio;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.scale(ratio, ratio);
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  [
    [0, "#f0dca4"],
    [0.35, "#c9a44c"],
    [0.55, "#f7ecc8"],
    [0.8, "#b8902f"],
    [1, "#e2c67d"],
  ].forEach(([stop, color]) => gradient.addColorStop(stop, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = i % 2 ? "#fff" : "#8a6a1c";
    ctx.fillRect(
      Math.random() * size,
      Math.random() * size,
      Math.random() * 14 + 2,
      1,
    );
  }
  ctx.globalAlpha = 1;
  let down = false,
    last = null,
    done = false;
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "button");
  canvas.setAttribute(
    "aria-label",
    `Reveal date ${["month", "day", "year"][index]}`,
  );
  function complete() {
    if (done) return;
    done = true;
    revealed++;
    canvas.style.opacity = 0;
    canvas.style.pointerEvents = "none";
    canvas.setAttribute(
      "aria-label",
      $("span", canvas.parentElement).textContent,
    );
    if (revealed === 3) {
      const date = $("#intro .text-gold");
      date.style.opacity = 1;
      date.style.transform = "none";
      confetti();
    }
  }
  canvas.addEventListener("keydown", (e) => {
    if (["Enter", " "].includes(e.key)) {
      e.preventDefault();
      complete();
    }
  });
  function draw(e) {
    const bounds = canvas.getBoundingClientRect();
    const p = {
      x: ((e.clientX - bounds.left) * size) / bounds.width,
      y: ((e.clientY - bounds.top) * size) / bounds.height,
    };
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = 30;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (last) {
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
    ctx.fill();
    last = p;
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (done) return;
    down = true;
    last = null;
    canvas.setPointerCapture(e.pointerId);
    draw(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (down && !done) draw(e);
  });
  function finish() {
    down = false;
    last = null;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let empty = 0,
      count = 0;
    for (let i = 3; i < pixels.length; i += 96) {
      count++;
      if (pixels[i] < 40) empty++;
    }
    if (empty / count > 0.5) complete();
  }
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
});
function confetti() {
  if (reducedMotion) return;
  const wrap = document.createElement("div");
  wrap.className = "celebration-confetti";
  wrap.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    Object.assign(piece.style, {
      left: `${Math.random() * 100}%`,
      backgroundColor: ["#d4af37", "#1e2a4f", "#c77088", "#fff"][i % 4],
      animationDelay: `${Math.random() * 2}s`,
      animationDuration: `${4 + Math.random() * 3}s`,
    });
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 160}px`);
    wrap.append(piece);
  }
  document.body.append(wrap);
  setTimeout(() => wrap.remove(), 9000);
}
const form = $("form");
const note = document.createElement("p");
note.className = "text-xs text-muted-foreground";
form.append(note);
const rsvpEndpoint = window.WEDDING_CONFIG?.rsvpEndpoint;
const attendanceInput = $("[name=attending]", form);
const plusOnesInput = $("[name=plusOnes]", form);
attendanceInput.addEventListener("change", () => {
  const notAttending = attendanceInput.value === "No";
  if (notAttending) plusOnesInput.value = "0";
  plusOnesInput.disabled = notAttending;
});
const isWeb3Forms = window.WEDDING_CONFIG?.rsvpProvider === "web3forms";
const botcheck = document.createElement("input");
botcheck.type = "checkbox";
botcheck.name = "botcheck";
botcheck.tabIndex = -1;
botcheck.autocomplete = "off";
botcheck.hidden = true;
botcheck.setAttribute("aria-hidden", "true");
form.append(botcheck);
function updateRsvpAvailability() {
  if (rsvpEndpoint) {
    if (isWeb3Forms) {
      note.textContent =
        language === "hi"
          ? "आपका उत्तर शादी के आयोजकों को भेजा जाएगा।"
          : "Your reply will be sent to the wedding organizers.";
      return;
    }
    note.textContent =
      language === "hi"
        ? "उत्तर इस स्थानीय ऐप में सहेजे जाते हैं।"
        : "Recreated site: replies are saved to this local app.";
    return;
  }
  note.textContent =
    language === "hi"
      ? "ऑनलाइन RSVP जल्द शुरू होंगे। कृपया बाद में देखें।"
      : "Online RSVPs will open soon. Please check back later.";
  $$("input, select, button", form).forEach(
    (control) => (control.disabled = true),
  );
  $("[type=submit]", form).textContent =
    language === "hi" ? "RSVP जल्द शुरू होंगे" : "RSVPs opening soon";
}
updateRsvpAvailability();
const status = document.createElement("p");
status.id = "rsvp-status";
status.className = "rsvp-status";
status.setAttribute("role", "status");
status.setAttribute("aria-live", "polite");
status.setAttribute("aria-atomic", "true");
form.insertBefore(status, note);
const submitButton = $("[type=submit]", form);
const nameInput = $("[name=name]", form);
const confirmedNames = new Set();
const receiptPrefix = "nisha-sajal:rsvp:confirmed:v1:";
let submitting = false;
let rsvpState = "idle";
let successTitle;
const rsvpCopy = {
  en: {
    idle: ["Confirm", ""],
    checking: ["Checking…", "Checking your RSVP…"],
    sending: ["Sending…", "Sending your RSVP. Please keep this page open."],
    slow: ["Sending…", "Still sending your RSVP. Please keep this page open."],
    error: ["Try again", "Unable to send your reply. Please check your connection and try again."],
    uncertain: ["Try again", "We couldn’t confirm delivery. Please check with the wedding organizers before trying again."],
    duplicate: ["Already received", "An RSVP for this name has already been received in this browser. Please contact the wedding organizers if you need to make a change."],
    invalid: ["Confirm", "Please complete the required fields before sending your RSVP."],
    invalidName: ["Confirm", "Please enter your full name."],
    invalidGuests: ["Confirm", "Please enter a whole number of additional guests from 0 to 99."],
    success: ["RSVP received", "Your reply has been received. Thank you for letting us know."],
  },
  hi: {
    idle: ["पुष्टि करें", ""],
    checking: ["जाँच हो रही है…", "आपके RSVP की जाँच हो रही है…"],
    sending: ["भेजा जा रहा है…", "आपका RSVP भेजा जा रहा है। कृपया यह पेज खुला रखें।"],
    slow: ["भेजा जा रहा है…", "आपका RSVP अभी भेजा जा रहा है। कृपया यह पेज खुला रखें।"],
    error: ["फिर कोशिश करें", "आपका उत्तर नहीं भेजा जा सका। कृपया अपना इंटरनेट कनेक्शन जाँचें और दोबारा प्रयास करें।"],
    uncertain: ["फिर कोशिश करें", "आपके उत्तर की पुष्टि नहीं हो सकी। दोबारा भेजने से पहले कृपया शादी के आयोजकों से संपर्क करें।"],
    duplicate: ["उत्तर प्राप्त हो चुका है", "इस नाम का RSVP इस ब्राउज़र से पहले ही प्राप्त हो चुका है। बदलाव के लिए कृपया शादी के आयोजकों से संपर्क करें।"],
    invalid: ["पुष्टि करें", "कृपया RSVP भेजने से पहले सभी आवश्यक जानकारी भरें।"],
    invalidName: ["पुष्टि करें", "कृपया अपना पूरा नाम दर्ज करें।"],
    invalidGuests: ["पुष्टि करें", "कृपया ० से ९९ तक अतिरिक्त मेहमानों की सही संख्या दर्ज करें।"],
    success: ["RSVP प्राप्त हुआ", "आपका उत्तर प्राप्त हो गया है। हमें बताने के लिए धन्यवाद।"],
  },
};
function renderRsvpState() {
  const [label, message] = rsvpCopy[language][rsvpState];
  if (rsvpEndpoint) submitButton.textContent = label;
  status.textContent = message;
  status.dataset.state = rsvpState;
  submitButton.dataset.state = rsvpState;
  submitButton.disabled = !rsvpEndpoint || submitting || rsvpState === "duplicate";
  submitButton.setAttribute("aria-busy", String(submitting));
  form.setAttribute("aria-busy", String(submitting));
  if (successTitle)
    successTitle.textContent = translations.thankYou?.[language] || "Thank You";
}
function setRsvpState(state) {
  rsvpState = state;
  renderRsvpState();
}
function wasConfirmed(key) {
  try {
    return confirmedNames.has(key) || localStorage.getItem(receiptPrefix + key) === "1";
  } catch {
    return confirmedNames.has(key);
  }
}
function rememberConfirmation(key) {
  confirmedNames.add(key);
  // Only store a hash, never the guest's name or their form answers.
  try { localStorage.setItem(receiptPrefix + key, "1"); } catch {}
}
nameInput.addEventListener("input", () => {
  if (!submitting && rsvpState !== "idle") setRsvpState("idle");
});
form.addEventListener("invalid", () => {
  if (!submitting) setRsvpState("invalid");
}, true);
renderRsvpState();
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!rsvpEndpoint || submitting || !form.reportValidity() || botcheck.checked) return;
  const data = Object.fromEntries(new FormData(form));
  data.name = data.name.trim();
  const plusOnes = data.attending === "Yes" ? Number(data.plusOnes) : 0;
  if (!Number.isInteger(plusOnes) || plusOnes < 0 || plusOnes > 99) {
    setRsvpState("invalidGuests");
    return;
  }
  const totalGuests = data.attending === "Yes" ? plusOnes + 1 : 0;
  if (!data.name) {
    setRsvpState("invalidName");
    nameInput.focus();
    return;
  }
  submitting = true;
  setRsvpState("checking");
  const controls = $$("input, select", form).map((control) => [control, control.disabled]);
  controls.forEach(([control]) => { control.disabled = true; });
  let slowTimer;
  let timeoutTimer;
  let requestStarted = false;
  let responseReceived = false;
  try {
    const { createNameKey } = await import("./rsvp-identity.mjs");
    const nameKey = await createNameKey(data.name);
    async function sendReply() {
      // Check inside the cross-tab lock so two tabs cannot both send the same name.
      if (wasConfirmed(nameKey)) {
        setRsvpState("duplicate");
        return;
      }
      setRsvpState("sending");
      const payload = isWeb3Forms
        ? {
            access_key: window.WEDDING_CONFIG.accessKey,
            subject: window.WEDDING_CONFIG.subject,
            from_name: "Nisha & Sajal Wedding",
            name: data.name,
            name_key: nameKey,
            attending: data.attending,
            plus_ones: plusOnes,
            total_guests: totalGuests,
            song_request: data.song.trim(),
            event: "Nisha & Sajal · January 30–31, 2027",
            source: "nisha-sajal-wedding",
            website: location.origin + location.pathname,
            botcheck: false,
          }
        : { name: data.name, nameKey, attending: data.attending, plusOnes, song: data.song };
      const controller = new AbortController();
      slowTimer = setTimeout(() => setRsvpState("slow"), 10000);
      timeoutTimer = setTimeout(() => controller.abort(), 30000);
      requestStarted = true;
      const response = await fetch(rsvpEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const result = await response.json();
      responseReceived = true;
      if (!response.ok || (isWeb3Forms ? result.success !== true : result.ok !== true))
        throw new Error("RSVP rejected");
      rememberConfirmation(nameKey);
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
      submitting = false;
      setRsvpState("success");
      const card = document.createElement("div");
      card.id = "rsvp-confirmation";
      card.className = "surface-card mt-9 rounded-sm px-7 py-12 text-center";
      card.tabIndex = -1;
      card.setAttribute("aria-labelledby", "rsvp-success-title");
      successTitle = document.createElement("p");
      successTitle.id = "rsvp-success-title";
      successTitle.className = "script text-5xl text-gold";
      successTitle.textContent = translations.thankYou?.[language] || "Thank You";
      const check = document.createElement("span");
      check.className = "rsvp-success-check";
      check.setAttribute("aria-hidden", "true");
      check.textContent = "✓";
      card.append(check, successTitle, status);
      form.replaceWith(card);
      card.focus({ preventScroll: true });
      confetti();
    }
    if (navigator.locks?.request) {
      await navigator.locks.request(receiptPrefix + nameKey, sendReply);
    } else {
      await sendReply();
    }
  } catch {
    setRsvpState(requestStarted && !responseReceived ? "uncertain" : "error");
  } finally {
    clearTimeout(slowTimer);
    clearTimeout(timeoutTimer);
    controls.forEach(([control, disabled]) => { control.disabled = disabled; });
    submitting = false;
    renderRsvpState();
  }
});
