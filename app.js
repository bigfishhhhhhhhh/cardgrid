
import html2canvas from 'html2canvas';

const $ = id => document.getElementById(id);
let selected = null, cards = [], backgroundImage = null, freeTexts = [], selectedFreeText = null;
let bgState={zoom:1,x:50,y:50,rotate:0};

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
 img:null,number:String(cards.length+1),name:'',price:'',custom:'',
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
function needTop(c){
 const list=[[c.showNumber,c.numberPos],[c.showName,c.namePos],[c.showPrice,c.pricePos],[c.showCustom,c.customPos]];
 return list.some(([on,p])=>on&&(p.startsWith('out-top')||p.startsWith('cross-')));
}
function needBottom(c){
 const list=[[c.showNumber,c.numberPos],[c.showName,c.namePos],[c.showPrice,c.pricePos],[c.showCustom,c.customPos]];
 return list.some(([on,p])=>on&&p.startsWith('out-bottom'));
}
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
$('fileInput').onchange=e=>{const f=e.target.files?.[0];if(!f||selected===null)return;const r=new FileReader();r.onload=()=>{cards[selected].img=r.result;render();loadEditor()};r.readAsDataURL(f);e.target.value=''};
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
