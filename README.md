# George Ponce Real Estate — site

Static bilingual site. English at the root, Spanish mirrors under `/es/`
(alquiler, comprar, propietarios, sobre-george, contacto, privacidad).
Built 2026-08-08 from `../design_handoff_george_ponce` (styling source of
truth) and George-Ponce-Design-Brief.md.

## Stack
- Plain HTML + `css/site.css` (all design tokens) + `js/site.js` (nav drawer,
  3-step lead form with localStorage drafts, affordability calculator).
- Netlify: `publish = "."`, one function `netlify/functions/lead-notify.js`
  emails form submissions via Resend. `/api/lead` redirects to it.
- Env vars needed on Netlify: `RESEND_API_KEY`, `LEAD_TO`, `LEAD_FROM`.

## Trusted Network directory
- Public pages: `/network.html` (EN) and `/es/red.html` (ES), both rendered
  by `js/network.js` from the single source file `data/network.json`.
- Manager UI: `/admin/network.html` (noindex, robots-disallowed). Edit
  businesses, then Download network.json and replace `data/network.json`
  (or email it to Anne). Drafts persist in the editor's browser.
- Current list: Hive-Rise + both Sonoran Sun businesses (real, verified
  from their live sites) plus three entries marked Demo pending George's
  real vendor list. Card images live in `img/network/`.

## Local preview
`ponce-site` entry in Hive-Rise `.claude/launch.json` (python http.server,
port 5610). The form's submit will show the graceful error locally because
`/api/lead` only exists on Netlify.

## Before launch (see the George Ponce vault note for the full punchlist)
- Confirm photo/story captions match the real people, and photo releases.
- Confirm the solo-flag portrait is actually George.
- Hero video (poster + play button are a stand-in), real stats, bio review.
- Self-host the two Google Fonts. git init + GitHub + Netlify + domain.
