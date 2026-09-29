import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useDialog } from '../../components/Dialogs';
import { localStorageUsage } from '../../storage/showStore';
import { deleteUnusedAudio, findUnusedAudio } from '../../storage/cleanup';
import { getEstimate, isPersisted, requestPersist, type StorageEstimateInfo } from '../../storage/quota';
import { listAudioMeta } from '../../storage/audioStore';
import { formatBytes } from '../../utils/format';

/** 저장 공간: 쓰는 용량, 음원 지키기, 안 쓰는 음원 지우기 */
export function StorageModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const { confirm, toast } = useDialog();
  const [est, setEst] = useState<StorageEstimateInfo | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [audio, setAudio] = useState({ count: 0, bytes: 0 });
  const [unused, setUnused] = useState({ count: 0, bytes: 0 });

  const load = useCallback(async () => {
    const [e, p, list, un] = await Promise.all([getEstimate(), isPersisted(), listAudioMeta(), findUnusedAudio()]);
    setEst(e);
    setPersisted(p);
    setAudio({ count: list.length, bytes: list.reduce((n, m) => n + m.size, 0) });
    setUnused({ count: un.length, bytes: un.reduce((n, m) => n + m.size, 0) });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 브라우저 추정값이 늦게 갱신될 때가 있어 실제 음원 크기와 비교해 큰 값을 보여준다
  const usage = Math.max(est?.usage ?? 0, audio.bytes + localStorageUsage());
  const ratio = est && est.quota > 0 ? Math.min(1, usage / est.quota) : 0;

  const clean = async () => {
    const ok = await confirm({
      title: '안 쓰는 음원을 지울까요?',
      message: <p>어떤 공연에서도 쓰지 않는 음원 {unused.count}개({formatBytes(unused.bytes)})를 지워요.</p>,
      confirmLabel: '지우기',
      danger: true,
    });
    if (!ok) return;
    const r = await deleteUnusedAudio();
    toast(`음원 ${r.count}개를 지웠어요.`, 'success');
    onChanged();
    void load();
  };

  return (
    <Modal title="저장 공간" onClose={onClose}>
      <div className="storage">
        <p className="storage__num">
          <span className="mono">{formatBytes(usage)}</span> <span className="muted">쓰는 중</span>
        </p>
        <div className="meter" role="img" aria-label={`저장 공간 ${Math.round(ratio * 100)}% 사용`}>
          <div className="meter__fill" style={{ width: `${Math.max(1, ratio * 100)}%` }} />
        </div>
        <p className="muted small">
          음원 {audio.count}개 ({formatBytes(audio.bytes)})
          {est && est.quota > 0 && <> · 남은 공간 약 {formatBytes(Math.max(0, est.quota - usage))}</>}
        </p>

        {persisted ? (
          <p className="storage__ok">
            <ShieldCheck size={18} aria-hidden="true" /> 음원이 저절로 지워지지 않게 지키는 중이에요.
          </p>
        ) : (
          <div className="storage__row">
            <p className="small">저장 공간이 모자라면 브라우저가 음원을 지울 수도 있어요.</p>
            <button
              className="btn btn--sm"
              onClick={async () => {
                const ok = await requestPersist();
                toast(
                  ok
                    ? '이제 브라우저가 음원을 저절로 지우지 않아요.'
                    : '브라우저가 요청을 받아 주지 않았어요. 중요한 공연은 파일로 저장해 두세요.',
                  ok ? 'success' : 'info',
                );
                void load();
              }}
            >
              <ShieldAlert size={15} aria-hidden="true" /> 음원 지키기
            </button>
          </div>
        )}

        <div className="storage__row">
          <p className="small">
            {unused.count > 0
              ? `어떤 공연에서도 쓰지 않는 음원이 ${unused.count}개(${formatBytes(unused.bytes)}) 있어요.`
              : '안 쓰는 음원이 없어요.'}
          </p>
          <button className="btn btn--sm" onClick={clean} disabled={unused.count === 0}>
            <Trash2 size={15} aria-hidden="true" /> 지우기
          </button>
        </div>
      </div>
    </Modal>
  );
}
