import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadPage, fire, tick } from './helpers/loadPage.js';

describe('splash intro', () => {
  let page;
  afterEach(() => page.close());

  it('is dismissed on click and unlocks page scrolling', () => {
    page = loadPage();
    const splash = page.id('splash');
    expect(splash.classList.contains('hide')).toBe(false);

    splash.click();

    expect(splash.classList.contains('hide')).toBe(true);
    expect(page.document.body.classList.contains('locked')).toBe(false);
  });

  it('is dismissed quickly when reduced motion is preferred', async () => {
    page = loadPage({ reducedMotion: true });
    expect(page.id('splash').classList.contains('hide')).toBe(false);

    await tick(300);

    expect(page.id('splash').classList.contains('hide')).toBe(true);
  });

  it('stays hidden when clicked twice', () => {
    page = loadPage();
    const splash = page.id('splash');
    splash.click();
    splash.click();

    expect(splash.className.match(/hide/g)).toHaveLength(1);
  });
});

describe('mobile menu', () => {
  let page;
  beforeEach(() => {
    page = loadPage();
  });
  afterEach(() => page.close());

  const isOpen = (p) =>
    [p.id('menuBtn'), p.id('nav'), p.id('overlay')].map((el) => el.classList.contains('open'));

  it('opens and closes when the burger button is toggled', () => {
    expect(isOpen(page)).toEqual([false, false, false]);

    page.id('menuBtn').click();
    expect(isOpen(page)).toEqual([true, true, true]);

    page.id('menuBtn').click();
    expect(isOpen(page)).toEqual([false, false, false]);
  });

  it('closes when the backdrop overlay is clicked', () => {
    page.id('menuBtn').click();

    page.id('overlay').click();

    expect(isOpen(page)).toEqual([false, false, false]);
  });

  it('closes when any navigation link is followed', () => {
    page.id('menuBtn').click();

    page.$('.nav-link').click();

    expect(isOpen(page)).toEqual([false, false, false]);
  });
});

describe('header and sticky order bar', () => {
  let page;
  beforeEach(() => {
    page = loadPage();
  });
  afterEach(() => page.close());

  it('switches to the scrolled state once the hero leaves the viewport', () => {
    const observer = page.observerFor(page.id('hero'));
    expect(observer).toBeDefined();

    observer.trigger([{ target: page.id('hero'), isIntersecting: false }]);

    expect(page.id('siteHeader').classList.contains('scrolled')).toBe(true);
    expect(page.id('stickyBar').classList.contains('visible')).toBe(true);
  });

  it('returns to the transparent state when the hero is visible again', () => {
    const observer = page.observerFor(page.id('hero'));
    observer.trigger([{ target: page.id('hero'), isIntersecting: false }]);

    observer.trigger([{ target: page.id('hero'), isIntersecting: true }]);

    expect(page.id('siteHeader').classList.contains('scrolled')).toBe(false);
    expect(page.id('stickyBar').classList.contains('visible')).toBe(false);
  });
});

describe('reading progress bar', () => {
  let page;
  beforeEach(() => {
    page = loadPage();
  });
  afterEach(() => page.close());

  it('reflects the scrolled fraction of the document', () => {
    const html = page.document.documentElement;
    Object.defineProperty(html, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(html, 'clientHeight', { value: 1000, configurable: true });
    html.scrollTop = 250;

    page.window.dispatchEvent(new page.window.Event('scroll'));

    expect(page.id('progressFill').style.width).toBe('25%');
  });

  it('stays empty when the document is not scrollable', () => {
    const html = page.document.documentElement;
    Object.defineProperty(html, 'scrollHeight', { value: 800, configurable: true });
    Object.defineProperty(html, 'clientHeight', { value: 800, configurable: true });

    page.window.dispatchEvent(new page.window.Event('scroll'));

    expect(page.id('progressFill').style.width).toBe('0%');
  });
});

describe('button ripple effect', () => {
  let page;
  beforeEach(() => {
    page = loadPage();
  });
  afterEach(() => page.close());

  it('adds a ripple sized to the button and removes it afterwards', async () => {
    const btn = page.$('.rippleable');
    btn.getBoundingClientRect = () => ({ left: 10, top: 20, width: 120, height: 40 });

    fire(page.window, btn, 'click', { clientX: 40, clientY: 30 });

    const ripple = btn.querySelector('.ripple');
    expect(ripple).not.toBeNull();
    expect(ripple.style.width).toBe('120px');
    expect(ripple.style.height).toBe('120px');
    expect(ripple.style.left).toBe('-30px');
    expect(ripple.style.top).toBe('-50px');

    await tick(700);
    expect(btn.querySelector('.ripple')).toBeNull();
  });

  it('centres the ripple for clicks without pointer coordinates', () => {
    const btn = page.$('.rippleable');
    btn.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 50 });

    fire(page.window, btn, 'click');

    const ripple = btn.querySelector('.ripple');
    expect(ripple.style.left).toBe('0px');
    expect(ripple.style.top).toBe('-25px');
  });
});

describe('scroll reveal animations', () => {
  let page;
  beforeEach(() => {
    page = loadPage();
  });
  afterEach(() => page.close());

  it('marks revealed elements in view and stops observing them', () => {
    const target = page.$('.reveal');
    const observer = page.observerFor(target);

    observer.trigger([{ target, isIntersecting: true }]);

    expect(target.classList.contains('in-view')).toBe(true);
    expect(target.classList.contains('drawn')).toBe(true);
    expect(observer.targets).not.toContain(target);
  });

  it('leaves elements untouched while they are off screen', () => {
    const target = page.$('.reveal');
    const observer = page.observerFor(target);

    observer.trigger([{ target, isIntersecting: false }]);

    expect(target.classList.contains('in-view')).toBe(false);
    expect(observer.targets).toContain(target);
  });
});
