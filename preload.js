const {
  contextBridge,
  ipcRenderer
} = require("electron");


contextBridge.exposeInMainWorld(
  "electronAPI",
  {

    chooseResourceFolder:
      () =>
        ipcRenderer.invoke(
          "resource:choose"
        ),

    getSavedResourceFolder:
      () =>
        ipcRenderer.invoke(
          "resource:getSaved"
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

  }
);
