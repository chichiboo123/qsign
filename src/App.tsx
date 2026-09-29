import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import { Play } from 'lucide-react';
import { Logo } from './components/Logo';
import { Footer } from './components/Footer';
import { CueTypeBadge } from './components/CueTypeBadge';
import { CUE_TYPE_ORDER } from './types/cueMeta';

export default function App() {
  return (
    <>
      <div className="aurora" aria-hidden="true" />
      <header className="app-header">
        <Logo height={36} />
        <span className="eyebrow">Stage Sound Console</span>
      </header>
      <main className="page">
        <section className="panel" style={{ padding: 24, display: 'grid', gap: 16 }}>
          <span className="eyebrow">Next Signal</span>
          <p style={{ fontSize: 28, fontWeight: 700 }}>궁금쓰가 “저기 봐!” 라고 외치면</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CUE_TYPE_ORDER.map((t) => (
              <CueTypeBadge key={t} type={t} />
            ))}
          </div>
          <p className="mono muted">01:42 / 03:15</p>
          <div>
            <button className="btn btn--primary">
              <Play size={18} aria-hidden="true" /> 공연 모드로 시작
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
