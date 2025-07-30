import { test, expect } from '@playwright/test';

interface Summary {
  formsFilled: number;
  buttonsClicked: number;
  errors: string[];
}

test('traverse app and interact', async ({ page, baseURL }) => {
  const startUrl = baseURL || 'http://localhost:5173';
  const visited = new Set<string>();
  const summary: Summary = { formsFilled: 0, buttonsClicked: 0, errors: [] };

  page.on('pageerror', (err) => {
    console.error('Console error:', err.message);
    summary.errors.push(`console error: ${err.message}`);
  });
  page.on('requestfailed', (req) => {
    const msg = `request failed: ${req.url()} - ${req.failure()?.errorText}`;
    console.error(msg);
    summary.errors.push(msg);
  });

  await page.goto(startUrl);

  const navLinks = await page.locator('a[href]').all();
  const urls: string[] = [];
  for (const link of navLinks) {
    const href = await link.getAttribute('href');
    if (!href || href.startsWith('#')) continue;
    const url = new URL(href, startUrl).toString();
    if (!visited.has(url)) {
      urls.push(url);
      visited.add(url);
    }
  }

  urls.unshift(startUrl);

  for (const url of urls) {
    await page.goto(url);

    const buttons = page.locator('button:visible');
    for (let i = 0; i < await buttons.count(); i++) {
      const btn = buttons.nth(i);
      const label = (await btn.innerText()).trim();
      if (/logout|delete|remove|destroy/i.test(label)) continue;
      try {
        await btn.click({ force: true });
        summary.buttonsClicked++;
      } catch (e) {
        const msg = `failed to click ${label} on ${url}`;
        console.error(msg);
        summary.errors.push(msg);
      }
    }

    const forms = page.locator('form');
    for (let f = 0; f < await forms.count(); f++) {
      const form = forms.nth(f);

      const inputs = form.locator('input[type="text"], input:not([type]), input[type="email"], input[type="number"], input[type="date"], textarea');
      for (let j = 0; j < await inputs.count(); j++) {
        const input = inputs.nth(j);
        const type = await input.getAttribute('type');
        const value = type === 'number' ? '1' : type === 'date' ? '2020-01-01' : 'test';
        await input.fill(value);
      }

      const selects = form.locator('select');
      for (let j = 0; j < await selects.count(); j++) {
        const select = selects.nth(j);
        await select.selectOption({ index: 0 }).catch(() => {});
      }

      const checkboxes = form.locator('input[type="checkbox"]');
      for (let j = 0; j < await checkboxes.count(); j++) {
        const cb = checkboxes.nth(j);
        await cb.setChecked(true).catch(() => {});
      }

      const radios = form.locator('input[type="radio"]');
      for (let j = 0; j < await radios.count(); j++) {
        const r = radios.nth(j);
        if (!await r.isChecked()) {
          await r.check().catch(() => {});
        }
      }

      const submit = form.locator('button[type="submit"], input[type="submit"]');
      if (await submit.count()) {
        const text = (await submit.first().innerText()).toLowerCase();
        if (!/delete|remove|destroy/.test(text)) {
          await Promise.all([
            page.waitForLoadState('networkidle').catch(() => {}),
            submit.first().click({ force: true })
          ]).catch(() => summary.errors.push(`submit failed on ${url}`));
        } else {
          console.log('Skipping destructive submit on', url);
        }
      }
      summary.formsFilled++;
    }
  }

  console.log(`Forms filled: ${summary.formsFilled}`);
  console.log(`Buttons clicked: ${summary.buttonsClicked}`);
  if (summary.errors.length) {
    console.log('Errors encountered:');
    summary.errors.forEach(e => console.log(e));
  }

  expect(summary.errors.length).toBe(0);
});
