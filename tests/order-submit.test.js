import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadPage, tick } from './helpers/loadPage.js';

const WHATSAPP_NUMBER = '213778188638';

function fillForm(page, values = {}) {
  const data = {
    'f-name': 'محمد الأمين',
    'f-company': 'شركة الأوراس',
    'f-phone': '0555123456',
    'f-state': 'باتنة',
    'f-city': 'عين التوتة',
    ...values,
  };
  for (const [id, value] of Object.entries(data)) page.id(id).value = value;
  return data;
}

function submit(page) {
  const event = new page.window.Event('submit', { bubbles: true, cancelable: true });
  page.id('orderForm').dispatchEvent(event);
  return event;
}

function openedMessage(page) {
  const { url } = page.openedUrls.at(-1);
  return decodeURIComponent(url.split('?text=')[1]);
}

describe('order form submission', () => {
  let page;
  beforeEach(() => {
    page = loadPage();
  });
  afterEach(() => page.close());

  it('never navigates away from the page', () => {
    fillForm(page);

    const event = submit(page);

    expect(event.defaultPrevented).toBe(true);
  });

  it('shows the success toast and hides it again', async () => {
    fillForm(page);

    submit(page);
    expect(page.id('toast').classList.contains('show')).toBe(true);

    await tick(2700);
    expect(page.id('toast').classList.contains('show')).toBe(false);
  });

  it('clears the entered fields', () => {
    fillForm(page);

    submit(page);

    expect(page.id('f-name').value).toBe('');
    expect(page.id('f-phone').value).toBe('');
    expect(page.id('f-city').value).toBe('');
  });

  it('opens WhatsApp in a new tab with the business number', () => {
    fillForm(page);

    submit(page);

    expect(page.openedUrls).toHaveLength(1);
    const { url, target } = page.openedUrls[0];
    expect(url.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(true);
    expect(target).toBe('_blank');
  });

  it('includes every customer field in the WhatsApp message', () => {
    const data = fillForm(page);

    submit(page);

    const message = openedMessage(page);
    expect(message).toContain(`الاسم الكامل: ${data['f-name']}`);
    expect(message).toContain(`اسم الشركة: ${data['f-company']}`);
    expect(message).toContain(`رقم الهاتف: ${data['f-phone']}`);
    expect(message).toContain(`الولاية: ${data['f-state']}`);
    expect(message).toContain(`المدينة: ${data['f-city']}`);
  });

  it('reports the chosen quantity and total in the WhatsApp message', () => {
    fillForm(page);
    page.id('plusBtn').click();
    page.id('plusBtn').click();

    submit(page);

    const message = openedMessage(page);
    expect(message).toContain('عدد الكراتين: 4');
    expect(message).toContain('السعر الإجمالي: 180,000 دج');
  });

  it('substitutes a dash for an omitted company name', () => {
    fillForm(page, { 'f-company': '   ' });

    submit(page);

    expect(openedMessage(page)).toContain('اسم الشركة: -');
  });

  it('trims surrounding whitespace from the entered values', () => {
    fillForm(page, { 'f-name': '  سعيد  ', 'f-phone': ' 0661000000 ' });

    submit(page);

    const message = openedMessage(page);
    expect(message).toContain('الاسم الكامل: سعيد\n');
    expect(message).toContain('رقم الهاتف: 0661000000\n');
  });
});
