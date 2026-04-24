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

Current mock data lives in `script.js`.

Event:

- `events` array
- `Upcoming` sorts ascending by date
- `Past` sorts descending by date
- Active/open event section renders when visited/opened

Gallery:

- `galleryCollections` object
- Placeholder structure mirrors future Google Drive folders
- No Google Drive connection is active yet

News:

- `newsItems` array
- `Latest` shows the newest item open
- `Archive` shows the remaining items collapsed

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

It passed after the latest changes.
