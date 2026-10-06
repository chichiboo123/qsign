import { Clapperboard, Download, FileText, HardDrive, Keyboard, ListChecks, MonitorDown } from 'lucide-react';
import { Modal } from './Modal';

/** 사용법: 첫 화면과 준비 화면의 [? 사용법]에서 연다 */
export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="큐싸인 사용법" wide onClose={onClose}>
      <p className="help__lead">
        공연에 쓸 노래와 효과음을 순서대로 준비해 두고, 공연 날에는 <kbd>Space</kbd> 키 하나로 틀어요.
      </p>

      <section className="help__sec">
        <h3>
          <ListChecks size={18} aria-hidden="true" /> 준비하기 (선생님)
        </h3>
        <ol className="steps steps--big">
          <li>
            <strong>[새 공연 만들기]</strong>를 누르고 공연 이름을 적어요.
          </li>
          <li>
            장(1장, 2장…)을 만들고 <strong>[신호 추가]</strong>로 노래·효과음·배경 소리를 넣어요.
          </li>
          <li>
            신호마다 음원 파일을 넣고, 학생이 들을 <strong>신호 대사</strong>를 적어요.
          </li>
        </ol>
      </section>

      <section className="help__sec">
        <h3>
          <Clapperboard size={18} aria-hidden="true" /> 공연하기 (학생)
        </h3>
        <p>
          <strong>[공연]</strong> 또는 <strong>[공연 모드로 시작]</strong>을 눌러요. 신호 대사가 들리면 [다음]을 눌러요.
        </p>
        <ul className="help__keys">
          <li>
            <kbd>Space</kbd> 다음 신호
          </li>
          <li>
            <kbd>Esc</kbd> 모두 멈춤 (2초 동안 작아짐, 한 번 더 누르면 바로)
          </li>
          <li>
            <kbd>←</kbd> 이전 신호로 (소리 없이)
          </li>
        </ul>
      </section>

      <section className="help__sec">
        <h3>
          <Download size={18} aria-hidden="true" /> 다른 컴퓨터로 옮기기
        </h3>
        <p>
          공연 목록의 <strong>[⋯] → [파일로 저장]</strong>으로 zip 파일을 만들어 USB로 옮기고, 그 컴퓨터에서
          <strong> [공연 파일 가져오기]</strong>를 누르거나 첫 화면에 파일을 끌어다 놓아요.
        </p>
      </section>

      <section className="help__sec">
        <h3>
          <FileText size={18} aria-hidden="true" /> 셋리스트 저장하기
        </h3>
        <p>
          공연 목록의 <strong>[⋯]</strong>나 준비 화면 위쪽의 <strong>[셋리스트]</strong>에서 신호 순서표를
          <strong> PDF</strong>(인쇄용)나 <strong>텍스트(메모)</strong>로 저장할 수 있어요.
        </p>
      </section>

      <section className="help__sec">
        <h3>
          <MonitorDown size={18} aria-hidden="true" /> 앱으로 설치하기
        </h3>
        <p>
          첫 화면 오른쪽 위 <strong>[앱 설치]</strong>를 누르면 PC·태블릿·휴대폰에 앱처럼 설치돼요. 설치하면 인터넷이
          없어도 열려요.
        </p>
      </section>

      <section className="help__sec">
        <h3>
          <HardDrive size={18} aria-hidden="true" /> 알아 두세요
        </h3>
        <ul className="help__notes">
          <li>공연과 음원은 이 컴퓨터(브라우저) 안에만 저장돼요. 인터넷으로 보내지 않아요.</li>
          <li>브라우저 기록을 지우면 공연도 지워질 수 있어요. 중요한 공연은 파일로 저장해 두세요.</li>
          <li>
            <strong>Chrome</strong>이나 <strong>Edge</strong>에서 가장 잘 동작해요.
          </li>
          <li>오른쪽 위에서 화면을 밝게 / 어둡게 바꿀 수 있어요.</li>
        </ul>
      </section>

      <p className="help__keys-note muted small">
        <Keyboard size={14} aria-hidden="true" /> 공연 모드 안에도 [도움말] 버튼이 있어요.
      </p>
    </Modal>
  );
}
