const LIBRARY_FILE = "private-library.json";
let resourceRootPath = null;

const defaultData={
  settings:{
    title:"私人图书馆",
    subtitle:"",
    cover:""
  },

  pages:[
    {
      id:"all",
      name:"全部",
      postIds:[]
    }
  ],

  currentPage:"all",
  activeTag:"全部",
  tags:["全部"],

  stories:[]
};

let data=structuredClone(defaultData);

let newest=true;
let readerStory=null;
let editingId=null;
let selectedStoryFile=null;

let importedParagraphs=[];
let contentAdjustments=[];

const storyTitle =
  document.getElementById("storyTitle");

const storyAuthor =
  document.getElementById("storyAuthor");

const storyPlatform =
  document.getElementById("storyPlatform");

const storySourceUrl =
  document.getElementById("storySourceUrl");

const storyTags =
  document.getElementById("storyTags");

const storySummary =
  document.getElementById("storySummary");

const storyFileName =
  document.getElementById("storyFileName");

const contentPreview =
  document.getElementById("contentPreview");


async function saveData(){

  await window.electronAPI
    .saveLibraryData(data);

}

  
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function strip(html){const d=document.createElement("div");d.innerHTML=html||"";return d.textContent||""}
function normalizeTags(raw){
  return [...new Set(String(raw||"").split(/[\s,，、]+/).map(x=>x.trim()).filter(Boolean))];
}
function allTags(){
  const set=new Set(["全部"]);
  data.stories.forEach(s=>(s.tags||[]).forEach(t=>set.add(t)));
  return [...set];
}
function getPage(){return data.pages.find(p=>p.id===data.currentPage)||data.pages[0]}
function pageStories(){
  const page=getPage();
  let list=data.stories;
  if(page && page.id!=="all") list=list.filter(s=page.postIds.includes(s.id));
  const q=search.value.trim().toLowerCase();
  if(data.activeTag && data.activeTag!=="全部") list=list.filter(s=>(s.tags||[]).includes(data.activeTag));

  if(q){
    list=list.filter(s=>{
      const haystack=[
        s.title,
        s.author,
        ...(s.tags||[])
      ].join(" ").toLowerCase();

      return haystack.includes(q);
    });
  }

  return newest?list:[...list].reverse();
}

function renderNav(){
  nav.innerHTML=data.pages.map(p=>`<button class="${p.id===data.currentPage?'active':''}" data-page="${esc(p.id)}">${esc(p.name)}</button>`).join("");
  nav.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>{
    data.currentPage=b.dataset.page;data.activeTag="全部";saveData();renderAll()
  });
}
function renderTags(){
  tagsBar.innerHTML=allTags().map(t=>`<button class="tag-chip ${data.activeTag===t?'on':''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join("");
  tagsBar.querySelectorAll("[data-tag]").forEach(b=>b.onclick=()=>{data.activeTag=b.dataset.tag;render()});
}

function render(){
  const page=getPage();
  sectionTitle.textContent=page.id==="all"?"故事":page.name;
  renderTags();
  const list=pageStories();
  count.textContent=`${list.length} 篇`;
  storyList.innerHTML=list.map(s=>{
    const tags=(s.tags||[]).slice(0,4).map(t=>`<span class="tag">#${esc(t)}</span>`).join("");
    return `<article class="story-row" data-id="${esc(s.id)}">
      <div>
        <h3 class="story-title">${esc(s.title||"无标题")}</h3>

        <div class="story-meta">
          <span>${esc(s.author||"未知作者")}</span>
          ${tags}
        </div>

      </div>

      <div class="story-side">
      </div>
    </article>`
  }).join("");
  empty.style.display=list.length?"none":"block";
  storyList.querySelectorAll(".story-row").forEach(r=>r.onclick=()=>openStory(r.dataset.id));
}
function renderAll(){renderNav();render();}

async function openStory(id){

  const s=data.stories.find(x=>x.id===id);
  if(!s)return;

  readerStory=s;

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

  rTags.innerHTML=
    (s.tags||[])
      .map(t=>`<span>#${esc(t)}</span>`)
      .join("");

  rContent.innerHTML=
    `<p class="reader-loading">正在读取本地文章……</p>`;

  reader.classList.add("show");

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
rEdit.onclick=()=>{if(readerStory){reader.classList.remove("show");openStoryEditor(readerStory.id)}};


search.oninput=render;
sortBtn.onclick=()=>{newest=!newest;sortBtn.textContent=newest?"最近加入":"最早加入";render()};

function openStoryEditor(id=null){
  editingId=id;

  storyDialogTitle.textContent=id ? "编辑文章" : "添加文章";
  deleteStoryBtn.style.display=id ? "inline-flex" : "none";

  if(id){
    const s=data.stories.find(x=>x.id===id);
    if(!s)return;

    storyTitle.value=s.title||"";
    storyAuthor.value=s.author||"";
    storyPlatform.value=s.platform||"";
    storySourceUrl.value=s.sourceUrl||"";
    storyTags.value=(s.tags||[]).join(" ");
    storySummary.value=s.summary||"";

    storyFileName.textContent=
      s.fileName
        ? `当前文件：${s.fileName}`
        : "这篇文章没有连接本地 DOCX。";
  }else{
    selectedStoryFile=null;

    importedParagraphs=[];
    contentAdjustments=[];

    storyTitle.value="";
    storyAuthor.value="";
    storyPlatform.value="";
    storySourceUrl.value="";
    storyTags.value="";
    storySummary.value="";

    storyFileName.textContent=
      "选择后，网页只保存文件引用，不复制文章正文。";
  }

  storyOverlay.classList.add("show");
}

function closeStoryEditor(){storyOverlay.classList.remove("show");editingId=null}
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
addBtn.onclick=()=>openStoryEditor();
storyClose.onclick=closeStoryEditor;storyCancel.onclick=closeStoryEditor;
storyOverlay.onclick=e=>{if(e.target===storyOverlay)closeStoryEditor()};

chooseStoryFile.onclick=async()=>{

  if(!window.showOpenFilePicker){

    alert(
      "当前浏览器不支持本地文件选择。\n\n"+
      "请使用最新版 Chrome 或 Edge。"
    );

    return;
  }

  try{

    const [handle]=
      await window.showOpenFilePicker({

        multiple:false,

        types:[
          {
            description:"Word 文档",
            accept:{
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document":[
                ".docx"
              ]
            }
          }
        ]

      });

    const f=
      await handle.getFile();

    selectedStoryFile=f;

    storyFileName.textContent=
      `已选择：${f.name}`;

    /*
     * 读取 DOCX。
     *
     * 注意：
     * 这里读取的是内存中的文件内容。
     * 不会写入 localStorage。
     * 不会写入 IndexedDB。
     * 不会修改 DOCX。
     */

    importedParagraphs=
      await readDocxParagraphs(f);

    contentAdjustments=[];

    /*
     * 根据正文提供“候选标题 / 作者”。
     * 用户仍然可以手动修改。
     */

    const guessed=
      guessMetadata(
        importedParagraphs,
        f.name
      );

    storyTitle.value=
      guessed.title;

    /*
     * 作者先不要盲猜。
     *
     * 因为不同 Fanfics 的格式差异太大。
     * 如果第二段很明显像作者，你可以手动填。
     */

    storyAuthor.value="";

    renderContentPreview();

  }catch(e){

    if(e.name!=="AbortError"){

      alert(
        "无法读取 DOCX：\n\n"+
        e.message
      );

      console.error(e);

    }

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

      const removed=
        contentAdjustments.includes(index);

      return `
        <div
          class="content-preview-item ${removed?"removed":""}"
          data-paragraph="${index}"
        >

          <div class="content-preview-control">

            <label>
              <input
                type="checkbox"
                data-remove-paragraph="${index}"
                ${removed?"checked":""}
              >
              删除这一段
            </label>

          </div>

          <div class="content-preview-text">
            ${esc(p.text)}
          </div>

        </div>
      `;

    }).join("");

  contentPreview
    .querySelectorAll("[data-remove-paragraph]")
    .forEach(box=>{

      box.onchange=()=>{

        const index=
          Number(box.dataset.removeParagraph);

        if(box.checked){

          if(!contentAdjustments.includes(index)){
            contentAdjustments.push(index);
          }

        }else{

          contentAdjustments=
            contentAdjustments.filter(
              x=>x!==index
            );

        }

        renderContentPreview();

      };

    });

}

storySave.onclick=async()=>{

  const title=
    storyTitle.value.trim();

  if(!title){
    alert("请填写标题。");
    return;
  }

  const tags=
    normalizeTags(storyTags.value);

  if(editingId){

    const s=
      data.stories.find(
        x=>x.id===editingId
      );

    if(!s)return;

    s.title=title;

    s.author=
      storyAuthor.value.trim();

    s.platform=
      storyPlatform.value.trim();

    s.sourceUrl=
      storySourceUrl.value.trim();

    s.tags=tags;

    s.summary=
      storySummary.value.trim();

  }else{

    const f=
      selectedStoryFile;

    const path=
      selectedStoryPath;

    if(!f || !path){

      alert("请先选择一个 .docx 文件。");

      return;
    }

    if(!/\.docx$/i.test(f.name)){
      alert("目前只支持 .docx 文件。");
      return;
    }

    try{

      const id=
        "story_"+
        Date.now()+
        "_"+
        Math.random()
          .toString(36)
          .slice(2,8);

      const s={
        id,
        title,
        author:
          storyAuthor.value.trim(),

        platform:
          storyPlatform.value.trim(),

        sourceUrl:
          storySourceUrl.value.trim(),

        tags,

        summary:
          storySummary.value.trim(),

        date:
          new Date()
            .toISOString()
            .slice(0,10),

        path:path,

        favorite:false,

        sourceType:"word",

        contentAdjustments:{
          removed:
            [...contentAdjustments]
        }

      };

      data.stories.unshift(s);

    }catch(e){

      alert(
        "添加失败："+
        e.message
      );

      console.error(e);

      return;
    }
  }

  /*
   * 更新标签集合
   */
  tags.forEach(t=>{
    if(!data.tags.includes(t)){
      data.tags.push(t);
    }
  });

  saveData();

  selectedStoryFile=null;

  importedParagraphs=[];
  contentAdjustments=[];

  closeStoryEditor();
  renderAll();
};

deleteStoryBtn.onclick=async()=>{
  if(!editingId)return;
  const s=data.stories.find(x=>x.id===editingId);
  if(!s||!confirm(`删除《${s.title}》？`))return;
  data.stories=data.stories.filter(x=>x.id!==editingId);
  data.pages.forEach(p=>p.postIds=p.postIds.filter(id=>id!==editingId));
  await saveData();closeStoryEditor();renderAll();
};

function openPages(){renderPageList();pagesOverlay.classList.add("show")}
function renderPageList(){
  pageList.innerHTML=data.pages.map(p=>`<div class="manage-page">
    <span>${esc(p.name)}${p.id==="all"?"（固定）":""}</span>
    <button data-config="${esc(p.id)}">${p.id==="all"?"—":"选择文章"}</button>
    ${p.id!=="all"?`<button data-rename="${esc(p.id)}">改名</button><button data-delete="${esc(p.id)}">删除</button>`:""}
  </div>`).join("");
  pageList.querySelectorAll("[data-config]").forEach(b=>b.onclick=()=>openPageConfig(b.dataset.config));
  pageList.querySelectorAll("[data-rename]").forEach(b=>b.onclick=()=>{
    const p=data.pages.find(x=>x.id===b.dataset.rename);if(!p)return;
    const n=prompt("页面名称",p.name);if(n&&n.trim()){p.name=n.trim();saveData();renderPageList();renderNav()}
  });
  pageList.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.delete;if(!confirm("删除页面？文章不会被删除。"))return;
    data.pages=data.pages.filter(x=>x.id!==id);if(data.currentPage===id)data.currentPage="all";saveData();renderPageList();renderNav();render()
  });
}
managePagesBtn.onclick=openPages;
pagesClose.onclick=()=>pagesOverlay.classList.remove("show");
pagesOverlay.onclick=e=>{if(e.target===pagesOverlay)pagesOverlay.classList.remove("show")};
addPage.onclick=()=>{
  const n=newPageName.value.trim();if(!n)return;
  const id="page_"+Date.now();data.pages.push({id,name:n,postIds:[]});data.currentPage=id;data.activeTag="全部";newPageName.value="";saveData();renderAll();renderPageList();
};
function openPageConfig(id){
  const p=data.pages.find(x=>x.id===id);if(!p||id==="all")return;
  pageConfigTitle.textContent=`${p.name} · 选择文章`;
  pagePostList.innerHTML=data.stories.map(s=>`<label class="manage-page" style="cursor:pointer">
    <input type="checkbox" data-post="${esc(s.id)}" ${p.postIds.includes(s.id)?"checked":""}>
    <span>${esc(s.title)}<small style="display:block;color:var(--muted);font-size:9px">${esc((s.tags||[]).join(" · "))}</small></span>
  </label>`).join("");
  pagePostList.querySelectorAll("[data-post]").forEach(cb=>cb.onchange=()=>{
    const id=cb.dataset.post;
    if(cb.checked&&!p.postIds.includes(id))p.postIds.push(id);
    if(!cb.checked)p.postIds=p.postIds.filter(x=>x!==id);
    saveData();render();
  });
  pageConfigOverlay.classList.add("show");
}
pageConfigClose.onclick=()=>pageConfigOverlay.classList.remove("show");
pageConfigOverlay.onclick=e=>{if(e.target===pageConfigOverlay)pageConfigOverlay.classList.remove("show")};


async function getFileByPath(relativePath){

  if(!resourceRootPath){
    throw new Error(
      "尚未设置资源文件夹。"
    );
  }

  return await window.electronAPI
    .readResourceFile(
      relativePath
    );

}


async function readDocxParagraphs(file){

  if(!window.JSZip){

    await new Promise((resolve,reject)=>{

      const s=document.createElement("script");

      s.src=
        "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";

      s.onload=resolve;

      s.onerror=()=>{
        reject(
          new Error(
            "无法加载 DOCX 解析模块；请检查网络。"
          )
        );
      };

      document.head.appendChild(s);

    });

  }

  const zip=
    await JSZip.loadAsync(
      await file.arrayBuffer()
    );

  const xmlFile=
    zip.file("word/document.xml");

  if(!xmlFile){
    throw new Error("这个文件不是有效的 DOCX 文档。");
  }

  const xml=
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


async function chooseFolder(){

  try{

    const selectedPath =
      await window.electronAPI
        .chooseResourceFolder();

    if(!selectedPath){
      return;
    }

    resourceRootPath =
      selectedPath;

    folderBox.innerHTML=
      `已连接：
      <strong>
        ${esc(selectedPath)}
      </strong>`;

    await loadLibrary();

    renderAll();

    updateLibraryHero();

  }catch(e){

    console.error(e);

    alert(
      "连接资源文件夹失败：\n\n"+
      e.message
    );

  }

}


async function loadLibrary(){

  const saved =
    await window.electronAPI
      .loadLibraryData();

  if(saved){

    data={
      ...structuredClone(defaultData),
      ...saved
    };

  }else{

    data=
      structuredClone(defaultData);

    await saveData();

  }

  if(!Array.isArray(data.stories)){
    data.stories=[];
  }

  if(!Array.isArray(data.pages)){
    data.pages=
      structuredClone(defaultData.pages);
  }

  if(!Array.isArray(data.tags)){
    data.tags=["全部"];
  }

  if(!data.settings){
    data.settings=
      structuredClone(
        defaultData.settings
      );
  }

}





manageLibraryBtn.onclick=()=>libraryOverlay.classList.add("show");
libraryClose.onclick=()=>libraryOverlay.classList.remove("show");
libraryOverlay.onclick=e=>{if(e.target===libraryOverlay)libraryOverlay.classList.remove("show")};
chooseFolder.onclick=chooseFolder;



function updateLibraryHero(){

  if(data.settings.cover){

    libraryHeroImage.style.backgroundImage=
      `url("${data.settings.cover}")`;

  }else{

    libraryHeroImage.style.backgroundImage="";
  }
}

function openSettings(){

  coverPreview.style.backgroundImage=
    data.settings.cover
      ? `url("${data.settings.cover}")`
      : "";

  settingsOverlay.classList.add("show");
}
settingsBtn.onclick=openSettings;settingsClose.onclick=()=>settingsOverlay.classList.remove("show");
settingsOverlay.onclick=e=>{if(e.target===settingsOverlay)settingsOverlay.classList.remove("show")};

coverFile.onchange=()=>{
  const f=coverFile.files[0];
  if(!f)return;

  const r=new FileReader();

  r.onload=()=>{
    data.settings.cover=r.result;

    coverPreview.style.backgroundImage=
      `url("${r.result}")`;

    libraryHeroImage.style.backgroundImage=
      `url("${r.result}")`;
  };

  r.readAsDataURL(f);
};

settingsSave.onclick=()=>{
  saveData();

  settingsOverlay.classList.remove("show");

  render();

  updateLibraryHero();
};

document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){[reader,storyOverlay,pagesOverlay,pageConfigOverlay,libraryOverlay,settingsOverlay].forEach(x=>x.classList.remove("show"))}
});


async function init(){

  try{

    resourceRootPath =
      await window.electronAPI
        .getCurrentResourceFolder();

    if(resourceRootPath){

      folderBox.innerHTML=
        `已连接：
        <strong>
          ${esc(resourceRootPath)}
        </strong>`;

      await loadLibrary();

    }

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
