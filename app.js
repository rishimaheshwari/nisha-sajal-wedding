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
      const key = Object.keys(data).find(
        (k) => data[k].en === node.textContent.trim(),
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
        ? "लैंसडाउन · ३१ जनवरी २०२७"
        : "Lansdowne · 31 January 2027";
    updateMusicLabel();
    updateRsvpAvailability();
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
const music = new Audio("./assets/music.mp3");
music.loop = true;
music.volume = 0.4;
music.preload = "none";
const musicButton = $("button.fixed");
function updateMusicLabel() {
  musicButton.setAttribute(
    "aria-label",
    language === "hi"
      ? music.paused
        ? "संगीत चलाएँ"
        : "संगीत रोकें"
      : music.paused
        ? "Play music"
        : "Pause music",
  );
  musicButton.setAttribute("aria-pressed", String(!music.paused));
  musicButton.innerHTML = music.paused
    ? '<span aria-hidden="true" style="font-size:23px">♫</span>'
    : '<span aria-hidden="true" style="font-size:20px">Ⅱ</span>';
}
async function playMusic() {
  try {
    await music.play();
  } catch {}
  updateMusicLabel();
}
musicButton.addEventListener("click", () => {
  if (music.paused) playMusic();
  else {
    music.pause();
    updateMusicLabel();
  }
});
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
const countdown = $$("section")[2];
function tick() {
  const total = Math.max(
    0,
    Math.floor((new Date("2027-01-31T14:00:00-05:00") - Date.now()) / 1000),
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
      note.textContent = language === "hi"
        ? "आपका उत्तर शादी के आयोजकों को भेजा जाएगा।"
        : "Your reply will be sent to the wedding organizers.";
      return;
    }
    note.textContent = language === "hi"
      ? "उत्तर इस स्थानीय ऐप में सहेजे जाते हैं।"
      : "Recreated site: replies are saved to this local app.";
    return;
  }
  note.textContent = language === "hi"
    ? "ऑनलाइन RSVP जल्द शुरू होंगे। कृपया बाद में देखें।"
    : "Online RSVPs will open soon. Please check back later.";
  $$("input, select, button", form).forEach(control => control.disabled = true);
  $("[type=submit]", form).textContent = language === "hi"
    ? "RSVP जल्द शुरू होंगे"
    : "RSVPs opening soon";
}
updateRsvpAvailability();
const status = document.createElement("p");
status.setAttribute("role", "status");
status.setAttribute("aria-live", "polite");
form.append(status);
let submitting = false;
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!rsvpEndpoint || submitting || !form.reportValidity()) return;
  if (botcheck.checked) return;
  const data = Object.fromEntries(new FormData(form));
  data.name = data.name.trim();
  if (!data.name) {
    status.textContent = language === "hi" ? "कृपया अपना पूरा नाम दर्ज करें।" : "Please enter your full name.";
    $("[name=name]", form).focus();
    return;
  }
  submitting = true;
  const button = $("[type=submit]", form);
  button.disabled = true;
  button.textContent = language === "hi" ? "भेजा जा रहा है…" : "Sending…";
  status.textContent = "";
  try {
    const payload = isWeb3Forms ? {
      access_key: window.WEDDING_CONFIG.accessKey,
      subject: window.WEDDING_CONFIG.subject,
      from_name: "Nisha & Sajal Wedding",
      name: data.name,
      attending: data.attending,
      dietary_restrictions: data.diet.trim(),
      song_request: data.song.trim(),
      event: "Nisha & Sajal · January 31, 2027",
      source: "nisha-sajal-wedding",
      website: location.origin + location.pathname,
      botcheck: false,
    } : { name: data.name, attending: data.attending, diet: data.diet, song: data.song };
    const response = await fetch(rsvpEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || (isWeb3Forms ? result.success !== true : result.ok !== true))
      throw new Error(language === "hi"
        ? "आपका उत्तर नहीं भेजा जा सका। कृपया दोबारा प्रयास करें।"
        : "Unable to send your reply. Please try again.");
    const card = document.createElement("div");
    card.className = "surface-card mt-9 rounded-sm px-7 py-12 text-center";
    const title = document.createElement("p");
    title.className = "script text-5xl text-gold";
    title.textContent = translations.thankYou?.[language] || "Thank You";
    const message = document.createElement("p");
    message.className = "mt-5 text-sm text-muted-foreground";
    message.textContent = isWeb3Forms
      ? language === "hi"
        ? "आपका उत्तर प्राप्त हो गया है। हमें बताने के लिए धन्यवाद।"
        : "Your reply has been received. Thank you for letting us know."
      : language === "hi"
        ? "आपका उत्तर इस स्थानीय ऐप में सहेज दिया गया है।"
        : "Your reply has been saved to this local app. We cannot wait to celebrate with you.";
    card.append(title, message);
    form.replaceWith(card);
    confetti();
  } catch (error) {
    status.textContent = language === "hi"
      ? "आपका उत्तर नहीं भेजा जा सका। कृपया दोबारा प्रयास करें।"
      : "Unable to send your reply. Please try again.";
    button.disabled = false;
    button.textContent = translations.confirm?.[language] || "Confirm";
  } finally {
    submitting = false;
  }
});
