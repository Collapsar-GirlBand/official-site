import { ASSETS } from '../content/assets';
import { CHAR_CONFIG } from '../content/spriteData';

export interface AssetLoadProgress {
  loadedBytes: number;
  totalBytes: number;
  completedFiles: number;
  totalFiles: number;
  percent: number;
  failedUrls: string[];
  done: boolean;
}

const GAME_ASSET_URLS = Array.from(new Set([
  ...Object.values(CHAR_CONFIG).map(config => config.image),
  ...Object.values(ASSETS.AUDIO),
]));

const listeners = new Set<(progress: AssetLoadProgress) => void>();
const assetBuffers = new Map<string, ArrayBuffer>();
const loadedByUrl = new Map<string, number>();
const totalByUrl = new Map<string, number>();
let failedUrls: string[] = [];
let activeLoad: Promise<AssetLoadProgress> | null = null;
let lastPercent = 0;

let snapshot: AssetLoadProgress = {
  loadedBytes: 0,
  totalBytes: 0,
  completedFiles: 0,
  totalFiles: GAME_ASSET_URLS.length,
  percent: 0,
  failedUrls: [],
  done: false,
};

const emit = (done = false) => {
  const loadedBytes = [...loadedByUrl.values()].reduce((sum, value) => sum + value, 0);
  const totalBytes = [...totalByUrl.values()].reduce((sum, value) => sum + value, 0);
  const completedFiles = assetBuffers.size + failedUrls.length;
  const measuredProgress = GAME_ASSET_URLS.reduce((sum, url) => {
    if (assetBuffers.has(url) || failedUrls.includes(url)) return sum + 1;
    const total = totalByUrl.get(url) ?? 0;
    const loaded = loadedByUrl.get(url) ?? 0;
    return sum + (total > 0 ? Math.min(1, loaded / total) : 0);
  }, 0) / GAME_ASSET_URLS.length;
  const measuredPercent = Math.round(measuredProgress * 100);
  lastPercent = done ? 100 : Math.max(lastPercent, Math.min(99, measuredPercent));

  snapshot = {
    loadedBytes,
    totalBytes,
    completedFiles,
    totalFiles: GAME_ASSET_URLS.length,
    percent: lastPercent,
    failedUrls: [...failedUrls],
    done,
  };
  listeners.forEach(listener => listener(snapshot));
};

const downloadAsset = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const contentLength = Number(response.headers.get('content-length')) || 0;
  totalByUrl.set(url, contentLength);

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    assetBuffers.set(url, buffer);
    loadedByUrl.set(url, buffer.byteLength);
    totalByUrl.set(url, buffer.byteLength);
    emit();
    return;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    loadedByUrl.set(url, received);
    if (!contentLength) totalByUrl.set(url, received);
    emit();
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  chunks.forEach(chunk => {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  });
  assetBuffers.set(url, merged.buffer);
  loadedByUrl.set(url, received);
  totalByUrl.set(url, Math.max(contentLength, received));
  emit();
};

export const subscribeToAssetProgress = (listener: (progress: AssetLoadProgress) => void) => {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
};

export const preloadGameAssets = (retryFailed = false) => {
  if (activeLoad) return activeLoad;
  if (snapshot.done && (!retryFailed || failedUrls.length === 0)) return Promise.resolve(snapshot);

  const urls = retryFailed ? [...failedUrls] : GAME_ASSET_URLS.filter(url => !assetBuffers.has(url));
  if (retryFailed) {
    failedUrls = [];
    lastPercent = 0;
    urls.forEach(url => {
      loadedByUrl.delete(url);
      totalByUrl.delete(url);
    });
  }

  snapshot = { ...snapshot, done: false, failedUrls: [] };
  emit();

  activeLoad = Promise.allSettled(urls.map(async url => {
    try {
      await downloadAsset(url);
    } catch (error) {
      console.warn(`Failed to preload asset: ${url}`, error);
      failedUrls.push(url);
      emit();
    }
  })).then(() => {
    emit(true);
    return snapshot;
  }).finally(() => {
    activeLoad = null;
  });

  return activeLoad;
};

export const getPreloadedAssetBuffer = (url: string) => assetBuffers.get(url)?.slice(0);
