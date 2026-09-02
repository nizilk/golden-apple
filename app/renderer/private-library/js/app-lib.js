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

  });

};


  
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function strip(html){const d=document.createElement("div");d.innerHTML=html||"";return d.textContent||""}
function normalizeTags(raw){
  return [...new Set(String(raw||"").split(/[\s,，、]+/).map(x=>x.trim()).filter(Boolean))];
}


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
      list.filter(
        article =>
          Array.isArray(page.articleIds) &&
          page.articleIds.includes(
            article.id
          )
      );

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
      page =>
        page.id === data.homePageId
    );

  const otherPages =
    data.pages.filter(
      page =>
        page.id !== data.homePageId
    );

  let html = "";

  // 自定义首页
  if(homePage){

    html += `
      <button
        class="${data.activePage===homePage.id ? "active" : ""}"
        data-page="${esc(homePage.id)}"
      >
        ${esc(homePage.name)}
      </button>
    `;

  }

  // “全部”是缺省项，不属于 pages
  html += `
    <button
      class="${data.activePage===null ? "active" : ""}"
      data-page=""
    >
      全部
    </button>
  `;

  // 其他自定义页面
  html +=
    otherPages
      .map(
        page => `
          <button
            class="${data.activePage===page.id ? "active" : ""}"
            data-page="${esc(page.id)}"
          >
            ${esc(page.name)}
          </button>
        `
      )
      .join("");

  nav.innerHTML = html;

  nav
    .querySelectorAll("[data-page]")
    .forEach(button => {

      button.onclick = () => {

        data.activePage =
          button.dataset.page || null;

        data.activeTag = null;

        renderAll();

      };

    });

}


function render(){

  const page =
    getPage();

  const list =
    pageArticles();

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

        return `
          <div
            class="article-row"
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
    .forEach(
      row => {
        const title = row.querySelector(".article-title");
        if(title){
          title.onclick = (e)=>{
            e.stopPropagation();
            openArticle(title.dataset.openArticle);
          };
        }
      }
    );

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
        .map(p=>`<p>${esc(p.text).replace(/\n/g,"<br>")}</p>`)
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


search.oninput=render;


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
            ${esc(p.text)}
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
      (page.articleIds||[])
        .filter(
          id=>id!==editingId
        );

  }

  await savePages();

  await window.electronAPI.deleteLibraryArticle(editingId);
  closeArticleEditor();
  renderAll();
};

function openPages(){renderPageList();pagesOverlay.classList.add("show")}

function renderPageList(){

  pageList.innerHTML =
    data.pages
      .map(page => {

        return `
          <div class="manage-page">

            <span>
              ${esc(page.name)}

              ${
                page.id === data.homePageId
                  ? "（首页）"
                  : ""
              }
            </span>

            <button
              data-config="${esc(page.id)}"
            >
              选择文章
            </button>

            <button
              data-home="${esc(page.id)}"
            >
              ${
                page.id === data.homePageId
                  ? "取消首页"
                  : "设为首页"
              }
            </button>

            <button
              data-rename="${esc(page.id)}"
            >
              改名
            </button>

            <button
              data-delete="${esc(page.id)}"
            >
              删除
            </button>

          </div>
        `;

      })
      .join("");

  pageList
    .querySelectorAll("[data-config]")
    .forEach(button => {

      button.onclick = () => {

        openPageConfig(
          button.dataset.config
        );

      };

    });

  pageList
    .querySelectorAll("[data-home]")
    .forEach(button => {

      button.onclick = async () => {

        const id =
          button.dataset.home;

        if(data.homePageId === id){

          data.homePageId = null;

        }else{

          data.homePageId = id;

        }

        await savePages();

        renderPageList();
        renderNav();

      };

    });

  pageList
    .querySelectorAll("[data-rename]")
    .forEach(button => {

      button.onclick = async () => {

        const page =
          data.pages.find(
            item =>
              item.id ===
              button.dataset.rename
          );

        if(!page){
          return;
        }

        const name =
          prompt(
            "页面名称",
            page.name
          );

        if(
          !name ||
          !name.trim()
        ){
          return;
        }

        page.name =
          name.trim();

        await savePages();

        renderPageList();
        renderNav();

      };

    });

  pageList
    .querySelectorAll("[data-delete]")
    .forEach(button => {

      button.onclick = async () => {

        const id =
          button.dataset.delete;

        const page =
          data.pages.find(
            item =>
              item.id === id
          );

        if(!page){
          return;
        }

        if(
          !confirm(
            `删除页面「${page.name}」？\n\n文章不会被删除。`
          )
        ){
          return;
        }

        data.pages =
          data.pages.filter(
            item =>
              item.id !== id
          );

        if(
          data.activePage === id
        ){
          data.activePage =
            null;
        }

        if(
          data.homePageId === id
        ){
          data.homePageId =
            null;
        }

        await savePages();

        renderPageList();
        renderNav();
        render();

      };

    });

}

// managePagesBtn.onclick=openPages;
// pagesClose.onclick=()=>pagesOverlay.classList.remove("show");
// pagesOverlay.onclick=e=>{if(e.target===pagesOverlay)pagesOverlay.classList.remove("show")};

// addPage.onclick=async()=>{

//   const name =
//     newPageName.value.trim();

//   if(!name)return;

//   const page={
//     id:
//       "page_"+
//       Date.now(),

//     name,

//     articleIds:[]
//   };

//   data.pages.push(page);

//   data.activePage =
//     page.id;

//   data.activeTag =
//     null;

//   newPageName.value="";

//   await savePages();

//   renderAll();
//   renderPageList();

// };


function openPageConfig(id){

  const page =
    data.pages.find(
      p => p.id === id
    );

  if(!page){
    return;
  }

  pageConfigTitle.textContent =
    `${page.name} · 选择文章`;

  const articleIds =
    Array.isArray(page.articleIds)
      ? page.articleIds
      : [];

  pagePostList.innerHTML =
    data.articles
      .map(
        article => {

          const checked =
            articleIds.includes(
              article.id
            );

          return `
            <label
              class="manage-page"
              style="cursor:pointer"
            >

              <input
                type="checkbox"
                data-article="${esc(article.id)}"
                ${checked ? "checked" : ""}
              >

              <span>
                ${esc(article.title)}

                <small
                  style="
                    display:block;
                    color:var(--muted);
                    font-size:9px
                  "
                >
                  ${esc(
                    (article.tags || [])
                      .join(" · ")
                  )}
                </small>

              </span>

            </label>
          `;

        }
      )
      .join("");

  pagePostList
    .querySelectorAll(
      "[data-article]"
    )
    .forEach(
      checkbox => {

        checkbox.onchange =
          async () => {

            const articleId =
              checkbox.dataset.article;

            if(checkbox.checked){

              if(
                !page.articleIds
                  .includes(articleId)
              ){

                page.articleIds.push(
                  articleId
                );

              }

            }else{

              page.articleIds =
                page.articleIds.filter(
                  id =>
                    id !== articleId
                );

            }

            await savePages();

            render();

          };

      }
    );

  pageConfigOverlay.classList.add(
    "show"
  );

}


// pageConfigClose.onclick=()=>pageConfigOverlay.classList.remove("show");
// pageConfigOverlay.onclick=e=>{if(e.target===pageConfigOverlay)pageConfigOverlay.classList.remove("show")};


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

    text=
      text
        .replace(/\r/g,"")
        .trim();

    if(text){

      out.push({
        index:out.length,
        text
      });

    }

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


// settingsSave.onclick = async () => {

//   try {

//     await window.electronAPI.writeSettings(
//       data.settings
//     );

//     settingsOverlay.classList.remove(
//       "show"
//     );

//     render();
//     updateLibraryHero();

//   } catch(error) {

//     console.error(error);

//     alert(
//       "保存设置失败：\n\n" +
//       error.message
//     );

//   }

// };





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
