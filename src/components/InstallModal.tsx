import { Monitor, Smartphone, Tablet, WifiOff } from 'lucide-react';
import { Modal } from './Modal';
import { detectPlatform, type Platform } from '../pwa';

const SECTIONS: Record<Platform, { icon: typeof Monitor; title: string; steps: React.ReactNode[] }> = {
  desktop: {
    icon: Monitor,
    title: '컴퓨터 (Chrome · Edge)',
    steps: [
      <>
        주소창 오른쪽 끝의 <strong>설치 아이콘</strong>(모니터에 화살표 모양)을 눌러요.
      </>,
      <>
        안 보이면 Chrome은 <strong>⋮ 메뉴 → 저장 및 공유 → 페이지를 앱으로 설치</strong>, Edge는{' '}
        <strong>⋯ 메뉴 → 앱 → 이 사이트를 앱으로 설치</strong>를 눌러요.
      </>,
      <>
        설치하면 <strong>시작 메뉴·바탕 화면</strong>에 큐싸인이 생기고, 주소창 없는 창으로 열려요.
      </>,
    ],
  },
  android: {
    icon: Smartphone,
    title: '안드로이드 (Chrome)',
    steps: [
      <>
        오른쪽 위 <strong>⋮ 메뉴</strong>를 눌러요.
      </>,
      <>
        <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를 눌러요.
      </>,
      <>홈 화면에 생긴 큐싸인 아이콘으로 열어요.</>,
    ],
  },
  ios: {
    icon: Tablet,
    title: '아이폰 · 아이패드 (Safari)',
    steps: [
      <>
        꼭 <strong>Safari</strong>로 열어요.
      </>,
      <>
        아래(아이패드는 위)의 <strong>공유 버튼</strong>(네모에 위쪽 화살표)을 눌러요.
      </>,
      <>
        <strong>홈 화면에 추가</strong> → <strong>추가</strong>를 눌러요.
      </>,
    ],
  },
};

/** 앱으로 설치하는 방법 (브라우저가 설치 창을 직접 띄울 수 없을 때) */
export function InstallModal({ onClose }: { onClose: () => void }) {
  const here = detectPlatform();
  const order: Platform[] = [here, ...(['desktop', 'android', 'ios'] as Platform[]).filter((p) => p !== here)];
  return (
    <Modal title="앱으로 설치하기" wide onClose={onClose}>
      <p className="help__lead">
        큐싸인을 앱처럼 설치하면 바탕 화면이나 홈 화면에서 바로 열리고, <strong>인터넷이 없어도</strong> 쓸 수 있어요.
      </p>
      {order.map((p, i) => {
        const s = SECTIONS[p];
        const Icon = s.icon;
        return (
          <section key={p} className={`help__sec ${i === 0 ? 'is-here' : ''}`}>
            <h3>
              <Icon size={18} aria-hidden="true" /> {s.title}
              {i === 0 && <span className="help__here">지금 쓰는 기기</span>}
            </h3>
            <ol className="steps steps--big">
              {s.steps.map((st, j) => (
                <li key={j}>{st}</li>
              ))}
            </ol>
          </section>
        );
      })}
      <section className="help__sec">
        <h3>
          <WifiOff size={18} aria-hidden="true" /> 알아 두세요
        </h3>
        <ul className="help__notes">
          <li>설치한 앱은 한 번 열어 두면 인터넷 없이도 열려요. 음원도 이 기기에 저장돼 있어요.</li>
          <li>
            공연은 <strong>주소마다 따로</strong> 저장돼요. 늘 같은 주소(qsign.chichiboo.link)에서 설치하고 쓰세요.
          </li>
          <li>새 버전이 나오면 첫 화면에 [업데이트] 안내가 떠요. 공연 중에는 저절로 바뀌지 않아요.</li>
        </ul>
      </section>
    </Modal>
  );
}
