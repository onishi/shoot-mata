import { expect, test } from '@playwright/test';

function watchConsole(page) {
  const problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

async function pressPath(page, path) {
  const keys = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' };
  for (const step of path) await page.keyboard.press(keys[step]);
}

test('title, reveal, gather, dim, and pause are keyboard complete', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  const canvas = page.locator('#game');
  await expect(canvas).toHaveAttribute('data-phase', 'title');
  await page.screenshot({ path: '../docs/evidence/m1-title.png' });

  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-phase', 'playing');
  await page.screenshot({ path: '../docs/evidence/m1-dim-room.png' });
  await page.keyboard.down('Space');
  await pressPath(page, 'RRR');
  await page.screenshot({ path: '../docs/evidence/m1-bright-reveal.png' });
  await pressPath(page, 'U');
  await expect(canvas).toHaveAttribute('data-seeds', '1');
  await expect(canvas).toHaveAttribute('data-light', 'bright');
  await page.screenshot({ path: '../docs/evidence/m1-bright-seed.png' });

  await page.keyboard.up('Space');
  await expect(canvas).toHaveAttribute('data-light', 'dim');
  await page.keyboard.press('Escape');
  await expect(canvas).toHaveAttribute('data-phase', 'paused');
  await expect(canvas).toHaveAttribute('aria-label', /paused/i);
  await page.screenshot({ path: '../docs/evidence/m1-paused.png' });
  await page.keyboard.press('Escape');
  await expect(canvas).toHaveAttribute('data-phase', 'playing');
  expect(problems).toEqual([]);
});

test('all three seeds open the gate and finish the room', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  const canvas = page.locator('#game');
  await page.keyboard.press('Enter');
  await page.keyboard.down('Space');
  await pressPath(page, 'RRRUDRRRRRRUUUUULLRRRRUURR');
  await page.keyboard.up('Space');
  await expect(canvas).toHaveAttribute('data-seeds', '3');
  await expect(canvas).toHaveAttribute('data-phase', 'won');
  await expect(canvas).toHaveAttribute('aria-label', /Room restored/i);
  await page.screenshot({ path: '../docs/evidence/m1-glasshouse-wakes.png' });

  await page.keyboard.press('KeyR');
  await expect(canvas).toHaveAttribute('data-phase', 'playing');
  await expect(canvas).toHaveAttribute('data-seeds', '0');
  expect(problems).toEqual([]);
});

test('all three rooms are completable and their light rules are visible', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  const canvas = page.locator('#game');
  await page.keyboard.press('Enter');
  await page.keyboard.down('Space');
  await pressPath(page, 'RRRUDRRRRRRUUUUULLRRRRUURR');
  await page.keyboard.up('Space');
  await expect(canvas).toHaveAttribute('data-phase', 'won');

  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-level', '2');
  await expect(canvas).toHaveAttribute('data-phase', 'playing');
  await expect(canvas).toHaveAttribute('data-mirror', 'idle');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-mirror', 'active');
  await page.screenshot({ path: '../docs/evidence/m2-prism-beam.png' });

  await pressPath(page, 'RRRRUUUUUUDDRRRRUURRRRRU');
  await page.keyboard.up('Space');
  await expect(canvas).toHaveAttribute('data-seeds', '3');
  await expect(canvas).toHaveAttribute('data-phase', 'won');

  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-level', '3');
  await page.keyboard.down('Space');
  await expect.poll(async () => Number(await canvas.getAttribute('data-phosphor'))).toBeGreaterThan(0);
  await page.keyboard.up('Space');
  await expect(canvas).toHaveAttribute('data-light', 'dim');
  await expect.poll(async () => Number(await canvas.getAttribute('data-afterglow'))).toBeGreaterThan(0);
  await page.screenshot({ path: '../docs/evidence/m2-phosphor-afterglow.png' });

  await page.keyboard.down('Space');
  await pressPath(page, 'UUUUUURRRDDDDDRRRRUUUUURRRRRDDUUUR');
  await page.keyboard.up('Space');
  await expect(canvas).toHaveAttribute('data-seeds', '3');
  await expect(canvas).toHaveAttribute('data-phase', 'won');
  await expect(canvas).toHaveAttribute('aria-label', /All available rooms restored/i);
  await page.screenshot({ path: '../docs/evidence/m2-three-rooms-kindled.png' });

  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-phase', 'title');
  await expect(canvas).toHaveAttribute('data-level', '1');
  expect(problems).toEqual([]);
});

test('three contacts extinguish the last ember and retry recovers', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  const canvas = page.locator('#game');
  await page.keyboard.press('Enter');

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await pressPath(page, 'RRRRRRRRRRRR');
  }
  await expect(canvas).toHaveAttribute('data-phase', 'lost');
  await expect(canvas).toHaveAttribute('data-lives', '0');
  await page.screenshot({ path: '../docs/evidence/m1-last-ember-out.png' });

  await page.keyboard.press('KeyR');
  await expect(canvas).toHaveAttribute('data-phase', 'playing');
  await expect(canvas).toHaveAttribute('data-lives', '3');
  expect(problems).toEqual([]);
});
