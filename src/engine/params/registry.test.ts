import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PARAMS,
  getDefaults,
  normalize,
  denormalize,
  clampToParam,
  paramsForPane,
  panesForPage,
  presetParamIds,
} from "./registry.ts";

test("all parameter ids are unique", () => {
  const ids = PARAMS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("defaults are within [min,max]", () => {
  for (const p of PARAMS) {
    assert.ok(p.default >= p.min && p.default <= p.max, `${p.id} default out of range`);
  }
});

test("normalize↔denormalize round-trips within tolerance", () => {
  for (const p of PARAMS) {
    if (p.kind === "toggle" || p.steps) continue;
    for (const v of [p.min, p.default, (p.min + p.max) / 2, p.max]) {
      const back = denormalize(p.id, normalize(p.id, v));
      const tol = Math.max(1e-4, (p.max - p.min) * 0.001);
      assert.ok(Math.abs(back - v) <= tol, `${p.id} round-trip ${v} -> ${back}`);
    }
  }
});

test("clamp keeps values in range", () => {
  assert.equal(clampToParam("filter.cutoff", 999999), 18000);
  assert.equal(clampToParam("filter.cutoff", -5), 30);
});

test("every editor pane resolves to at least one param", () => {
  const pages = ["OSC", "FILTER", "ENV", "LFO", "MOD", "FX", "VOICE"] as const;
  for (const page of pages) {
    const panes = panesForPage(page);
    assert.ok(panes.length > 0, `${page} has no panes`);
    for (const pane of panes) {
      assert.ok(paramsForPane(page, pane).length > 0, `${page}/${pane} empty`);
    }
  }
});

test("preset param set excludes non-preset params", () => {
  const ids = presetParamIds();
  assert.ok(!ids.includes("master.volume"));
  assert.ok(ids.includes("filter.cutoff"));
});

test("getDefaults covers every param", () => {
  const d = getDefaults();
  for (const p of PARAMS) assert.ok(p.id in d, `${p.id} missing from defaults`);
});
