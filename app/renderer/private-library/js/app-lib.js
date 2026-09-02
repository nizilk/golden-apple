const LIBRARY_ARTICLES_DIRECTORY = "articles";

let data = {
  articles: [],
  pages: [],
  tags: [],
  settings: {},
  homePageId: null,
  activePage: null,
  activeTag: null
};

let newest=true;
let readerArticle=null;
let editingId=null;

let editingFromReader=false;

let selectedArticleFile=null;
let selectedArticlePath = null;

let importedParagraphs=[];
let contentAdjustments=[];

const articleTitle =
  document.getElementById("articleTitle");

const articleAuthor =
  document.getElementById("articleAuthor");

const articlePlatform =
  document.getElementById("articlePlatform");

const articleTags =
  document.getElementById("articleTags");

const articleSummary =
  document.getElementById("articleSummary");

const articleFileName =
  document.getElementById("articleFileName");

const contentPreview =
  document.getElementById("contentPreview");

const rSummary = document.getElementById("rSummary");

const heroEdit =
  document.getElementById("heroEdit");

const addBtn = document.getElementById('addBtn');

const libraryTop =
  document.getElementById(
    "libraryTop"
  );

const heroToggle =
  document.getElementById(
    "heroToggle"
  );

const contentWrap =
  document.querySelector(
    ".content-wrap"
  );


let heroCollapsed = false;


function resetLibraryScroll(){

  window.scrollTo({
    top:0,
    left:0,
    behavior:"auto"
  });

}


heroToggle.onclick = () => {

  /*
   * 无论当前滚到了哪里，
   * 点击箭头后先回到页面顶部。
   */
  resetLibraryScroll();

  /*
   * 等滚动位置真正归零后，
   * 再执行收起 / 展开。
   */
  requestAnimationFrame(() => {

    heroCollapsed =
      !heroCollapsed;

    libraryTop.classList.toggle(
      "collapsed",
      heroCollapsed
    );

    contentWrap.classList.toggle(
      "collapsed",
      heroCollapsed
    );

    heroToggle.classList.toggle(
      "is-collapsed",
      heroCollapsed
    );

    heroToggle.setAttribute(
      "aria-label",
      heroCollapsed
        ? "展开内容"
        : "收起内容"
    );

    addBtn.classList.toggle("collapsed", heroCollapsed)

  });

};


  
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function strip(html){const d=document.createElement("div");d.innerHTML=html||"";return d.textContent||""}
function normalizeTags(raw){
  return [...new Set(String(raw||"").split(/[\s,，、]+/).map(x=>x.trim()).filter(Boolean))];
}


let sidebarEditMode = false;
let inlineRenamePageId = null;
let editingPageId = null;


function applyTheme(theme){
  document.body.classList.toggle(
    "dark",
    theme === "dark"
  );

  localStorage.setItem(
    "myLibrary_theme",
    theme
  );

  const btn =
    document.getElementById(
      "themeToggle"
    );

  if(btn){
    btn.textContent =
      theme === "dark"
        ? "☀"
        : "☾";
  }
}

document.getElementById(
  "themeToggle"
).onclick = ()=>{
  applyTheme(
    document.body.classList.contains("dark")
      ? "light"
      : "dark"
  );
};

applyTheme(
  localStorage.getItem(
    "myLibrary_theme"
  ) || "light"
);


function allTags(){

  const set =
    new Set();

  data.articles.forEach(
    article=>{
      (article.tags||[])
        .forEach(
          tag=>set.add(tag)
        );
    }
  );

  return [...set];

}



function getPage(){

  if(!data.activePage){
    return null;
  }

  return data.pages.find(
    page =>
      page.id === data.activePage
  ) || null;

}


function pageArticles(){

  const page =
    getPage();

  let list =
    data.articles;

  // 没有选择自定义 page
  // = 全部文章
  if(page){

    list =
      list.filter(article => {

        if(
          (page.excludes || [])
            .includes(article.id)
        ){
          return false;
        }

        if(
          (page.includes || [])
            .includes(article.id)
        ){
          return true;
        }

        return (page.tags || [])
          .some(tag =>
            (article.tags || [])
              .includes(tag)
          );

      });

  }

  if(data.activeTag){

    list =
      list.filter(
        article =>
          (article.tags || [])
            .includes(
              data.activeTag
            )
      );

  }

  const q =
    search.value
      .trim()
      .toLowerCase();

  if(q){

    list =
      list.filter(
        article => {

          const text = [
            article.title,
            article.author,
            article.platform,
            ...(article.tags || [])
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return text.includes(q);

        }
      );

  }

  return newest
    ? list
    : [...list].reverse();

}


function renderNav(){

  const homePage =
    data.pages.find(
      page => page.id === data.homePageId
    );

  const otherPages =
    data.pages.filter(
      page => page.id !== data.homePageId
    );

  function itemHtml(page){

    if(
      sidebarEditMode &&
      inlineRenamePageId === page.id
    ){
      return `
        <div
          class="nav-page inline-page-edit"
          data-page="${esc(page.id)}"
        >
          <input
            class="inline-page-name-input"
            data-inline-name="${esc(page.id)}"
            value="${esc(page.name)}"
          >

          <span class="inline-page-edit-actions">
            <button
              type="button"
              class="inline-save-btn"
              data-inline-save="${esc(page.id)}"
              title="保存"
            ></button>

            <button
              type="button"
              data-inline-cancel="${esc(page.id)}"
              title="取消"
            >✕</button>
          </span>
        </div>
      `;
    }

    return `
      <div
        class="nav-page ${data.activePage===page.id ? "active" : ""}"
        data-page="${esc(page.id)}"
      >
        <span class="nav-page-label">
          ${esc(page.name)}
        </span>

        ${
          sidebarEditMode
            ? `
              <button
                type="button"
                class="page-more"
                data-more="${esc(page.id)}"
                title="页面操作"
              >⋯</button>
            `
            : ""
        }
      </div>
    `;
  }

  let html = "";

  if(homePage){
    html += itemHtml(homePage);
  }

  html += `
    <div
      class="nav-page ${data.activePage===null ? "active" : ""}"
      data-page=""
    >
      <span class="nav-page-label">全部</span>
    </div>
  `;

  html += otherPages
    .map(page => itemHtml(page))
    .join("");

  if(sidebarEditMode){
    html += `
      <div
        class="nav-page page-add"
        id="addPageBtn"
      >
        ＋ 新建页面
      </div>
    `;
  }

  html += `
    <div
      class="nav-page page-manage"
      id="pageManageBtn"
    >
      ${sidebarEditMode ? "完成" : "管理"}
    </div>
  `;

  nav.innerHTML = html;

  /* 页面点击 */

  nav
    .querySelectorAll(".nav-page[data-page]")
    .forEach(item => {

      item.onclick = e => {

        if(e.target.closest(".page-more")){
          return;
        }

        if(e.target.closest(".inline-page-edit")){
          return;
        }

        reader.classList.remove("show");

        reader.classList.remove("show");

        data.activePage =
          item.dataset.page || null;

        data.activeTag = null;

        search.value = "";

        searchClear.classList.remove("show");

        renderAll();

      };

    });

  /* ⋯ */

  nav
    .querySelectorAll("[data-more]")
    .forEach(button => {

      button.onclick = e => {

        e.stopPropagation();

        showPageActionMenu(
          button,
          button.dataset.more
        );

      };

    });

  /* 保存重命名 */

  nav
    .querySelectorAll("[data-inline-save]")
    .forEach(button => {

      button.onclick = async e => {

        e.stopPropagation();

        const id =
          button.dataset.inlineSave;

        const page =
          data.pages.find(
            x => x.id === id
          );

        const input =
          nav.querySelector(
            `[data-inline-name="${id}"]`
          );

        if(!page || !input){
          return;
        }

        const name =
          input.value.trim();

        if(!name){
          input.focus();
          return;
        }

        page.name = name;

        inlineRenamePageId = null;

        await savePages();

        renderNav();

      };

    });

  /* 取消重命名 */

  nav
    .querySelectorAll("[data-inline-cancel]")
    .forEach(button => {

      button.onclick = e => {

        e.stopPropagation();

        inlineRenamePageId = null;

        renderNav();

      };

    });

  /* Enter / Esc */

  nav
    .querySelectorAll("[data-inline-name]")
    .forEach(input => {

      input.onkeydown = async e => {

        e.stopPropagation();

        if(e.key === "Enter"){

          e.preventDefault();

          const page =
            data.pages.find(
              x =>
                x.id ===
                input.dataset.inlineName
            );

          const name =
            input.value.trim();

          if(page && name){

            page.name = name;

            inlineRenamePageId = null;

            await savePages();

            renderNav();

          }

        }

        if(e.key === "Escape"){

          inlineRenamePageId = null;

          renderNav();

        }

      };

      input.onclick =
        e => e.stopPropagation();

    });

  /* 管理 / 完成 */

  document
    .getElementById("pageManageBtn")
    ?.addEventListener(
      "click",
      () => {

        sidebarEditMode =
          !sidebarEditMode;

        if(!sidebarEditMode){
          inlineRenamePageId = null;
        }

        renderNav();

      }
    );

  /* 新建 */
  
  const addPageBtn =
    nav.querySelector("#addPageBtn");

  if(addPageBtn){
    addPageBtn.onclick = () => {

      const overlay =
        document.getElementById("renameOverlay");

      const input =
        document.getElementById("renameInput");

      if(!overlay || !input){
        return;
      }

      input.value = "";

      overlay.classList.add("show");

      input.focus();

      const saveBtn =
        document.getElementById("renameSave");

      const cancelBtn =
        document.getElementById("renameCancel");

      const closeBtn =
        document.getElementById("renameClose");

      const finish = async (save) => {

        if(!save){
          overlay.classList.remove("show");
          return;
        }

        const name =
          input.value.trim();

        if(!name){
          input.focus();
          return;
        }

        const page = {
          id:
            "page_" +
            Date.now(),

          name,

          tags:[],

          includes:[],

          excludes:[],

          articleIds:[]
        };

        data.pages.push(page);

        data.activePage =
          page.id;

        data.activeTag =
          null;

        overlay.classList.remove("show");

        await savePages();

        renderNav();
        enterPageSelectionMode(page.id);
      };

      saveBtn.onclick =
        () => finish(true);

      cancelBtn.onclick =
        () => finish(false);

      closeBtn.onclick =
        () => finish(false);

      input.onkeydown = e => {

        if(e.key === "Enter"){
          e.preventDefault();
          finish(true);
        }

        if(e.key === "Escape"){
          e.preventDefault();
          finish(false);
        }

      };

    };
  }

}




function showPageActionMenu(anchor,pageId){

  document
    .querySelectorAll(".page-action-menu")
    .forEach(el => el.remove());

  const page =
    data.pages.find(
      x => x.id === pageId
    );

  if(!page){
    return;
  }

  const menu =
    document.createElement("div");

  menu.className =
    "page-action-menu";

  menu.innerHTML = `
    <button
      type="button"
      data-action="home"
    >
      ${
        data.homePageId === pageId
          ? "取消首页"
          : "设为首页"
      }
    </button>

    <button
      type="button"
      data-action="rename"
    >
      重命名
    </button>

    <button
      type="button"
      data-action="content"
    >
      编辑内容
    </button>

    <button
      type="button"
      data-action="delete"
      class="danger"
    >
      删除
    </button>
  `;

  document.body.appendChild(menu);

  const rect =
    anchor.getBoundingClientRect();

  const menuWidth = 160;

  let left = rect.left;

  if(
    left + menuWidth >
    window.innerWidth - 8
  ){
    left =
      window.innerWidth -
      menuWidth -
      8;
  }

  menu.style.position = "fixed";
  menu.style.left = `${left}px`;
  menu.style.top =
    `${rect.bottom + 6}px`;

  /* 首页 */

  menu
    .querySelector(
      '[data-action="home"]'
    )
    .onclick = async () => {

      data.homePageId =
        data.homePageId === pageId
          ? null
          : pageId;

      await savePages();

      menu.remove();

      renderNav();

    };

  /* 重命名 */

  menu
    .querySelector(
      '[data-action="rename"]'
    )
    .onclick = () => {

      inlineRenamePageId =
        pageId;

      menu.remove();

      renderNav();

      const input =
        document.querySelector(
          `[data-inline-name="${pageId}"]`
        );

      if(input){
        input.focus();
        input.select();
      }

    };

  /* 编辑内容 */

  menu
    .querySelector(
      '[data-action="content"]'
    )
    .onclick = () => {

      menu.remove();

      enterPageSelectionMode(
        pageId
      );

    };

  /* 删除 */

  menu
    .querySelector(
      '[data-action="delete"]'
    )
    .onclick = async () => {

      menu.remove();

      if(
        !confirm(
          `删除页面「${page.name}」？\n\n文章不会被删除。`
        )
      ){
        return;
      }

      data.pages =
        data.pages.filter(
          x => x.id !== pageId
        );

      if(
        data.activePage === pageId
      ){
        data.activePage = null;
      }

      if(
        data.homePageId === pageId
      ){
        data.homePageId = null;
      }

      if(
        editingPageId === pageId
      ){
        exitPageSelectionMode();
      }

      await savePages();

      renderAll();

    };

  /* 点击外面关闭 */

  setTimeout(() => {

    const closeMenu = e => {

      if(
        !menu.contains(e.target) &&
        e.target !== anchor
      ){

        menu.remove();

        document.removeEventListener(
          "click",
          closeMenu
        );

      }

    };

    document.addEventListener(
      "click",
      closeMenu
    );

  },0);

}






let renamePageId = null;

function openPageRename(pageId){

  const page =
    pageId
      ? data.pages.find(
          x => x.id === pageId
        )
      : null;

  const name =
    prompt(
      "页面名称",
      page ? page.name : ""
    );

  if(!name || !name.trim()){
    return;
  }

  if(page){

    page.name =
      name.trim();

    savePages().then(
      renderAll
    );

    return;

  }

  const newPage = {

    id:
      "page_" +
      Date.now(),

    name:
      name.trim(),

    articleIds:[],

    tags:[]

  };

  data.pages.push(
    newPage
  );

  data.activePage =
    newPage.id;

  data.activeTag =
    null;

  savePages().then(
    () => {

      renderAll();

    }
  );

}


nav.addEventListener("click",async e=>{

  const save =
    e.target.closest(
      "[data-inline-save]"
    );

  const cancel =
    e.target.closest(
      "[data-inline-cancel]"
    );

  if(save){

    const id =
      save.dataset.inlineSave;

    const input =
      nav.querySelector(
        `[data-inline-name="${id}"]`
      );

    const page =
      data.pages.find(
        x=>x.id===id
      );

    if(
      page &&
      input &&
      input.value.trim()
    ){

      page.name =
        input.value.trim();

      inlineRenamePageId=null;

      await savePages();

      renderNav();

    }

  }

  if(cancel){

    inlineRenamePageId=null;

    renderNav();

  }

});


function render(){

  const page =
    getPage();

  const editingPage =
    editingPageId
      ? data.pages.find(
          x => x.id === editingPageId
        )
      : null;

  let list;

  if(editingPage){

    list =
      data.articles;

  }else{

    list =
      pageArticles();

  }

  count.textContent =
    `${list.length} 篇`;

  articleList.innerHTML =
    list.map(
      article=>{

        const tags =
          (article.tags||[])
            .slice(0,4)
            .map(
              tag =>
                `<span class="tag">
                  #${esc(tag)}
                </span>`
            )
            .join("");

        const checked =
          editingPage &&
          !(
            (editingPage.excludes || [])
              .includes(article.id)
          ) &&
          (
            (editingPage.includes || [])
              .includes(article.id) ||
            (editingPage.tags || [])
              .some(tag =>
                (article.tags || [])
                  .includes(tag)
              )
          );

        return `
          <div
            class="article-row ${checked ? "page-selected" : ""}"
            data-id="${article.id}"
          >


            <div class="article-main">

              <span class="article-title" data-open-article="${article.id}">${esc(article.title||"无标题")}</span>

              ${
                article.summary
                  ? `
                    <div class="article-summary">${esc(article.summary)}</div>
                  `
                  : ""
              }

              ${
                tags
                  ? `
                    <div class="article-tags">
                      ${tags}
                    </div>
                  `
                  : ""
              }

            </div>

          </div>
        `;
      }
    )
    .join("");

  empty.style.display =
    list.length
      ? "none"
      : "block";

  articleList
    .querySelectorAll(".article-row")
    .forEach(row => {

      if(editingPage){

        row.onclick = async () => {

          const id =
            row.dataset.id;

          editingPage.articleIds =
            editingPage.articleIds || [];

          const inIncludes =
            (editingPage.includes || [])
              .includes(id);

          const inExcludes =
            (editingPage.excludes || [])
              .includes(id);

          const inTag =
            (editingPage.tags || [])
              .some(tag =>
                (data.articles.find(
                  article => article.id === id
                )?.tags || [])
                  .includes(tag)
              );

          if(inTag){

            if(inExcludes){

              editingPage.excludes =
                editingPage.excludes
                  .filter(x => x !== id);

            }else{

              editingPage.excludes =
                editingPage.excludes || [];

              editingPage.excludes.push(id);

            }

          }else{

            if(inIncludes){

              editingPage.includes =
                editingPage.includes
                  .filter(x => x !== id);

            }else{

              editingPage.includes =
                editingPage.includes || [];

              editingPage.includes.push(id);

            }

          }

          await savePages();

          render();

          renderPageSelectionBar();

        };

        return;

      }

      const title =
        row.querySelector(
          ".article-title"
        );

      if(title){

        title.onclick = e => {

          e.stopPropagation();

          openArticle(
            title.dataset.openArticle
          );

        };

      }

    });

  articleList
    .querySelectorAll(".tag")
    .forEach(tagEl => {

      tagEl.onclick = e => {

        e.stopPropagation();

        if(editingPage){
          return;
        }

        const tag =
          tagEl.textContent
            .replace(/^#/,"")
            .trim();

        data.activeTag =
          tag;

        search.value =
          tag;

        searchClear.classList.add("show");

        render();
      };

    });

}


function renderAll(){renderNav();render();}

async function openArticle(id){

  const s=data.articles.find(x=>x.id===id);
  if(!s)return;

  readerArticle=s;

  rTitle.textContent=s.title||"无标题";

  const meta=[];

  if(s.author){
    meta.push(s.author);
  }

  if(s.platform){
    meta.push(s.platform);
  }

  rMeta.textContent=
    meta.join(" · ");

  rSummary.innerHTML =
    s.summary
      ? esc(s.summary)
          .replace(/\r\n/g,"<br>")
          .replace(/\n/g,"<br>")
      : "";

  rTags.innerHTML=
    (s.tags||[])
      .map(t=>`<span>#${esc(t)}</span>`)
      .join("");

  rTags
    .querySelectorAll("span")
    .forEach(tagEl=>{

      tagEl.onclick=()=>{

        const tag =
          tagEl.textContent
            .replace(/^#/,"")
            .trim();

        reader.classList.remove("show");

        search.value = tag;

        data.activeTag = tag;

        render();

      };

    });

  rContent.innerHTML=
    `<p class="reader-loading">正在读取本地文章……</p>`;

  reader.classList.add("show");
  reader.scrollTop = 0;

  try{

    if(!s.path){

      rContent.innerHTML=
        `<p>这篇文章没有记录本地文件路径。</p>`;

      return;
    }

    let f;

    try{

      f=
        await getFileByPath(s.path);

    }catch(e){

      rContent.innerHTML=
        `<p>找不到原始 DOCX。</p>
        <p class="reader-note">
          路径：${esc(s.path)}
        </p>
        <p class="reader-note">
          请确认文件仍然位于你的 Fanfics 文件夹中。
        </p>`;

      return;
    }

    const paragraphs=
      await readDocxParagraphs(f);

    const removed=
      new Set(
        s.contentAdjustments?.removed || []
      );

    const visible=
      paragraphs.filter(
        p=>!removed.has(p.index)
      );

    rContent.innerHTML=
      visible
        .map(p=>{
          const text = p.text ?? "";
          const isEmpty = !text.replace(/[\s\u00A0\u200B\uFEFF]/g,"");

          return `<p>${isEmpty ? "&nbsp;" : esc(text).replace(/\n/g,"<br>")}</p>`;
        })
        .join("")
        ||
        "<p>正文为空。</p>";

  }catch(e){

    console.error(e);

    rContent.innerHTML=
      `<p>读取本地文章失败。</p>
       <p class="reader-note">${esc(e.message)}</p>`;
  }
}

readerClose.onclick=()=>reader.classList.remove("show");
reader.onclick=e=>{if(e.target===reader)reader.classList.remove("show")};

rEdit.onclick=()=>{
  if(readerArticle){
    openArticleEditor(
      readerArticle.id,
      true
    );
  }
};


const searchClear =
  document.getElementById("searchClear");

search.oninput = () => {
  if(!search.value.trim()){
    data.activeTag = null;
  }else{
    data.activeTag = null;
  }

  searchClear.classList.toggle(
    "show",
    !!search.value.trim()
  );

  render();
};

searchClear.onclick = () => {
  search.value = "";
  data.activeTag = null;
  searchClear.classList.remove("show");
  render();
};


async function openArticleEditor(
  id=null,
  fromReader=false
){

  editingId = id;

  editingFromReader = fromReader;

  articleDialogTitle.textContent =
    id
      ? "编辑文章"
      : "添加文章";

  deleteArticleBtn.style.display =
    id
      ? "inline-flex"
      : "none";

  if(id){

    const s =
      data.articles.find(
        x => x.id === id
      );

    if(!s){
      return;
    }

    articleTitle.value =
      s.title || "";

    articleAuthor.value =
      s.author || "";

    articlePlatform.value =
      s.platform || "";

    articleTags.value =
      (s.tags || []).join(" ");

    articleSummary.value =
      s.summary || "";

    selectedArticleFile = null;

    selectedArticlePath =
      s.path || null;

    articleFileName.textContent =
      s.fileName
        ? `当前文件：${s.fileName}`
        : "这篇文章没有连接本地 DOCX。";

    importedParagraphs = [];

    contentAdjustments =
      [
        ...(s.contentAdjustments?.removed || [])
      ];

    if(s.path){

      try{

        const file =
          await getFileByPath(
            s.path
          );

        importedParagraphs =
          await readDocxParagraphs(
            file
          );

      }catch(e){

        console.error(e);

        contentPreview.innerHTML =
          `<div class="hint">
            无法读取原始 DOCX。
          </div>`;

      }

    }

    renderContentPreview();

  }else{

    selectedArticleFile = null;

    selectedArticlePath = null;

    importedParagraphs = [];

    contentAdjustments = [];

    articleTitle.value = "";

    articleAuthor.value = "";

    articlePlatform.value = "";

    articleTags.value = "";

    articleSummary.value = "";

    articleFileName.textContent =
      "选择后，网页只保存文件引用，不复制文章正文。";

    contentPreview.innerHTML = "";

  }

  articleOverlay.classList.add("show");

}


function closeArticleEditor(){
  articleOverlay.classList.remove("show");
  editingId=null;
  editingFromReader=false;
}

function htmlToPlain(html){
  const d=document.createElement("div");
  d.innerHTML=html||"";

  return [...d.children]
    .map(x=>x.innerText||x.textContent||"")
    .join("\n\n")
    .trim();
}

function plainToHtml(text){
  return String(text||"")
    .trim()
    .split(/\n{2,}/)
    .map(p=>{
      return `<p>${esc(p).replace(/\n/g,"<br>")}</p>`;
    })
    .join("") || "<p></p>";
}

addBtn.onclick=()=>openArticleEditor();
articleClose.onclick=closeArticleEditor;articleCancel.onclick=closeArticleEditor;
articleOverlay.onclick=e=>{if(e.target===articleOverlay)closeArticleEditor()};



chooseArticleFile.onclick = async () => {

  try{

    const result =
      await window.electronAPI
        .chooseLibraryArticleFile();

    if(!result){
      return;
    }

    selectedArticlePath =
      result.path;

    selectedArticleFile = {
      name:
        result.name
    };

    articleFileName.textContent =
      `已选择：${result.name}`;

    const binary =
      Uint8Array.from(
        atob(result.data),
        c => c.charCodeAt(0)
      );

    importedParagraphs =
      await readDocxParagraphs(binary);

    contentAdjustments = [];

    articleTitle.value = result.name.substring(0, result.name.lastIndexOf('.'));

    articleAuthor.value = "";

    renderContentPreview();

  }catch(e){

    alert(
      "无法读取 DOCX：\n\n"+
      e.message
    );

    console.error(e);

  }

};
  


function renderContentPreview(){

  if(!importedParagraphs.length){

    contentPreview.innerHTML=
      `<div class="hint">没有可显示的正文段落。</div>`;

    return;
  }

  contentPreview.innerHTML=
    importedParagraphs.map((p,index)=>{

      const removed =
        contentAdjustments.includes(index);

      return `
        <div
          class="content-preview-item ${removed ? "removed" : ""}"
          data-paragraph="${index}"
        >

          <div class="content-preview-control">
            <input
              type="checkbox"
              data-remove-paragraph="${index}"
              ${removed ? "checked" : ""}
            >
          </div>

          <div class="content-preview-text">
            ${esc(p.text || "\u200B")}
          </div>

        </div>
      `;

    }).join("");

  contentPreview
    .querySelectorAll(
      "[data-remove-paragraph]"
    )
    .forEach(box=>{

      box.onchange=()=>{

        const index =
          Number(
            box.dataset.removeParagraph
          );

        if(box.checked){

          if(
            !contentAdjustments.includes(index)
          ){
            contentAdjustments.push(index);
          }

        }else{

          contentAdjustments =
            contentAdjustments.filter(
              x=>x!==index
            );

        }

        renderContentPreview();

      };

    });

}


articleSave.onclick = async () => {

  const title =
    articleTitle.value.trim();

  if(!title){

    alert("请填写标题。");

    return;

  }

  const tags =
    normalizeTags(
      articleTags.value
    );

  let s;

  if(editingId){

    s =
      data.articles.find(
        x => x.id === editingId
      );

    if(!s){
      return;
    }

    s.title =
      title;

    s.author =
      articleAuthor.value.trim();

    s.platform =
      articlePlatform.value.trim();

    s.tags =
      tags;

    s.summary =
      articleSummary.value.trim();

    if(selectedArticlePath){

      s.path =
        selectedArticlePath;

      s.fileName =
        selectedArticleFile
          ? selectedArticleFile.name
          : s.fileName;

    }

    s.contentAdjustments = {
      removed:
        [...contentAdjustments]
    };

  }else{

    const f =
      selectedArticleFile;

    const articlePath =
      selectedArticlePath;

    if(!f || !articlePath){

      alert(
        "请先选择一个 .docx 文件。"
      );

      return;

    }

    if(!/\.docx$/i.test(f.name)){

      alert(
        "目前只支持 .docx 文件。"
      );

      return;

    }

    const id =
      "article_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .slice(2,8);

    s = {

      id,

      title,

      author:
        articleAuthor.value.trim(),

      platform:
        articlePlatform.value.trim(),

      tags,

      summary:
        articleSummary.value.trim(),

      date:
        new Date()
          .toISOString()
          .slice(0,10),

      path:
        articlePath,

      fileName:
        f.name,

      favorite:
        false,

      sourceType:
        "word",

      contentAdjustments:{
        removed:
          [...contentAdjustments]
      }

    };

    data.articles.push(s);

  }

  data.tags =
    allTags();

  await saveArticle(s);

  selectedArticleFile = null;
  selectedArticlePath = null;

  importedParagraphs = [];
  contentAdjustments = [];

  const shouldRefreshReader =
    editingFromReader;

  const articleId =
    editingId;

  closeArticleEditor();

  renderAll();

  if(
    shouldRefreshReader &&
    articleId
  ){
    await openArticle(articleId);
  }

};


deleteArticleBtn.onclick=async()=>{
  if(!editingId)return;
  const s=data.articles.find(x=>x.id===editingId);
  if(!s||!confirm(`删除《${s.title}》？`))return;
  data.articles=data.articles.filter(x=>x.id!==editingId);
  
  for(const page of data.pages){

    page.articleIds =
      (page.articleIds || [])
        .filter(id => id !== editingId);

    page.includes =
      (page.includes || [])
        .filter(id => id !== editingId);

    page.excludes =
      (page.excludes || [])
        .filter(id => id !== editingId);

  }

  await savePages();

  await window.electronAPI.deleteLibraryArticle(editingId);
  closeArticleEditor();
  renderAll();

  reader.classList.remove("show");
};


function enterPageSelectionMode(pageId){

  editingPageId =
    pageId;

  document
    .getElementById(
      "pageSelectionBar"
    )
    .style.display = "flex";

  renderPageSelectionBar();

  render();

}

function renderPageSelectionBar(){

  const page =
    data.pages.find(
      x => x.id === editingPageId
    );

  if(!page){
    return;
  }

  const tags =
    allTags().sort();

  const tagsEl =
    document.getElementById(
      "pageSelectionTags"
    );

  tagsEl.innerHTML =
    tags
      .map(tag => {

        const on =
          (page.tags || [])
            .includes(tag);

        return `
          <button
            type="button"
            class="tag-chip ${on ? "on" : ""}"
            data-page-tag="${esc(tag)}"
          >
            #${esc(tag)}
          </button>
        `;

      })
      .join("")
      ||
      `<span class="hint">还没有标签</span>`;

  tagsEl
    .querySelectorAll(
      "[data-page-tag]"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          const tag =
            button.dataset.pageTag;

          page.tags =
            page.tags || [];

          if(page.tags.includes(tag)){
            page.tags =
              page.tags.filter(
                x => x !== tag
              );
          }else{
            page.tags.push(tag);

            const tagArticleIds =
              data.articles
                .filter(article =>
                  (article.tags || []).includes(tag)
                )
                .map(article => article.id);

            page.includes =
              (page.includes || [])
                .filter(id =>
                  !tagArticleIds.includes(id)
                );

            page.excludes =
              (page.excludes || [])
                .filter(id =>
                  !tagArticleIds.includes(id)
                );
          }

          await savePages();

          renderPageSelectionBar();
          render();

        };

    });

  const count =
    data.articles.filter(article => {

      if(
        (page.excludes || [])
          .includes(article.id)
      ){
        return false;
      }

      return (
        (page.includes || [])
          .includes(article.id) ||
        (page.tags || [])
          .some(tag =>
            (article.tags || [])
              .includes(tag)
          )
      );

    }).length;

  document
    .getElementById(
      "pageSelectionCount"
    )
    .textContent =
      `已选 ${count} 篇`;

}

function exitPageSelectionMode(){

  editingPageId = null;

  document
    .getElementById(
      "pageSelectionBar"
    )
    .style.display = "none";

  render();

}

document
  .getElementById(
    "pageSelectionDone"
  )
  .onclick =
    exitPageSelectionMode;


async function getFileByPath(filePath){

  if(!filePath){
    throw new Error(
      "没有记录文章文件路径。"
    );
  }

  return await window.electronAPI
    .readLibraryArticleFile(
      filePath
    );

}


async function readDocxParagraphs(file){

  if(!window.JSZip){

    await new Promise((resolve,reject)=>{

      const s =
        document.createElement("script");

      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";

      s.onload = resolve;

      s.onerror = () => {
        reject(
          new Error(
            "无法加载 DOCX 解析模块；请检查网络。"
          )
        );
      };

      document.head.appendChild(s);

    });

  }

  let buffer;

  if(
    file &&
    typeof file.arrayBuffer === "function"
  ){

    buffer =
      await file.arrayBuffer();

  }else{

    buffer = file;

  }

  const zip =
    await JSZip.loadAsync(
      buffer
    );

  const xmlFile =
    zip.file(
      "word/document.xml"
    );

  if(!xmlFile){

    throw new Error(
      "这个文件不是有效的 DOCX 文档。"
    );

  }

  const xml =
    await xmlFile.async("string");

  const doc=
    new DOMParser().parseFromString(
      xml,
      "application/xml"
    );

  const paras=
    [...doc.getElementsByTagName("w:p")];

  const out=[];

  for(const p of paras){

    let text="";

    for(const node of p.childNodes){

      if(node.nodeType!==1) continue;

      const name=node.localName;

      if(name==="r"){

        for(const child of node.childNodes){

          if(child.nodeType!==1) continue;

          if(child.localName==="t"){
            text+=child.textContent||"";
          }

          if(child.localName==="tab"){
            text+="\t";
          }

          if(child.localName==="br"){
            text+="\n";
          }

        }

      }else if(name==="hyperlink"){

        text+=
          [...node.getElementsByTagName("w:t")]
            .map(x=>x.textContent||"")
            .join("");

      }

    }

    text =
      text.replace(/\r/g,"");

    out.push({
      index:out.length,
      text
    });

  }

  return out;
}

function getInitialTitle(paragraphs,fileName){

  const first =
    paragraphs
      .find(p=>p.text.trim());

  if(first && first.text.trim()){
    return first.text.trim();
  }

  return fileName
    .replace(/\.docx$/i,"")
    .trim();
}




async function loadPages(){

  const result =
    await window.electronAPI
      .loadLibraryPages();

  data.pages =
    Array.isArray(result?.list)
      ? result.list
      : [];

  data.pages.forEach(page => {

    if(!Array.isArray(page.tags)){
      page.tags = [];
    }

    if(!Array.isArray(page.includes)){
      page.includes =
        Array.isArray(page.articleIds)
          ? [...page.articleIds]
          : [];
    }

    if(!Array.isArray(page.excludes)){
      page.excludes = [];
    }

  });

  data.homePageId =
    result?.home || null;

  const homeExists =
    data.pages.some(
      page =>
        page.id ===
        data.homePageId
    );

  if(!homeExists){

    data.homePageId =
      null;

  }

  data.activePage =
    data.homePageId;

}


async function savePages(){

  await window.electronAPI
    .saveLibraryPages({

      home:
        data.homePageId || null,

      list:
        data.pages

    });

}


async function loadSettings(){

  const settings =
    await window.electronAPI
      .readSettings();

  data.settings =
    settings &&
    typeof settings === "object"
      ? settings
      : {};

}


async function loadLibrary(){

  const settings =
    await window.electronAPI
      .readSettings();

  data.settings =
    settings &&
    typeof settings === "object"
      ? settings
      : {};

  const result =
    await window.electronAPI
      .listLibraryArticles();

  data.articles =
    Array.isArray(result)
      ? result
      : [];

  await loadPages();

  data.tags=[];

  data.articles.forEach(
    article=>{

      (article.tags||[])
        .forEach(
          tag=>{

            if(
              !data.tags.includes(tag)
            ){
              data.tags.push(tag);
            }

          }
        );

    }
  );

}



async function saveArticle(article){

  if(!article || !article.id){
    throw new Error("文章缺少 id。");
  }

  await window.electronAPI
    .saveLibraryArticle(article);

}


async function updateLibraryHero(){

  try{

    const files =
      await window.electronAPI
        .listDataDirectory(
          "private-library"
        );

    const cover =
      files.find(
        file =>
          file.isFile &&
          /^cover\.(png|jpg|jpeg|gif|webp|bmp|avif)$/i
            .test(file.name)
      );

    if(!cover){

      libraryHeroImage.style.backgroundImage =
        "";

      return;
    }

    const dataUrl =
      await window.electronAPI
        .readDataURL(
          `private-library/${cover.name}`
        );

    libraryHeroImage.style.backgroundImage =
      `url("${dataUrl}")`;

  }catch(error){

    console.error(
      "无法读取书房头图：",
      error
    );

    libraryHeroImage.style.backgroundImage =
      "";

  }

}




// async function openSettings(){

//   coverPreview.style.backgroundImage =
//     "";

//   if(data.settings.cover){

//     try{

//       const dataUrl =
//         await window.electronAPI
//           .readFileDataURL(
//             data.settings.cover
//           );

//       coverPreview.style.backgroundImage =
//         `url("${dataUrl}")`;

//     }catch(error){

//       console.error(
//         "无法读取书房头图：",
//         error
//       );

//     }

//   }

//   settingsOverlay.classList.add(
//     "show"
//   );

// }


// settingsBtn.onclick=openSettings;settingsClose.onclick=()=>settingsOverlay.classList.remove("show");
// settingsOverlay.onclick=e=>{if(e.target===settingsOverlay)settingsOverlay.classList.remove("show")};


heroEdit.onclick = async()=>{
  const filePath =
    await window.electronAPI.chooseLibraryCoverFile();

  if(!filePath) return;

  await window.electronAPI.saveLibraryCoverFile(
    filePath
  );

  await updateLibraryHero();
};


document
  .getElementById("selectionDoneBtn")
  ?.addEventListener("click", () => {

    document
      .getElementById("selectionBar")
      ?.style.setProperty("display","none");

    renderAll();

  });





async function init(){

  try{

    await loadSettings();

    await loadLibrary();

    renderAll();

    updateLibraryHero();

  }catch(e){

    console.error(e);

    alert(
      "私人图书馆启动失败：\n\n"+
      e.message
    );

  }

}

init();
