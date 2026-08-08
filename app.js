
const $ = (id) => document.getElementById(id);

let selected = null;
let cards = [];
let backgroundImage = null;

const POSITIONS = [
  ['top-left','框內左上'],['top-center','框內上中'],['top-right','框內右上'],
  ['center-left','框內左中'],['center','框內正中'],['center-right','框內右中'],
  ['bottom-left','框內左下'],['bottom-center','框內下中'],['bottom-right','框內右下'],
  ['out-top-left','框外上方・靠左'],['out-top-center','框外上方・置中'],['out-top-right','框外上方・靠右'],
  ['out-bottom-left','框外下方・靠左'],['out-bottom-center','框外下方・置中'],['out-bottom-right','框外下方・靠右'],
  ['cross-top-left','跨左上'],['cross-top-right','跨右上']
];

const FONTS = [
  ["-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC',sans-serif",'系統黑體'],
  ["Arial,sans-serif",'Arial'],
  ["'Times New Roman',serif",'Times'],
  ["Georgia,serif",'Georgia'],
  ["monospace",'等寬'],
  ["cursive",'手寫']
];

function populateSelects() {
  ['numberPos','namePos','pricePos','customPos'].forEach(id=>{
    const s=$(id); s.innerHTML='';
    POSITIONS.forEach(([v,t])=>{
      const o=document.createElement('option');o.value=v;o.textContent=t;s.appendChild(o);
    });
  });
  ['numberFont','nameFont','priceFont','customFont'].forEach(id=>{
    const s=$(id); s.innerHTML='';
    FONTS.forEach(([v,t])=>{
      const o=document.createElement('option');o.value=v;o.textContent=t;s.appendChild(o);
    });
  });
}

function metaStyle() {
  return {font:FONTS[0][0],size:16,color:'#ffffff',opacity:1};
}

function blankCard() {
  return {
    img:null,
    number:String(cards.length + 1), name:'', price:'', custom:'',
    showNumber:true, showName:false, showPrice:true, showCustom:false,
    numberPos:'bottom-left', namePos:'out-top-left', pricePos:'out-bottom-center', customPos:'center',
    numberStyle:'plain',
    numberStyleData:metaStyle(), nameStyleData:metaStyle(), priceStyleData:metaStyle(), customStyleData:metaStyle(),
    overrideSize:false,width:60,height:92,
    zoom:1,x:50,y:50,rotate:0,skewX:0,skewY:0,brightness:1,warmth:0,sold:false
  };
}

function parseLayout() {
  const arr = $('layoutInput').value.trim()
    .split(/[,，、\s]+/)
    .map(v => parseInt(v.trim(),10))
    .filter(v => Number.isFinite(v) && v > 0);
  return arr.length ? arr : [1];
}

function syncCards() {
  const count=parseLayout().reduce((a,b)=>a+b,0);
  while(cards.length<count) cards.push(blankCard());
  if(cards.length>count) cards.length=count;
  if(selected!==null && selected>=cards.length) selected=null;
}

function globalSize(){
  return {
    w:Math.max(20,Number($('widthInput').value)||60),
    h:Math.max(20,Number($('heightInput').value)||92)
  };
}
function sizeOf(c){
  const g=globalSize();
  return c.overrideSize ? {w:Math.max(20,+c.width||g.w),h:Math.max(20,+c.height||g.h)} : g;
}
function rgba(hex,a){
  const h=hex.replace('#','');const n=parseInt(h,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
function formatNumber(v,style){
  if(style==='hash') return '#'+v;
  if(style==='bracket') return '['+v+']';
  if(style==='zero') return String(v).padStart(2,'0');
  if(style==='circle'){
    const m=['⓪','①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];
    return m[+v] || v;
  }
  return v;
}
function usesOutside(pos){ return pos.startsWith('out-') || pos.startsWith('cross-'); }

function addMeta(shell, text, pos, style){
  if(!text) return;
  const el=document.createElement('div');
  el.className=`meta-item pos-${pos}`;
  el.textContent=text;
  el.style.fontFamily=style.font;
  el.style.fontSize=style.size+'px';
  el.style.color=style.color;
  el.style.opacity=style.opacity;
  shell.appendChild(el);
}

function render(){
  syncCards();
  const board=$('board');
  board.innerHTML='';
  board.style.padding=(+($('padInput').value)||0)+'px';
  board.style.backgroundColor=$('backgroundColorInput').value;
  board.style.backgroundImage=backgroundImage ? `url(${backgroundImage})` : 'none';

  const gap=Math.max(0,+$('gapInput').value||0);
  const scale=1.45;
  const arr=parseLayout();
  let idx=0;

  arr.forEach((count,rowIndex)=>{
    const row=document.createElement('div');
    row.className='card-row';
    row.style.gap=gap+'px';
    row.style.marginBottom=rowIndex===arr.length-1?'0':gap+'px';
    row.dataset.startIndex=idx;

    const rowCards=cards.slice(idx,idx+count);
    const dims=rowCards.map(sizeOf);
    const maxH=Math.max(...dims.map(d=>d.h*scale));
    const outsideTop=34, outsideBottom=42;
    row.style.height=(maxH+outsideTop+outsideBottom)+'px';

    const align=$('rowAlignSelect').value;
    rowCards.forEach((c,j)=>{
      const cardIndex=idx+j;
      const d=dims[j];
      const w=Math.max(70,d.w*scale), h=Math.max(90,d.h*scale);
      const shell=document.createElement('div');
      shell.className='card-shell';
      shell.style.width=w+'px';
      shell.style.height=(maxH+outsideTop+outsideBottom)+'px';

      let top=outsideTop;
      if(align==='center') top=outsideTop+(maxH-h)/2;
      if(align==='bottom') top=outsideTop+(maxH-h);

      const card=document.createElement('div');
      card.className='card'+(selected===cardIndex?' selected':'')+(c.img?' has-photo':'')+(c.sold?' sold':'');
      card.style.width=w+'px'; card.style.height=h+'px'; card.style.top=top+'px';
      card.style.borderRadius=($('frameCornerSelect').value==='999' ? Math.min(w,h)/2 : +$('frameCornerSelect').value)+'px';

      if($('borderEnabledInput').checked){
        card.style.border=`${+$('borderWidthInput').value||0}px solid ${rgba($('borderColorInput').value,+$('borderOpacityInput').value)}`;
      } else {
        card.style.border='none';
      }

      const ph=document.createElement('div'); ph.className='placeholder'; ph.innerHTML='＋<br>放照片'; card.appendChild(ph);

      if(c.img){
        const im=document.createElement('img'); im.className='photo'; im.src=c.img;
        im.style.objectPosition=`${c.x}% ${c.y}%`;
        im.style.borderRadius=($('photoCornerSelect').value==='999' ? Math.min(w,h)/2 : +$('photoCornerSelect').value)+'px';
        im.style.transform=`scale(${c.zoom}) rotate(${c.rotate}deg) skewX(${c.skewX}deg) skewY(${c.skewY}deg)`;
        const warm=+c.warmth;
        const sep=Math.max(0,warm)*.38;
        const hue=warm<0 ? 190 : 0;
        im.style.filter=`brightness(${c.brightness}) sepia(${sep}) saturate(${1+Math.abs(warm)*.25}) hue-rotate(${hue}deg)`;
        card.appendChild(im);
      }

      // inside meta go into card; outside/cross go into shell relative to actual card top.
      const add = (shown,text,pos,sty)=>{
        if(!shown || !text) return;
        const target = usesOutside(pos) ? shell : card;
        const displayText=text;
        addMeta(target,displayText,pos,sty);
        if(usesOutside(pos)){
          const m=target.lastChild;
          if(pos.startsWith('out-top')) m.style.top=(top-26)+'px';
          if(pos.startsWith('out-bottom')) m.style.bottom=(shell.offsetHeight-(top+h)+0)+'px';
          if(pos==='cross-top-left') m.style.top=(top-8)+'px';
          if(pos==='cross-top-right') m.style.top=(top-8)+'px';
        }
      };

      add(c.showNumber,formatNumber(c.number,c.numberStyle),c.numberPos,c.numberStyleData);
      add(c.showName,c.name,c.namePos,c.nameStyleData);

      // Individual price hidden later when grouped
      if(c.showPrice && c.price){
        const priceEl=document.createElement('div');
        priceEl.className=`meta-item pos-${c.pricePos} individual-price`;
        priceEl.dataset.cardIndex=cardIndex;
        priceEl.textContent=c.price;
        const s=c.priceStyleData;
        priceEl.style.fontFamily=s.font;priceEl.style.fontSize=s.size+'px';priceEl.style.color=s.color;priceEl.style.opacity=s.opacity;
        const target=usesOutside(c.pricePos)?shell:card;
        target.appendChild(priceEl);
        if(usesOutside(c.pricePos)){
          if(c.pricePos.startsWith('out-top')) priceEl.style.top=(top-26)+'px';
          if(c.pricePos.startsWith('out-bottom')) priceEl.style.bottom=(shell.offsetHeight-(top+h)+0)+'px';
          if(c.pricePos==='cross-top-left'||c.pricePos==='cross-top-right') priceEl.style.top=(top-8)+'px';
        }
      }

      add(c.showCustom,c.custom,c.customPos,c.customStyleData);

      card.addEventListener('click',()=>{selected=cardIndex;render();loadEditor();});
      card.addEventListener('dblclick',(e)=>{e.preventDefault();c.sold=!c.sold;render();loadEditor();});

      shell.appendChild(card);
      row.appendChild(shell);
    });

    board.appendChild(row);
    renderGroupedPrices(row,rowCards,idx,outsideTop,maxH,outsideBottom);
    idx+=count;
  });
}

function renderGroupedPrices(row,rowCards,startIndex,outsideTop,maxH,outsideBottom){
  if(!$('groupPriceInput').checked) return;
  const shells=[...row.querySelectorAll('.card-shell')];
  let s=0;
  while(s<rowCards.length){
    const price=(rowCards[s].showPrice?String(rowCards[s].price).trim():'');
    let e=s+1;
    while(e<rowCards.length){
      const p=rowCards[e].showPrice?String(rowCards[e].price).trim():'';
      if(!price || p!==price) break;
      e++;
    }
    if(price && e-s>=2){
      for(let k=s;k<e;k++){
        shells[k].querySelectorAll('.individual-price').forEach(el=>el.style.display='none');
      }
      const first=shells[s], last=shells[e-1];
      const left=first.offsetLeft;
      const right=last.offsetLeft+last.offsetWidth;
      const g=document.createElement('div');
      g.className='group-price';
      g.style.left=left+'px';
      g.style.width=(right-left)+'px';
      g.style.bottom='4px';
      const style=rowCards[s].priceStyleData;
      g.style.fontFamily=style.font;
      g.style.fontSize=style.size+'px';
      g.style.color=style.color;
      g.style.opacity=style.opacity;
      g.textContent=`${price}/1`;
      row.appendChild(g);
    }
    s=e;
  }
}

function loadEditor(){
  const noSel=$('noSelection'), editor=$('editor');
  if(selected===null || !cards[selected]){
    noSel.hidden=false;editor.hidden=true;return;
  }
  noSel.hidden=true;editor.hidden=false;
  const c=cards[selected];

  $('numberInput').value=c.number;$('nameInput').value=c.name;$('priceInput').value=c.price;$('customInput').value=c.custom;
  $('showNumber').checked=c.showNumber;$('showName').checked=c.showName;$('showPrice').checked=c.showPrice;$('showCustom').checked=c.showCustom;
  $('numberPos').value=c.numberPos;$('namePos').value=c.namePos;$('pricePos').value=c.pricePos;$('customPos').value=c.customPos;
  $('numberStyleSelect').value=c.numberStyle;

  [['number',c.numberStyleData],['name',c.nameStyleData],['price',c.priceStyleData],['custom',c.customStyleData]].forEach(([p,s])=>{
    $(p+'Font').value=s.font;$(p+'Size').value=s.size;$(p+'Color').value=s.color;$(p+'Opacity').value=s.opacity;
  });

  $('overrideSizeInput').checked=c.overrideSize;
  $('cardWidthInput').value=c.width;$('cardHeightInput').value=c.height;
  $('cardSizeControls').classList.toggle('enabled',c.overrideSize);

  const presets=[[60,92],[67,92],[81,107],[96,133],[134,190]];
  const match=presets.find(([w,h])=>+c.width===w&&+c.height===h);
  $('cardPresetSelect').value=match?`${match[0]},${match[1]}`:'custom';

  $('zoomInput').value=c.zoom;$('xInput').value=c.x;$('yInput').value=c.y;$('rotateInput').value=c.rotate;
  $('skewXInput').value=c.skewX;$('skewYInput').value=c.skewY;$('brightnessInput').value=c.brightness;$('warmthInput').value=c.warmth;
  $('soldInput').checked=c.sold;
}

function choosePhoto(){ if(selected===null){alert('先點一個框框');return;} $('fileInput').click(); }

populateSelects();

$('addCardBtn').onclick=()=>{
  const a=parseLayout();a[a.length-1]++;$('layoutInput').value=a.join(',');render();
};
$('photoBtn').onclick=choosePhoto;$('choosePhotoBtn').onclick=choosePhoto;

$('fileInput').onchange=e=>{
  const f=e.target.files?.[0];if(!f||selected===null)return;
  const r=new FileReader();r.onload=()=>{cards[selected].img=r.result;render();loadEditor();};r.readAsDataURL(f);e.target.value='';
};
$('removePhotoBtn').onclick=()=>{if(selected===null)return;cards[selected].img=null;render();};

$('backgroundImageBtn').onclick=()=>$('backgroundFileInput').click();
$('backgroundFileInput').onchange=e=>{
  const f=e.target.files?.[0];if(!f)return;
  const r=new FileReader();r.onload=()=>{backgroundImage=r.result;render();};r.readAsDataURL(f);e.target.value='';
};
$('clearBackgroundImageBtn').onclick=()=>{backgroundImage=null;render();};

$('presetSelect').onchange=()=>{
  if($('presetSelect').value==='custom')return;
  const [w,h]=$('presetSelect').value.split(',').map(Number);$('widthInput').value=w;$('heightInput').value=h;render();
};
$('cardPresetSelect').onchange=()=>{
  if(selected===null||$('cardPresetSelect').value==='custom')return;
  const [w,h]=$('cardPresetSelect').value.split(',').map(Number);
  cards[selected].width=w;cards[selected].height=h;$('cardWidthInput').value=w;$('cardHeightInput').value=h;render();
};
$('overrideSizeInput').onchange=()=>{
  if(selected===null)return;
  const c=cards[selected];c.overrideSize=$('overrideSizeInput').checked;
  $('cardSizeControls').classList.toggle('enabled',c.overrideSize);render();
};
$('cardWidthInput').oninput=()=>{if(selected===null)return;cards[selected].width=+$('cardWidthInput').value||60;$('cardPresetSelect').value='custom';render();};
$('cardHeightInput').oninput=()=>{if(selected===null)return;cards[selected].height=+$('cardHeightInput').value||92;$('cardPresetSelect').value='custom';render();};

['layoutInput','widthInput','heightInput','gapInput','padInput','rowAlignSelect','groupPriceInput',
'backgroundColorInput','borderEnabledInput','borderColorInput','borderWidthInput','borderOpacityInput',
'frameCornerSelect','photoCornerSelect'].forEach(id=>{
  $(id).addEventListener('input',render);$(id).addEventListener('change',render);
});

const textMap={numberInput:'number',nameInput:'name',priceInput:'price',customInput:'custom'};
Object.entries(textMap).forEach(([id,key])=>$(id).oninput=()=>{if(selected===null)return;cards[selected][key]=$(id).value;render();});

const boolMap={showNumber:'showNumber',showName:'showName',showPrice:'showPrice',showCustom:'showCustom',soldInput:'sold'};
Object.entries(boolMap).forEach(([id,key])=>$(id).onchange=()=>{if(selected===null)return;cards[selected][key]=$(id).checked;render();});

const posMap={numberPos:'numberPos',namePos:'namePos',pricePos:'pricePos',customPos:'customPos'};
Object.entries(posMap).forEach(([id,key])=>$(id).onchange=()=>{if(selected===null)return;cards[selected][key]=$(id).value;render();});

$('numberStyleSelect').onchange=()=>{if(selected===null)return;cards[selected].numberStyle=$('numberStyleSelect').value;render();};

['number','name','price','custom'].forEach(prefix=>{
  $(prefix+'Font').onchange=()=>{if(selected===null)return;cards[selected][prefix+'StyleData'].font=$(prefix+'Font').value;render();};
  $(prefix+'Size').oninput=()=>{if(selected===null)return;cards[selected][prefix+'StyleData'].size=+$(prefix+'Size').value||16;render();};
  $(prefix+'Color').oninput=()=>{if(selected===null)return;cards[selected][prefix+'StyleData'].color=$(prefix+'Color').value;render();};
  $(prefix+'Opacity').oninput=()=>{if(selected===null)return;cards[selected][prefix+'StyleData'].opacity=+$(prefix+'Opacity').value;render();};
});

const rangeMap={zoomInput:'zoom',xInput:'x',yInput:'y',rotateInput:'rotate',skewXInput:'skewX',skewYInput:'skewY',brightnessInput:'brightness',warmthInput:'warmth'};
Object.entries(rangeMap).forEach(([id,key])=>$(id).oninput=()=>{if(selected===null)return;cards[selected][key]=+$(id).value;render();});

render();loadEditor();
