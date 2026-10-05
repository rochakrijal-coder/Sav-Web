# Savitara website

Custom website exploration for Moon 1. Brand direction: technical precision and calm confidence.

## Workflow

Store source and revision history in this private repository. The current browser prototype is a static site and can be reviewed locally. GitHub repository access alone does not provide a running website preview.

The existing Webflow site remains untouched. A gated Linode deployment workflow is configured; it runs only on `main` when the `LINODE_DEPLOY_ENABLED` repository variable is `true`, and requires the Linode SSH secrets.

## Repository layout

- `src/` contains editable JavaScript source for the Three.js scene.
- `public/` contains the site entry point, styles, runtime assets, and generated scene bundle. This directory is deployed as-is.
- Root-level package files define the build tooling and lock its versions.
- `.github/workflows/` contains the gated Linode deployment workflow.

Run `pnpm install` and `pnpm build` to generate `public/moon-scene.js`. To preview locally, serve `public/` with any static HTTP server; opening the HTML directly as a file may prevent the model from loading.

## Prototype

An opening product scene with a continuous scroll-controlled lighting sequence:

1. Begin with subdued ambient illumination while navigation and essential text remain readable.
2. Gradually increase a directional key light from the upper right.
3. Preserve a defined shadow side.
4. Introduce a softer secondary fill light later in the sequence.
5. Coordinate product detail and typography with the lighting progression.
6. Reverse the sequence when scrolling backward.

Use real product photography or footage where available. Physically convincing relighting requires matching exposures, appropriate footage, or a 3D scene; a gradient overlay alone is not a faithful simulation of light on a face or product.

## Verification before review

- Demonstrate different rendered states at the start, middle, and end of the scroll sequence.
- Verify reverse scrolling, touch scrolling, and resizing.
- Keep links and navigation usable throughout the animation.
- Provide a readable static treatment for reduced-motion preferences.
- Check desktop and mobile browser performance with the actual media assets.
- Clearly identify any placeholder imagery or unimplemented forms.

## Hosting direction

Target Linode after prototype approval. Keep the frontend portable and avoid host-specific dependencies. Server sizing and media delivery will be decided from the finished site's measured needs; the lowest-priced plan is not assumed sufficient for all future workloads.

## Current status

The initial Moon I light-study prototype is implemented. It uses a Three.js model with a poster fallback and scroll-driven lighting, and supports a reduced-motion static state. The deployment workflow is present but remains gated on repository configuration. Verify the page against the checklist above before enabling production deployment.
