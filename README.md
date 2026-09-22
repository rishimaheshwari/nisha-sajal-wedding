# Nisha & Sajal wedding recreation

A local recreation of https://nisha-sajal-wedding.vercel.app, using its publicly served page structure, stylesheet, imagery, door video, music, and translations. The interactive JavaScript and local RSVP server have been rebuilt in readable source.

## Run

Requires Node.js 20 or newer. No dependencies or install step required.

```sh
node server.mjs
```

Open http://localhost:5173. Set `PORT` to use another port.

## Features

- Animated invitation doorway and background music toggle
- English/Hindi text switch
- Gold scratch circles, with Enter/Space keyboard support
- Countdown to the celebrations on January 30, 2027 at noon in Virginia
- Venue map link, event dress codes, and RSVP
- RSVP validation, Web3Forms submission on GitHub Pages, and local storage in development
- Scroll reveals, confetti, responsive layout, and reduced-motion support

## Editing

- `index.html`: content and layout
- `app.js`: interactive behavior
- `styles.css`: reference site's compiled stylesheet
- `enhancements.css`: accessibility and small-screen adjustments
- `translations.json`: English/Hindi strings; update matching English HTML when editing a translation
- `assets/`: reference media
- `server.mjs`: static serving and local RSVP endpoint
- `rsvp-config.mjs`: public Web3Forms configuration used by the GitHub Pages build

Local development replies are saved in `data/rsvps.jsonl`. This directory is not publicly served. The development server binds to localhost. The GitHub Pages build sends replies to the existing Web3Forms connection used by `rishimaheshwari/prime-care-senior-services`. Google Fonts requires internet access; other assets are local.

## Verification

JavaScript syntax and HTTP checks cover asset availability, video byte ranges, invalid RSVP rejection, successful local RSVP persistence, and private data isolation. Browser checks cover the door, English/Hindi switching, date reveal, local RSVP submission, and mobile overflow. Web3Forms browser tests intercept requests and simulate success, API rejection, and network failures; they do not send test emails or verify private dashboard records.

## GitHub Pages

The `main` branch deploys automatically through `.github/workflows/pages.yml`.
Run `npm run build` to generate `dist/`. Only public website files are included;
RSVP records and the Node server are excluded. Relative asset paths support a
GitHub Pages project URL. The static version submits directly from the visitor's
browser to Web3Forms using the existing Prime Care form key. That key is a public
submission identifier, not an administrative API secret.

## Wedding submissions

Replies use the subject `Nisha & Sajal Wedding RSVP`, the source field
`nisha-sajal-wedding`, and an event field identifying January 30–31, 2027. They include
the guest's name, attendance, additional guest count, total party size, and song request. They share
the existing Web3Forms form, recipient, account quota, and retention settings with
Prime Care. Access and export submissions in the existing Web3Forms dashboard;
the wedding site never reads stored submissions. Account retention and delivery
settings cannot be verified from the public submission key. If Trusted Domains
are enabled, allow `rishimaheshwari.github.io` in that form's Web3Forms settings.

The original Prime Care repository and its settings are unchanged.

## Event weekend

- January 30, 2027 at noon: Haldi at Terrace Ballroom — Indian / Indo-Western.
- January 30, 2027 in the evening: Sangeet at Clubhouse Ballroom — Western / Indo-Western.
- January 31, 2027 in the morning: Wedding at Clubhouse — Royal Traditionals, followed by lunch.

The original doorway video and soundtrack are unchanged. Event illustrations are
frames extracted at 23s, 31.5s and 42s from the user-supplied WhatsApp invitation
video. Only scene artwork and attire guidance were reused; its other couple's
names, dates, locations and contact details are not included. Event slides use full-width artwork, native scroll snapping and slide-in effects
with a reduced-motion fallback.

The RSVP additional guest count excludes the person submitting. An attending
response with 2 additional guests stores `plus_ones: 2` and `total_guests: 3`.
Declining responses always store zero attendees. No dietary information is collected.

## Full-screen slides and soundtrack

Event scenes now fill the viewport. Native scroll snapping settles on one event
at a time; the rest of the page remains normally scrollable. Each slide also has
a Next link. Small landscape screens can scroll within an oversized slide to
keep all details accessible. Slide motion is disabled for reduced-motion users.

`assets/ns-monogram.svg` contains the new vector monogram. `event-audio.js`
manages a user-enabled soundtrack: Morning for Haldi, Dream Culture for Sangeet, and
Canon in D for Two Harps for the wedding. Music starts only after the invitation or music
button is tapped, and uses 1.8-second crossfades. Muting persists across scrolling.
Event audio is loaded only when needed; the original opening track streams.
Sources, licenses and modifications are documented in `ASSET-CREDITS.md` and
credited in the page footer.

Browser verification covers full-width layouts at desktop and mobile sizes,
scroll snapping, actual audio decoding, crossfade cleanup, mute behavior, and
reduced-motion display.

## RSVP feedback and browser duplicate protection

The button has hover, focus, pressed, and busy styles, with an accessible live
status for sending, success, rejection, and uncertain delivery. A successful
response stores an event-scoped SHA-256 name key in localStorage and includes
`name_key` in the Web3Forms payload. Names use Unicode NFKC normalization,
case folding via lowercase, trimmed edges and collapsed whitespace. Names and
form answers are not kept in browser storage. Confirmation markers are written
only after the provider acknowledges success; failed submissions remain retryable.
Web Locks serialize matching names across tabs where supported.

As requested, this is **same-browser protection**, not a server uniqueness
constraint. It covers confirmed replies submitted after this change. A different
browser, cleared/blocked storage or private browsing can bypass it. Without Web
Locks, simultaneous tabs are not serialized. The local server recomputes and
records the same name key, but does not enforce database uniqueness.

The venue now leads directly to the attendance form; the accommodation and
registry sections have been removed.

Lansdowne Resort names in the event slides and venue heading link to its official
website in a new tab. `music-samples.html` displays the three selected tracks:
Morning (90 seconds) for Haldi, Dream Culture (120 seconds) for Sangeet, and
Canon in D for Two Harps (90 seconds) for the wedding. All three are active on
the invitation. The combined 131.4-second preview uses 1.8-second crossfades,
matching the event player. Each recording has visible attribution and a
full-track link.
