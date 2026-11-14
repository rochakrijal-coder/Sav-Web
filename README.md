# Savitara website

The website for **Savitr I**, Savitara's COB studio light: https://savitara.org

It is a single static page with no framework. The top of the page shows a 3D model of the light. As the visitor scrolls, studio lights come up on it and it turns from the back to the front. Visitors can drag the light to spin it and use a slider to set the color temperature (2700–6500 K), which tints both the 3D lights and the glow behind them.

## Files

```
public/                     Everything in here is uploaded to the server as-is.
  index.html                Page content and structure.
  style.css                 All styling. Colors and spacing are named at the top (:root).
  page.js                   Scroll-driven lighting and the color slider. Plain JS, edit directly.
  light-scene.js            GENERATED from src/light-scene.js by `pnpm build`. Do not edit.
  assets/
    savitr-i.glb            3D model of the light (exported from Blender).
    savitr-i-rear-poster.webp  Still image shown until the 3D model loads, or if WebGL is unavailable.
    archivo.woff2           Archivo variable font (self-hosted; SIL Open Font License).
src/
  light-scene.js            Source for the 3D view (Three.js): camera, studio lights, drag to turn.
archive/                    Earlier prototypes, kept for reference. Not used by the site.
.github/workflows/
  deploy-linode.yml         Uploads public/ to the Linode server on push to main (see Deploying).
```

## How the pieces talk to each other

`page.js` is the only code that reads the scroll position and the slider. On every change it:

1. sets CSS variables on the page (`--cct` light color, `--ambient` glow strength, `--light-brightness` for the poster image), which `style.css` uses; and
2. sends a `savitara:light` event with `{ progress, exposure, rgb }`, which `light-scene.js` listens to and redraws the 3D view.

`light-scene.js` never reads the page directly, so the 3D view can be changed or replaced without touching the scroll logic. If the model or WebGL fails, the poster image stays visible and the page still works.

## Working on it

Requirements: Node.js and pnpm.

```sh
pnpm install          # once
pnpm build            # after editing src/light-scene.js
pnpm preview          # serves public/ at http://localhost:8080
```

Open the page through `pnpm preview` (or any local web server); opening `index.html` directly as a file stops the 3D model from loading.

Edits to `index.html`, `style.css` and `page.js` need no build. When you change any CSS or JS file, bump the `?v=` number on its link in `index.html` so visitors' browsers fetch the new version instead of a cached copy.

### Common changes

- **Text and sections:** `public/index.html`.
- **Colors, fonts, spacing:** the variables at the top of `public/style.css`.
- **How far you scroll before the lights are full, and the status messages:** constants at the top of `public/page.js`.
- **Light brightness, start angle, how far scrolling turns the light, drag feel:** constants and the `draw()` function in `src/light-scene.js`, then `pnpm build`.
- **A new 3D model:** replace `public/assets/savitr-i.glb` (keep the file name, or change `MODEL_URL` in `src/light-scene.js`). The script centers and scales the model automatically. Large models can be compressed with `npx gltf-transform optimize in.glb out.glb --compress meshopt`.

### Before publishing a change, check

- Scrolling down and back up, on desktop and on a phone.
- Dragging the light, and the color slider.
- With "Reduce motion" turned on in the system settings: the page should show the lit, front-facing light without scroll animation.

## Deploying

Pushing to `main` runs `.github/workflows/deploy-linode.yml`, which uploads `public/` to the Linode server and checks that the live `index.html` matches the commit. It only runs when the repository variable `LINODE_DEPLOY_ENABLED` is `true` and the `LINODE_SSH_KEY` and `LINODE_KNOWN_HOSTS` secrets are set.

The upload adds and updates files but does not delete old ones, so files that were renamed or removed stay on the server until someone deletes them there.

## Open items

- The "Reserve your spot" button in the Reserve section is a placeholder (marked with a TODO in `index.html`). It should link to the Webflow pre-order checkout.
- The existing Webflow site is separate and is not changed by this repository.
