import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadPage, fire, tick } from './helpers/loadPage.js';

/** jsdom reports zero layout, so cards get explicit geometry. */
function layoutGallery(page, { cardWidth = 300, viewport = 900 } = {}) {
  const scroller = page.id('galleryScroll');
  Object.defineProperty(scroller, 'clientWidth', { value: viewport, configurable: true });
  [...scroller.children].forEach((card, i) => {
    Object.defineProperty(card, 'offsetWidth', { value: cardWidth, configurable: true });
    Object.defineProperty(card, 'offsetLeft', { value: i * cardWidth, configurable: true });
  });
  return scroller;
}

function scrollTo(page, scroller, left) {
  scroller.scrollLeft = left;
  fire(page.window, scroller, 'scroll');
}

describe('gallery carousel', () => {
  let page;
  beforeEach(() => {
    page = loadPage();
  });
  afterEach(() => page.close());

  it('starts on the first slide', () => {
    expect(page.id('galleryCountStart').textContent).toBe('01');
    expect(page.id('galleryCountEnd').textContent).toBe(
      String(page.id('galleryScroll').children.length).padStart(2, '0')
    );
  });

  it('pads the slide counter to two digits as the track scrolls', () => {
    const scroller = layoutGallery(page);

    scrollTo(page, scroller, 0);
    expect(page.id('galleryCountStart').textContent).toBe('02');

    scrollTo(page, scroller, 300);
    expect(page.id('galleryCountStart').textContent).toBe('03');

    scrollTo(page, scroller, 1500);
    expect(page.id('galleryCountStart').textContent).toBe('04');
  });

  it('advances the progress bar proportionally to the active slide', () => {
    const scroller = layoutGallery(page);
    const total = scroller.children.length;

    scrollTo(page, scroller, 0);
    expect(page.id('galleryBar').style.width).toBe(`${(2 / total) * 100}%`);

    scrollTo(page, scroller, 300);
    expect(page.id('galleryBar').style.width).toBe(`${(3 / total) * 100}%`);

    scrollTo(page, scroller, 1500);
    expect(page.id('galleryBar').style.width).toBe('100%');
  });

  it('marks the centred card active and applies a 3D transform to the others', () => {
    const scroller = layoutGallery(page);
    const [first, second] = scroller.children;

    scrollTo(page, scroller, 0);

    expect(second.classList.contains('active')).toBe(true);
    expect(first.classList.contains('active')).toBe(false);
    expect(second.style.transform).toContain('scale(1)');
    expect(first.style.transform).toContain('scale(0.9)');
    expect(first.style.transform).toMatch(/rotateY\([-\d.]+deg\)/);
  });

  it('skips the 3D transform when reduced motion is preferred', () => {
    page.close();
    page = loadPage({ reducedMotion: true });
    const scroller = layoutGallery(page);

    scrollTo(page, scroller, 0);

    expect(scroller.children[1].classList.contains('active')).toBe(true);
    expect(scroller.children[0].style.transform).toBe('');
  });
});

describe('gallery pointer dragging', () => {
  let page;
  let scroller;
  beforeEach(() => {
    page = loadPage();
    scroller = layoutGallery(page);
    scroller.scrollLeft = 500;
  });
  afterEach(() => page.close());

  const down = (button = 0, pointerType = 'mouse') =>
    fire(page.window, scroller, 'pointerdown', { button, pointerType, clientX: 400, pointerId: 1 });
  const move = (clientX) =>
    fire(page.window, scroller, 'pointermove', { clientX, pointerType: 'mouse', pointerId: 1 });

  it('drags the track faster than the pointer travels', () => {
    down();
    expect(scroller.classList.contains('dragging')).toBe(true);

    move(300);

    expect(scroller.scrollLeft).toBe(500 + 100 * 1.15);
  });

  it('stops dragging on pointerup', () => {
    down();
    move(300);

    fire(page.window, scroller, 'pointerup', { pointerId: 1 });
    const afterRelease = scroller.scrollLeft;
    move(100);

    expect(scroller.classList.contains('dragging')).toBe(false);
    expect(scroller.scrollLeft).toBe(afterRelease);
  });

  it('ignores non-primary mouse buttons', () => {
    down(2);
    move(300);

    expect(scroller.classList.contains('dragging')).toBe(false);
    expect(scroller.scrollLeft).toBe(500);
  });

  it('ends the drag when the mouse leaves the track but not on touch', () => {
    down();
    fire(page.window, scroller, 'pointerleave', { pointerType: 'touch', pointerId: 1 });
    expect(scroller.classList.contains('dragging')).toBe(true);

    fire(page.window, scroller, 'pointerleave', { pointerType: 'mouse', pointerId: 1 });
    expect(scroller.classList.contains('dragging')).toBe(false);
  });
});

describe('animated statistic counters', () => {
  let page;
  beforeEach(() => {
    page = loadPage();
  });
  afterEach(() => page.close());

  it('counts up to the target value with a suffix and stops observing', async () => {
    const num = page.$('.num');
    const observer = page.observerFor(num);
    const target = Number(num.dataset.count);
    const suffix = num.dataset.suffix || '';

    observer.trigger([{ target: num, isIntersecting: true }]);
    await tick(1600);

    expect(num.textContent).toBe(target.toLocaleString('en-US') + suffix);
    expect(observer.targets).not.toContain(num);
  });

  it('leaves the counter idle while the stats section is off screen', () => {
    const num = page.$('.num');
    const observer = page.observerFor(num);
    const initial = num.textContent;

    observer.trigger([{ target: num, isIntersecting: false }]);

    expect(num.textContent).toBe(initial);
  });
});

describe('testimonials autoplay', () => {
  let page;
  afterEach(() => page.close());

  it('is disabled when reduced motion is preferred', async () => {
    page = loadPage({ reducedMotion: true });
    const scroller = page.id('testScroll');
    scroller.scrollLeft = 0;

    await tick(200);

    expect(page.id('testProgressBar').style.width).toBe('');
    expect(scroller.scrollLeft).toBe(0);
  });

  it('fills the progress bar while waiting for the next slide', async () => {
    page = loadPage();

    await tick(200);

    const width = parseFloat(page.id('testProgressBar').style.width);
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThan(100);
  });

  it('freezes the progress bar once the user touches the track', async () => {
    page = loadPage();
    const scroller = page.id('testScroll');
    await tick(200);

    fire(page.window, scroller, 'touchstart');
    const frozen = page.id('testProgressBar').style.width;
    await tick(300);

    expect(page.id('testProgressBar').style.width).toBe(frozen);
  });
});
