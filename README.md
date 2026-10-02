# Abe Deal Report V3a assets

Static files for Abe's Deal Report (WordPress page 7663). This repo is the GitHub Pages host for the scripts. `abe-data.js` is a published snapshot — do not edit deal numbers here.

## Pages base URL

https://bulk-development.github.io/abe-v3a-assets/

## Scripts

Load data first, then the app:

- https://bulk-development.github.io/abe-v3a-assets/abe-data.js
- https://bulk-development.github.io/abe-v3a-assets/abe-v3a.js

```html
<script src="https://bulk-development.github.io/abe-v3a-assets/abe-data.js"></script>
<script src="https://bulk-development.github.io/abe-v3a-assets/abe-v3a.js"></script>
```

`abe-data.js` assigns `window.ABE_DATA`. `abe-v3a.js` reads that object and fills the mount markup (`#abe-v3a`).

## CSS

`abe-v3a.css` is published for convenience. WordPress may still paste it into Elementor Page Custom CSS instead of linking the file.

https://bulk-development.github.io/abe-v3a-assets/abe-v3a.css

## Markup

`mount-markup-only.html` is the Elementor Custom HTML reference (no `<script>` tags). The report page stays on WordPress. This file is not required for Pages.

## Snapshot

Taken from the header of `abe-data.js` (unchanged):

| Field | Value |
|---|---|
| generated_at | 2026-10-02T08:37:42-05:00 |
| deal_count | 54 |
| amount_sum_usd | 163835778.83 |

No secrets. HubSpot record URLs only.
