/** 짧고 충돌 가능성이 낮은 id */
export function newId(prefix = ''): string {
  let core: string;
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    core = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  } else {
    core = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  return prefix ? `${prefix}_${core}` : core;
}
