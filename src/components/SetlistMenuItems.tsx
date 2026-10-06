import { FileText, FileType } from 'lucide-react';
import type { SetlistFormat } from '../io/exportSetlist';

/** 더보기·편집 화면에서 같이 쓰는 셋리스트 내려받기 메뉴 칸 두 개 */
export function SetlistMenuItems({
  disabled,
  onPick,
}: {
  disabled?: boolean;
  onPick: (format: SetlistFormat) => void;
}) {
  return (
    <>
      <button role="menuitem" onClick={() => onPick('pdf')} disabled={disabled}>
        <FileType size={16} aria-hidden="true" />
        <span>
          셋리스트 PDF<small>인쇄하거나 공유할 때</small>
        </span>
      </button>
      <button role="menuitem" onClick={() => onPick('txt')} disabled={disabled}>
        <FileText size={16} aria-hidden="true" />
        <span>
          셋리스트 텍스트(메모)<small>메모장·카톡에 붙여 넣을 때</small>
        </span>
      </button>
    </>
  );
}
