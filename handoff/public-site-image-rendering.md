# Public Website Image Rendering Handoff

## Context

The CMS image editor now supports multiple images in one image block and per-image display sizes.

The CMS saves content as Markdown so the public website can keep using the existing content pipeline. Image layout metadata is stored in a small HTML comment immediately after each Markdown image.

## Markdown Format

Default image, 33% width:

```md
![](../assets/example.jpg)
```

Custom image widths:

```md
![](../assets/example.jpg) <!-- cms:image-size=25 -->
![](../assets/example.jpg) <!-- cms:image-size=50 -->
![](../assets/example.jpg) <!-- cms:image-size=100 -->
```

Supported size values:

```text
25  -> quarter width
33  -> one third width, default when no comment exists
50  -> half width
100 -> full width
```

Adjacent image lines belong to one image grid:

```md
![](../assets/a.jpg) <!-- cms:image-size=50 -->
![](../assets/b.jpg) <!-- cms:image-size=50 -->
![](../assets/c.jpg)
```

## Rendering Rule

When the public website renders Markdown:

1. Detect consecutive image-only lines.
2. Wrap that run in a grid container.
3. Parse optional `cms:image-size` comments.
4. Remove the CMS comment from visible output.
5. Apply responsive grid sizing.

Recommended desktop mapping:

```text
25  -> grid-column: span 3
33  -> grid-column: span 4
50  -> grid-column: span 6
100 -> grid-column: 1 / -1
```

Recommended mobile behavior:

```css
grid-column: 1 / -1;
```

## Regex

Use this to identify image lines and extract metadata:

```js
const imageLinePattern =
  /^!\[([^\]]*)\]\(([^)]+)\)(?:\s*<!--\s*cms:image-size=(25|33|50|100)\s*-->)?$/;
```

Capture groups:

```text
1 -> alt/caption text
2 -> image URL/path
3 -> optional size value
```

If group 3 is missing, treat it as `33`.

## Example HTML Output

```html
<div class="content-image-grid">
  <figure class="content-image content-image--50">
    <img src="../assets/a.jpg" alt="">
  </figure>
  <figure class="content-image content-image--50">
    <img src="../assets/b.jpg" alt="">
  </figure>
  <figure class="content-image content-image--33">
    <img src="../assets/c.jpg" alt="">
  </figure>
</div>
```

## Suggested CSS

```css
.content-image-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 0;
}

.content-image {
  margin: 0;
}

.content-image--25 {
  grid-column: span 3;
}

.content-image--33 {
  grid-column: span 4;
}

.content-image--50 {
  grid-column: span 6;
}

.content-image--100 {
  grid-column: 1 / -1;
}

.content-image img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 6px;
}

@media (max-width: 760px) {
  .content-image {
    grid-column: 1 / -1;
  }
}
```

## Important Notes

- The CMS intentionally does not show uploaded file names as captions.
- Empty alt text is valid and expected for newly uploaded images.
- The CMS uses authenticated `/api/asset?path=...` URLs only inside the private editor.
- Saved Markdown uses relative asset paths, for example `../assets/image.jpg`, so the public website should resolve paths relative to the Markdown file location.
- If the public website's Markdown parser preserves HTML comments, strip `<!-- cms:image-size=... -->` before final display.

## CMS Files That Define This Format

- `src/frontend/app.ts`
  - `parseImageMarkdownLine`
  - `imageSizeComment`
  - `imageSizeToGridColumn`
  - `renderMarkdown`
