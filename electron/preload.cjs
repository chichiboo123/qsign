// 웹 앱에서 쓸 수 있는 윈도우 프로그램 기능 (전체 화면, 화면 꺼짐 방지)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('qsignDesktop', {
  isDesktop: true,
  setFullScreen: (on) => ipcRenderer.invoke('qsign:setFullScreen', on),
  isFullScreen: () => ipcRenderer.invoke('qsign:isFullScreen'),
  preventSleep: (on) => ipcRenderer.invoke('qsign:preventSleep', on),
  onFullScreenChange: (cb) => {
    const handler = (_e, value) => cb(value);
    ipcRenderer.on('qsign:fullscreen', handler);
    return () => ipcRenderer.removeListener('qsign:fullscreen', handler);
  },
});
