/**
 * 큐싸인 윈도우 프로그램 (Electron)
 * - 웹 앱(dist/)을 app://qsign/ 주소로 열어서 저장소(공연·음원)가 한곳에 안정적으로 남게 한다.
 * - 인터넷 없이 동작하고, 메뉴 막대를 숨겨 실수로 새로고침하지 않게 한다.
 * - 공연 중 창을 닫으려 하면 확인창을 띄운다.
 */
const { app, BrowserWindow, Menu, dialog, ipcMain, net, powerSaveBlocker, protocol, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');
const APP_URL = 'app://qsign/index.html';
// CI에서 프로그램이 제대로 켜지는지만 확인하고 끝내는 모드
const SMOKE = process.argv.includes('--smoke-test');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

if (!SMOKE && !app.requestSingleInstanceLock()) {
  app.quit();
}

/** @type {BrowserWindow | null} */
let win = null;
let sleepBlocker = null;

function serveApp() {
  protocol.handle('app', (request) => {
    let rel = decodeURIComponent(new URL(request.url).pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(DIST, rel));
    // dist 폴더 밖의 파일은 주지 않는다
    if (!file.startsWith(DIST)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1000,
    minHeight: 640,
    title: '큐싸인',
    backgroundColor: '#0d1017',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      // 공연 모드에서 첫 소리가 바로 나도록
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  Menu.setApplicationMenu(null);
  win.loadURL(APP_URL);
  win.once('ready-to-show', () => {
    if (!SMOKE) win.show();
  });

  // 바깥 링크(푸터 등)는 기본 브라우저로 연다
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('app://')) return;
    e.preventDefault();
    if (/^https?:/i.test(url)) void shell.openExternal(url);
  });

  // 공연 중(beforeunload 경고)에 창을 닫으려 하면 확인한다
  win.webContents.on('will-prevent-unload', (e) => {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      title: '큐싸인',
      message: '공연 중이에요. 정말 끝낼까요?',
      detail: '지금 나오는 소리가 모두 멈춰요.',
      buttons: ['공연 계속하기', '끝내기'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (choice === 1) e.preventDefault(); // 경고를 무시하고 닫는다
  });

  win.on('enter-full-screen', () => win?.webContents.send('qsign:fullscreen', true));
  win.on('leave-full-screen', () => win?.webContents.send('qsign:fullscreen', false));
  win.on('closed', () => {
    win = null;
  });

  if (SMOKE) runSmokeTest();
}

/** CI 점검: 첫 화면·글꼴·저장소가 동작하는지 보고 종료 코드로 알린다 */
function runSmokeTest() {
  const fail = (why) => {
    console.error('SMOKE FAIL:', why);
    app.exit(1);
  };
  setTimeout(() => fail('시간 초과'), 30000);
  win.webContents.once('did-fail-load', (_e, code, desc) => fail(`불러오기 실패 ${code} ${desc}`));
  win.webContents.once('did-finish-load', async () => {
    try {
      await new Promise((r) => setTimeout(r, 2500));
      const result = await win.webContents.executeJavaScript(`(async () => {
        await document.fonts.ready;
        localStorage.setItem('qsign:smoke', '1');
        const idbOk = await new Promise((res) => {
          const req = indexedDB.open('qsign-smoke', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('s');
          req.onsuccess = () => { req.result.close(); res(true); };
          req.onerror = () => res(false);
        });
        return {
          home: !!document.querySelector('.home'),
          title: document.title,
          desktop: !!window.qsignDesktop,
          fonts: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))],
          localStorage: localStorage.getItem('qsign:smoke') === '1',
          indexedDB: idbOk,
          audio: typeof AudioContext === 'function',
          secure: window.isSecureContext,
        };
      })()`);
      console.log('SMOKE', JSON.stringify(result));
      const ok =
        result.home && result.desktop && result.fonts.length >= 3 && result.localStorage && result.indexedDB && result.audio;
      if (!ok) return fail('점검 항목 실패');
      console.log('SMOKE OK');
      app.exit(0);
    } catch (err) {
      fail(String(err));
    }
  });
}

ipcMain.handle('qsign:setFullScreen', (_e, on) => {
  win?.setFullScreen(!!on);
  return !!win?.isFullScreen();
});
ipcMain.handle('qsign:isFullScreen', () => !!win?.isFullScreen());
ipcMain.handle('qsign:preventSleep', (_e, on) => {
  if (on && sleepBlocker === null) sleepBlocker = powerSaveBlocker.start('prevent-display-sleep');
  if (!on && sleepBlocker !== null) {
    powerSaveBlocker.stop(sleepBlocker);
    sleepBlocker = null;
  }
});

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  serveApp();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
