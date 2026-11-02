import { expect, test } from '@playwright/test';

type QaWindow = Window & {
  __PALIMPSEST_APP_STATE__: () => {
    screen: string; marginaliaMoment: string; midpointMarginaliaTaken: boolean; marginalia: string[];
    game: { tick: number; player: { invulnerableUntil: number } };
  };
  __PALIMPSEST_ADVANCE__: (ticks: number) => number;
};

const marginaliaIds = [
  'longhand', 'footnote', 'cross-reference', 'errata',
  'rubric', 'gloss', 'ligature', 'underline',
  'redaction', 'citation', 'palinode', 'afterword'
];

test('midpoint marginalia pauses, persists the selection and resumes play', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    const qa = window as unknown as QaWindow;
    const state = qa.__PALIMPSEST_APP_STATE__();
    state.game.tick = 10_799;
    state.game.player.invulnerableUntil = 20_000;
    qa.__PALIMPSEST_ADVANCE__(1);
  });
  let state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__());
  expect(state).toMatchObject({ screen: 'marginalia', marginaliaMoment: 'midpoint' });
  expect(state.game.tick).toBe(10_800);
  await page.locator('#game').screenshot({ path: '../docs/evidence/m4-04-midpoint-marginalia.png' });
  await page.keyboard.press('Enter');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__());
  expect(state).toMatchObject({ screen: 'playing', midpointMarginaliaTaken: true });
  expect(state.marginalia).toHaveLength(1);
  const stored = await page.evaluate(() => window.localStorage.getItem('palimpsest-wake:v4.2:save'));
  expect(stored).toContain(state.marginalia[0]);
});

test('all notes fit every card position, moment and supported viewport', async ({ page }) => {
  await page.addInitScript(() => {
    type TextCall = { text: string; x: number; y: number; width: number; size: number };
    const target = window as unknown as { __MARGINALIA_TEXT_CALLS__: TextCall[] };
    target.__MARGINALIA_TEXT_CALLS__ = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text: string, x: number, y: number, maxWidth?: number): void {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 10);
      target.__MARGINALIA_TEXT_CALLS__.push({ text, x, y, width: this.measureText(text).width, size });
      original.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');

  for (const viewport of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    for (const id of marginaliaIds) {
      for (const position of [0, 1, 2]) {
        for (const moment of ['midpoint', 'result']) {
          const result = await page.evaluate(({ candidate, index, screenMoment, owned }) => {
            const qa = window as unknown as QaWindow;
            const app = qa.__PALIMPSEST_APP_STATE__() as unknown as {
              screen: string; marginaliaMoment: string; marginaliaIndex: number; marginalia: string[]; marginaliaOptions: string[];
            };
            app.screen = 'marginalia'; app.marginaliaMoment = screenMoment; app.marginaliaIndex = index; app.marginalia = owned;
            app.marginaliaOptions = ['longhand', 'rubric', 'redaction']; app.marginaliaOptions[index] = candidate;
            const recorder = window as unknown as { __MARGINALIA_TEXT_CALLS__: Array<{ text: string; x: number; y: number; width: number; size: number }> };
            recorder.__MARGINALIA_TEXT_CALLS__ = [];
            qa.__PALIMPSEST_ADVANCE__(0);
            const calls = recorder.__MARGINALIA_TEXT_CALLS__;
            const cards = [72, 472, 872].map((left) => ({ left, right: left + 336, top: 218, bottom: 500 }));
            const overflow = calls.filter((call) => cards.some((card) =>
              call.x >= card.left && call.x <= card.right && call.y >= card.top && call.y <= card.bottom
                && (call.x + call.width > card.right - 18 || call.y - call.size < card.top || call.y > card.bottom - 12)
            ));
            const current = calls.filter((call) => call.text.includes('CURRENT NOTES') || (call.y >= 178 && call.y <= 196));
            const currentOverflow = current.filter((call) => call.x < 72 || call.x + call.width > 1208 || call.y > 200);
            return { overflow, currentOverflow, cardCalls: calls.filter((call) => call.y >= 218 && call.y <= 500).length };
          }, { candidate: id, index: position, screenMoment: moment, owned: marginaliaIds });
          expect(result.overflow, `${id} card ${position} ${moment} at ${viewport.width}x${viewport.height}`).toEqual([]);
          expect(result.currentOverflow).toEqual([]);
          expect(result.cardCalls).toBeGreaterThanOrEqual(18);
        }
      }
    }
    await page.locator('#game').screenshot({ path: `../docs/evidence/v4.2-01-marginalia-${viewport.width}x${viewport.height}.png` });
  }
});
