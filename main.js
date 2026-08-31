const {
  app,
  BrowserWindow,
  ipcMain,
  dialog
} = require("electron");

const path = require("node:path");
const fs = require("node:fs/promises");

let mainWindow = null;
let resourceRootPath = null;


// ============================================================
// 选择资源文件夹
// ============================================================
ipcMain.handle(
  "resource:choose",
  async () => {

    const result =
      await dialog.showOpenDialog(
        mainWindow,
        {
          properties: [
            "openDirectory"
          ]
        }
      );


    if(
      result.canceled ||
      result.filePaths.length === 0
    ){

      return null;

    }


    resourceRootPath =
      result.filePaths[0];


    return resourceRootPath;

  }
);


function getSafeResourcePath(
  relativePath
){

  if(!resourceRootPath){

    throw new Error(
      "尚未选择资源文件夹"
    );

  }


  const root =
    path.resolve(
      resourceRootPath
    );


  const target =
    path.resolve(
      resourceRootPath,
      relativePath
    );


  if(
    target !== root &&
    !target.startsWith(
      root + path.sep
    )
  ){

    throw new Error(
      "Invalid resource path"
    );

  }


  return target;

}

ipcMain.handle(
  "resource:list",
  async (
    _event,
    relativePath = ""
  ) => {

    const dirPath =
      getSafeResourcePath(
        relativePath
      );


    const entries =
      await fs.readdir(
        dirPath,
        {
          withFileTypes: true
        }
      );


    return entries.map(
      entry => ({

        name:
          entry.name,

        isFile:
          entry.isFile(),

        isDirectory:
          entry.isDirectory()

      })
    );

  }
);

ipcMain.handle(
  "data:readDataURL",
  async (
    _event,
    relativePath
  ) => {

    const filePath =
      getSafeDataPath(
        relativePath
      );


    const buffer =
      await fs.readFile(
        filePath
      );


    const ext =
      path.extname(
        filePath
      ).toLowerCase();


    const mimeMap = {

      ".png":
        "image/png",

      ".jpg":
        "image/jpeg",

      ".jpeg":
        "image/jpeg",

      ".gif":
        "image/gif",

      ".webp":
        "image/webp",

      ".bmp":
        "image/bmp",

      ".avif":
        "image/avif",

      ".mp4":
        "video/mp4",

      ".webm":
        "video/webm",

      ".mov":
        "video/quicktime",

      ".m4v":
        "video/x-m4v"

    };


    const mime =
      mimeMap[ext] ||
      "application/octet-stream";


    return `data:${mime};base64,${buffer.toString("base64")}`;

  }
);


ipcMain.handle(
  "resource:readDataURL",
  async (
    _event,
    relativePath
  ) => {

    const filePath =
      getSafeResourcePath(
        relativePath
      );


    const buffer =
      await fs.readFile(
        filePath
      );


    const ext =
      path.extname(
        filePath
      ).toLowerCase();


    const mimeMap = {

      ".png":
        "image/png",

      ".jpg":
        "image/jpeg",

      ".jpeg":
        "image/jpeg",

      ".gif":
        "image/gif",

      ".webp":
        "image/webp",

      ".bmp":
        "image/bmp",

      ".avif":
        "image/avif",

      ".mp4":
        "video/mp4",

      ".webm":
        "video/webm",

      ".mov":
        "video/quicktime",

      ".m4v":
        "video/x-m4v"

    };


    const mime =
      mimeMap[ext] ||
      "application/octet-stream";


    return `data:${mime};base64,${buffer.toString("base64")}`;

  }
);


ipcMain.handle(
  "data:writeBinary",
  async (
    _event,
    relativePath,
    arrayBuffer
  ) => {

    const filePath =
      getSafeDataPath(
        relativePath
      );


    await fs.mkdir(
      path.dirname(filePath),
      {
        recursive: true
      }
    );


    await fs.writeFile(
      filePath,
      Buffer.from(arrayBuffer)
    );


    return true;

  }
);



ipcMain.handle(
  "data:list",
  async (
    _event,
    relativePath
  ) => {

    const dirPath =
      getSafeDataPath(
        relativePath
      );


    const entries =
      await fs.readdir(
        dirPath,
        {
          withFileTypes: true
        }
      );


    return entries.map(
      entry => ({

        name:
          entry.name,

        isFile:
          entry.isFile(),

        isDirectory:
          entry.isDirectory()

      })
    );

  }
);



// ============================================================
// 路径
// ============================================================

// main.js:
// D:\GoldenApple\app\main\main.js

const APP_ROOT = path.resolve(
  __dirname,
  ".."
);

// D:\GoldenApple
const PROJECT_ROOT = path.resolve(
  APP_ROOT,
  ".."
);

// D:\GoldenApple\data
const DATA_ROOT = path.join(
  PROJECT_ROOT,
  "data"
);

// D:\GoldenApple\data\private-xhs
const XHS_DATA_ROOT = path.join(
  DATA_ROOT,
  "private-xhs"
);

const SETTINGS_FILE = path.join(
  DATA_ROOT,
  "settings.json"
);


// ============================================================
// 安全的数据路径
// ============================================================

function getSafeDataPath(relativePath) {

  const root = path.resolve(
    XHS_DATA_ROOT
  );

  const target = path.resolve(
    XHS_DATA_ROOT,
    relativePath
  );

  if (
    target !== root &&
    !target.startsWith(root + path.sep)
  ) {
    throw new Error(
      "Invalid data path"
    );
  }

  return target;
}


// ============================================================
// 创建数据目录
// ============================================================

async function ensureDataDirectories() {

  await fs.mkdir(
    DATA_ROOT,
    {
      recursive: true
    }
  );

  await fs.mkdir(
    XHS_DATA_ROOT,
    {
      recursive: true
    }
  );

}




// ============================================================
// 获取 XHS 数据目录
// ============================================================

ipcMain.handle(
  "storage:getXhsDirectory",
  async () => {

    await ensureDataDirectories();

    return XHS_DATA_ROOT;

  }
);


// ============================================================
// 读取数据文件
// ============================================================

ipcMain.handle(
  "data:read",
  async (
    _event,
    relativePath
  ) => {

    const filePath =
      getSafeDataPath(
        relativePath
      );

    return await fs.readFile(
      filePath,
      "utf8"
    );

  }
);


// ============================================================
// 写入数据文件
// ============================================================

ipcMain.handle(
  "data:write",
  async (
    _event,
    relativePath,
    data
  ) => {

    const filePath =
      getSafeDataPath(
        relativePath
      );

    await fs.mkdir(
      path.dirname(filePath),
      {
        recursive: true
      }
    );

    await fs.writeFile(
      filePath,
      data,
      "utf8"
    );

    return true;

  }
);


// ============================================================
// 删除数据文件
// ============================================================

ipcMain.handle(
  "data:delete",
  async (
    _event,
    relativePath
  ) => {

    const filePath =
      getSafeDataPath(
        relativePath
      );

    await fs.rm(
      filePath,
      {
        force: true
      }
    );

    return true;

  }
);


// ============================================================
// 创建数据目录
// ============================================================

ipcMain.handle(
  "data:mkdir",
  async (
    _event,
    relativePath
  ) => {

    const dirPath =
      getSafeDataPath(
        relativePath
      );

    await fs.mkdir(
      dirPath,
      {
        recursive: true
      }
    );

    return true;

  }
);


// ============================================================
// 创建窗口
// ============================================================

function createWindow() {

  mainWindow =
    new BrowserWindow({

      width: 1440,

      height: 900,

      minWidth: 1000,

      minHeight: 700,

      webPreferences: {

        preload:
          path.join(
            APP_ROOT,
            "preload",
            "preload.js"
          ),

        contextIsolation: true,

        nodeIntegration: false

      }

    });


  // 删除 Electron 默认菜单栏
  mainWindow.setMenu(null);


  // 加载 GoldenApple 首页
  mainWindow.loadFile(
    path.join(
      APP_ROOT,
      "renderer",
      "index.html"
    )
  );

}


// ============================================================
// Electron 启动
// ============================================================

app.whenReady().then(
  async () => {

    await ensureDataDirectories();

    createWindow();

  }
);


app.on(
  "window-all-closed",
  () => {

    if (
      process.platform !== "darwin"
    ) {

      app.quit();

    }

  }
);


// ============================================================
// settings
// ============================================================

ipcMain.handle(
  "settings:read",
  async () => {

    try {

      const text =
        await fs.readFile(
          SETTINGS_FILE,
          "utf8"
        );

      return JSON.parse(text);

    } catch (error) {

      if(error.code === "ENOENT") {
        return {};
      }

      throw error;

    }

  }
);


ipcMain.handle(
  "settings:write",
  async (event, settings) => {

    await fs.mkdir(
      DATA_ROOT,
      {
        recursive: true
      }
    );

    await fs.writeFile(
      SETTINGS_FILE,
      JSON.stringify(
        settings,
        null,
        2
      ),
      "utf8"
    );

    return true;

  }
);
