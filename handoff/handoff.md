# Music Angels Hands Website Handoff

## Current Structure

The site is still a static HTML/CSS/JavaScript site:

- `index.html`
- `styles.css`
- `script.js`
- `assets/music-angels-logo.png`

The original single-page layout was changed into a hash-routed structure:

- Top-level menu pages: `HOME`, `ABOUT`, `PROGRAMS`, `EVENT`, `GALLERY`, `NEWS`, `JOIN/VOLUNTEER`
- Each top-level page has a compact sticky submenu.
- Each submenu item now behaves like its own page view. Only the active submenu section is shown.

## Navigation Behavior

Top menu links route to the first submenu item for that section:

- `ABOUT` -> `Mission/Vision`
- `PROGRAMS` -> `Music Journey`
- `EVENT` -> `Upcoming`
- `GALLERY` -> `Current Year`
- `NEWS` -> `Latest`
- `JOIN/VOLUNTEER` -> `How to join`

Routing is implemented with URL hashes in `script.js`.

Examples:

- `#mission-vision`
- `#board`
- `#music-journey`
- `#upcoming-events`
- `#gallery-current`
- `#latest-news`
- `#how-to-join`

## Subpage Display

`.page` elements represent top-level pages.

`.page-section` elements represent submenu pages.

CSS hides all `.page-section` elements by default and only shows the current section with:

```css
.page-section.is-active-subpage
```

This avoids loading or displaying every submenu's content as one long page.

## Header/Submenu Fix

The sticky submenu originally used a fixed `top: 77px`, which caused awkward clipping when the main header height changed.

Current behavior:

- `script.js` measures `.site-header.offsetHeight`
- It writes that value to the CSS variable `--header-height`
- `.sub-nav` uses `top: var(--header-height)`
- The value updates on resize and mobile menu open/close

This keeps short submenu pages from being visually cut off by the top menu.

## Dynamic/Lazy Content Placeholders

Markdown content now loads through the root-level `content-manifest.json`.

The browser cannot reliably list static folders by itself, so the manifest is the source of truth for content files. It intentionally lives outside `contents/` because `contents/` is expected to be deleted and replaced with fresh content. Regenerate the root manifest after replacing, adding, or removing Markdown files:

```sh
node scripts/generate-content-manifest.js
```

Content folders:

- Mission: `contents/mission`
- Board: `contents/board/{year}`
- History: `contents/history`
- Music Journey: `contents/music-journey`
- Music & Beyond: `contents/music-and-beyond`
- Music Biz: `contents/music-biz`
- Caring Angels: `contents/caring-angels`
- Event: `contents/event`
- News: `contents/news`

Markdown titles are read from the first `## Title` line. The renderer also accepts `# Title` as a fallback for existing drafts. If no heading exists, the file name is used as the title.

Missing folders, missing files, and empty sections render as:

```text
No Contents
```

Current rendering rules:

- Mission renders all files in ascending file-name order, showing title and body.
- Board renders year folders in descending order. The newest year starts open, older years start closed. Files render as cards in ascending file-name order.
- History, Music Journey, Music & Beyond, Music Biz, and Caring Angels render files in descending file-name order. The first item starts open, later items start closed.
- Event splits date-named files into Upcoming and Past. Upcoming starts open, Past starts closed. Titles open content in a dialog.
- News renders the latest 10 date-named files as a title list. Older files live under a closed Archive section. Titles open content in a dialog.

Date files should use `YYYYMMDDxxx.md`. The renderer also supports older `MMDDYYYY.md` names while existing content is migrated.

Event:

- Event Markdown is fetched only when the matching open Event section is visited.

Gallery:

- `galleryCollections` object
- Placeholder structure mirrors future Google Drive folders
- No Google Drive connection is active yet

News:

- Latest and Archive are loaded lazily from Markdown.

## Future Architecture Recommendation

If Firebase, Google Drive, Markdown parsing, and page-specific JavaScript grow, do not keep everything in one `script.js`.

Recommended next split:

- `js/router.js`
- `js/events.js`
- `js/news.js`
- `js/gallery.js`
- `js/programs.js`
- `js/firebase.js`
- `js/markdown.js`

Each submenu page should own its own loader/init function so data is fetched only when that submenu view is opened.

## Security Notes

Do not store keys, secrets, service account credentials, private Google Drive tokens, or other sensitive information in this repository.

Firebase client config is usually public configuration, not a secret, but access still must be protected through Firebase Security Rules.

Google Drive API keys and protected folder access should not be trusted in client-side code. If protected access is needed, use a server-side layer such as Firebase Functions.

## Verification Done

The JavaScript syntax was checked with:

```sh
node --check script.js
```

The manifest generator syntax was checked with:

```sh
node --check scripts/generate-content-manifest.js
```

The static server was started with:

```sh
python3 -m http.server 4173
```

Then `index.html`, `content-manifest.json`, and a Markdown file were fetched through `http://localhost:4173/`.

All checks passed after the latest changes.
