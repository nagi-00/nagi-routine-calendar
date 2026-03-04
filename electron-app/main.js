const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(app.getPath('userData'), 'nagi-data.json');
const pkg = require('./package.json');

const DEFAULT_DATA = {
  calendars: [],
  settings: {
    bgColor: '#EEEAE3',
    bgDark: '#CEC8BE',
    bgLight: '#FFFFFF',
    subtitle: '내면의 성장을 향한 여정',
    focusMessages: [
      "오늘도 한 걸음씩, 꾸준히.",
      "작은 변화가 큰 성장을 만든다.",
      "지금 이 순간이 가장 중요하다.",
      "매일의 기록이 당신의 역사가 된다.",
      "포기하지 않는 것이 가장 큰 용기다."
    ]
  }
};

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return DEFAULT_DATA;
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DATA;
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

let mainWin = null;
let alwaysOnTopEnabled = false;

function buildMenu() {
  const template = [
    {
      label: '데이터',
      submenu: [
        {
          label: '백업 저장',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            const data = loadData();
            const { filePath, canceled } = await dialog.showSaveDialog(mainWin, {
              title: '데이터 백업',
              defaultPath: `nagi-backup-${new Date().toISOString().slice(0,10)}.json`,
              filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (canceled || !filePath) return;
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
            dialog.showMessageBox(mainWin, {
              type: 'info',
              title: '백업 완료',
              message: '데이터가 저장되었어요.',
              detail: filePath
            });
          }
        },
        {
          label: '백업 불러오기',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            const { filePaths, canceled } = await dialog.showOpenDialog(mainWin, {
              title: '백업 불러오기',
              filters: [{ name: 'JSON', extensions: ['json'] }],
              properties: ['openFile']
            });
            if (canceled || !filePaths[0]) return;
            try {
              const raw = fs.readFileSync(filePaths[0], 'utf-8');
              const parsed = JSON.parse(raw);
              saveData(parsed);
              mainWin.webContents.send('menu:action', 'reload');
              dialog.showMessageBox(mainWin, {
                type: 'info',
                title: '복원 완료',
                message: '데이터를 불러왔어요. 앱이 새로고침됩니다.'
              });
            } catch {
              dialog.showMessageBox(mainWin, {
                type: 'error',
                title: '오류',
                message: '올바른 백업 파일이 아닌 것 같아요.'
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: '데이터 초기화',
          click: async () => {
            const { response } = await dialog.showMessageBox(mainWin, {
              type: 'warning',
              title: '데이터 초기화',
              message: '모든 달력과 설정이 삭제됩니다.',
              detail: '이 작업은 되돌릴 수 없어요. 계속할까요?',
              buttons: ['취소', '초기화'],
              defaultId: 0,
              cancelId: 0
            });
            if (response !== 1) return;
            saveData(DEFAULT_DATA);
            mainWin.webContents.send('menu:action', 'reload');
          }
        }
      ]
    },
    {
      label: '보기',
      submenu: [
        {
          label: '전체 메모 보기',
          accelerator: 'CmdOrCtrl+M',
          click: () => mainWin.webContents.send('menu:action', 'showMemos')
        },
        {
          label: '달성 통계',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWin.webContents.send('menu:action', 'showStats')
        }
      ]
    },
    {
      label: '앱',
      submenu: [
        {
          label: '항상 위에 표시',
          type: 'checkbox',
          checked: alwaysOnTopEnabled,
          click: (menuItem) => {
            alwaysOnTopEnabled = menuItem.checked;
            mainWin.setAlwaysOnTop(alwaysOnTopEnabled);
          }
        },
        { type: 'separator' },
        {
          label: `nagi calendar v${pkg.version}에 대하여`,
          click: () => {
            dialog.showMessageBox(mainWin, {
              type: 'info',
              title: 'nagi : calendar',
              message: `nagi : calendar  v${pkg.version}`,
              detail: 'As time goes by,\ncolor our moments with routines and daily records.\n\nⓒ 2026. nagi All rights reserved.'
            });
          }
        }
      ]
    }
  ];

  return Menu.buildFromTemplate(template);
}

function createWindow() {
  let iconPath;
  try { iconPath = path.join(__dirname, 'favi.ico'); } catch { iconPath = undefined; }

  mainWin = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 780,
    minHeight: 560,
    backgroundColor: '#EEEAE3',
    title: 'nagi : calendar',
    ...(iconPath ? { icon: iconPath } : {}),
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWin.loadFile(path.join(__dirname, 'index.html'));
  mainWin.once('ready-to-show', () => mainWin.show());

  Menu.setApplicationMenu(buildMenu());
}

ipcMain.handle('data:get', () => loadData());
ipcMain.handle('data:save', (_, data) => { saveData(data); return true; });

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
