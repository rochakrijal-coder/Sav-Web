// Page behaviour for the Savitr I hero: scroll-driven lighting and the colour-temperature slider.
//
// Plain JavaScript, no build step: edit this file directly.
// It works out the lighting state and shares it two ways:
//   1. CSS custom properties on the page (--cct, --ambient, --light-brightness),
//      used by style.css for the glow and the poster image.
//   2. A 'savitara:light' event, which src/light-scene.js listens to for the 3D view.
// The event's `detail` is { progress, exposure, rgb }; see the top of src/light-scene.js.

(() => {
  'use strict';

  // How much of the hero's height you scroll before the lights are fully up.
  const REVEAL_DISTANCE = 0.4;

  // Status line under the description, by stage of the reveal.
  const CAPTIONS = ['The lights are off.', 'Key light coming up.', 'Fill added. The shape is set.'];

  const hero = document.querySelector('.hero');
  const scene = document.querySelector('.light-scene');
  const slider = document.querySelector('#cct');
  const sliderValue = document.querySelector('#cct-value');
  const caption = document.querySelector('#caption');
  const readouts = {
    key: { bar: document.querySelector('#key-bar'), value: document.querySelector('#key-value') },
    fill: { bar: document.querySelector('#fill-bar'), value: document.querySelector('#fill-value') },
  };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const clamp01 = v => Math.max(0, Math.min(1, v));

  // Eases from 0 to 1 as v goes from a to b, starting and ending gently.
  function smoothstep(a, b, v) {
    const t = clamp01((v - a) / (b - a));
    return t * t * (3 - 2 * t);
  }

  // Approximate colour of light at a colour temperature in kelvin, as [r, g, b] from 0 to 255.
  // (Tanner Helland's blackbody fit; accurate enough for a preview.)
  function kelvinToRGB(kelvin) {
    const t = kelvin / 100;
    const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
    const g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755);
    const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
    return [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))));
  }

  let progress = -1; // -1 forces the first update
  let frameQueued = false;

  // Push the current lighting state to the readouts, the CSS and the 3D scene.
  function update() {
    const kelvin = Number(slider.value);
    const rgb = kelvinToRGB(kelvin);
    const exposure = smoothstep(0, 1, progress);
    const key = 0.06 + 0.94 * exposure;  // key light: almost off to full
    const fill = 0.20 + 0.25 * exposure; // fill light: stays softer than the key

    const root = document.documentElement.style;
    root.setProperty('--cct', rgb.join(' '));
    root.setProperty('--ambient', (0.05 + exposure * 0.22).toFixed(4));
    scene.style.setProperty('--light-brightness', (0.12 + 0.88 * exposure).toFixed(4));

    window.savitaraLight = { progress, exposure, rgb };
    window.dispatchEvent(new CustomEvent('savitara:light', { detail: window.savitaraLight }));

    for (const [name, level] of [['key', key], ['fill', fill]]) {
      readouts[name].value.textContent = Math.round(level * 100) + '%';
      readouts[name].bar.style.width = level * 100 + '%';
    }
    sliderValue.textContent = kelvin + ' K';

    const nextCaption = CAPTIONS[progress < 0.2 ? 0 : progress < 0.7 ? 1 : 2];
    if (caption.textContent !== nextCaption) caption.textContent = nextCaption;
  }

  // Work out scroll progress; update only when it actually changed.
  function onFrame() {
    frameQueued = false;
    const scrolled = Math.max(0, -hero.getBoundingClientRect().top);
    const next = reducedMotion.matches ? 1 : clamp01(scrolled / (hero.offsetHeight * REVEAL_DISTANCE));
    if (Math.abs(progress - next) > 0.0001) {
      progress = next;
      update();
    }
  }

  // Scroll events can fire many times per frame; handle at most one per frame.
  function queueFrame() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(onFrame);
  }

  function refresh() {
    progress = -1;
    onFrame();
  }

  document.addEventListener('scroll', queueFrame, { passive: true, capture: true });
  window.addEventListener('resize', refresh);
  window.addEventListener('pageshow', refresh); // also covers returning with the back button
  slider.addEventListener('input', update);
  reducedMotion.addEventListener?.('change', refresh);

  refresh();
})();
