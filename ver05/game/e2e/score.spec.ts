import { expect, test, type Page } from '@playwright/test';

type Action = 'up' | 'down' | 'left' | 'right' | 'wait';

const keyForAction: Record<Action, string> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  wait: 'Space',
};

const solutions: readonly (readonly (readonly Action[])[])[] = [
  [
    ['up', 'up', 'up', 'up', 'wait', 'wait', 'wait', 'wait'],
    ['up', 'up', 'left', 'left', 'left', 'wait', 'wait', 'wait'],
    ['up', 'up', 'right', 'right', 'right', 'wait', 'wait', 'wait'],
  ],
  [
    ['left', 'left', 'left', 'up', 'up', 'wait', 'wait', 'wait'],
    ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'wait'],
    ['right', 'right', 'right', 'wait', 'wait', 'wait', 'wait', 'wait'],
  ],
  [
    ['left', 'left', 'up', 'wait', 'wait', 'wait', 'wait', 'wait'],
    ['up', 'up', 'wait', 'wait', 'wait', 'up', 'up', 'wait'],
    ['right', 'right', 'right', 'wait', 'wait', 'wait', 'wait', 'wait'],
  ],
  [
    ['wait', 'wait', 'wait', 'wait', 'wait', 'wait', 'wait', 'wait'],
    ['left', 'left', 'left', 'up', 'up', 'up', 'wait', 'wait'],
    ['up', 'up', 'up', 'up', 'right', 'right', 'right', 'down'],
  ],
  [
    ['right', 'right', 'up', 'up', 'wait', 'wait', 'wait', 'wait'],
    ['left', 'left', 'left', 'wait', 'wait', 'wait', 'wait', 'wait'],
    ['right', 'right', 'right', 'wait', 'wait', 'wait', 'wait', 'wait'],
  ],
];

async function expectState(page: Page, state: string): Promise<void> {
  await expect(page.locator('#game')).toHaveAttribute('data-game-state', state);
}

async function playPhrase(page: Page, actions: readonly Action[]): Promise<void> {
  for (const action of actions) await page.keyboard.press(keyForAction[action]);
}

async function playRoom(page: Page, room: number): Promise<void> {
  await expect(page.locator('#game')).toHaveAttribute('data-room', String(room));
  for (const phrase of solutions[room - 1]!) {
    await playPhrase(page, phrase);
    if ((await page.locator('#game').getAttribute('data-game-state')) === 'won') break;
  }
  await expectState(page, 'won');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('keyboard flow completes all available rooms and persists clean room progress', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await expectState(page, 'title');
  await page.keyboard.press('Enter');
  await expectState(page, 'playing');

  await page.keyboard.press('Escape');
  await expectState(page, 'paused');
  await page.keyboard.press('KeyH');
  await expectState(page, 'hint');
  await expect(page.locator('#game')).toHaveAttribute('data-hint', '1');
  await page.keyboard.press('KeyH');
  await expect(page.locator('#game')).toHaveAttribute('data-hint', '2');
  await page.keyboard.press('Escape');
  await expectState(page, 'paused');
  await page.keyboard.press('Escape');
  await expectState(page, 'playing');

  for (let room = 1; room <= solutions.length; room += 1) {
    if (room === 5) {
      await playPhrase(page, solutions[4]![0]!);
      await expect(page.locator('#game')).toHaveAttribute('data-tracks', '1');
      await playPhrase(page, ['left', 'left', 'left']);
      await page.locator('#game').screenshot({ path: '../docs/evidence/m3-mirror-entry-replay.png' });
      await playPhrase(page, solutions[4]![1]!.slice(3));
      await playPhrase(page, solutions[4]![2]!);
      await expectState(page, 'won');
      break;
    }
    await playRoom(page, room);
    if (room < solutions.length) {
      await page.keyboard.press('Enter');
      await expectState(page, 'playing');
    }
  }
  await page.locator('#game').screenshot({ path: '../docs/evidence/m3-e2e-mirror-entry-complete.png' });
  await expect(page.locator('#game')).toHaveAttribute('data-unlocked-room', '5');

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('chorus-shift:v1') ?? 'null'));
  expect(saved.highestUnlockedRoom).toBe(4);
  expect(saved.completedRooms).toEqual([0, 1, 2, 3, 4]);
  expect(saved.hintsSeen).toEqual([0]);

  await page.reload();
  await expectState(page, 'title');
  await expect(page.locator('#game')).toHaveAttribute('data-unlocked-room', '5');
  await page.keyboard.press('Enter');
  await expectState(page, 'playing');
  await expect(page.locator('#game')).toHaveAttribute('data-room', '5');
  await expect(page.locator('#game')).toHaveAttribute('data-beat', '0');
  await expect(page.locator('#game')).toHaveAttribute('data-tracks', '0');
  expect(errors).toEqual([]);
});

test('settings survive reload and both required viewports contain every game state', async ({ page }) => {
  await page.keyboard.press('KeyS');
  await expectState(page, 'settings');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#game')).toHaveAttribute('data-reduced-motion', 'true');
  await page.keyboard.press('Enter');
  await page.reload();

  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('chorus-shift:v1') ?? 'null').settings);
  expect(settings).toEqual({ volume: 0.75, reducedMotion: true });

  for (const viewport of [
    { width: 1280, height: 720, name: '1280x720' },
    { width: 640, height: 800, name: '640x800' },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const canvas = page.locator('#game');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    expect(box!.width / box!.height).toBeCloseTo(16 / 9, 2);
    await page.screenshot({ path: `../docs/evidence/m2-viewport-title-${viewport.name}.png` });

    await page.keyboard.press('Enter');
    await expectState(page, 'playing');
    await page.keyboard.press('KeyH');
    await expectState(page, 'hint');
    await page.screenshot({ path: `../docs/evidence/m2-viewport-hint-${viewport.name}.png` });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expectState(page, 'paused');
    await page.screenshot({ path: `../docs/evidence/m2-viewport-paused-${viewport.name}.png` });
  }
});
