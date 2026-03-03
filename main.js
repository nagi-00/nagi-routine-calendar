const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(app.getPath('userData'), 'nagi-data.json');

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
    if (!fs.existsSync(DATA_FILE)) {
      return DEFAULT_DATA;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT_DATA;
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function createWindow() {
  let iconPath;
  try {
    iconPath = path.join(__dirname, 'favi.ico');
  } catch (e) {
    iconPath = undefined;
  }

  const win = new BrowserWindow({
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

  win.loadFile('index.html');

  win.once('ready-to-show', () => {
    win.show();
  });
}

ipcMain.handle('data:get', () => {
  return loadData();
});

ipcMain.handle('data:save', (event, data) => {
  saveData(data);
  return true;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
