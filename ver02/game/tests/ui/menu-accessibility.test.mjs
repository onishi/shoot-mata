import test from "node:test";
import assert from "node:assert/strict";
import {
  focusInitialMenuAction,
  getMenuActionLabel,
  setMenuBackgroundInert,
} from "../../src/ui/menu-accessibility.mjs";

test("A11Y-04: 画面操作へ文脈を含む意味あるラベルを付ける", () => {
  assert.equal(getMenuActionLabel("start-stage-2", "STAGE 3 生体方舟", "出撃先を選択"), "STAGE 3 生体方舟を開始する");
  assert.equal(getMenuActionLabel("confirm", "実行", "タイトルへ戻りますか？"), "タイトルへ戻りますか？。「実行」");
  assert.equal(getMenuActionLabel("request-restart", "最初から", "一時停止"), "現在のステージを最初からやり直す確認を開く");
  assert.equal(getMenuActionLabel("advance", "次のステージへ", "SCORE 100"), "次のステージへ");
});

test("A11Y-04: モーダル表示中は背面UIをTab順から外す", () => {
  const elements = [{ inert: false }, { inert: false }, { inert: false }];
  setMenuBackgroundInert(elements, true);
  assert.ok(elements.every(({ inert }) => inert));
  setMenuBackgroundInert(elements, false);
  assert.ok(elements.every(({ inert }) => !inert));
});

test("A11Y-04: 画面遷移後はDOM順を保ったまま主操作へフォーカスする", () => {
  const calls = [];
  const buttons = [
    { dataset: { primary: "false" }, focus: () => calls.push("secondary") },
    { dataset: { primary: "true" }, focus: (options) => calls.push(["primary", options]) },
    { dataset: { primary: "false" }, focus: () => calls.push("last") },
  ];
  assert.equal(focusInitialMenuAction(buttons), buttons[1]);
  assert.deepEqual(calls, [["primary", { preventScroll: true }]]);
});
