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
- Countdown to January 31, 2027 at 2 PM in Virginia
- Venue map link, accommodation, dress code, and registry sections
- RSVP validation and persistent local storage
- Scroll reveals, confetti, responsive layout, and reduced-motion support

## Editing

- `index.html`: content and layout
- `app.js`: interactive behavior
- `styles.css`: reference site's compiled stylesheet
- `enhancements.css`: accessibility and small-screen adjustments
- `translations.json`: English/Hindi strings; update matching English HTML when editing a translation
- `assets/`: reference media
- `server.mjs`: static serving and local RSVP endpoint

RSVP replies are saved in `data/rsvps.jsonl`. This directory is not publicly served. This recreation does not send replies to the original wedding organizers. The server binds to localhost and is intended for local use; public deployment needs an appropriate hosting and durable storage setup. Google Fonts requires internet access; other assets are local.

## Verification

JavaScript syntax and HTTP checks cover asset availability, video byte ranges, invalid RSVP rejection, successful RSVP persistence, and private data isolation. Browser checks cover the door, English/Hindi switching, date reveal, local RSVP submission, and mobile overflow.

## GitHub Pages

The `main` branch deploys automatically through `.github/workflows/pages.yml`.
Run `npm run build` to generate `dist/`. Only public website files are included;
RSVP records and the Node server are excluded. Relative asset paths support a
GitHub Pages project URL. The static version displays “RSVPs opening soon” and
disables submissions because GitHub Pages cannot host the local RSVP API.
