import { useEffect, useRef, useState } from 'react';
import { Copy, Download, MoreHorizontal, Pencil, Play, Trash2 } from 'lucide-react';
import type { ShowSummary } from '../../types/show';
import { formatDate } from '../../utils/format';

interface Props {
  show: ShowSummary;
  recent?: boolean;
  busy: boolean;
  onOpen: () => void;
  onPerform: () => void;
  onExport: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** 공연 목록 한 줄: [공연] [준비] [⋯ 더보기] */
export function ShowRow({ show, recent, busy, onOpen, onPerform, onExport, onDuplicate, onDelete }: Props) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const pick = (fn: () => void) => () => {
    setMenu(false);
    fn();
  };

  return (
    <li ref={ref} className={`show-item ${menu ? 'is-menu-open' : ''}`}>
      <button className="show-item__main" onClick={onOpen} title="눌러서 준비하기">
        <span className="show-item__title">
          {show.title}
          {recent && <span className="show-item__recent">최근</span>}
        </span>
        <span className="show-item__meta">
          {show.sceneCount}개 장 · 신호 {show.cueCount}개 · <span className="mono">{formatDate(show.updatedAt)}</span>
        </span>
      </button>
      <div className="show-item__actions">
        <button
          className="btn btn--sm btn--primary"
          onClick={onPerform}
          disabled={show.cueCount === 0}
          title={show.cueCount === 0 ? '신호가 있어야 공연할 수 있어요. [준비]에서 신호를 만들어요.' : '공연 모드로 시작'}
        >
          <Play size={15} aria-hidden="true" /> 공연
        </button>
        <button className="btn btn--sm" onClick={onOpen}>
          <Pencil size={15} aria-hidden="true" /> 준비
        </button>
        <div className="more-menu">
          <button
            className="btn btn--sm btn--icon"
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            aria-haspopup="menu"
            aria-label={`${show.title} 더보기`}
            title="더보기"
          >
            <MoreHorizontal size={18} />
          </button>
          {menu && (
            <div className="more-menu__list panel" role="menu">
              <button role="menuitem" onClick={pick(onExport)} disabled={busy}>
                <Download size={16} aria-hidden="true" />
                <span>
                  파일로 저장<small>USB로 다른 컴퓨터에 옮길 때</small>
                </span>
              </button>
              <button role="menuitem" onClick={pick(onDuplicate)}>
                <Copy size={16} aria-hidden="true" />
                <span>복제</span>
              </button>
              <button role="menuitem" className="is-danger" onClick={pick(onDelete)}>
                <Trash2 size={16} aria-hidden="true" />
                <span>지우기</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
