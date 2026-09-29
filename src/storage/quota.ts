import { loadSettings, saveSettings } from './showStore';

/**
 * 브라우저가 공간이 부족할 때 음원을 자동으로 지우지 않도록 "계속 보관"을 요청한다.
 * 앱 첫 실행 때 한 번 요청하고, 이미 허락된 경우는 다시 묻지 않는다.
 */
export async function requestPersistOnce(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    const settings = loadSettings();
    if (settings.persistRequested) return false;
    const granted = await navigator.storage.persist();
    saveSettings({ persistRequested: true });
    return granted;
  } catch {
    return false;
  }
}

export async function isPersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}

/** 설정 화면에서 사용자가 직접 다시 요청할 때 */
export async function requestPersist(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export interface StorageEstimateInfo {
  usage: number;
  quota: number;
}

export async function getEstimate(): Promise<StorageEstimateInfo | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}
