
const $ = (id) => document.getElementById(id);

let selected = null;
let cards = [];

function blankCard() {
  return {
    img:null,
    number:String(cards.length + 1),
    name:'',
    price:'',
    custom:'',
    showNumber:true,
    showName:false,
    showPrice:true,
    showCustom:false,
    zoom:1,
    x:50,
    y:50,
    rotate:0,
    brightness:1,
    sold:false
  };
}

function parseLayout() {
  const arr = $('layoutInput').value
    .split(',')
    .map(v => parseInt(v.trim(), 10))
    .filter(v => Number.isFinite(v) && v > 0);
  return arr.length ? arr : [1];
}

function syncCards() {
  const count = parseLayout().reduce((a,b) => a+b, 0);
  while (cards.length < count) cards.push(blankCard());
  if (cards.length > count) cards.length = count;
  if (selected !== null && selected >= cards.length) selected = null;
}

function render() {
  syncCards();
  const board = $('board');
  board.innerHTML = '';

  const gap = Math.max(0, Number($('gapInput').value) || 0);
  const pad = Math.max(0, Number($('padInput').value) || 0);
  const wmm = Math.max(20, Number($('widthInput').value) || 60);
  const hmm = Math.max(20, Number($('heightInput').value) || 92);

  board.style.padding = pad + 'px';

  const scale = 1.45;
  let idx = 0;

  parseLayout().forEach((count, rowIndex, rows) => {
    const row = document.createElement('div');
    row.className = 'card-row';
    row.style.gap = gap + 'px';
    row.style.marginBottom = rowIndex === rows.length - 1 ? '0' : gap + 'px';

    for (let i = 0; i < count; i++, idx++) {
      const c = cards[idx];

      const card = document.createElement('div');
      card.className =
        'card' +
        (selected === idx ? ' selected' : '') +
        (c.img ? ' has-photo' : '') +
        (c.sold ? ' sold' : '');

      card.style.width = Math.max(78, wmm * scale) + 'px';
      card.style.height = Math.max(110, hmm * scale) + 'px';
      card.style.borderRadius = '9px';

      const ph = document.createElement('div');
      ph.className = 'placeholder';
      ph.innerHTML = '＋<br>放照片';
      card.appendChild(ph);

      if (c.img) {
        const img = document.createElement('img');
        img.src = c.img;
        img.style.objectPosition = `${c.x}% ${c.y}%`;
        img.style.transform = `scale(${c.zoom}) rotate(${c.rotate}deg)`;
        img.style.filter = `brightness(${c.brightness})`;
        card.appendChild(img);
      }

      const meta = document.createElement('div');
      meta.className = 'meta';
      const bits = [];
      if (c.showNumber && c.number) bits.push(c.number);
      if (c.showName && c.name) bits.push(c.name);
      if (c.showPrice && c.price) bits.push(c.price);
      if (c.showCustom && c.custom) bits.push(c.custom);
      meta.textContent = bits.join('  ');
      card.appendChild(meta);

      const thisIndex = idx;
      card.addEventListener('click', () => {
        selected = thisIndex;
        render();
        loadEditor();
      });

      card.addEventListener('dblclick', () => {
        c.sold = !c.sold;
        render();
        loadEditor();
      });

      row.appendChild(card);
    }

    board.appendChild(row);
  });
}

function loadEditor() {
  const noSel = $('noSelection');
  const editor = $('editor');

  if (selected === null || !cards[selected]) {
    noSel.hidden = false;
    editor.hidden = true;
    return;
  }

  noSel.hidden = true;
  editor.hidden = false;

  const c = cards[selected];
  $('numberInput').value = c.number;
  $('nameInput').value = c.name;
  $('priceInput').value = c.price;
  $('customInput').value = c.custom;
  $('showNumber').checked = c.showNumber;
  $('showName').checked = c.showName;
  $('showPrice').checked = c.showPrice;
  $('showCustom').checked = c.showCustom;
  $('zoomInput').value = c.zoom;
  $('xInput').value = c.x;
  $('yInput').value = c.y;
  $('rotateInput').value = c.rotate;
  $('brightnessInput').value = c.brightness;
  $('soldInput').checked = c.sold;
}

function choosePhoto() {
  if (selected === null) {
    alert('先點一個框框');
    return;
  }
  $('fileInput').click();
}

$('addCardBtn').addEventListener('click', () => {
  const arr = parseLayout();
  arr[arr.length - 1] += 1;
  $('layoutInput').value = arr.join(',');
  render();
});

$('photoBtn').addEventListener('click', choosePhoto);
$('choosePhotoBtn').addEventListener('click', choosePhoto);

$('fileInput').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file || selected === null) return;

  const reader = new FileReader();
  reader.onload = () => {
    cards[selected].img = reader.result;
    render();
    loadEditor();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

$('removePhotoBtn').addEventListener('click', () => {
  if (selected === null) return;
  cards[selected].img = null;
  render();
});

$('presetSelect').addEventListener('change', () => {
  if ($('presetSelect').value === 'custom') return;
  const [w,h] = $('presetSelect').value.split(',').map(Number);
  $('widthInput').value = w;
  $('heightInput').value = h;
  render();
});

['layoutInput','widthInput','heightInput','gapInput','padInput'].forEach(id => {
  $(id).addEventListener('input', render);
});

const textMap = {
  numberInput:'number',
  nameInput:'name',
  priceInput:'price',
  customInput:'custom'
};

Object.entries(textMap).forEach(([id,key]) => {
  $(id).addEventListener('input', () => {
    if (selected === null) return;
    cards[selected][key] = $(id).value;
    render();
  });
});

const checkMap = {
  showNumber:'showNumber',
  showName:'showName',
  showPrice:'showPrice',
  showCustom:'showCustom',
  soldInput:'sold'
};

Object.entries(checkMap).forEach(([id,key]) => {
  $(id).addEventListener('change', () => {
    if (selected === null) return;
    cards[selected][key] = $(id).checked;
    render();
  });
});

const rangeMap = {
  zoomInput:'zoom',
  xInput:'x',
  yInput:'y',
  rotateInput:'rotate',
  brightnessInput:'brightness'
};

Object.entries(rangeMap).forEach(([id,key]) => {
  $(id).addEventListener('input', () => {
    if (selected === null) return;
    cards[selected][key] = Number($(id).value);
    render();
  });
});

render();
loadEditor();
