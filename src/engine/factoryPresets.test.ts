import { test } from "node:test";
import assert from "node:assert/strict";
import { FACTORY_PRESETS } from "./factoryPresets.ts";
import { tryParam, clampToParam } from "./params/registry.ts";

test("factory bank is non-trivial and varied", () => {
  assert.ok(FACTORY_PRESETS.length >= 24, `only ${FACTORY_PRESETS.length} presets`);
  const cats = new Set(FACTORY_PRESETS.map((p) => p.category));
  assert.ok(cats.size >= 6, "not enough distinct categories");
});

test("preset ids and names are unique / LCD-safe", () => {
  const ids = FACTORY_PRESETS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate ids");
  for (const p of FACTORY_PRESETS) {
    assert.ok(p.name.length <= 16, `${p.name} too long for LCD`);
  }
});

test("every override references a real, in-range parameter", () => {
  for (const preset of FACTORY_PRESETS) {
    for (const [id, value] of Object.entries(preset.params)) {
      const def = tryParam(id);
      assert.ok(def, `${preset.id} references unknown param ${id}`);
      assert.equal(clampToParam(id, value), value, `${preset.id}.${id}=${value} out of range`);
    }
  }
});

test("presets are genuinely distinct (not clones)", () => {
  const sigs = FACTORY_PRESETS.filter((p) => p.category !== "INIT").map((p) =>
    JSON.stringify(p.params),
  );
  assert.equal(new Set(sigs).size, sigs.length, "duplicate preset parameter sets found");
});
