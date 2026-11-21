"use strict";
var test = require("node:test");
var assert = require("node:assert");
var Picket = require("../src/core.js");

test("ten metre run makes six panels and seven posts", function () {
  // The worked example every supplier gives: 10 / 1.83 = 5.46 -> 6 panels,
  // and one more post than panels -> 7.
  var r = Picket.estimate({ runLength: 10 });
  assert.strictEqual(r.panels, 6);
  assert.strictEqual(r.posts, 7);
});

test("a run that is an exact multiple of the panel does not round up", function () {
  var r = Picket.estimate({ runLength: 1.83 * 4, panelWidth: 1.83 });
  assert.strictEqual(r.panels, 4);
  assert.strictEqual(r.posts, 5);
  assert.strictEqual(r.offcut, 0);
});

test("extra posts for corners and gates are added on", function () {
  var r = Picket.estimate({ runLength: 10, extraPosts: 2 });
  assert.strictEqual(r.posts, 6 + 1 + 2);
});

test("a 1.83 m fence wants a 2.4 m post", function () {
  var r = Picket.estimate({ runLength: 10, fenceHeight: 1.83 });
  assert.strictEqual(r.postLength, 2.4);
  assert.ok(r.holeDepth >= 0.5, "roughly 0.57 m buried");
});

test("a low fence drops to a shorter post", function () {
  var r = Picket.estimate({ runLength: 10, fenceHeight: 0.9 });
  assert.ok(r.postLength <= 2.1, "a 3 ft fence does not need a 2.4 m post");
});

test("firm ground is one to two bags per post", function () {
  var r = Picket.estimate({ runLength: 10, ground: "firm" });
  assert.strictEqual(r.bagsPerPostLow, 1);
  assert.strictEqual(r.bagsPerPostHigh, 2);
  assert.strictEqual(r.bagsLow, r.posts * 1);
  assert.strictEqual(r.bagsHigh, r.posts * 2);
});

test("soft ground needs more postmix than firm", function () {
  var firm = Picket.estimate({ runLength: 10, ground: "firm" });
  var soft = Picket.estimate({ runLength: 10, ground: "soft" });
  assert.ok(soft.bagsLow > firm.bagsLow);
  assert.strictEqual(soft.bagsPerPostLow, 2);
  assert.strictEqual(soft.bagsPerPostHigh, 3);
});

test("heavy-duty posts add a bag at each end of the range", function () {
  var normal = Picket.estimate({ runLength: 10, ground: "firm" });
  var heavy = Picket.estimate({ runLength: 10, ground: "firm", heavyDuty: true });
  assert.strictEqual(heavy.bagsPerPostLow, normal.bagsPerPostLow + 1);
  assert.strictEqual(heavy.bagsPerPostHigh, normal.bagsPerPostHigh + 1);
});

test("gravel boards are one per bay and caps one per post", function () {
  var r = Picket.estimate({ runLength: 10 });
  assert.strictEqual(r.gravelBoards, r.panels);
  assert.strictEqual(r.caps, r.posts);
});

test("gravel boards and caps can be turned off", function () {
  var r = Picket.estimate({ runLength: 10, gravelBoards: false, postCaps: false });
  assert.strictEqual(r.gravelBoards, 0);
  assert.strictEqual(r.caps, 0);
});

test("the last panel cut and its offcut are reported", function () {
  var r = Picket.estimate({ runLength: 10, panelWidth: 1.83 });
  // 10 - 5 * 1.83 = 0.85 m final panel, offcut 0.98 m.
  assert.ok(r.offcut > 0.9 && r.offcut < 1.0);
  assert.ok(r.lastPanelWidth > 0.8 && r.lastPanelWidth < 0.9);
  assert.ok(r.notes.some(function (n) { return /last panel is cut/.test(n); }));
});

test("european panels are narrower, so a long run can need an extra panel", function () {
  var imp = Picket.estimate({ runLength: 11, panelWidth: 1.83 });
  var euro = Picket.estimate({ runLength: 11, panelWidth: 1.80 });
  assert.ok(euro.panels >= imp.panels);
});

test("built length counts the posts, not just the panels", function () {
  var r = Picket.estimate({ runLength: 10, panelWidth: 1.83, postWidth: 100 });
  // Panels plus seven 100 mm posts add about 0.7 m of post width.
  assert.ok(r.builtLength > 9.9, "covers the run");
});

test("zero or blank run gives nothing to buy", function () {
  var r = Picket.estimate({ runLength: 0 });
  assert.strictEqual(r.panels, 0);
  assert.strictEqual(r.posts, 0);
  assert.strictEqual(r.bagsLow, 0);
});

test("always warns that panel widths vary", function () {
  var r = Picket.estimate({ runLength: 10 });
  assert.ok(r.notes.some(function (n) { return /Panel widths vary/.test(n); }));
});

test("a trellis topper makes the posts taller", () => {
  var plain = Picket.estimate({ runLength: 10, fenceHeight: 1.83 });
  var topped = Picket.estimate({ runLength: 10, fenceHeight: 1.83, trellisHeight: 0.3 });
  assert.ok(topped.neededPostLength > plain.neededPostLength);
  assert.ok(topped.postLength >= plain.postLength);
  assert.strictEqual(topped.trellisHeight, 0.3);
});

test("a trellis topper adds one trellis panel per bay", () => {
  var r = Picket.estimate({ runLength: 10, fenceHeight: 1.83, trellisHeight: 0.45 });
  assert.strictEqual(r.trellisPanels, r.panels);
  assert.ok(r.trellisPanels > 0);
});

test("no trellis means no trellis panels", () => {
  var r = Picket.estimate({ runLength: 10, fenceHeight: 1.83 });
  assert.strictEqual(r.trellisPanels, 0);
  assert.strictEqual(r.trellisHeight, 0);
});

test("needed post length is fence plus trellis plus burial", () => {
  var r = Picket.estimate({ runLength: 6, fenceHeight: 1.5, trellisHeight: 0.6 });
  // burial for 1.5 m fence is max(0.6, 0.5) = 0.6; 1.5 + 0.6 + 0.6 = 2.7
  assert.strictEqual(r.neededPostLength, 2.7);
});

test("post holes give a concrete volume as an alternative to bags", () => {
  // 20 m run, 1.83 m panels -> 11 panels, 12 posts. 100 mm posts, ~300 mm holes.
  const r = Picket.estimate({ runLength: 20, fenceHeight: 1.83, postWidth: 100 });
  assert.strictEqual(r.posts, 12);
  assert.strictEqual(r.postHole.sideMm, 300);          // 3 x 100 mm
  assert.strictEqual(r.postHole.depthMm, Math.round(r.holeDepth * 1000));
  // per hole = (0.3^2 - 0.1^2) * depth = 0.08 * depth
  const expectPer = (0.3 * 0.3 - 0.1 * 0.1) * r.holeDepth;
  assert.ok(Math.abs(r.postHole.perHoleM3 - Math.round(expectPer * 1000) / 1000) < 1e-9);
  assert.ok(r.postHole.totalM3 > 0);
  assert.ok(r.notes.some((n) => /mix your own or order ready-mix/.test(n)));
});

test("a heavy-duty post digs a wider hole and needs more concrete", () => {
  const std = Picket.estimate({ runLength: 20, fenceHeight: 1.83, postWidth: 100 });
  const hd = Picket.estimate({ runLength: 20, fenceHeight: 1.83, postWidth: 100, heavyDuty: true });
  assert.ok(hd.postHole.sideMm > std.postHole.sideMm, "wider hole");
  assert.ok(hd.postHole.totalM3 > std.postHole.totalM3, "more concrete");
});
