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

test('settings and unlocked room survive reload while corrupt saves recover', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  const canvas = page.locator('#game');

  await page.keyboard.press('KeyS');
  await expect(canvas).toHaveAttribute('data-settings', 'open');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect(canvas).toHaveAttribute('data-volume', '1');
  await expect(canvas).toHaveAttribute('data-shake', 'off');
  await expect(canvas).toHaveAttribute('data-flashes', 'reduced');
  await page.screenshot({ path: '../docs/evidence/m2-settings.png' });
  await page.reload();
  await expect(canvas).toHaveAttribute('data-volume', '1');
  await expect(canvas).toHaveAttribute('data-shake', 'off');
  await expect(canvas).toHaveAttribute('data-flashes', 'reduced');

  await page.evaluate(() => localStorage.setItem('candlewick-v9-save', '{broken'));
  await page.reload();
  await expect(canvas).toHaveAttribute('data-volume', '0.5');
  await expect(canvas).toHaveAttribute('data-unlocked-level', '1');
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

test('all six rooms are completable and their light rules are visible', async ({ page }) => {
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
  await page.reload();
  await expect(canvas).toHaveAttribute('data-phase', 'title');
  await expect(canvas).toHaveAttribute('data-selected-level', '2');
  await expect(canvas).toHaveAttribute('data-unlocked-level', '2');
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-level', '2');
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

  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-level', '4');
  await expect(canvas).toHaveAttribute('data-wardens', '2');
  await expect(canvas).toHaveAttribute('data-hunting', 'dim');
  await page.screenshot({ path: '../docs/evidence/m3-twin-vigil-dim.png' });
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-hunting', 'bright');
  await page.screenshot({ path: '../docs/evidence/m3-twin-vigil-bright.png' });
  await pressPath(page, 'RRRUUUURRRRUUDDDRRRU');
  await expect(canvas).toHaveAttribute('data-seeds', '2');
  await page.keyboard.up('Space');
  await expect(canvas).toHaveAttribute('data-hunting', 'dim');
  await pressPath(page, 'RRD');
  await page.keyboard.down('Space');
  await pressPath(page, 'D');
  await page.keyboard.up('Space');
  await expect(canvas).toHaveAttribute('data-seeds', '3');
  await pressPath(page, 'RUUUUU');
  await expect(canvas).toHaveAttribute('data-phase', 'won');
  await expect(canvas).toHaveAttribute('aria-label', /Room restored/i);
  await page.screenshot({ path: '../docs/evidence/m3-four-rooms-kindled.png' });

  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-level', '5');
  await expect(canvas).toHaveAttribute('data-wardens', '1');
  await expect(canvas).toHaveAttribute('data-hunting', 'dim');
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-hunting', '');
  await expect.poll(async () => Number(await canvas.getAttribute('data-phosphor'))).toBeGreaterThan(0);
  await page.screenshot({ path: '../docs/evidence/m3-borrowed-glow-bright.png' });
  const duskStart = await canvas.getAttribute('data-warden');
  await page.keyboard.up('Space');
  await expect(canvas).toHaveAttribute('data-hunting', 'dim');
  await expect.poll(async () => Number(await canvas.getAttribute('data-afterglow'))).toBeGreaterThan(0);
  await expect.poll(async () => canvas.getAttribute('data-warden')).not.toBe(duskStart);
  await expect(canvas).toHaveAttribute('data-fuel', '24');
  await page.screenshot({ path: '../docs/evidence/m3-borrowed-glow-dim.png' });

  await page.keyboard.down('Space');
  await pressPath(page, 'UURRRRRRRUUUURRRDDDDRRRUUUUU');
  await page.keyboard.up('Space');
  await expect(canvas).toHaveAttribute('data-seeds', '3');
  await expect(canvas).toHaveAttribute('data-phase', 'won');
  await expect(canvas).toHaveAttribute('aria-label', /Room restored/i);
  await page.screenshot({ path: '../docs/evidence/m3-five-rooms-kindled.png' });

  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-level', '6');
  await expect(canvas).toHaveAttribute('data-wardens', '2');
  await expect(canvas).toHaveAttribute('data-mirror', 'idle');
  await expect(canvas).toHaveAttribute('data-hunting', 'dim');
  await page.screenshot({ path: '../docs/evidence/m3-refracted-dawn-dim.png' });

  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('data-mirror', 'active');
  await expect(canvas).toHaveAttribute('data-hunting', 'bright');
  await page.screenshot({ path: '../docs/evidence/m3-refracted-dawn-prism.png' });
  await pressPath(page, 'UUURRRUUU');
  await expect(canvas).toHaveAttribute('data-seeds', '1');

  await page.keyboard.up('Space');
  await expect(canvas).toHaveAttribute('data-hunting', 'dim');
  await pressPath(page, 'RRRRDDD');
  await page.keyboard.down('Space');
  await pressPath(page, 'D');
  await expect(canvas).toHaveAttribute('data-seeds', '2');

  await page.keyboard.up('Space');
  await pressPath(page, 'RRRUUU');
  await page.keyboard.down('Space');
  await pressPath(page, 'RRURU');
  await page.keyboard.up('Space');
  await expect(canvas).toHaveAttribute('data-seeds', '3');
  await expect(canvas).toHaveAttribute('data-phase', 'won');
  await expect(canvas).toHaveAttribute('aria-label', /All 6 rooms kindled/i);
  await page.screenshot({ path: '../docs/evidence/m3-six-rooms-kindled.png' });

  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-phase', 'title');
  await expect(canvas).toHaveAttribute('data-level', '6');
  await expect(canvas).toHaveAttribute('data-unlocked-level', '6');
  await page.keyboard.press('ArrowLeft');
  await expect(canvas).toHaveAttribute('data-selected-level', '5');
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
