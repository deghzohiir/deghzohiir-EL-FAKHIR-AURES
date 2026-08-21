import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(here, '../../index.html');
const html = readFileSync(indexPath, 'utf8');

/**
 * Loads index.html in jsdom with its inline scripts executed.
 *
 * Browser APIs the page depends on but jsdom lacks are stubbed before parsing:
 * IntersectionObserver instances are recorded on `observers` so tests can
 * trigger intersections, and `openedUrls` records window.open calls.
 */
export function loadPage({ reducedMotion = false } = {}) {
  const observers = [];
  const openedUrls = [];
  const virtualConsole = new VirtualConsole();

  const dom = new JSDOM(html, {
    url: 'https://example.test/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    resources: undefined,
    virtualConsole,
    beforeParse(window) {
      window.matchMedia = (query) => ({
        media: query,
        matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        onchange: null,
        dispatchEvent: () => false,
      });

      class IntersectionObserverStub {
        constructor(callback, options = {}) {
          this.callback = callback;
          this.options = options;
          this.targets = [];
          observers.push(this);
        }
        observe(target) {
          this.targets.push(target);
        }
        unobserve(target) {
          this.targets = this.targets.filter((t) => t !== target);
        }
        disconnect() {
          this.targets = [];
        }
        takeRecords() {
          return [];
        }
        /** Feeds synthetic entries to the page callback. */
        trigger(entries) {
          this.callback(entries, this);
        }
      }
      window.IntersectionObserver = IntersectionObserverStub;

      window.Element.prototype.scrollTo = function scrollTo(options = {}) {
        if (typeof options.left === 'number') this.scrollLeft = options.left;
        if (typeof options.top === 'number') this.scrollTop = options.top;
      };
      window.Element.prototype.setPointerCapture = () => {};
      window.Element.prototype.releasePointerCapture = () => {};

      window.open = (url, target) => {
        openedUrls.push({ url, target });
        return null;
      };
    },
  });

  return {
    dom,
    window: dom.window,
    document: dom.window.document,
    observers,
    openedUrls,
    /** Returns the observer whose callback watches `target`. */
    observerFor(target) {
      return observers.find((o) => o.targets.includes(target));
    },
    $: (selector) => dom.window.document.querySelector(selector),
    id: (elementId) => dom.window.document.getElementById(elementId),
    close: () => dom.window.close(),
  };
}

/** Dispatches an event of `type` on `target` inside the jsdom window. */
export function fire(window, target, type, init = {}) {
  const event = new window.Event(type, { bubbles: true, cancelable: true, ...init });
  Object.assign(event, init);
  target.dispatchEvent(event);
  return event;
}

/** Yields to the jsdom event loop so timers/rAF callbacks can run. */
export function tick(ms = 0) {
  return new Promise((r) => setTimeout(r, ms));
}
