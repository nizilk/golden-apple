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

    // 保存为 GoldenApple 的全局资源目录。
    // XHS、Library 等功能以后共用这里。
    let settings = {};

    try{

      const text =
        await fs.readFile(
          SETTINGS_FILE,
          "utf8"
        );

      settings =
        JSON.parse(text);

    }catch(error){

      if(error.code !== "ENOENT"){
        console.warn(
          "读取 settings.json 失败：",
          error
        );
      }

    }

    settings.version =
      settings.version || 1;

    settings.resourceRoot =
      resourceRootPath;

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

    return resourceRootPath;

  }
);


ipcMain.handle(
  "resource:getCurrent",
  async () => {

    // 如果当前 Electron 进程已经有路径，
    // 直接返回。
    if(resourceRootPath){

      return resourceRootPath;

    }

    // 否则从全局 settings.json 恢复。
    try{

      const text =
        await fs.readFile(
          SETTINGS_FILE,
          "utf8"
        );

      const settings =
        JSON.parse(text);

      const savedPath =
        settings.resourceRoot;

      if(!savedPath){
        return null;
      }

      // 确认路径仍然存在。
      await fs.access(
        savedPath
      );

      resourceRootPath =
        savedPath;

      return resourceRootPath;

    }catch(error){

      resourceRootPath =
        null;

      return null;

    }

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
  "resource:relativePath",
  async (
    _event,
    absolutePath
  ) => {

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
        absolutePath
      );

    if(
      target !== root &&
      !target.startsWith(
        root + path.sep
      )
    ){
      throw new Error(
        "所选文件不在当前资源文件夹内。"
      );
    }

    return path
      .relative(root, target)
      .split(path.sep)
      .join("/");

  }
);


ipcMain.handle(
  "resource:readBinary",
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

    return new Uint8Array(buffer);

  }
);



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

// main.js:DATA_ROOT
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

const LIB_DATA_ROOT =
  path.join(
    DATA_ROOT,
    "private-library"
  );

const LIB_ARTICLES_ROOT =
  path.join(
    LIB_DATA_ROOT,
    "articles"
  );

const LIB_PAGES_FILE =
  path.join(
    LIB_DATA_ROOT,
    "pages.json"
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

  await fs.mkdir(
    LIB_ARTICLES_ROOT,
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

      icon:
        path.join(
          XHS_DATA_ROOT,
          "favicon.png"
        ),

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

    // 启动时恢复上一次使用的资源文件夹。
    try{

      const text =
        await fs.readFile(
          SETTINGS_FILE,
          "utf8"
        );

      const settings =
        JSON.parse(text);

      const savedPath =
        settings.resourceRoot;

      if(savedPath){

        await fs.access(
          savedPath
        );

        resourceRootPath =
          savedPath;

      }

    }catch(error){

      // settings 不存在、路径失效或 JSON 损坏，
      // 都不阻止程序启动。
      resourceRootPath =
        null;

    }

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



// ============================================================
// 读取所有文章
// ============================================================

ipcMain.handle(
  "library:listArticles",
  async () => {

    await fs.mkdir(
      LIB_ARTICLES_ROOT,
      {
        recursive: true
      }
    );

    const files =
      await fs.readdir(
        LIB_ARTICLES_ROOT
      );

    const articles = [];

    for(const file of files){

      if(
        !file.toLowerCase().endsWith(".json")
      ){
        continue;
      }

      try{

        const fullPath =
          path.join(
            LIB_ARTICLES_ROOT,
            file
          );

        const text =
          await fs.readFile(
            fullPath,
            "utf8"
          );

        const article =
          JSON.parse(text);

        if(article && article.id){
          articles.push(article);
        }

      }catch(error){

        console.warn(
          "无法读取 Library JSON:",
          file,
          error
        );

      }

    }

    return articles;

  }
);


// ============================================================
// 保存单篇文章
// ============================================================

ipcMain.handle(
  "library:saveArticle",
  async (
    event,
    article
  ) => {

    if(
      !article ||
      typeof article !== "object" ||
      !article.id
    ){

      throw new Error(
        "无效的 Library 文章数据。"
      );

    }

    await fs.mkdir(
      LIB_ARTICLES_ROOT,
      {
        recursive: true
      }
    );

    const filename =
      `${article.id}.json`;

    const filePath =
      path.join(
        LIB_ARTICLES_ROOT,
        filename
      );

    await fs.writeFile(
      filePath,
      JSON.stringify(
        article,
        null,
        2
      ),
      "utf8"
    );

    return true;

  }
);


// ============================================================
// 删除文章
// ============================================================

ipcMain.handle(
  "library:deleteArticle",
  async (
    event,
    articleId
  ) => {

    if(
      typeof articleId !== "string" ||
      !articleId
    ){

      throw new Error(
        "无效的文章 ID。"
      );

    }

    const filePath =
      path.join(
        LIB_ARTICLES_ROOT,
        `${articleId}.json`
      );

    try{

      await fs.unlink(
        filePath
      );

    }catch(error){

      if(error.code !== "ENOENT"){
        throw error;
      }

    }

    return true;

  }
);


// ============================================================
// Pages
// ============================================================

ipcMain.handle(
  "library:readPages",
  async () => {

    try {

      const text =
        await fs.readFile(
          LIB_PAGES_FILE,
          "utf8"
        );

      const data =
        JSON.parse(text);

      return {
        home:
          data?.home || null,

        list:
          Array.isArray(data?.list)
            ? data.list
            : []
      };

    } catch(error) {

      if(error.code === "ENOENT") {

        return {
          home: null,
          list: []
        };

      }

      throw error;

    }

  }
);


ipcMain.handle(
  "library:savePages",
  async (
    _event,
    pagesData
  ) => {

    if(
      !pagesData ||
      typeof pagesData !== "object"
    ){

      throw new Error(
        "Library pages 数据无效。"
      );

    }

    const data = {
      home:
        pagesData.home || null,

      list:
        Array.isArray(pagesData.list)
          ? pagesData.list
          : []
    };

    await fs.mkdir(
      LIB_DATA_ROOT,
      {
        recursive: true
      }
    );

    await fs.writeFile(
      LIB_PAGES_FILE,
      JSON.stringify(
        data,
        null,
        2
      ),
      "utf8"
    );

    return true;

  }
);


ipcMain.handle(
  "library:chooseArticleFile",
  async () => {

    const result =
      await dialog.showOpenDialog(
        mainWindow,
        {
          properties: [
            "openFile"
          ],

          filters: [
            {
              name: "Word 文档",
              extensions: [
                "docx"
              ]
            }
          ]

        }
      );

    if(
      result.canceled ||
      result.filePaths.length === 0
    ){

      return null;

    }

    const filePath =
      result.filePaths[0];

    const buffer =
      await fs.readFile(
        filePath
      );

    return {
      path: filePath,
      name: path.basename(filePath),
      data: buffer.toString(
        "base64"
      )
    };

  }
);


ipcMain.handle(
  "library:readArticleFile",
  async (
    _event,
    filePath
  ) => {

    if(
      typeof filePath !== "string" ||
      !filePath
    ){
      throw new Error(
        "无效的文章文件路径。"
      );
    }

    return await fs.readFile(
      filePath
    );

  }
);
