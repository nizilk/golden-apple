const {
  contextBridge,
  ipcRenderer,
  webUtils
} = require("electron");


contextBridge.exposeInMainWorld(
  "electronAPI",
  {

    chooseResourceFolder:
      () =>
        ipcRenderer.invoke(
          "resource:choose"
        ),

    getCurrentResourceFolder:
      () =>
        ipcRenderer.invoke(
          "resource:getCurrent"
        ),

    getFilePath:
      file =>
        webUtils.getPathForFile(file),

    getResourceRelativePath:
      absolutePath =>
        ipcRenderer.invoke(
          "resource:relativePath",
          absolutePath
        ),

    readResourceFile:
      relativePath =>
        ipcRenderer.invoke(
          "resource:readBinary",
          relativePath
        ),

    getXhsDataDirectory:
      () =>
        ipcRenderer.invoke(
          "storage:getXhsDirectory"
        ),

    readDataFile:
      (relativePath) =>
        ipcRenderer.invoke(
          "data:read",
          relativePath
        ),

    writeDataFile:
      (relativePath, data) =>
        ipcRenderer.invoke(
          "data:write",
          relativePath,
          data
        ),

    deleteDataFile:
      (relativePath) =>
        ipcRenderer.invoke(
          "data:delete",
          relativePath
        ),

    createDataDirectory:
      (relativePath) =>
        ipcRenderer.invoke(
          "data:mkdir",
          relativePath
        ),

    listResourceDirectory:
      (relativePath) =>
        ipcRenderer.invoke(
          "resource:list",
          relativePath
        ),

    readResourceDataURL:
      (relativePath) =>
        ipcRenderer.invoke(
          "resource:readDataURL",
          relativePath
        ),

    readDataURL:
      (relativePath) =>
        ipcRenderer.invoke(
          "data:readDataURL",
          relativePath
        ),

    listDataDirectory:
      (relativePath) =>
        ipcRenderer.invoke(
          "data:list",
          relativePath
        ),

    writeDataBinary:
      async (
        relativePath,
        blob
      ) => {

        const arrayBuffer =
          await blob.arrayBuffer();

        return await ipcRenderer.invoke(
          "data:writeBinary",
          relativePath,
          arrayBuffer
        );

      },

    readSettings:
      () =>
        ipcRenderer.invoke(
          "settings:read"
        ),

    writeSettings:
      settings =>
        ipcRenderer.invoke(
          "settings:write",
          settings
        ),

    listLibraryArticles:
      () =>
        ipcRenderer.invoke(
          "library:listArticles"
        ),

    saveLibraryArticle:
      article =>
        ipcRenderer.invoke(
          "library:saveArticle",
          article
        ),

    deleteLibraryArticle:
      articleId =>
        ipcRenderer.invoke(
          "library:deleteArticle",
          articleId
        ),

    chooseLibraryArticleFile:
      () =>
        ipcRenderer.invoke(
          "library:chooseArticleFile"
        ),

    loadLibraryPages:
      () =>
        ipcRenderer.invoke(
          "library:readPages"
        ),

    saveLibraryPages:
      pagesData =>
        ipcRenderer.invoke(
          "library:savePages",
          pagesData
        ),

  }
);
