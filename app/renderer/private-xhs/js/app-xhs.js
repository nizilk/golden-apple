
// ============================================================
// path
// ============================================================

function joinPath(...parts) {
    return parts
        .filter(p => p !== undefined && p !== null && p !== '')
        .map((p, i) => {
            p = String(p);
            if (i === 0) return p.replace(/[\\/]+$/, '');
            return p.replace(/^[\\/]+|[\\/]+$/g, '');
        })
        .join('/');
}

const path_xhs = 'private-xhs'
const path_media = joinPath(path_xhs, "media")

// ============================================================
// Electron 本地数据存储
// ============================================================

const electronStorage = {

  async readText(path) {

    path = joinPath(path_xhs, path)

    return await window.electronAPI
      .readDataFile(path);

  },


  async writeText(path, text) {

    path = joinPath(path_xhs, path)

    return await window.electronAPI
      .writeDataFile(
        path,
        text
      );

  },


  async delete(path) {

    path = joinPath(path_xhs, path)

    return await window.electronAPI
      .deleteDataFile(path);

  },


  async mkdir(path) {

    path = joinPath(path_xhs, path)

    return await window.electronAPI
      .createDataDirectory(path);

  },


  async list(path) {

    path = joinPath(path_xhs, path)

    return await window.electronAPI
      .listDataDirectory(path);

  }

};




/* ================= state ================= */
let resourceRootPath = null;

let allPosts = [];

let activeTag = null;
let activePage = null;
let searchTerm = "";

let pages = [];

let homePageId = null;
let editingPageId = null;

let editingId = null;
let editingComments = [];
let replyTarget = null;
let editingMedia = [];
let editingCommentId = null;

const pendingUploads = new Map();

function genId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function escapeHtml(s){ return (s||"").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function colorFor(name){
  const palette = ["#D94F63","#4F8CD9","#4FAF6D","#C98A3B","#8F63D9","#3BAFA3"];
  let h = 0; for(const ch of (name||"?")) h = (h*31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}


/* ================= theme ================= */
function applyTheme(theme){
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem("myXHS_theme", theme);
  const btn = document.getElementById("themeToggle");
  if(btn) btn.textContent = theme === "dark" ? "☀" : "☾";
}
document.getElementById("themeToggle").onclick = ()=>{
  applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
};
applyTheme(localStorage.getItem("myXHS_theme") || "light");





async function init(){

  const pagesData =
    await loadPagesData();

  pages =
    pagesData.list || [];

  homePageId =
    pagesData.home || null;

  activePage =
    homePageId || null;

  await reload();

  const savedPath =
    await window.electronAPI
      .getCurrentResourceFolder();

  if(savedPath){

    await connectFolder(
      savedPath
    );

  }

}



async function connectFolder(
  existingPath = null
){

  try{

    let selectedPath =
        existingPath;

    if(!selectedPath){

        selectedPath =
            await window.electronAPI.chooseResourceFolder();

        if(!selectedPath){

            return;

        }

    }

    resourceRootPath =
        selectedPath;


    const pagesData =
      await loadPagesData();


    pages =
      pagesData.list || [];

    homePageId =
      pagesData.home || null;


    activePage =
      homePageId || null;


    const currentFolderName =
      document.getElementById(
        "currentFolderName"
      );

    currentFolderName.textContent =
      `📁 ${selectedPath.split("\\").pop()}`;

    currentFolderName.onclick = () => {
      connectFolder();
    };


    await reload();

  }catch(err){

    console.error(err);

    showToast(
      `初始化失败：${err.message || err.name}`
    );

  }

}


/* ================= lazy media library ================= */

function isMediaName(name){
  return /\.(png|jpe?g|gif|webp|bmp|avif|mp4|webm|mov|m4v)$/i.test(name);
}

function isVideoName(name){
  return /\.(mp4|webm|mov|m4v)$/i.test(name);
}


async function getPickerChildrenFromDisk(
  prefix
){

  const entries =
    await window.electronAPI
      .listResourceDirectory(
        prefix
      );


  const folders = [];
  const files = [];


  for(const entry of entries){

    const fullPath =
      prefix
        ? `${prefix}/${entry.name}`
        : entry.name;


    if(entry.isDirectory){

      folders.push({

        name: entry.name,

        path:
          `${fullPath}/`

      });

    }


    else if(
      entry.isFile &&
      isMediaName(entry.name)
    ){

      files.push({

        name: entry.name,

        path: fullPath,

        absolutePath: `${resourceRootPath}/${fullPath}`

      });

    }

  }


  folders.sort(
    (a,b) =>
      a.name.localeCompare(
        b.name,
        "zh-CN"
      )
  );


  files.sort(
    (a,b) =>
      a.name.localeCompare(
        b.name,
        "zh-CN"
      )
  );


  return {
    folders,
    files
  };

}


async function loadPagesData(){

  try{

    const text =
      await electronStorage.readText(
        "pages.json"
      );


    if(!text){

      return {
        home: null,
        list: []
      };

    }


    const data =
      JSON.parse(text);


    return {

      home:
        data.home || null,

      list:
        Array.isArray(data.list)
          ? data.list
          : []

    };

  }catch(error){

    console.error(
      "读取 pages.json 失败：",
      error
    );


    return {

      home: null,

      list: []

    };

  }

}

async function savePagesDataWithList(
  list,
  home = homePageId
){

  await electronStorage.writeText(

    "pages.json",

    JSON.stringify(

      {
        home: home || null,
        list: list || []
      },

      null,

      2

    )

  );

}


async function savePagesData(){
  await savePagesDataWithList(pages, homePageId);
}

function pageIncludesPost(pg, p){
  if((pg.excludes||[]).includes(p.id)) return false;
  if((pg.includes||[]).includes(p.id)) return true;
  return (p.tags||[]).some(t => (pg.tags||[]).includes(t));
}
async function togglePageMembership(pg, p){
  const wasIn = pageIncludesPost(pg, p);
  pg.includes = (pg.includes||[]).filter(id => id !== p.id);
  pg.excludes = (pg.excludes||[]).filter(id => id !== p.id);
  if(wasIn) pg.excludes.push(p.id);
  else pg.includes.push(p.id);
  await savePagesData();
}


/* ================= disk I/O: posts stored as JSON ================= */

async function getAllPostsFromDisk(){

  const posts = [];

  try{

    const entries =
      await electronStorage.list("posts");

    for(const entry of entries){

      if(
        !entry.isFile ||
        !entry.name.toLowerCase().endsWith(".json")
      ){

        continue;

      }

      try{

        const text =
          await electronStorage.readText(
            `posts/${entry.name}`
          );

        const post =
          JSON.parse(text);

        /*
         * 兼容性保护：
         * 不主动删除任何未知字段。
         * 只给旧/缺失字段提供默认值。
         */

        if(!post.id){

          post.id =
            entry.name.replace(
              /\.json$/i,
              ""
            );

        }

        if(!Array.isArray(post.tags)){
          post.tags = [];
        }

        if(!Array.isArray(post.comments)){
          post.comments = [];
        }

        if(!Array.isArray(post.media)){
          post.media = [];
        }

        posts.push(post);

      }catch(error){

        console.error(
          `读取帖子 JSON 失败：${entry.name}`,
          error
        );

      }

    }

  }catch(error){

    console.error(
      "读取 posts 目录失败：",
      error
    );

  }

  posts.sort(
    (a,b) =>
      (b.createdAt || 0) -
      (a.createdAt || 0)
  );

  return posts;

}


async function writePostToDisk(post){

  if(!post || !post.id){

    throw new Error(
      "无法保存帖子：缺少 post.id"
    );

  }

  /*
   * 保证基本字段存在，但不删除任何其他字段。
   */

  if(!Array.isArray(post.tags)){
    post.tags = [];
  }

  if(!Array.isArray(post.comments)){
    post.comments = [];
  }

  if(!Array.isArray(post.media)){
    post.media = [];
  }

  if(!post.createdAt){

    post.createdAt =
      Date.now();

  }

  post.updatedAt =
    Date.now();


  await electronStorage.writeText(

    `posts/${post.id}.json`,

    JSON.stringify(
      post,
      null,
      2
    )

  );

}



async function deletePostFromDisk(post){

  if(!post || !post.id) return;

  try{

    await electronStorage.delete(
      `posts/${post.id}.json`
    );

  }catch(error){

    console.warn(
      "删除帖子 JSON 失败：",
      error
    );

  }


  /*
   * 只删除本程序自己保存到 media/
   * 的媒体文件。
   *
   * type === "asset" 的资源永远不能删除，
   * 因为它属于用户自己的资源文件夹。
   */

  for(
    const m of (post.media || [])
  ){

    if(
      m &&
      m.type === "file" &&
      m.ref
    ){

      try{

        await electronStorage.delete(
          `media/${m.ref}`
        );

      }catch(error){

        console.warn(
          "删除本地媒体失败：",
          m.ref,
          error
        );

      }

    }

  }

}


async function writeMediaFile(
  filename,
  blob
){

  await window.electronAPI.writeDataBinary(
    joinPath(path_media, filename),
    blob
  );

}


async function readMediaBlobURL(
  filename
){

  return await window.electronAPI.readDataURL(
    joinPath(path_media, filename)
  );

}




async function readLibraryBlobURL(
  resourcePath
){

  if(
    /^[A-Za-z]:[\\/]/.test(resourcePath) ||
    resourcePath.startsWith("/")
  ){

    return await window.electronAPI
      .readFileDataURL(
        resourcePath
      );

  }

  return await window.electronAPI
    .readResourceDataURL(
      resourcePath
    );

}

async function getMediaFile(m){

  if(m.type === "file"){

    return await window.electronAPI
      .readDataURL( joinPath(path_media, m.ref) );

  }

  return await window.electronAPI
    .readFileDataURL(
      m.ref
    );

}

function fileToDataURL(file){
  return new Promise((resolve)=>{
    const r = new FileReader();
    r.onload = ()=> resolve(r.result);
    r.readAsDataURL(file);
  });
}
function themeSafeBodyHtml(html){
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  doc.querySelectorAll("[style]").forEach(el=>{
    const style = el.getAttribute("style") || "";
    const cleaned = style
      .replace(/(?:^|;)\s*(?:background|background-color)\s*:[^;]+;?/gi, "")
      .replace(/(?:^|;)\s*color\s*:[^;]+;?/gi, "")
      .trim();
    if(cleaned) el.setAttribute("style", cleaned);
    else el.removeAttribute("style");
  });
  return doc.body.innerHTML;
}

function renderCommentsStatic(comments){
  if(!comments || !comments.length) return "";
  function one(c, depth=1){
    const avatar = depth === 1 ? 30 : 24;
    const fs = depth === 1 ? 12.5 : 10.5;
    return `<div style="display:flex;gap:${depth===1?10:8}px;margin-bottom:14px;">
      <div style="width:${avatar}px;height:${avatar}px;border-radius:50%;background:${colorFor(c.author)};color:#fff;display:flex;align-items:center;justify-content:center;font-size:${fs}px;font-weight:600;flex-shrink:0;">${escapeHtml((c.author||"匿").charAt(0))}</div>
      <div>
        <div style="font-weight:600;font-size:13px;">${escapeHtml(c.author||"匿名")}</div>
        <div style="font-size:13.5px;line-height:1.6;">${c.replyToAuthor ? `回复 <span style="color:#9A8F86;">${escapeHtml(c.replyToAuthor)}</span>: ` : ""}${escapeHtml(c.text)}</div>
        ${(c.replies && c.replies.length && depth===1) ? `<div style="margin-top:10px;padding-left:0;border-left:0;">${c.replies.map(r=>one(r,2)).join("")}</div>` : ""}
      </div>
    </div>`;
  }
  return `<div style="margin-top:16px;border-top:1px solid #EEE3DD;padding-top:16px;">${comments.map(c => one(c, 1)).join("")}</div>`;
}

async function exportPostSnapshot(p){
  showToast("正在导出…");
  const liveSheet = document.getElementById("readerSheet");
  const clone = liveSheet.cloneNode(true);

  for(const el of [...clone.querySelectorAll("img, video")]){
    const isFile = el.hasAttribute("data-file");
    const isAsset = el.hasAttribute("data-asset-path");
    if(!isFile && !isAsset) continue;
    try{
        const m = isFile ? {type:"file", ref: el.getAttribute("data-file")} : {type:"asset", ref: el.getAttribute("data-asset-path")};
        const dataUrl = await getMediaFile(m);

        el.setAttribute("src", dataUrl);
    }catch(e){}
  }

  clone.querySelectorAll(".reader-menu, .reader-bottom, .comment-actions-inline").forEach(el => el.remove());
  clone.removeAttribute("id");
  clone.removeAttribute("style");

  const slideCount = clone.querySelectorAll(".carousel-track > .slide").length;
  const carouselScript = slideCount > 1 ? `
<script>
(function(){
  const track = document.querySelector(".carousel-track");
  const counter = document.querySelector(".car-counter");
  const total = ${slideCount};
  let idx = 0;
  function update(){
    track.style.transform = "translateX(-" + (idx*100) + "%)";
    if(counter) counter.textContent = (idx+1) + " / " + total;
  }
  document.querySelectorAll(".car-arrow").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      idx = (idx + Number(btn.dataset.dir) + total) % total;
      update();
    });
  });
})();
<\/script>` : "";

  const pageStyle = document.querySelector("style").textContent;

  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(p.title || "我的收藏")}</title>
<style>
${pageStyle}
:root{ color-scheme:light !important; }
body{ margin:0; padding:40px 16px; background:#FAF7F5 !important; color:#2B2622 !important; display:flex; justify-content:center; }
.reader-sheet{ position:static !important; width:min(1180px,94vw) !important; height:auto !important; max-height:none !important; box-shadow:none; }
.reader-media{ height:min(860px,80vh); }
.reader-side-content{ overflow-y:visible; }
</style></head>
<body>
${clone.outerHTML}
${carouselScript}
</body></html>`;

    const filename =
    `${(p.title||"未命名")
        .replace(/[\\/:*?"<>|]/g,"")
        .trim()
        .slice(0,40)
        || "未命名"
    }-${p.id.slice(-5)}.html`;

    await electronStorage.writeText(
    `exports/${filename}`,
    html
    );

    showToast(
    `已导出到文件夹：${filename}`
    );

}

async function hydrateMedia(containerEl){
  const els = containerEl.querySelectorAll("[data-file], [data-asset-path]");
  let missing = 0;
  for(const el of els){
    try{
      if(el.hasAttribute("data-file")) el.setAttribute("src", await readMediaBlobURL(el.getAttribute("data-file")));
      else el.setAttribute("src", await readLibraryBlobURL(el.getAttribute("data-asset-path")));
    }catch(e){ missing++; }
  }
  if(missing > 0) showToast(`有 ${missing} 个素材未能显示，原文件可能被移动或删除了`);
}



/* ================= grid ================= */
function plainSnippet(html){
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent.trim().slice(0, 120);
}
function commentsToText(comments){
  let out = "";
  (comments||[]).forEach(c=>{ out += " " + c.text; (c.replies||[]).forEach(r => out += " " + r.text); });
  return out;
}
function matchesSearch(p, term){
  if(!term) return true;
  const hay = [p.title, plainSnippet(p.body), (p.tags||[]).join(" "), p.source||"", p.author||"", commentsToText(p.comments)].join(" ").toLowerCase();
  return hay.includes(term.toLowerCase());
}

let sidebarEditMode = false;    // 右侧正在编辑页面内容
let inlineRenamePageId = null;  // 左栏正在改名字

function renderCategorySidebar(){
  const el = document.getElementById("categorySidebar");
  if(!el) return;

  const homePage = pages.find(pg => pg.id === homePageId);
  const others = pages.filter(pg => pg.id !== homePageId);

  function itemHtml(pg){
    // 正在重命名时，仍然使用原来的原地编辑
    if(inlineRenamePageId === pg.id && sidebarEditMode){
      return `
        <div class="cat-item inline-page-edit ${activePage===pg.id?"active":""}" data-page="${pg.id}">
          <input
            class="inline-page-name-input"
            data-inline-name="${pg.id}"
            value="${escapeHtml(pg.name)}"
            aria-label="页面名称"
          >
          <span class="inline-page-edit-actions">
            <button type="button" class="inline-save-btn" data-inline-save="${pg.id}" title="保存" aria-label="保存"></button>
            <button type="button" data-inline-cancel="${pg.id}" title="取消">✕</button>
          </span>
        </div>
      `;
    }

    return `
      <div class="cat-item ${activePage===pg.id?"active":""}" data-page="${pg.id}">
        <span class="cat-label">${escapeHtml(pg.name)}</span>

        ${sidebarEditMode ? `
          <button
            type="button"
            class="sb-more"
            data-more="${pg.id}"
            title="页面操作"
            aria-label="页面操作"
          >⋯</button>
        ` : ""}
      </div>
    `;
  }

  let html = "";

  // 自定义首页
  if(homePage){
    html += itemHtml(homePage);
  }

  // “全部”是缺省项，不属于 pages
  html += `
    <div class="cat-item ${activePage===null?"active":""}" data-page="">
      <span class="cat-label">全部</span>
    </div>
  `;

  // 其他自定义页面
  others.forEach(pg => {
    html += itemHtml(pg);
  });

  // 管理状态下显示新建
  if(sidebarEditMode){
    html += `
      <div class="cat-item sb-add" id="sbAddPage">
        <span class="cat-label">＋ 新建页面</span>
      </div>
    `;
  }

  // 管理 / 完成
  html += `
    <div class="cat-item cat-manage" id="sidebarEditToggle">
      <span class="cat-label">
        ${sidebarEditMode ? "完成" : "管理"}
      </span>
    </div>
  `;

  el.innerHTML = `
    <div class="sidebar-brand">✿ 我的收藏</div>
    ${html}
  `;


  // --------------------------------------------------
  // 点击页面
  // --------------------------------------------------

  el.querySelectorAll(".cat-item[data-page]").forEach(item=>{
    item.onclick = (e)=>{
      // 点击 ⋯ 时，不切换页面
      if(e.target.closest(".sb-more")) return;

      // 如果正在重命名，也不要触发页面切换
      if(e.target.closest(".inline-page-edit")) return;

      activePage = item.dataset.page || null;

      renderCategorySidebar();
      renderGrid();

      window.scrollTo({
        top:0,
        behavior:"smooth"
      });
    };
  });


  // --------------------------------------------------
  // 页面 ⋯ 菜单
  // --------------------------------------------------

  el.querySelectorAll("[data-more]").forEach(btn=>{
    btn.onclick = (e)=>{
      e.stopPropagation();

      const pageId = btn.dataset.more;
      showPageActionMenu(btn, pageId);
    };
  });


  // --------------------------------------------------
  // 原地重命名
  // --------------------------------------------------

  el.querySelectorAll("[data-inline-save]").forEach(btn=>{
    btn.onclick = async (e)=>{
      e.stopPropagation();

      const id = btn.dataset.inlineSave;
      const pg = pages.find(x=>x.id===id);
      const input = el.querySelector(`[data-inline-name="${id}"]`);

      if(!pg || !input) return;

      const name = input.value.trim();

      if(!name){
        input.focus();
        return;
      }

      pg.name = name;
      inlineRenamePageId = null;

      await savePagesData();
      renderCategorySidebar();
    };
  });


  // --------------------------------------------------
  // 取消重命名
  // --------------------------------------------------

  el.querySelectorAll("[data-inline-cancel]").forEach(btn=>{
    btn.onclick = (e)=>{
      e.stopPropagation();

      inlineRenamePageId = null;
      renderCategorySidebar();
    };
  });


  // --------------------------------------------------
  // 重命名输入框
  // --------------------------------------------------

  el.querySelectorAll("[data-inline-name]").forEach(input=>{
    input.onkeydown = async (e)=>{
      e.stopPropagation();

      if(e.key === "Enter"){
        e.preventDefault();

        const pg = pages.find(
          x => x.id === input.dataset.inlineName
        );

        const name = input.value.trim();

        if(pg && name){
          pg.name = name;
          inlineRenamePageId = null;

          await savePagesData();
          renderCategorySidebar();
        }

      }else if(e.key === "Escape"){
        inlineRenamePageId = null;
        renderCategorySidebar();
      }
    };

    input.onclick = e => e.stopPropagation();
  });


  // --------------------------------------------------
  // 管理 / 完成
  // --------------------------------------------------

  const editToggleBtn = document.getElementById("sidebarEditToggle");

  if(editToggleBtn){
    editToggleBtn.onclick = ()=>{
      sidebarEditMode = !sidebarEditMode;

      // 离开管理模式时，取消正在进行的重命名
      if(!sidebarEditMode){
        inlineRenamePageId = null;
      }

      renderCategorySidebar();
    };
  }


  // --------------------------------------------------
  // 新建页面
  // --------------------------------------------------
  const addBtn = document.getElementById("sbAddPage");

  if(addBtn){
    addBtn.onclick = ()=>{
      openRenameModal(null);
    };
  }
  
}

function showPageActionMenu(anchor, pageId){

  // 如果已经有菜单，先删除
  document.querySelectorAll(".page-action-menu").forEach(el=>{
    el.remove();
  });

  const pg = pages.find(x => x.id === pageId);
  if(!pg) return;

  const menu = document.createElement("div");
  menu.className = "page-action-menu";

  menu.innerHTML = `
    <button type="button" data-action="home">
      ${homePageId === pageId ? "取消首页" : "设为首页"}
    </button>

    <button type="button" data-action="rename">
      重命名
    </button>

    <button type="button" data-action="content">
      编辑内容
    </button>

    <button type="button" data-action="delete" class="danger">
      删除
    </button>
  `;

  document.body.appendChild(menu);

  const rect = anchor.getBoundingClientRect();
  const menuWidth = 160;
  let left = rect.left;
  if(left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;

  menu.style.position = "fixed";
  menu.style.left = `${left}px`;
  menu.style.top = `${rect.bottom + 6}px`;


  // 设为首页
  menu.querySelector('[data-action="home"]').onclick = async ()=>{
    homePageId = (homePageId === pageId) ? null : pageId;

    await savePagesData();

    menu.remove();
    renderCategorySidebar();
  };


  // 重命名
  menu.querySelector('[data-action="rename"]').onclick = ()=>{
    inlineRenamePageId = pageId;

    menu.remove();
    renderCategorySidebar();

    const input = document.querySelector(
      `[data-inline-name="${pageId}"]`
    );

    if(input){
      input.focus();
      input.select();
    }
  };


  // 编辑内容
  menu.querySelector('[data-action="content"]').onclick = ()=>{
    menu.remove();

    enterPageSelectionMode(pageId);
  };


  // 删除
  menu.querySelector('[data-action="delete"]').onclick = async ()=>{

    menu.remove();

    if(!confirm("删除这个页面？（不会删除任何帖子）")){
      return;
    }

    pages = pages.filter(x => x.id !== pageId);

    if(homePageId === pageId){
      homePageId = null;
    }

    if(activePage === pageId){
      activePage = null;
    }

    if(editingPageId === pageId){
      exitPageSelectionMode();
    }

    await savePagesData();

    renderCategorySidebar();
    renderGrid();
  };


  // 点击菜单外关闭
  setTimeout(()=>{
    const closeMenu = (e)=>{

      if(
        !menu.contains(e.target) &&
        e.target !== anchor
      ){
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    };

    document.addEventListener("click", closeMenu);
  }, 0);
}

function searchByTag(tag){
  const input = document.getElementById("searchInput");
  input.value = tag;
  searchTerm = tag;
  document.getElementById("searchClear").style.display = "inline";
  renderGrid();
  window.scrollTo({top:0, behavior:"smooth"});
}

function layoutMasonryCard(card){
  const grid = document.getElementById("grid");
  const styles = getComputedStyle(grid);
  const rowHeight = parseFloat(styles.getPropertyValue("grid-auto-rows")) || 8;
  const rowGap = parseFloat(styles.getPropertyValue("row-gap") || styles.getPropertyValue("gap")) || 0;
  const height = card.getBoundingClientRect().height;
  const span = Math.ceil((height + rowGap) / (rowHeight + rowGap));
  card.style.gridRowEnd = `span ${span}`;
}
function layoutMasonry(){
  document.querySelectorAll("#grid .card").forEach(layoutMasonryCard);
}
let masonryResizeTimer;
window.addEventListener("resize", ()=>{
  clearTimeout(masonryResizeTimer);
  masonryResizeTimer = setTimeout(layoutMasonry, 150);
});

function renderGrid(){
  const grid = document.getElementById("grid");
  const empty = document.getElementById("emptyState");
  const editPg = editingPageId ? pages.find(x=>x.id===editingPageId) : null;
  let list = allPosts;

  if(!editPg){
    if(activePage){
      const pg = pages.find(x => x.id === activePage);
      if(pg) list = list.filter(p => pageIncludesPost(pg, p));
    }
    if(searchTerm) list = list.filter(p => matchesSearch(p, searchTerm));
  }

  if(list.length === 0){
    grid.innerHTML = "";
    empty.style.display = "block";
    empty.querySelector("div:last-child").textContent = allPosts.length===0 ? "还没有收藏，点右下角 ＋ 添加第一条" : "没有符合条件的收藏";
    return;
  }
  empty.style.display = "none";
  grid.innerHTML = list.map(p => {
    const firstImg = (p.media||[]).find(m => m.kind !== "video");
    const snippet = plainSnippet(p.body);
    const thumbAttr = firstImg ? (firstImg.type === "file" ? "data-file" : "data-asset-path") : null;
    const checked = editPg ? pageIncludesPost(editPg, p) : false;
    return `
      <div class="card ${firstImg ? "" : "no-media-card"}" data-id="${p.id}">
        ${editPg ? `<div class="select-check ${checked?"checked":""}">${checked?"✓":""}</div>` : ""}

        ${firstImg
          ? `<img class="thumb" ${thumbAttr}="${escapeHtml(firstImg.ref)}" data-open-post="${p.id}">`
          : ""
        }

        <div class="card-body">

          ${p.title && p.title.trim()
            ? `<div class="card-title" data-open-post="${p.id}">${escapeHtml(p.title.trim())}</div>`
            : ""
          }
          

          ${!firstImg && snippet
            ? `<p class="card-snippet">${escapeHtml(snippet)}</p>`
            : ""}

        </div>
      </div>`;
  }).join("");

  if(editPg){
    grid.querySelectorAll(".card").forEach(card=>{
      card.onclick = async (e)=>{
        e.stopPropagation();
        await togglePageMembership(editPg, allPosts.find(x=>x.id===card.dataset.id));
        renderGrid();
        updateSelectionCount();
      };
    });
  } else {
    grid.querySelectorAll("[data-open-post]").forEach(el=>{
      el.onclick = (e)=>{
        e.stopPropagation();
        openReader(el.dataset.openPost);
      };
    });
  }
  layoutMasonry();
  grid.querySelectorAll("img.thumb").forEach(img=>{
    img.addEventListener("load", ()=> layoutMasonryCard(img.closest(".card")), {once:true});
  });
  hydrateMedia(grid);
}

function enterPageSelectionMode(pageId){
  editingPageId = pageId;
  document.getElementById("selectionBar").style.display = "flex";
  renderPageConfigBar();
  renderGrid();
}
function renderPageConfigBar(){
  const pg = pages.find(x=>x.id===editingPageId);
  if(!pg) return;
  const allTags = [...new Set(allPosts.flatMap(p=>p.tags||[]))].sort();
  const tagsEl = document.getElementById("pageConfigTags");
  tagsEl.innerHTML = allTags.map(t=>{
    const on = (pg.tags||[]).includes(t);
    return `<span class="cfg-tag-chip ${on?"on":""}" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`;
  }).join("") || `<span class="hint">还没有标签</span>`;
  tagsEl.querySelectorAll(".cfg-tag-chip").forEach(chip=>{
    chip.onclick = async ()=>{
      pg.tags = pg.tags || [];
      const t = chip.dataset.tag;
      pg.tags = pg.tags.includes(t) ? pg.tags.filter(x=>x!==t) : [...pg.tags, t];
      pg.includes = [];
      pg.excludes = [];
      await savePagesData();
      renderPageConfigBar();
      renderGrid();
    };
  });
  updateSelectionCount();
}

function exitPageSelectionMode(){
  editingPageId = null;
  document.getElementById("selectionBar").style.display = "none";
  renderGrid();
}
function updateSelectionCount(){
  const pg = pages.find(x=>x.id===editingPageId);
  if(!pg) return;
  const count = allPosts.filter(p => pageIncludesPost(pg, p)).length;
  document.getElementById("selectionCount").textContent = `已选 ${count} 篇`;
}
document.getElementById("selectionDoneBtn").onclick = exitPageSelectionMode;

let renameTargetId = null;

function openRenameModal(pageId){
  renameTargetId = pageId || null;

  const input = document.getElementById("renameInput");

  if(pageId){
    input.value = pages.find(p=>p.id===pageId)?.name || "";
  }else{
    input.value = "";
  }

  document.getElementById("renameOverlay").classList.add("show");

  setTimeout(()=>{
    input.focus();
    input.select();
  }, 50);
}

document.getElementById("renameClose").onclick = ()=> document.getElementById("renameOverlay").classList.remove("show");
document.getElementById("renameCancel").onclick = ()=>{
  document.getElementById("renameOverlay").classList.remove("show");
};
document.getElementById("renameInput").addEventListener("keydown", e=>{
  if(e.key === "Enter"){
    e.preventDefault();
    document.getElementById("renameSave").click();
  }

  if(e.key === "Escape"){
    e.preventDefault();
    document.getElementById("renameOverlay").classList.remove("show");
  }
});
document.getElementById("renameOverlay").addEventListener("click",(e)=>{ if(e.target.id==="renameOverlay") document.getElementById("renameOverlay").classList.remove("show"); });

document.getElementById("renameSave").onclick = async ()=>{
  const input = document.getElementById("renameInput");
  const name = input.value.trim();

  if(!name){
    input.focus();
    return;
  }


  // ==========================================
  // 情况 1：重命名已有页面
  // ==========================================

  if(renameTargetId){

    const pg = pages.find(p => p.id === renameTargetId);

    if(pg){
      pg.name = name;
    }

    await savePagesData();

    document.getElementById("renameOverlay").classList.remove("show");

    renderCategorySidebar();
    return;
  }


  // ==========================================
  // 情况 2：新建页面
  // ==========================================

  const pg = {
    id: genId(),
    name,
    tags: [],
    includes: [],
    excludes: []
  };

  pages.push(pg);

  activePage = pg.id;

  await savePagesData();

  document.getElementById("renameOverlay").classList.remove("show");

  // 新建完成后，直接进入页面内容编辑
  enterPageSelectionMode(pg.id);

  // 左栏也同步刷新
  renderCategorySidebar();
};

/* ================= reader ================= */
function renderCommentsReadonly(comments){
  if(!comments || !comments.length) return "";
  function renderOne(c, depth=1){
    const replyActions = `<span class="comment-actions-inline">
      <span class="comment-action reply-link" data-reply-id="${c.id}" data-reply-author="${escapeHtml(c.author||"匿名")}">↩ 回复</span>
      <span class="comment-action delete-comment" data-delete-id="${c.id}">⌫ 删除</span>
    </span>`;
    return `
      <div class="comment ${depth > 1 ? "is-reply" : ""}">
        <div class="avatar" style="background:${colorFor(c.author)}">${escapeHtml((c.author||"匿").charAt(0))}</div>
        <div class="comment-main">
          <div class="author">${escapeHtml(c.author||"匿名")}</div>
          <div class="text">${c.replyToAuthor ? `回复 <span class="reply-to">${escapeHtml(c.replyToAuthor)}</span>: ` : ""}${escapeHtml(c.text)}${replyActions}</div>
          ${(c.replies && c.replies.length && depth === 1) ? `<div class="reply">${c.replies.map(r=>renderOne(r,2)).join("")}</div>` : ""}
        </div>
      </div>`;
  }
  const count = (comments||[]).reduce((n,c)=>n+1+(c.replies||[]).length,0);
  return `<div class="discuss"><h3>共 ${count} 条评论</h3>${comments.map(c=>renderOne(c,1)).join("")}</div>`;
}
function getQuickAuthor(){ return localStorage.getItem("myXHS_commentAuthor") || "我"; }
function mediaTagHtml(m){
  const attr = m.type === "file" ? "data-file" : "data-asset-path";
  return m.kind === "video"
    ? `<video controls ${attr}="${escapeHtml(m.ref)}"></video>`
    : `<img ${attr}="${escapeHtml(m.ref)}">`;
}
function fitMediaWidth(sheet, mediaEls){
  const MIN_LEFT = 360, MAX_LEFT = 680, RIGHT = 460;
  if(!mediaEls || mediaEls.length === 0) return;
  const ready = mediaEls.map(el => new Promise(resolve=>{
    if(el.tagName === "IMG"){
      if(el.complete && el.naturalWidth) resolve();
      else el.addEventListener("load", resolve, {once:true});
    } else {
      if(el.readyState >= 1) resolve();
      else el.addEventListener("loadedmetadata", resolve, {once:true});
    }
  }));
  Promise.all(ready).then(()=>{
    const h = sheet.clientHeight || 860;
    const first = mediaEls[0];

    const ratio = first.tagName === "IMG"
      ? first.naturalWidth / first.naturalHeight
      : first.videoWidth / first.videoHeight;

    if(!ratio || !isFinite(ratio)) return;

    const firstWidth = h * ratio;
    const left = Math.max(MIN_LEFT, Math.min(MAX_LEFT, firstWidth));
    
    const width = Math.min(window.innerWidth*0.94, left + RIGHT);
    sheet.style.width = `${width}px`;
    sheet.style.gridTemplateColumns = `${left}px ${RIGHT}px`;
    const p = allPosts.find(x => x.id === document.getElementById("readerSheet")?.dataset.postId);
    if(p && Math.abs((p.readerWidth||0) - (left+RIGHT)) > 1){
      p.readerWidth = left + RIGHT;
      writePostToDisk(p).catch(()=>{});
    }
  });
}

function openReader(id){
  const p = allPosts.find(x => x.id === id);
  if(!p) return;
  let quickReplyTarget = null;
  const sheet = document.getElementById("readerSheet");
  sheet.dataset.postId = p.id;

  const isLongPost = p.mode === "long";
  const media = p.media || [];
  const hasMedia = !isLongPost && media.length > 0;
  sheet.classList.toggle("no-media", !hasMedia);

  // Reuse the previously measured width immediately, so reopening the same post
  // does not resize after the media loads.
  if(hasMedia){
    const savedWidth = Number(p.readerWidth) || 940;
    const right = 460;
    const left = Math.max(360, Math.min(560, savedWidth - right));
    sheet.style.width = `${Math.min(window.innerWidth*0.94, savedWidth)}px`;
    sheet.style.gridTemplateColumns = `${left}px ${right}px`;
  }else{
    sheet.style.gridTemplateColumns = "";
    sheet.style.width = "";
  }

  const mediaHtml = hasMedia ? `
    <div class="reader-media">
      <div class="carousel">
        <div class="carousel-track">${media.map(m=>`<div class="slide">${mediaTagHtml(m)}</div>`).join("")}</div>
      </div>
      ${media.length > 1 ? `
        <button class="car-arrow left" data-dir="-1">‹</button>
        <button class="car-arrow right" data-dir="1">›</button>
        <div class="car-counter">1 / ${media.length}</div>
      ` : ""}
    </div>` : "";

  let commentCount = 0;
  (p.comments||[]).forEach(c => { commentCount += 1 + (c.replies||[]).length; });
  const date = new Date(p.createdAt).toLocaleString();
  const authorName = p.author || "我";

  sheet.innerHTML = `
    ${mediaHtml}
    <div class="reader-side">
      <div class="reader-side-content">
        <div class="reader-author">
          <div class="reader-avatar" style="background:${colorFor(authorName)}">${escapeHtml(authorName.charAt(0))}</div>
          <div>
            <strong>${escapeHtml(authorName)}</strong>
            <small>${p.source ? `${escapeHtml(p.source)} · ` : ""}${date}</small>
          </div>
          <div class="reader-menu">
            <button class="btn-icon btn-ghost" id="readerMenuBtn" title="更多">⋯</button>
            <div class="reader-menu-dropdown" id="readerMenuDropdown" style="display:none;">
              <div data-act="edit">✎ 编辑</div>
              <div data-act="export">⇩ 导出</div>
            </div>
          </div>
        </div>
        ${p.title && p.title.trim() ? `<h2 class="reader-title serif">${escapeHtml(p.title.trim())}</h2>` : ""}
        <div class="reader-body">${themeSafeBodyHtml(p.body)}</div>
        ${(p.tags && p.tags.length) ? `<div class="reader-tags">${p.tags.map(t=>`<span data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`).join("")}</div>` : ""}
        ${renderCommentsReadonly(p.comments)}
      </div>
      <div class="reader-bottom" id="readerComposer">
        <div class="quick-reply-hint" id="quickReplyHint" style="display:none;"></div>
        <div class="comment-input-row">
          <div class="quick-comment-box">
            <textarea class="quick-comment-input" id="quickCommentInput" rows="1" placeholder="说点什么..." maxlength="2000"></textarea>
            <div class="comment-actions">
              <div class="quick-author-wrap">
                <span class="quick-author-label">昵称</span>
                <input
                  class="quick-author-edit"
                  id="quickAuthorInput"
                  aria-label="评论昵称"
                >
              </div>

              <div class="comment-action-buttons">
                <button
                  class="btn btn-primary quick-send"
                  id="quickCommentSend"
                  type="button"
                >发送</button>

                <button
                  class="btn btn-ghost"
                  id="quickCommentCancel"
                  type="button"
                >取消</button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("readerOverlay").classList.add("show");

  const menuBtn = document.getElementById("readerMenuBtn");
  const dd = document.getElementById("readerMenuDropdown");
  menuBtn.onclick = (e)=>{
    e.stopPropagation();
    dd.style.display = dd.style.display === "block" ? "none" : "block";
  };
  document.addEventListener("click", function closeReaderMenu(e){
    if(!dd.contains(e.target) && e.target !== menuBtn) dd.style.display = "none";
  }, {once:false});

  sheet.querySelector(".reader-side-content").addEventListener("scroll", ()=>{ dd.style.display = "none"; });

  sheet.querySelector('[data-act="edit"]').onclick = ()=>{ dd.style.display="none"; closeReader(); openEditor(p.id); };
  sheet.querySelector('[data-act="export"]').onclick = ()=>{ dd.style.display="none"; exportPostSnapshot(p); };

  sheet.querySelectorAll(".reader-tags span").forEach(span=>{
    span.onclick = ()=>{ closeReader(); searchByTag(span.dataset.tag); };
  });

  const composer = document.getElementById("readerComposer");
  const authorInput = document.getElementById("quickAuthorInput");
  const input = document.getElementById("quickCommentInput");
  const cancelBtn = document.getElementById("quickCommentCancel");
  const hint = document.getElementById("quickReplyHint");

  authorInput.onchange = ()=>{
    const name = authorInput.value.trim() || "我";
    localStorage.setItem("myXHS_commentAuthor", name);
    authorInput.value = name;
  };

  function expandComposer(){
    composer.classList.add("expanded");

    input.rows = 1;

    requestAnimationFrame(()=>{
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 120) + "px";
    });
  }

  function collapseComposer(){
    composer.classList.remove("expanded");

    hint.style.display = "none";
    quickReplyTarget = null;

    input.value = "";
    input.style.height = "22px";
    input.rows = 1;
  }

  input.addEventListener("focus", expandComposer);

  input.addEventListener("input", ()=>{
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  cancelBtn.onclick = collapseComposer;


  // /* 点击输入框外部，自动收起 */
  // document.addEventListener("mousedown", (event)=>{
  //   if (!composer.contains(event.target)) {
  //     collapseComposer();
  //   }
  // });

  sheet.querySelectorAll(".delete-comment").forEach(el=>{
    el.onclick = async ()=>{
      const id = el.dataset.deleteId;
      if(!confirm("确定删除这条评论吗？")) return;
      removeCommentNode(p.comments || [], id);
      await writePostToDisk(p);
      await reload();
      openReader(p.id);
    };
  });
  sheet.querySelectorAll(".reply-link").forEach(el=>{
    el.onclick = ()=>{
      quickReplyTarget = el.dataset.replyId;
      expandComposer();
      hint.style.display = "block";
      hint.innerHTML = `正在回复 ${escapeHtml(el.dataset.replyAuthor)} <a id="cancelQuickReply">取消</a>`;
      document.getElementById("cancelQuickReply").onclick = ()=>{
        quickReplyTarget = null;
        hint.style.display = "none";
      };
      input.focus();
    };
  });

  async function sendQuickComment(){
    const text = input.value.trim();
    if(!text) return;
    const author = authorInput.value.trim() || "我";
    p.comments = p.comments || [];
    if(quickReplyTarget){
      const loc = locateComment(p.comments, quickReplyTarget);
      if(loc){
        const node = {id: genId(), author, text, at: Date.now(), replies: []};
        if(loc.depth === 1) node.replyToAuthor = loc.node.author || "匿名";
        (loc.root.replies = loc.root.replies || []).push(node);
      }
    } else {
      p.comments.push({id: genId(), author, text, at: Date.now(), replies: []});
    }
    await writePostToDisk(p);
    await reload();
    openReader(p.id);
  }
  document.getElementById("quickCommentSend").onclick = sendQuickComment;
  input.addEventListener("keydown", (e)=>{
    if((e.ctrlKey || e.metaKey) && e.key === "Enter"){
      e.preventDefault();
      sendQuickComment();
    }
  });

  const track = sheet.querySelector(".carousel-track");
  if(track && media.length > 1){
    let idx = 0;
    const counter = sheet.querySelector(".car-counter");
    function update(){
      track.style.transform = `translateX(-${idx*100}%)`;
      if(counter) counter.textContent = `${idx+1} / ${media.length}`;
    }
    sheet.querySelectorAll(".car-arrow").forEach(btn=>{
      btn.onclick = ()=>{ idx = (idx + Number(btn.dataset.dir) + media.length) % media.length; update(); };
    });
  }

  hydrateMedia(sheet).then(()=> fitMediaWidth(sheet, [...sheet.querySelectorAll(".carousel-track .slide img, .carousel-track .slide video")]));
}

function closeReader(){ document.getElementById("readerOverlay").classList.remove("show"); }

/* ================= editor: media gallery (separate from the rich-text body) ================= */
function renderMediaGallery(){
  const el = document.getElementById("mediaGallery");
  el.innerHTML = editingMedia.map((m,i)=>{
    let inner;
    if(m.previewUrl){
      inner = m.kind === "video" ? `<video src="${m.previewUrl}" muted></video>` : `<img src="${m.previewUrl}">`;
    } else {
      const attr = m.type === "file" ? "data-file" : "data-asset-path";
      inner = m.kind === "video" ? `<video ${attr}="${escapeHtml(m.ref)}" muted></video>` : `<img ${attr}="${escapeHtml(m.ref)}">`;
    }
    return `<div class="media-thumb">${inner}<span class="rm" data-rm="${i}">✕</span></div>`;
  }).join("");
  el.querySelectorAll("[data-rm]").forEach(btn=>{
    btn.onclick = ()=>{ editingMedia.splice(Number(btn.dataset.rm),1); renderMediaGallery(); };
  });
  hydrateMedia(el);
}
document.getElementById("fBody").addEventListener("paste", (e)=>{
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData("text/plain");
  document.execCommand("insertText", false, text);
});
document.getElementById("editorOverlay").addEventListener("paste", (e)=>{
  const items = e.clipboardData && e.clipboardData.items;
  if(!items) return;
  for(const item of items){
    if(item.type && item.type.startsWith("image/")){
      const file = item.getAsFile();
      if(!file) continue;
      const token = genId();
      pendingUploads.set(token, file);
      editingMedia.push({type:"file", kind:"image", ref:token, previewUrl:URL.createObjectURL(file)});
      renderMediaGallery();
      e.preventDefault();
    }
  }
});
document.getElementById("addFromLibraryBtn").onclick = ()=> openPicker();
document.getElementById("addUploadBtn").onclick = ()=> document.getElementById("galleryFileInput").click();
document.getElementById("galleryFileInput").onchange = (e)=>{
  const files = [...e.target.files];
  files.forEach(file=>{
    const token = genId();
    pendingUploads.set(token, file);
    editingMedia.push({
      type:"file",
      kind: file.type.startsWith("video/") ? "video" : "image",
      ref: token,
      previewUrl: URL.createObjectURL(file)
    });
  });
  e.target.value = "";
  renderMediaGallery();
};

/* ================= lazy library picker ================= */

let pickerPath = "";

/*
 * 打开选择器时，只把根目录作为当前目录。
 * 此时不会读取根目录内容，真正读取发生在 renderPickerList()。
 */
function openPicker(){
  pickerPath = "";

  document.getElementById("pickerSearch").value = "";
  document.getElementById("pickerOverlay").classList.add("show");

  renderPickerList("");
}

function pickerLabel(path){
  const parts = path.split("/");
  const nameNoExt = parts[parts.length - 1].replace(/\.[^.]+$/, "");
  return parts.length > 1
    ? `${parts[0]} / ${nameNoExt}`
    : nameNoExt;
}

function fileThumbHtml(f, attr, showPath){
  const label = showPath
    ? pickerLabel(f.path)
    : f.name.replace(/\.[^.]+$/, "");

  return `
    <div class="picker-thumb" ${attr}>
      ${
        isVideoName(f.name)
          ? `<video data-asset-path="${escapeHtml(f.path)}" muted></video>`
          : `<img data-asset-path="${escapeHtml(f.path)}">`
      }
      <div class="picker-label">${escapeHtml(label)}</div>
    </div>
  `;
}

/*
 * 只读取当前目录的一层。
 *
 * 注意：
 * 这里没有递归。
 * 用户点进哪个文件夹，才读取哪个文件夹。
 */
async function renderPickerList(term){
  const grid = document.getElementById("pickerGrid");
  const backBtn = document.getElementById("pickerBack");

  grid.innerHTML = `<div class="hint">正在读取当前文件夹…</div>`;

  try{
    const {folders, files} =
      await getPickerChildrenFromDisk(pickerPath);

    /*
     * 搜索现在只搜索当前已经打开的这一层。
     * 不再为了搜索而扫描整个硬盘文件夹。
     */
    if(term){
      backBtn.style.display = pickerPath ? "inline-flex" : "none";

      const lower = term.toLowerCase();

      const filteredFiles = files.filter(f =>
        f.name.toLowerCase().includes(lower)
      );

      const filteredFolders = folders.filter(f =>
        f.name.toLowerCase().includes(lower)
      );

      if(filteredFiles.length === 0 && filteredFolders.length === 0){
        grid.innerHTML = `<div class="hint">当前文件夹里没有找到匹配项</div>`;
        return;
      }

      const folderTiles = filteredFolders.map(f => `
        <div
          class="picker-thumb picker-folder"
          data-folder="${escapeHtml(f.name)}"
        >
          📁
          <div class="picker-label">${escapeHtml(f.name)}</div>
        </div>
      `).join("");

      const fileTiles = filteredFiles.map((f,i) =>
        fileThumbHtml(f, `data-file-idx="${i}"`, true)
      ).join("");

      grid.innerHTML = `
        <div class="picker-thumb-grid">
          ${folderTiles}
          ${fileTiles}
        </div>
      `;

      grid.querySelectorAll("[data-folder]").forEach(el=>{
        el.onclick = async ()=>{
          const folder = filteredFolders.find(
            f => f.name === el.dataset.folder
          );

          if(!folder) return;

          pickerPath = folder.path;

          document.getElementById("pickerSearch").value = "";

          await renderPickerList("");
        };
      });

      grid.querySelectorAll("[data-file-idx]").forEach(el=>{
        el.onclick = ()=>{
          pickLibraryFile(
            filteredFiles[Number(el.dataset.fileIdx)]
          );
        };
      });

      hydrateMedia(grid);
      return;
    }

    backBtn.style.display =
      pickerPath ? "inline-flex" : "none";

    if(folders.length === 0 && files.length === 0){
      grid.innerHTML =
        `<div class="hint">这个文件夹里没有图片/视频</div>`;
      return;
    }

    const folderTiles = folders.map(f => `
      <div
        class="picker-thumb picker-folder"
        data-folder="${escapeHtml(f.name)}"
      >
        📁
        <div class="picker-label">${escapeHtml(f.name)}</div>
      </div>
    `).join("");

    const fileTiles = files.map((f,i) =>
      fileThumbHtml(f, `data-file-idx="${i}"`, false)
    ).join("");

    grid.innerHTML = `
      <div class="picker-thumb-grid">
        ${folderTiles}
        ${fileTiles}
      </div>
    `;

    grid.querySelectorAll("[data-folder]").forEach(el=>{
      el.onclick = async ()=>{
        const folder = folders.find(
          f => f.name === el.dataset.folder
        );

        if(!folder) return;

        pickerPath = folder.path;

        document.getElementById("pickerSearch").value = "";

        await renderPickerList("");
      };
    });

    grid.querySelectorAll("[data-file-idx]").forEach(el=>{
      el.onclick = ()=>{
        pickLibraryFile(
          files[Number(el.dataset.fileIdx)]
        );
      };
    });

    hydrateMedia(grid);

  }catch(err){
    console.error(err);
    grid.innerHTML =
      `<div class="hint">读取文件夹失败：${escapeHtml(err.name || "未知错误")}</div>`;
  }
}

document.getElementById(
  "pickerBack"
).onclick = async () => {

  if(!pickerPath) return;


  const parts =
    pickerPath
      .split("/")
      .filter(Boolean);


  parts.pop();


  pickerPath =
    parts.length
      ? parts.join("/") + "/"
      : "";


  document.getElementById(
    "pickerSearch"
  ).value = "";


  await renderPickerList("");

};

document.getElementById("pickerSearch").oninput = (e)=>{
  renderPickerList(e.target.value);
};

document.getElementById("pickerClose").onclick = ()=>{
  document.getElementById("pickerOverlay").classList.remove("show");
};

document.getElementById("pickerOverlay").addEventListener("click",(e)=>{
  if(e.target.id === "pickerOverlay"){
    document.getElementById("pickerOverlay").classList.remove("show");
  }
});


function pickLibraryFile(f){

  editingMedia.push({

    type:"asset",

    kind:isVideoName(f.name)
      ? "video"
      : "image",

    ref:f.absolutePath

  });

  document.getElementById("pickerOverlay").classList.remove("show");

  renderMediaGallery();

}

/* ================= editor ================= */
function openEditor(id){
  editingId = id || null;
  editingComments = [];
  editingMedia = [];
  replyTarget = null;
  editingCommentId = null;
  document.getElementById("cAdd").textContent = "添加";
  document.getElementById("replyHint").style.display = "none";

  const heading = document.getElementById("editorHeading");
  const deleteBtn = document.getElementById("deleteBtn");
  const fBody = document.getElementById("fBody");

  if(id){
    const p = allPosts.find(x=>x.id===id);
    heading.textContent = "编辑收藏";
    document.getElementById("fTitle").value = p.title || "";
    document.getElementById("fBody").dataset.longPost = p.mode === "long" ? "1" : "0";
    fBody.innerHTML = p.body || "";
    document.getElementById("fLongPost").checked = p.mode === "long";
    document.getElementById("fAuthor").value = p.author || "";
    document.getElementById("fTags").value = (p.tags||[]).join(" ");
    document.getElementById("fSource").value = p.source || "";
    editingComments = JSON.parse(JSON.stringify(p.comments || []));
    editingMedia = JSON.parse(JSON.stringify(p.media || []));
    deleteBtn.style.display = "inline-block";
  } else {
    heading.textContent = "新建收藏";
    document.getElementById("fTitle").value = "";
    document.getElementById("fBody").dataset.longPost = "0";
    fBody.innerHTML = "";
    document.getElementById("fLongPost").checked = false;
    document.getElementById("fAuthor").value = "";
    document.getElementById("fTags").value = "";
    document.getElementById("fSource").value = "";
    deleteBtn.style.display = "none";
  }
  renderMediaGallery();
  renderCommentEditList();
  document.getElementById("editorOverlay").classList.add("show");
}
function closeEditor(){ document.getElementById("editorOverlay").classList.remove("show"); }



/* two-level comment editing */
function locateComment(list, id){
  for(const root of list){
    if(root.id === id) return {root, node: root, depth:0};
    for(const child of (root.replies||[])){
      if(child.id === id) return {root, node: child, depth:1};
    }
  }
  return null;
}
function removeCommentNode(list, id){
  const idx = list.findIndex(c => c.id === id);
  if(idx > -1){ list.splice(idx,1); return true; }
  for(const c of list){
    const ridx = (c.replies||[]).findIndex(r => r.id === id);
    if(ridx > -1){ c.replies.splice(ridx,1); return true; }
  }
  return false;
}

function renderCommentEditList(){
  const el = document.getElementById("commentListEdit");
  function rowHtml(c, isReply){
    if(editingCommentId === c.id){
      return `<div class="comment-item-edit comment-item-editing" style="${isReply?'margin-left:20px;':''}">
        <input type="text" class="inline-edit-author" data-inline-author="${c.id}" value="${escapeHtml(c.author||'')}" placeholder="昵称">
        <textarea class="inline-edit-text" data-inline-text="${c.id}" rows="1" placeholder="评论内容">${escapeHtml(c.text||'')}</textarea>
        <div class="inline-edit-actions">
          <span class="rm" data-inline-save="${c.id}" title="保存">✓</span>
          <span class="rm" data-inline-cancel="${c.id}" title="取消">✕</span>
        </div>
      </div>`;
    }
    return `<div class="comment-item-edit" style="${isReply?'margin-left:20px;':''}"><span>@${escapeHtml(c.author||"匿名")}：${escapeHtml(c.text)}</span><span class="actions"><span class="rm" data-edit="${c.id}" title="编辑">✎</span><span class="rm" data-reply="${c.id}" title="回复">↩</span><span class="rm" data-del="${c.id}" title="删除">⌫</span></span></div>`;
  }
  let html = "";
  editingComments.forEach(c=>{
    html += rowHtml(c, false);
    (c.replies||[]).forEach(r=> html += rowHtml(r, true));
  });
  el.innerHTML = html || `<div class="hint">还没有评论</div>`;

  el.querySelectorAll("[data-del]").forEach(b => b.onclick = ()=>{
    removeCommentNode(editingComments, b.dataset.del);
    if(replyTarget === b.dataset.del) cancelReply();
    if(editingCommentId === b.dataset.del) editingCommentId = null;
    renderCommentEditList();
  });
  el.querySelectorAll("[data-reply]").forEach(b => b.onclick = ()=>{
    editingCommentId = null;
    replyTarget = b.dataset.reply;
    const loc = locateComment(editingComments, replyTarget);
    const hint = document.getElementById("replyHint");
    hint.innerHTML = `正在回复 ${escapeHtml(loc.node.author||"匿名")} <a id="cancelReplyLink">取消</a>`;
    hint.style.display = "block";
    document.getElementById("cancelReplyLink").onclick = cancelReply;
    renderCommentEditList();
  });
  el.querySelectorAll("[data-edit]").forEach(b => b.onclick = ()=>{
    cancelReply();
    editingCommentId = b.dataset.edit;
    renderCommentEditList();
  });
  el.querySelectorAll("[data-inline-cancel]").forEach(b => b.onclick = ()=>{
    editingCommentId = null;
    renderCommentEditList();
  });
  el.querySelectorAll("[data-inline-save]").forEach(b => b.onclick = ()=>{
    const id = b.dataset.inlineSave;
    const loc = locateComment(editingComments, id);
    if(loc){
      const authorInput = el.querySelector(`[data-inline-author="${id}"]`);
      const textInput = el.querySelector(`[data-inline-text="${id}"]`);
      loc.node.author = authorInput.value.trim() || "匿名";
      loc.node.text = textInput.value.trim();
    }
    editingCommentId = null;
    renderCommentEditList();
  });
  el.querySelectorAll(".inline-edit-text").forEach(t=>{
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 140) + "px";
    t.addEventListener("input", function(){
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 140) + "px";
    });
  });
}
  
function cancelReply(){ replyTarget = null; document.getElementById("replyHint").style.display = "none"; }
function cancelCommentEdit(){
  editingCommentId = null;
  document.getElementById("cAuthor").value = "";
  document.getElementById("cText").value = "";
  document.getElementById("cAdd").textContent = "添加";
  document.getElementById("replyHint").style.display = "none";
}
function autosizeCommentText(){
  const t = document.getElementById("cText");
  t.style.height = "auto";
  t.style.height = Math.min(t.scrollHeight, 140) + "px";
}
document.getElementById("cText").addEventListener("input", autosizeCommentText);

document.getElementById("cText").addEventListener("input", function(){
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 140) + "px";
});

document.getElementById("cAdd").onclick = ()=>{
  const a = document.getElementById("cAuthor"), t = document.getElementById("cText");
  if(!t.value.trim()) return;
  const author = a.value.trim() || "匿名";
  let text = t.value.trim();
  if(editingCommentId){
    const loc = locateComment(editingComments, editingCommentId);
    if(loc){ loc.node.author = author; loc.node.text = text; }
    cancelCommentEdit();
    renderCommentEditList();
    return;
  }
  if(replyTarget){
    const loc = locateComment(editingComments, replyTarget);
    if(loc){
      const node = {id: genId(), author, text, at: Date.now(), replies: []};
      if(loc.depth === 1) node.replyToAuthor = loc.node.author || "匿名";
      (loc.root.replies = loc.root.replies || []).push(node);
    }
  } else {
    editingComments.push({id: genId(), author, text, at: Date.now(), replies: []});
  }
  a.value = ""; t.value = ""; t.style.height = "auto";
  cancelReply();
  renderCommentEditList();
};



/* text toolbar — bold/italic/quote/hr only, no media (media has its own section now) */
document.querySelectorAll(".toolbar button").forEach(btn=>{
  btn.onclick = ()=>{
    const cmd = btn.dataset.cmd;
    const body = document.getElementById("fBody");
    body.focus();
    if(cmd === "bold") document.execCommand("bold");
    else if(cmd === "italic") document.execCommand("italic");
    else if(cmd === "quote") document.execCommand("insertHTML", false, "<blockquote>引用文字</blockquote><div><br></div>");
    else if(cmd === "hr") document.execCommand("insertHTML", false, "<hr>");
  };
});

/* save */
async function finalizeMedia(postId){
  const finalList = [];
  for(const m of editingMedia){
    if(m.type === "file" && m.previewUrl){
      const file = pendingUploads.get(m.ref);
      if(!file) continue;
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const filename = `${postId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}.${ext}`;
      await writeMediaFile(filename, file);
      pendingUploads.delete(m.ref);
      finalList.push({type:"file", kind:m.kind, ref:filename});
    } else {
      finalList.push({type:m.type, kind:m.kind, ref:m.ref});
    }
  }
  return finalList;
}



document.getElementById("saveBtn").onclick = async ()=>{
  const title = document.getElementById("fTitle").value.trim();
  const author = document.getElementById("fAuthor").value.trim();
  const tags = document.getElementById("fTags").value.trim().split(/[\s,，]+/).filter(Boolean);
  const source = document.getElementById("fSource").value.trim();
  const body = document.getElementById("fBody").innerHTML.trim();
  const id = editingId || genId();
  const existing = editingId ? allPosts.find(p=>p.id===editingId) : null;
  const createdAt = existing ? existing.createdAt : Date.now();

  if(!title && !plainSnippet(body) && editingMedia.length===0){ showToast("标题、正文、图片至少填一个"); return; }

  const media = await finalizeMedia(id);
  const post = {
    id,
    title,
    author,
    body,
    tags,
    source,
    comments: editingComments,
    media,
    mode: document.getElementById("fLongPost").checked ? "long" : "normal",
    createdAt
  };
  await writePostToDisk(post);
  closeEditor();
  await reload();
  showToast(editingId ? "已更新" : "已收藏");
};
document.getElementById("deleteBtn").onclick = async ()=>{
  if(!editingId) return;
  if(!confirm("确定删除这条收藏吗？此操作不可撤销。")) return;
  const p = allPosts.find(x=>x.id===editingId);
  await deletePostFromDisk(p);
  closeEditor();
  await reload();
  showToast("已删除");
};
document.getElementById("addBtn").onclick = ()=> openEditor(null);
document.getElementById("editorClose").onclick = closeEditor;

/* search */
document.getElementById("searchInput").oninput = (e)=>{
  searchTerm = e.target.value;
  document.getElementById("searchClear").style.display = searchTerm ? "inline" : "none";
  renderGrid();
};
document.getElementById("searchClear").onclick = ()=>{
  document.getElementById("searchInput").value = "";
  searchTerm = "";
  document.getElementById("searchClear").style.display = "none";
  renderGrid();
};

/* toast */
let toastTimer;
function showToast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove("show"), 2400);
}

/* boot */
async function reload(){
  allPosts = await getAllPostsFromDisk();
  renderCategorySidebar();
  renderGrid();
}
init();

document.getElementById("readerOverlay").addEventListener("click", (e)=>{ if(e.target.id === "readerOverlay") closeReader(); });
