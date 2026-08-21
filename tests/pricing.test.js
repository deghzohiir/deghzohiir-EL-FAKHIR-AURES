import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadPage } from './helpers/loadPage.js';

const UNIT_PRICE = 45000;

describe('order quantity and total', () => {
  let page;

  beforeEach(() => {
    page = loadPage();
  });

  afterEach(() => {
    page.close();
  });

  it('starts at two cartons with the matching total', () => {
    expect(page.id('qtyVal').textContent).toBe('2');
    expect(page.id('totalVal').textContent).toBe('90,000 دج');
    expect(page.id('stickyTotal').textContent).toBe('90,000 دج');
    expect(page.id('totalLabel').textContent).toBe('السعر الإجمالي 45,000 دج × 2 كرتون');
  });

  it('increments the quantity and recomputes the total', () => {
    page.id('plusBtn').click();

    expect(page.id('qtyVal').textContent).toBe('3');
    expect(page.id('totalVal').textContent).toBe(`${(UNIT_PRICE * 3).toLocaleString('en-US')} دج`);
    expect(page.id('stickyTotal').textContent).toBe(page.id('totalVal').textContent);
  });

  it('decrements the quantity down to one but never below', () => {
    page.id('minusBtn').click();
    expect(page.id('qtyVal').textContent).toBe('1');
    expect(page.id('totalVal').textContent).toBe('45,000 دج');

    page.id('minusBtn').click();
    expect(page.id('qtyVal').textContent).toBe('1');
    expect(page.id('totalVal').textContent).toBe('45,000 دج');
  });

  it('formats large totals with thousands separators', () => {
    for (let i = 0; i < 20; i++) page.id('plusBtn').click();

    expect(page.id('qtyVal').textContent).toBe('22');
    expect(page.id('totalVal').textContent).toBe('990,000 دج');
  });

  it('animates the quantity and total on user-driven changes only', () => {
    const qtyVal = page.id('qtyVal');
    const totalVal = page.id('totalVal');
    expect(qtyVal.classList.contains('bump')).toBe(false);

    page.id('plusBtn').click();

    expect(qtyVal.classList.contains('bump')).toBe(true);
    expect(totalVal.classList.contains('flash')).toBe(true);
  });

  it('resets the quantity to two after the order form is submitted', () => {
    page.id('plusBtn').click();
    page.id('plusBtn').click();
    expect(page.id('qtyVal').textContent).toBe('4');

    page.id('orderForm').dispatchEvent(
      new page.window.Event('submit', { bubbles: true, cancelable: true })
    );

    expect(page.id('qtyVal').textContent).toBe('2');
    expect(page.id('totalVal').textContent).toBe('90,000 دج');
    expect(page.id('stickyTotal').textContent).toBe('90,000 دج');
  });
});
