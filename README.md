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
`nisha-sajal-wedding`, and an event field identifying January 31, 2027. They include
the guest's name, attendance, dietary restrictions, and song request. They share
the existing Web3Forms form, recipient, account quota, and retention settings with
Prime Care. Access and export submissions in the existing Web3Forms dashboard;
the wedding site never reads stored submissions. Account retention and delivery
settings cannot be verified from the public submission key. If Trusted Domains
are enabled, allow `rishimaheshwari.github.io` in that form's Web3Forms settings.

The original Prime Care repository and its settings are unchanged.
