
import html2canvas from 'html2canvas';
import Sortable from 'sortablejs';

const $ = id => document.getElementById(id);
let selected = null, cards = [], backgroundImage = null, freeTexts = [], selectedFreeText = null;
let bgState={zoom:1,x:50,y:50,rotate:0};
let cropSourceImage=null,cropRegions=[],selectedCropRegion=null,cropDisplayScale=1,cameraStream=null,orientationEnabled=false;
let batchSortable=null;

const POSITIONS=[
 ['top-left','框內左上'],['top-center','框內上中'],['top-right','框內右上'],
 ['center-left','框內左中'],['center','框內正中'],['center-right','框內右中'],
 ['bottom-left','框內左下'],['bottom-center','框內下中'],['bottom-right','框內右下'],
 ['out-top-left','框外上方・靠左'],['out-top-center','框外上方・置中'],['out-top-right','框外上方・靠右'],
 ['out-bottom-left','框外下方・靠左'],['out-bottom-center','框外下方・置中'],['out-bottom-right','框外下方・靠右'],
 ['cross-top-left','跨左上'],['cross-top-right','跨右上'],['manual','手動位置']
];
const FONTS=[
 ["-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC',sans-serif",'系統黑體'],
 ["Arial,sans-serif",'Arial'],["'Times New Roman',serif",'Times'],["Georgia,serif",'Georgia'],["monospace",'等寬'],["cursive",'手寫']
];

function populate(){
 ['numberPos','namePos','pricePos','customPos'].forEach(id=>{
   $(id).innerHTML=''; POSITIONS.forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;$(id).appendChild(o)});
 });
 ['numberFont','nameFont','priceFont','customFont','freeTextFont'].forEach(id=>{
   $(id).innerHTML=''; FONTS.forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;$(id).appendChild(o)});
 });
}
const newStyle=()=>({font:FONTS[0][0],size:16,color:'#ffffff',opacity:1});
function blankCard(){return{
 img:null,originalImg:null,number:String(cards.length+1),name:'',price:'',custom:'',
 showNumber:true,showName:false,showPrice:true,showCustom:false,
 numberPos:'bottom-left',namePos:'out-top-left',pricePos:'out-bottom-center',customPos:'center',numberStyle:'plain',
 numberStyleData:newStyle(),nameStyleData:newStyle(),priceStyleData:newStyle(),customStyleData:newStyle(),
 numberX:50,numberY:50,nameX:50,nameY:50,priceX:50,priceY:50,customX:50,customY:50,
 overrideSize:false,width:60,height:92,zoom:1,x:50,y:50,rotate:0,skewX:0,skewY:0,brightness:1,warmth:0,sold:false
}}
function parseLayout(){
 const a=$('layoutInput').value.trim().split(/[,，、\s]+/).map(v=>parseInt(v,10)).filter(v=>Number.isFinite(v)&&v>0);
 return a.length?a:[1];
}
function syncCards(){const n=parseLayout().reduce((a,b)=>a+b,0);while(cards.length<n)cards.push(blankCard());if(cards.length>n)cards.length=n;if(selected!==null&&selected>=cards.length)selected=null}
function gsize(){return{w:Math.max(20,+$('widthInput').value||60),h:Math.max(20,+$('heightInput').value||92)}}
function csize(c){const g=gsize();return c.overrideSize?{w:Math.max(20,+c.width||g.w),h:Math.max(20,+c.height||g.h)}:g}
function rgba(hex,a){const n=parseInt(hex.replace('#',''),16);return`rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`}
function fmtNum(v,s){if(s==='hash')return'#'+v;if(s==='bracket')return'['+v+']';if(s==='zero')return String(v).padStart(2,'0');if(s==='circle'){const m=['⓪','①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];return m[+v]||v}return v}
function outside(pos){return pos.startsWith('out-')||pos.startsWith('cross-')}
function visibleTextItems(c){
 return [
  [c.showNumber,String(c.number||'').trim(),c.numberPos],
  [c.showName,String(c.name||'').trim(),c.namePos],
  [c.showPrice,String(c.price||'').trim(),c.pricePos],
  [c.showCustom,String(c.custom||'').trim(),c.customPos]
 ];
}
function needTop(c){return visibleTextItems(c).some(([on,text,p])=>on&&text&&(p.startsWith('out-top')||p.startsWith('cross-')))}
function needBottom(c){return visibleTextItems(c).some(([on,text,p])=>on&&text&&p.startsWith('out-bottom'))}
function addMeta(shell,card,text,pos,sty,cardTop,cardH,mx=50,my=50){
 if(!text)return;
 const el=document.createElement('div');el.className=`meta-item pos-${pos}`;el.textContent=text;
 el.style.fontFamily=sty.font;el.style.fontSize=sty.size+'px';el.style.color=sty.color;el.style.opacity=sty.opacity;
 const target=(outside(pos)||pos==='manual')?shell:card;target.appendChild(el);
 if(pos.startsWith('out-top'))el.style.top=(cardTop-26)+'px';
 if(pos.startsWith('out-bottom'))el.style.top=(cardTop+cardH+5)+'px';
 if(pos.startsWith('cross-'))el.style.top=(cardTop-9)+'px';
 if(pos==='manual'){el.style.left=mx+'%';el.style.top=my+'%'}
 return el;
}
function groupedRuns(rowCards){
 const runs=[];let s=0;
 while(s<rowCards.length){
   const price=rowCards[s].showPrice?String(rowCards[s].price).trim():'';
   let e=s+1;while(e<rowCards.length){const p=rowCards[e].showPrice?String(rowCards[e].price).trim():'';if(!price||p!==price)break;e++}
   if(price&&e-s>=2)runs.push({s,e,price});s=e;
 }
 return runs;
}

function render(){
 syncCards();const board=$('board');board.innerHTML='';board.style.backgroundColor=$('backgroundColorInput').value;
 if(backgroundImage){const bg=document.createElement('img');bg.className='board-bg';bg.src=backgroundImage;bg.style.objectPosition=`${bgState.x}% ${bgState.y}%`;bg.style.transform=`scale(${bgState.zoom}) rotate(${bgState.rotate}deg)`;board.appendChild(bg)}
 const content=document.createElement('div');content.className='board-content';content.style.padding=`${Math.max(0,+$('padYInput').value||0)}px ${Math.max(0,+$('padXInput').value||0)}px`;board.appendChild(content);

 const hg=Math.max(0,+$('hGapInput').value||0),vg=Math.max(0,+$('vGapInput').value||0),scale=1.45,arr=parseLayout();
 let idx=0;
 arr.forEach((count,rowIndex)=>{
   const rowCards=cards.slice(idx,idx+count), dims=rowCards.map(csize), maxH=Math.max(...dims.map(d=>Math.max(90,d.h*scale)));
   const runs=$('groupPriceInput').checked?groupedRuns(rowCards):[];
   const gp=$('groupPricePosSelect').value;
   const topNeeded=rowCards.some(needTop)||(runs.length&&gp==='out-top');
   const bottomNeeded=rowCards.some(needBottom)||(runs.length&&gp==='out-bottom');
   const topReserve=topNeeded?34:0, bottomReserve=bottomNeeded?36:0;

   const row=document.createElement('div');row.className='card-row';row.style.gap=hg+'px';
   row.style.height=(topReserve+maxH+bottomReserve)+'px';
   row.style.marginBottom=rowIndex===arr.length-1?'0':vg+'px';

   const align=$('rowAlignSelect').value;
   rowCards.forEach((c,j)=>{
     const ci=idx+j,d=dims[j],w=Math.max(70,d.w*scale),h=Math.max(90,d.h*scale);
     const shell=document.createElement('div');shell.className='card-shell';shell.style.width=w+'px';shell.style.height=(topReserve+maxH+bottomReserve)+'px';
     let top=topReserve;if(align==='center')top+=((maxH-h)/2);if(align==='bottom')top+=(maxH-h);

     const card=document.createElement('div');card.className='card'+(selected===ci?' selected':'')+(c.img?' has-photo':'')+(c.sold?' sold':'');
     card.style.width=w+'px';card.style.height=h+'px';card.style.top=top+'px';
     const fr=+$('frameCornerSelect').value;card.style.borderRadius=(fr===999?Math.min(w,h)/2:fr)+'px';
     if($('borderEnabledInput').checked)card.style.border=`${+$('borderWidthInput').value||0}px solid ${rgba($('borderColorInput').value,+$('borderOpacityInput').value)}`;else card.style.border='none';

     const ph=document.createElement('div');ph.className='placeholder';ph.innerHTML='＋<br>放照片';card.appendChild(ph);
     if(c.img){const im=document.createElement('img');im.className='photo';im.src=c.img;im.style.objectPosition=`${c.x}% ${c.y}%`;
       const pr=+$('photoCornerSelect').value;im.style.borderRadius=(pr===999?Math.min(w,h)/2:pr)+'px';
       im.style.transform=`scale(${c.zoom}) rotate(${c.rotate}deg) skewX(${c.skewX}deg) skewY(${c.skewY}deg)`;
       const warm=+c.warmth;im.style.filter=`brightness(${c.brightness}) sepia(${Math.max(0,warm)*.38}) saturate(${1+Math.abs(warm)*.25}) hue-rotate(${warm<0?190:0}deg)`;card.appendChild(im);
     }
     addMeta(shell,card,c.showNumber?fmtNum(c.number,c.numberStyle):'',c.numberPos,c.numberStyleData,top,h,c.numberX,c.numberY);
     addMeta(shell,card,c.showName?c.name:'',c.namePos,c.nameStyleData,top,h,c.nameX,c.nameY);

     if(c.showPrice&&c.price){
       const pe=addMeta(shell,card,c.price,c.pricePos,c.priceStyleData,top,h,c.priceX,c.priceY);
       if(pe){pe.classList.add('individual-price');pe.dataset.localIndex=j}
     }
     addMeta(shell,card,c.showCustom?c.custom:'',c.customPos,c.customStyleData,top,h,c.customX,c.customY);

     card.onclick=()=>{selected=ci;render();loadEditor()};card.ondblclick=e=>{e.preventDefault();c.sold=!c.sold;render();loadEditor()};
     shell.appendChild(card);row.appendChild(shell);
   });
   content.appendChild(row);
   renderGroupPrices(row,rowCards,runs,topReserve,maxH,bottomReserve);
   idx+=count;
 });
 const layer=document.createElement('div');layer.className='free-text-layer';
 freeTexts.forEach(t=>{const el=document.createElement('div');el.className='free-text-item';el.textContent=t.text;el.style.left=t.x+'%';el.style.top=t.y+'%';el.style.fontFamily=t.font;el.style.fontSize=t.size+'px';el.style.color=t.color;el.style.opacity=t.opacity;el.style.transform=`translate(-50%,-50%) rotate(${t.rotate}deg)`;layer.appendChild(el)});
 board.appendChild(layer);
 renderBatchOrder();
}
function renderGroupPrices(row,rowCards,runs,topReserve,maxH,bottomReserve){
 if(!runs.length)return;
 const shells=[...row.querySelectorAll('.card-shell')],pos=$('groupPricePosSelect').value,align=$('groupPriceAlignSelect').value,xoff=+$('groupPriceXInput').value||0,yoff=+$('groupPriceYInput').value||0;
 runs.forEach(run=>{
   for(let k=run.s;k<run.e;k++)shells[k].querySelectorAll('.individual-price').forEach(el=>el.style.display='none');
   const left=shells[run.s].offsetLeft,right=shells[run.e-1].offsetLeft+shells[run.e-1].offsetWidth;
   const g=document.createElement('div');g.className=`group-price align-${align}`;g.style.left=(left+xoff)+'px';g.style.width=(right-left)+'px';
   const st=rowCards[run.s].priceStyleData;g.style.fontFamily=st.font;g.style.fontSize=st.size+'px';g.style.color=st.color;g.style.opacity=st.opacity;g.textContent=`${run.price}/1`;
   let gy=0;if(pos==='out-top')gy=2;if(pos==='out-bottom')gy=topReserve+maxH+4;if(pos==='in-top')gy=topReserve+4;if(pos==='in-bottom')gy=topReserve+maxH-30;g.style.top=(gy+yoff)+'px';
   row.appendChild(g);
 });
}
function loadEditor(){
 if(selected===null||!cards[selected]){$('noSelection').hidden=false;$('editor').hidden=true;return}
 $('noSelection').hidden=true;$('editor').hidden=false;const c=cards[selected];
 ['number','name','price','custom'].forEach(p=>{$(p+'Input').value=c[p];$('show'+p[0].toUpperCase()+p.slice(1)).checked=c['show'+p[0].toUpperCase()+p.slice(1)];$(p+'Pos').value=c[p+'Pos'];
   const s=c[p+'StyleData'];$(p+'Font').value=s.font;$(p+'Size').value=s.size;$(p+'Color').value=s.color;$(p+'Opacity').value=s.opacity;$(p+'X').value=c[p+'X'];$(p+'Y').value=c[p+'Y'];$(p+'Manual').classList.toggle('show',c[p+'Pos']==='manual');
 });
 $('numberStyleSelect').value=c.numberStyle;$('overrideSizeInput').checked=c.overrideSize;$('cardWidthInput').value=c.width;$('cardHeightInput').value=c.height;$('cardSizeControls').classList.toggle('enabled',c.overrideSize);
 const m=[[60,92],[67,92],[81,107],[96,133],[134,190]].find(([w,h])=>+c.width===w&&+c.height===h);$('cardPresetSelect').value=m?`${m[0]},${m[1]}`:'custom';
 ['zoom','x','y','rotate','skewX','skewY','brightness','warmth'].forEach(k=>$(k+'Input').value=c[k]);$('soldInput').checked=c.sold;
}
function loadFreeTextEditor(){
 const has=selectedFreeText!==null&&freeTexts[selectedFreeText];$('noFreeText').hidden=!!has;$('freeTextEditor').hidden=!has;$('freeTextSelect').innerHTML='';
 freeTexts.forEach((t,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${i+1}. ${t.text||'（空白）'}`;$('freeTextSelect').appendChild(o)});
 if(!has)return;const t=freeTexts[selectedFreeText];$('freeTextSelect').value=selectedFreeText;$('freeTextContentInput').value=t.text;$('freeTextFont').value=t.font;$('freeTextSize').value=t.size;$('freeTextColor').value=t.color;$('freeTextOpacity').value=t.opacity;$('freeTextX').value=t.x;$('freeTextY').value=t.y;$('freeTextRotate').value=t.rotate;
}
function addFreeText(){freeTexts.push({text:'新文字',font:FONTS[0][0],size:20,color:'#111111',opacity:1,x:50,y:50,rotate:0});selectedFreeText=freeTexts.length-1;render();loadFreeTextEditor()}
function choosePhoto(){if(selected===null){alert('先點一個框框');return}$('fileInput').click()}
populate();

$('addCardBtn').onclick=()=>{const a=parseLayout();a[a.length-1]++;$('layoutInput').value=a.join(',');render()};
$('photoBtn').onclick=choosePhoto;$('choosePhotoBtn').onclick=choosePhoto;$('addFreeTextBtn').onclick=addFreeText;$('addFreeTextTopBtn').onclick=addFreeText;
$('fileInput').onchange=e=>{const f=e.target.files?.[0];if(!f||selected===null)return;const r=new FileReader();r.onload=()=>{cards[selected].img=r.result;cards[selected].originalImg=r.result;render();loadEditor()};r.readAsDataURL(f);e.target.value=''};
$('removePhotoBtn').onclick=()=>{if(selected===null)return;cards[selected].img=null;render()};

$('backgroundImageBtn').onclick=()=>$('backgroundFileInput').click();
$('backgroundFileInput').onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{backgroundImage=r.result;$('backgroundAdjustPanel').classList.add('enabled');render()};r.readAsDataURL(f);e.target.value=''};
$('clearBackgroundImageBtn').onclick=()=>{backgroundImage=null;$('backgroundAdjustPanel').classList.remove('enabled');render()};
$('bgZoomInput').oninput=()=>{bgState.zoom=+$('bgZoomInput').value;render()};$('bgXInput').oninput=()=>{bgState.x=+$('bgXInput').value;render()};$('bgYInput').oninput=()=>{bgState.y=+$('bgYInput').value;render()};$('bgRotateInput').oninput=()=>{bgState.rotate=+$('bgRotateInput').value;render()};

$('presetSelect').onchange=()=>{if($('presetSelect').value==='custom')return;const[w,h]=$('presetSelect').value.split(',').map(Number);$('widthInput').value=w;$('heightInput').value=h;render()};
$('cardPresetSelect').onchange=()=>{if(selected===null||$('cardPresetSelect').value==='custom')return;const[w,h]=$('cardPresetSelect').value.split(',').map(Number);cards[selected].width=w;cards[selected].height=h;$('cardWidthInput').value=w;$('cardHeightInput').value=h;render()};
$('overrideSizeInput').onchange=()=>{if(selected===null)return;cards[selected].overrideSize=$('overrideSizeInput').checked;$('cardSizeControls').classList.toggle('enabled',cards[selected].overrideSize);render()};
$('cardWidthInput').oninput=()=>{if(selected===null)return;cards[selected].width=+$('cardWidthInput').value||60;$('cardPresetSelect').value='custom';render()};
$('cardHeightInput').oninput=()=>{if(selected===null)return;cards[selected].height=+$('cardHeightInput').value||92;$('cardPresetSelect').value='custom';render()};

['layoutInput','widthInput','heightInput','hGapInput','vGapInput','padXInput','padYInput','rowAlignSelect','groupPriceInput','groupPricePosSelect','groupPriceAlignSelect','groupPriceXInput','groupPriceYInput',
'backgroundColorInput','borderEnabledInput','borderColorInput','borderWidthInput','borderOpacityInput','frameCornerSelect','photoCornerSelect'].forEach(id=>{
 $(id).addEventListener('input',render);$(id).addEventListener('change',render)
});
['number','name','price','custom'].forEach(p=>{
 $(p+'Input').oninput=()=>{if(selected===null)return;cards[selected][p]=$(p+'Input').value;render()};
 $('show'+p[0].toUpperCase()+p.slice(1)).onchange=()=>{if(selected===null)return;cards[selected]['show'+p[0].toUpperCase()+p.slice(1)]=$('show'+p[0].toUpperCase()+p.slice(1)).checked;render()};
 $(p+'Pos').onchange=()=>{if(selected===null)return;cards[selected][p+'Pos']=$(p+'Pos').value;$(p+'Manual').classList.toggle('show',$(p+'Pos').value==='manual');render()};
 $(p+'Font').onchange=()=>{if(selected===null)return;cards[selected][p+'StyleData'].font=$(p+'Font').value;render()};
 $(p+'Size').oninput=()=>{if(selected===null)return;cards[selected][p+'StyleData'].size=+$(p+'Size').value||16;render()};
 $(p+'Color').oninput=()=>{if(selected===null)return;cards[selected][p+'StyleData'].color=$(p+'Color').value;render()};
 $(p+'Opacity').oninput=()=>{if(selected===null)return;cards[selected][p+'StyleData'].opacity=+$(p+'Opacity').value;render()};
 $(p+'X').oninput=()=>{if(selected===null)return;cards[selected][p+'X']=+$(p+'X').value;render()};
 $(p+'Y').oninput=()=>{if(selected===null)return;cards[selected][p+'Y']=+$(p+'Y').value;render()};
});
$('numberStyleSelect').onchange=()=>{if(selected===null)return;cards[selected].numberStyle=$('numberStyleSelect').value;render()};
['zoom','x','y','rotate','skewX','skewY','brightness','warmth'].forEach(k=>$(k+'Input').oninput=()=>{if(selected===null)return;cards[selected][k]=+$(k+'Input').value;render()});
$('soldInput').onchange=()=>{if(selected===null)return;cards[selected].sold=$('soldInput').checked;render()};

$('freeTextSelect').onchange=()=>{selectedFreeText=+$('freeTextSelect').value;loadFreeTextEditor()};
$('freeTextContentInput').oninput=()=>{if(selectedFreeText===null)return;freeTexts[selectedFreeText].text=$('freeTextContentInput').value;render();loadFreeTextEditor()};
$('freeTextFont').onchange=()=>{if(selectedFreeText===null)return;freeTexts[selectedFreeText].font=$('freeTextFont').value;render()};
$('freeTextSize').oninput=()=>{if(selectedFreeText===null)return;freeTexts[selectedFreeText].size=+$('freeTextSize').value||20;render()};
$('freeTextColor').oninput=()=>{if(selectedFreeText===null)return;freeTexts[selectedFreeText].color=$('freeTextColor').value;render()};
$('freeTextOpacity').oninput=()=>{if(selectedFreeText===null)return;freeTexts[selectedFreeText].opacity=+$('freeTextOpacity').value;render()};
$('freeTextX').oninput=()=>{if(selectedFreeText===null)return;freeTexts[selectedFreeText].x=+$('freeTextX').value;render()};
$('freeTextY').oninput=()=>{if(selectedFreeText===null)return;freeTexts[selectedFreeText].y=+$('freeTextY').value;render()};
$('freeTextRotate').oninput=()=>{if(selectedFreeText===null)return;freeTexts[selectedFreeText].rotate=+$('freeTextRotate').value;render()};
$('duplicateFreeTextBtn').onclick=()=>{if(selectedFreeText===null)return;const t={...freeTexts[selectedFreeText],x:Math.min(100,freeTexts[selectedFreeText].x+5),y:Math.min(100,freeTexts[selectedFreeText].y+5)};freeTexts.push(t);selectedFreeText=freeTexts.length-1;render();loadFreeTextEditor()};
$('deleteFreeTextBtn').onclick=()=>{if(selectedFreeText===null)return;freeTexts.splice(selectedFreeText,1);selectedFreeText=freeTexts.length?Math.min(selectedFreeText,freeTexts.length-1):null;render();loadFreeTextEditor()};


function setLayoutTotal(total){
 const current=parseLayout();let cols=Math.max(1,current[0]||4),rows=[];let remaining=total;
 while(remaining>0){rows.push(Math.min(cols,remaining));remaining-=cols}
 $('layoutInput').value=(rows.length?rows:[1]).join(',');syncCards();
}
function renumberAll(){cards.forEach((c,i)=>c.number=String(i+1))}
function addImageBatch(images){
 if(!images.length)return;
 syncCards();let empty=cards.filterIndex?null:null;
 let imageIndex=0;
 for(let i=0;i<cards.length&&imageIndex<images.length;i++){
   if(!cards[i].img){cards[i].img=images[imageIndex];cards[i].originalImg=images[imageIndex];imageIndex++}
 }
 if(imageIndex<images.length){
   const oldCount=cards.length,needed=images.length-imageIndex;setLayoutTotal(oldCount+needed);
   for(let i=oldCount;i<cards.length&&imageIndex<images.length;i++){cards[i].img=images[imageIndex];cards[i].originalImg=images[imageIndex];imageIndex++}
 }
 if($('autoNumberBatch').checked)renumberAll();render();loadEditor();
}
function readFilesAsDataURLs(files){return Promise.all([...files].map(f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})))}
$('multiUploadBtn').onclick=()=>$('multiFileInput').click();
$('multiFileInput').onchange=async e=>{const urls=await readFilesAsDataURLs(e.target.files||[]);addImageBatch(urls);e.target.value=''};

function imageCardIndices(){return cards.map((c,i)=>c.img?i:-1).filter(i=>i>=0)}
function renderBatchOrder(){
 const list=$('batchOrderList');if(!list)return;const inds=imageCardIndices();list.innerHTML='';
 inds.forEach(i=>{const c=cards[i],el=document.createElement('div');el.className='batch-order-item';el.dataset.cardIndex=i;el.innerHTML=`<span class="drag-handle">☰</span><img class="batch-thumb" src="${c.img}"><div class="batch-order-meta"><b>#${c.number||i+1}</b><span>${c.price?'$ '+c.price:'尚未輸入價格'}</span></div><button type="button" data-edit="${i}">編輯</button>`;list.appendChild(el)});
 list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{selected=+b.dataset.edit;render();loadEditor();document.getElementById('editor').scrollIntoView({behavior:'smooth'})});
 if(batchSortable){batchSortable.destroy();batchSortable=null}
 batchSortable=new Sortable(list,{animation:150,handle:'.drag-handle',touchStartThreshold:4,onEnd(evt){
   const before=imageCardIndices();const movedIndex=before[evt.oldIndex],targetIndex=before[evt.newIndex];if(movedIndex===undefined||targetIndex===undefined)return;
   const moved=cards.splice(movedIndex,1)[0];let insertAt=targetIndex;if(movedIndex<targetIndex)insertAt--;cards.splice(insertAt,0,moved);if($('autoNumberBatch').checked)renumberAll();render();
 }});
}
$('applyQuickPriceBtn').onclick=()=>{
 const lines=$('quickPriceInput').value.split(/\n+/);let count=0;
 lines.forEach(line=>{const m=line.trim().match(/^(\S+)\s*[,，:\t ]+\s*(.+)$/);if(!m)return;const num=m[1],price=m[2].trim();const c=cards.find(x=>String(x.number).trim()===num);if(c){c.price=price;c.showPrice=true;count++}});render();alert(`已套用 ${count} 筆價格`)
};
// batch price position options follows regular text positions
POSITIONS.forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;$('batchPricePosSelect').appendChild(o)});$('batchPricePosSelect').value='out-bottom-center';
$('applyBatchStyleBtn').onclick=()=>{const size=+$('batchFontSizeInput').value||16,pos=$('batchPricePosSelect').value;cards.filter(c=>c.img).forEach(c=>{c.numberStyleData.size=size;c.nameStyleData.size=size;c.priceStyleData.size=size;c.customStyleData.size=size;c.pricePos=pos});render()};

// -------- Multi-card crop editor: classical geometry only --------
function loadImage(dataUrl){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=dataUrl})}
function orderQuad(pts){
 const c={x:pts.reduce((s,p)=>s+p.x,0)/4,y:pts.reduce((s,p)=>s+p.y,0)/4};
 return pts.slice().sort((a,b)=>Math.atan2(a.y-c.y,a.x-c.x)-Math.atan2(b.y-c.y,b.x-c.x)).reduce((arr,p)=>arr.concat(p),[]);
}
async function openCropEditor(dataUrl){cropSourceImage=await loadImage(dataUrl);cropRegions=[];selectedCropRegion=null;$('cropModal').hidden=false;resizeCropCanvas();drawCropEditor();setTimeout(autoDetectCards,200)}
function resizeCropCanvas(){if(!cropSourceImage)return;const canvas=$('cropCanvas'),maxW=Math.min(820,window.innerWidth-40);cropDisplayScale=Math.min(1,maxW/cropSourceImage.naturalWidth);canvas.width=Math.round(cropSourceImage.naturalWidth*cropDisplayScale);canvas.height=Math.round(cropSourceImage.naturalHeight*cropDisplayScale)}
function drawCropEditor(){
 const can=$('cropCanvas');if(!cropSourceImage)return;const ctx=can.getContext('2d');ctx.clearRect(0,0,can.width,can.height);ctx.drawImage(cropSourceImage,0,0,can.width,can.height);
 cropRegions.forEach((r,ri)=>{const pts=r.pts.map(p=>({x:p.x*cropDisplayScale,y:p.y*cropDisplayScale}));ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();ctx.lineWidth=ri===selectedCropRegion?4:2;ctx.strokeStyle=ri===selectedCropRegion?'#7f8cff':'#2fd1ff';ctx.stroke();pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,ri===selectedCropRegion?8:6,0,Math.PI*2);ctx.fillStyle=ri===selectedCropRegion?'#7f8cff':'#2fd1ff';ctx.fill()});ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(pts[0].x,pts[0].y,26,20);ctx.fillStyle='#fff';ctx.font='13px sans-serif';ctx.fillText(String(ri+1),pts[0].x+7,pts[0].y+15)});renderCropRegionList()
}
function renderCropRegionList(){const box=$('cropRegionList');box.innerHTML='';cropRegions.forEach((r,i)=>{const d=document.createElement('div');d.className='crop-region-item'+(i===selectedCropRegion?' selected':'');d.innerHTML=`<b>${i+1}</b><label><input type="checkbox" data-persp="${i}" ${r.perspective?'checked':''}> 透視校正（選用）</label><button data-selectcrop="${i}">選取</button>`;box.appendChild(d)});box.querySelectorAll('[data-persp]').forEach(x=>x.onchange=()=>cropRegions[+x.dataset.persp].perspective=x.checked);box.querySelectorAll('[data-selectcrop]').forEach(x=>x.onclick=()=>{selectedCropRegion=+x.dataset.selectcrop;drawCropEditor()})}
function contourAreaPts(pts){let a=0;for(let i=0;i<pts.length;i++){let j=(i+1)%pts.length;a+=pts[i].x*pts[j].y-pts[j].x*pts[i].y}return Math.abs(a/2)}
async function waitForCv(timeout=7000){const start=Date.now();while(Date.now()-start<timeout){if(window.cv&&cv.Mat)return true;await new Promise(r=>setTimeout(r,150))}return false}
async function autoDetectCards(){
 if(!cropSourceImage)return;const ok=await waitForCv();if(!ok){alert('OpenCV 還在載入，請稍後再按「自動辨識」。');return}
 const srcCan=document.createElement('canvas');srcCan.width=cropSourceImage.naturalWidth;srcCan.height=cropSourceImage.naturalHeight;srcCan.getContext('2d').drawImage(cropSourceImage,0,0);
 let src=cv.imread(srcCan),gray=new cv.Mat(),blur=new cv.Mat(),edges=new cv.Mat(),contours=new cv.MatVector(),hierarchy=new cv.Mat();
 try{cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);cv.GaussianBlur(gray,blur,new cv.Size(5,5),0);cv.Canny(blur,edges,55,150);cv.findContours(edges,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);const found=[],imgArea=src.cols*src.rows;
   for(let i=0;i<contours.size();i++){const cnt=contours.get(i),peri=cv.arcLength(cnt,true),approx=new cv.Mat();cv.approxPolyDP(cnt,approx,0.02*peri,true);if(approx.rows===4){const pts=[];for(let k=0;k<4;k++)pts.push({x:approx.intPtr(k,0)[0],y:approx.intPtr(k,0)[1]});const area=contourAreaPts(pts);if(area>imgArea*.012&&area<imgArea*.45){const ordered=orderQuad(pts);found.push({pts:ordered,perspective:false,area})}}approx.delete();cnt.delete()}
   found.sort((a,b)=>{const ay=Math.min(...a.pts.map(p=>p.y)),by=Math.min(...b.pts.map(p=>p.y));if(Math.abs(ay-by)>src.rows*.08)return ay-by;return Math.min(...a.pts.map(p=>p.x))-Math.min(...b.pts.map(p=>p.x))});
   // remove near-duplicates by center
   const unique=[];for(const r of found){const cx=r.pts.reduce((s,p)=>s+p.x,0)/4,cy=r.pts.reduce((s,p)=>s+p.y,0)/4;if(!unique.some(u=>{const ux=u.pts.reduce((s,p)=>s+p.x,0)/4,uy=u.pts.reduce((s,p)=>s+p.y,0)/4;return Math.hypot(cx-ux,cy-uy)<Math.min(src.cols,src.rows)*.04}))unique.push(r)}
   cropRegions=unique.slice(0,30);selectedCropRegion=cropRegions.length?0:null;if(!cropRegions.length)addDefaultCrop();drawCropEditor();
 }finally{src.delete();gray.delete();blur.delete();edges.delete();contours.delete();hierarchy.delete()}
}
function addDefaultCrop(){if(!cropSourceImage)return;const w=cropSourceImage.naturalWidth,h=cropSourceImage.naturalHeight,cx=w/2,cy=h/2,rw=w*.22,rh=h*.35;cropRegions.push({pts:[{x:cx-rw,y:cy-rh},{x:cx+rw,y:cy-rh},{x:cx+rw,y:cy+rh},{x:cx-rw,y:cy+rh}],perspective:false});selectedCropRegion=cropRegions.length-1}
$('detectCardsBtn').onclick=autoDetectCards;$('addCropBtn').onclick=()=>{addDefaultCrop();drawCropEditor()};$('deleteCropBtn').onclick=()=>{if(selectedCropRegion===null)return;cropRegions.splice(selectedCropRegion,1);selectedCropRegion=cropRegions.length?Math.min(selectedCropRegion,cropRegions.length-1):null;drawCropEditor()};
$('multiCardPhotoBtn').onclick=()=>$('multiCardFileInput').click();$('multiCardFileInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const [url]=await readFilesAsDataURLs([f]);openCropEditor(url);e.target.value=''};$('closeCropModalBtn').onclick=()=>{$('cropModal').hidden=true};
let dragCorner=null;
$('cropCanvas').addEventListener('pointerdown',e=>{if(!cropRegions.length)return;const r=$('cropCanvas').getBoundingClientRect(),x=(e.clientX-r.left)*($('cropCanvas').width/r.width),y=(e.clientY-r.top)*($('cropCanvas').height/r.height);let best=null,bd=28;cropRegions.forEach((reg,ri)=>reg.pts.forEach((p,pi)=>{const d=Math.hypot(p.x*cropDisplayScale-x,p.y*cropDisplayScale-y);if(d<bd){bd=d;best={ri,pi}}}));if(best){selectedCropRegion=best.ri;dragCorner=best;$('cropCanvas').setPointerCapture(e.pointerId);drawCropEditor()}});
$('cropCanvas').addEventListener('pointermove',e=>{if(!dragCorner)return;const r=$('cropCanvas').getBoundingClientRect(),x=(e.clientX-r.left)*($('cropCanvas').width/r.width)/cropDisplayScale,y=(e.clientY-r.top)*($('cropCanvas').height/r.height)/cropDisplayScale;cropRegions[dragCorner.ri].pts[dragCorner.pi]={x:Math.max(0,Math.min(cropSourceImage.naturalWidth,x)),y:Math.max(0,Math.min(cropSourceImage.naturalHeight,y))};drawCropEditor()});
$('cropCanvas').addEventListener('pointerup',()=>dragCorner=null);$('cropCanvas').addEventListener('pointercancel',()=>dragCorner=null);
function rawCrop(region){const xs=region.pts.map(p=>p.x),ys=region.pts.map(p=>p.y),x=Math.max(0,Math.floor(Math.min(...xs))),y=Math.max(0,Math.floor(Math.min(...ys))),x2=Math.min(cropSourceImage.naturalWidth,Math.ceil(Math.max(...xs))),y2=Math.min(cropSourceImage.naturalHeight,Math.ceil(Math.max(...ys))),w=x2-x,h=y2-y;const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(cropSourceImage,x,y,w,h,0,0,w,h);return c.toDataURL('image/jpeg',.96)}
async function perspectiveCrop(region){const ok=await waitForCv();if(!ok)return rawCrop(region);const ordered=orderQuad(region.pts),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),w=Math.max(10,Math.round(Math.max(dist(ordered[0],ordered[1]),dist(ordered[3],ordered[2])))),h=Math.max(10,Math.round(Math.max(dist(ordered[0],ordered[3]),dist(ordered[1],ordered[2]))));const srcCan=document.createElement('canvas');srcCan.width=cropSourceImage.naturalWidth;srcCan.height=cropSourceImage.naturalHeight;srcCan.getContext('2d').drawImage(cropSourceImage,0,0);const src=cv.imread(srcCan),dst=new cv.Mat(),srcTri=cv.matFromArray(4,1,cv.CV_32FC2,ordered.flatMap(p=>[p.x,p.y])),dstTri=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,w-1,0,w-1,h-1,0,h-1]),M=cv.getPerspectiveTransform(srcTri,dstTri);cv.warpPerspective(src,dst,M,new cv.Size(w,h),cv.INTER_LINEAR,cv.BORDER_REPLICATE);const out=document.createElement('canvas');out.width=w;out.height=h;cv.imshow(out,dst);const url=out.toDataURL('image/jpeg',.96);src.delete();dst.delete();srcTri.delete();dstTri.delete();M.delete();return url}
$('importCropsBtn').onclick=async()=>{if(!cropRegions.length)return;const sorted=cropRegions.slice().sort((a,b)=>{const ay=Math.min(...a.pts.map(p=>p.y)),by=Math.min(...b.pts.map(p=>p.y));if(Math.abs(ay-by)>cropSourceImage.naturalHeight*.08)return ay-by;return Math.min(...a.pts.map(p=>p.x))-Math.min(...b.pts.map(p=>p.x))});const imgs=[];for(const r of sorted){const original=rawCrop(r),shown=r.perspective?await perspectiveCrop(r):original;imgs.push({shown,original})}addImageBatchObjects(imgs);$('cropModal').hidden=true};
function addImageBatchObjects(items){const urls=items.map(x=>x.shown);syncCards();let k=0;for(let i=0;i<cards.length&&k<items.length;i++)if(!cards[i].img){cards[i].img=items[k].shown;cards[i].originalImg=items[k].original;k++}if(k<items.length){const old=cards.length;setLayoutTotal(old+items.length-k);for(let i=old;i<cards.length&&k<items.length;i++){cards[i].img=items[k].shown;cards[i].originalImg=items[k].original;k++}}if($('autoNumberBatch').checked)renumberAll();render()}
$('restoreOriginalCropBtn').onclick=()=>{if(selected===null||!cards[selected]?.originalImg)return;cards[selected].img=cards[selected].originalImg;render();loadEditor()};

// camera + orientation guidance
async function requestOrientation(){try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted')throw new Error('denied')}orientationEnabled=true;window.addEventListener('deviceorientation',handleOrientation);$('orientationStatus').textContent='拍正提示已啟用。拍攝時會依手機傾斜方向提示。'}catch(e){$('orientationStatus').textContent='無法取得方向感測權限；仍可正常拍照。'}}
function handleOrientation(e){if(!orientationEnabled)return;const beta=e.beta??0,gamma=e.gamma??0;let msg='角度接近平行，可以拍攝';if(Math.abs(gamma)>5)msg=gamma>0?'請將手機稍微往左':'請將手機稍微往右';else if(Math.abs(beta)>5)msg=beta>0?'請將手機上緣稍微壓低':'請將手機上緣稍微抬高';$('cameraLevelHint').textContent=msg}
$('orientationBtn').onclick=requestOrientation;
$('cameraBatchBtn').onclick=async()=>{try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});$('cameraVideo').srcObject=cameraStream;$('cameraModal').hidden=false}catch(e){alert('無法開啟相機，請確認 Safari 已允許相機權限。')}};
function stopCamera(){if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}$('cameraModal').hidden=true}
$('closeCameraBtn').onclick=stopCamera;$('captureCameraBtn').onclick=async()=>{const v=$('cameraVideo');if(!v.videoWidth)return;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);const url=c.toDataURL('image/jpeg',.96);stopCamera();openCropEditor(url)};

$('exportBtn').onclick=async()=>{
 const board=$('board'), oldSelected=selected;
 board.classList.add('exporting');
 try{
   const canvas=await html2canvas(board,{backgroundColor:null,scale:2,useCORS:true,logging:false});
   const blob=await new Promise(res=>canvas.toBlob(res,'image/png'));
   const file=new File([blob],'cardgrid.png',{type:'image/png'});
   if(navigator.canShare && navigator.canShare({files:[file]})){
     await navigator.share({files:[file],title:'CardGrid'});
   }else{
     const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='cardgrid.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
   }
 }catch(err){console.error(err);alert('匯出失敗，請再試一次。')}
 finally{board.classList.remove('exporting')}
};

render();loadEditor();loadFreeTextEditor();
