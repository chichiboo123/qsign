/** 공연 모드 — 6단계에서 만든다 */
export function PerformScreen({ onExit }: { showId: string; onExit: () => void }) {
  return (
    <main className="page">
      <div className="panel tile empty">
        <p>공연 모드는 준비 중이에요.</p>
        <button className="btn" onClick={onExit}>
          준비 모드로
        </button>
      </div>
    </main>
  );
}
