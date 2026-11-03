import { expect, test, type Page } from '@playwright/test';

async function disableCache(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
}

test('packaged root and fixed v5 route start without cache or external requests', async ({ browser }) => {
  for (const route of ['/', '/v5/']) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    await disableCache(page);

    const failures: string[] = [];
    const externalRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.origin !== 'http://127.0.0.1:4192') externalRequests.push(request.url());
    });
    page.on('requestfailed', (request) => failures.push(`${request.method()} ${request.url()}`));
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') failures.push(message.text());
    });

    await page.addInitScript(() => {
      localStorage.setItem('chorus-shift:v1', JSON.stringify({
        version: 0,
        highestUnlockedRoom: 999,
        completedRooms: [999],
        hintsSeen: [999],
        settings: { volume: 9, reducedMotion: 'invalid' },
      }));
    });
    const response = await page.goto(route, { waitUntil: 'networkidle' });

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('CHORUS SHIFT — v5.0');
    await expect(page.locator('#game')).toHaveAttribute('data-game-state', 'title');
    await expect(page.locator('#game')).toHaveAttribute('data-unlocked-room', '1');
    await page.keyboard.press('Enter');
    await expect(page.locator('#game')).toHaveAttribute('data-game-state', 'playing');
    expect(externalRequests).toEqual([]);
    expect(failures).toEqual([]);
    await context.close();
  }
});
