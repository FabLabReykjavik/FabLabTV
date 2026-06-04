// Small file-based runtime state store.
// This is generated at runtime and intentionally not committed to Git.

import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

const runtimeFile = path.join(config.dataDir, "runtime.json");

const defaultState = {
  selectedStaffFilename: null,
  currentVideoIndex: 0,
  announcement: "",
  nowPlayingOverride: null,
  audio: {
    requested: false,
    enabled: false,
    muted: true
  },
  updatedAt: null
};

export async function loadState() {
  try {
    const raw = await fs.readFile(runtimeFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      audio: { ...defaultState.audio, ...(parsed.audio || {}) }
    };
  } catch {
    return { ...defaultState };
  }
}

export async function saveState(patch) {
  await fs.mkdir(config.dataDir, { recursive: true });
  const current = await loadState();
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  await fs.writeFile(runtimeFile, JSON.stringify(next, null, 2));
  return next;
}
