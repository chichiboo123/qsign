# 큐싸인 (Q-sign)

> **Q(큐) + sign(신호)** — 신호를 보고 소리를 보낸다.

초등학교 학예회·뮤지컬 공연에서 **학생이 음향 담당**이 되어 노래(MR)와 효과음을
순서대로 틀 수 있게 돕는 브라우저 기반 재생기입니다.
전문 공연 프로그램(QLab 등)의 핵심인 "신호 목록 + 다음 버튼"을 초등학생 눈높이로 단순하게 만들었습니다.

- 배포 주소: <https://qsign.chichiboo.link/> (GitHub Pages: <https://chichiboo123.github.io/qsign/>)
- 권장 환경: 윈도우 PC·노트북의 **Chrome** 또는 **Edge**

## 이런 점이 좋아요

- **서버가 없습니다.** 공연 정보와 음원은 모두 이 컴퓨터(브라우저) 안에만 저장되고, 밖으로 보내지 않습니다.
- **교사 준비 모드**에서 장(scene)과 신호를 만들고 음원을 끌어다 놓습니다.
- **공연 모드**에서는 학생이 스페이스바(또는 큰 "다음" 버튼)만 누르면 됩니다.
- 공연을 **zip 파일로 내보내서** USB로 강당 컴퓨터에 옮길 수 있습니다.

## 신호 종류

| 이름 | 하는 일 |
|---|---|
| 노래 | MR을 재생합니다 |
| 효과음 | 누르는 즉시 재생합니다. 다른 소리와 겹쳐도 됩니다 |
| 배경 소리 | 반복해서 재생합니다 |
| 스르륵 줄이기 | 소리를 정한 시간 동안 천천히 줄여서 끕니다 |
| 멈춤 | 소리를 바로 멈춥니다 |

## 공연 모드 단축키

| 키 | 동작 |
|---|---|
| `Space` | 다음 신호 실행 |
| `Esc` | 모두 멈춤 (2초 동안 부드럽게 줄임, 한 번 더 누르면 즉시 멈춤) |
| `←` | 이전 신호로 이동 (소리는 내지 않음) |

- "다음"을 누른 뒤 0.5초 동안은 다시 눌러도 무시돼요(연타 방지).
- 오른쪽 신호 목록을 누르면 그 신호로 순서만 옮겨요(소리는 나지 않아요).
- 공연 모드 위쪽의 **도움말**에 학생용 사용법이 있어요. **전체 볼륨**도 여기서 바꿔요.
- 공연 모드를 시작하면 전체 화면이 되고 화면이 꺼지지 않아요. Chrome·Edge에서는 전체 화면에서도 `Esc`가
  "모두 멈춤"으로 동작하고, 전체 화면을 나가려면 `Esc`를 **길게** 누르면 돼요.
- 공연 모드에서 창을 닫거나 새로고침하면 경고가 떠요.

## 앱으로 설치하기 (PC · 태블릿 · 휴대폰)

큐싸인은 **설치형 웹앱(PWA)** 이에요. 설치하면 바탕 화면·홈 화면에서 바로 열리고, **인터넷이 없어도** 실행돼요.
첫 화면 오른쪽 위 **[앱 설치]** 를 누르면 돼요.

| 기기 | 방법 |
|---|---|
| 윈도우 PC (Chrome · Edge) | [앱 설치] 또는 주소창 오른쪽 **설치 아이콘** → 설치. 시작 메뉴·바탕 화면에 생겨요 |
| 안드로이드 (Chrome) | [앱 설치] 또는 **⋮ → 앱 설치(홈 화면에 추가)** |
| 아이폰 · 아이패드 (Safari) | **공유 버튼 → 홈 화면에 추가** |

- 공연과 음원은 **주소마다 따로** 저장돼요. 늘 `https://qsign.chichiboo.link/` 에서 설치하고 쓰세요.
- 새 버전이 나오면 첫 화면에 **[지금 업데이트]** 안내가 떠요. 공연 중에는 저절로 바뀌지 않아요.

## 윈도우 프로그램(.exe)

브라우저 없이 쓰는 윈도우 프로그램도 있어요. **[Releases](https://github.com/chichiboo123/qsign/releases/latest)** 에서 받아요.

| 파일 | 쓰임 |
|---|---|
| `Qsign-Setup-버전.exe` | 설치형. 바탕 화면·시작 메뉴에 "큐싸인"이 생겨요. 관리자 권한 없이 설치돼요 |
| `Qsign-버전-Portable.exe` | 설치 없이 바로 실행. USB에 넣어 다니며 써요 |

- 인터넷 없이 동작해요. 공연 중 창을 닫으려 하면 확인창이 떠요.
- 처음 실행할 때 "Windows의 PC 보호" 창이 뜨면 **추가 정보 → 실행**을 눌러요(코드 서명 인증서가 없어서 뜨는 안내).
- 프로그램의 공연은 웹 주소와 **따로** 저장돼요. [⋯ → 파일로 저장] → 프로그램에서 [공연 파일 가져오기]로 옮겨요.

새 버전 만들기: `package.json`의 `version`을 올리고 `main`에 push한 뒤, **Actions → 윈도우 프로그램 만들기 → Run workflow**.
윈도우 컴퓨터에서 설치 파일을 만들고, 프로그램을 켜서 점검한 뒤 Releases에 올려요.
로컬에서는 `npm run desktop`(실행), `npm run dist:win`(윈도우에서 설치 파일 만들기).

## 화면 밝기

모든 화면 오른쪽 위에서 **밝게 / 어둡게**를 고를 수 있어요. 처음에는 컴퓨터 설정을 따르고, 고른 값은 기억해요.
밝은 교실에서는 "밝게", 어두운 무대 뒤에서는 "어둡게"가 잘 보여요.

## 다른 컴퓨터로 공연 옮기기 (교실 PC → 강당 PC)

1. 교실 PC의 공연 목록에서 **⋯ → 파일로 저장**을 눌러 `공연제목_날짜.qsign.zip` 파일을 저장해요.
2. 파일을 USB에 담아 강당 PC로 옮겨요.
3. 강당 PC에서 큐싸인을 열고 **공연 파일 가져오기**로 zip 파일을 고르거나, 첫 화면에 끌어다 놓아요.
   같은 공연이 이미 있으면 "(가져옴)"이 붙은 새 공연으로 들어와요.

---

## 로컬에서 실행하기

[Node.js](https://nodejs.org/) 20 이상이 필요합니다.

```bash
npm install      # 처음 한 번
npm run dev      # 개발 서버 실행 → 터미널에 나온 주소(예: http://localhost:5173/)를 엽니다
```

그 밖의 명령:

```bash
npm run build    # dist/ 폴더에 배포용 파일 만들기
npm run preview  # 만든 배포 파일을 로컬에서 미리 보기
npm run typecheck
```

## 배포하기 (GitHub Pages)

`main` 브랜치에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 자동으로 빌드해서 배포합니다.

처음 한 번만 설정이 필요합니다.

1. 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꿉니다.
2. **Settings → General → Default branch** 가 `main` 인지 확인합니다.
3. `main` 에 push하고 **Actions** 탭에서 "GitHub Pages 배포"가 초록색으로 끝나면 배포 주소에서 확인합니다.

### 배포 경로(base)와 커스텀 도메인

앱은 **상대 경로(`./`)** 로 빌드되기 때문에 커스텀 도메인(`https://qsign.chichiboo.link/`)과
GitHub Pages 주소(`https://chichiboo123.github.io/qsign/`) 어느 쪽에서 열어도 그대로 동작해요.

커스텀 도메인 설정은 저장소 **Settings → Pages → Custom domain** 에서 해요.
(GitHub Actions로 배포하므로 `CNAME` 파일은 필요 없어요.)

특정 절대 경로로 고정해야 하면 저장소 **Settings → Secrets and variables → Actions → Variables** 에
`VITE_BASE`(예: `/qsign/`)를 추가해요. 로컬에서는 `.env.example`을 `.env`로 복사해 바꿔요.

## 저장 구조

| 대상 | 저장소 |
|---|---|
| 공연 목록, 신호 목록, 설정 | localStorage (`qsign:shows`, `qsign:show:{id}`) |
| 음원 파일 | IndexedDB `qsign-db` / `audio` |

브라우저 데이터를 지우면 공연과 음원도 함께 지워집니다. 중요한 공연은 꼭 **내보내기**로 zip 파일을 보관하세요.

## 기술

React 18 · TypeScript · Vite · Web Audio API · IndexedDB(idb) · JSZip · lucide-react ·
Pretendard / Space Grotesk / JetBrains Mono (모두 자체 호스팅)

---

Created by. [교육뮤지컬 꿈꾸는 치수쌤](https://litt.ly/chichiboo)
