'use strict';
const THEMES = {
  nature: [...'🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🐔🐧🐦🦆🦉🦋🐌🐞🐢🐬🐳🦀🐙🌻🌵🍀🌈'],
  food: [...'🍏🍎🍐🍊🍋🍌🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🥑🥦🥕🌽🍕🍔🍟🌮🍣🍩🍪🎂🍫🍿'],
  space: [...'🚀🛸🌍🌙⭐☀🌌🪐☄👽🤖👾🛰🔭🧑‍🚀⚡🔥💎🧭🗺🏰🏝⛰🌋⛺🚁✈🚂🚢🛶🎮🏆']
};
// Array.from preserves code points; comma-delimited themes preserve compound emoji.
THEMES.space = '🚀,🛸,🌍,🌙,⭐,☀️,🌌,🪐,☄️,👽,🤖,👾,🛰️,🔭,🧑‍🚀,⚡,🔥,💎,🧭,🗺️,🏰,🏝️,⛰️,🌋,⛺,🚁,✈️,🚂,🚢,🛶,🎮,🏆'.split(',');
const $ = id => document.getElementById(id);
const STORAGE_KEY = 'find-pair.records.v1';
let size, first, second, locked, matched, moves, clicks, startedAt, elapsed, hideTimer;
let records = readRecords();
function readRecords() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const clean = {};
    for (const level of [4,6,8]) clean[level] = (Array.isArray(data?.[level]) ? data[level] : []).filter(r => Number.isInteger(r.moves) && r.moves >= level * level / 2 && Number.isFinite(r.time) && r.time >= 0).sort((a,b) => a.moves-b.moves || a.time-b.time).slice(0,5);
    return clean;
  } catch { return {}; }
}
function shuffle(items) {
  for (let i=items.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [items[i],items[j]]=[items[j],items[i]]; }
  return items;
}
function formatTime(ms) { const s=Math.floor(ms/1000); return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function updateStats() { $('moves').textContent=moves; $('clicks').textContent=clicks; $('pairs').textContent=`${matched} / ${size*size/2}`; $('time').textContent=formatTime(elapsed); }
function renderRecords() {
  const list=$('records'); list.replaceChildren();
  const best=records[size] || [];
  if (!best.length) { const li=document.createElement('li'); li.className='empty'; li.textContent='Здесь будет твоя первая победа ✦'; list.append(li); }
  best.forEach((r,i) => { const li=document.createElement('li'); const label=document.createElement('span'); label.textContent=`${i+1}. ${r.moves} ход. `; const date=document.createElement('small'); date.textContent=r.date ? new Date(r.date).toLocaleDateString('ru-RU') : ''; label.append(date); const time=document.createElement('strong'); time.textContent=formatTime(r.time); li.append(label,time); list.append(li); });
}
function newGame() {
  clearTimeout(hideTimer); $('victory').close();
  size=Number($('difficulty').value); first=second=null; locked=false; matched=moves=clicks=elapsed=0; startedAt=null;
  const symbols=shuffle([...THEMES[$('theme').value]]).slice(0,size*size/2);
  const deck=shuffle([...symbols,...symbols]); const board=$('board'); board.replaceChildren(); board.style.setProperty('--size',size); board.dataset.size=size;
  deck.forEach((symbol,index) => {
    const card=document.createElement('button'); card.className='card'; card.type='button'; card.dataset.symbol=symbol; card.setAttribute('aria-label',`Карточка ${index+1}, закрыта`);
    const back=document.createElement('span'); back.className='back'; back.textContent='✦'; back.setAttribute('aria-hidden','true');
    const front=document.createElement('span'); front.className='front'; front.textContent=symbol; front.setAttribute('aria-hidden','true'); card.append(back,front);
    card.addEventListener('click',()=>flip(card,index)); board.append(card);
  });
  $('status').textContent='Открой первую карточку — и время пойдёт.'; updateStats(); renderRecords();
}
function flip(card,index) {
  if (locked || card.classList.contains('open')) return;
  if (startedAt===null) startedAt=performance.now();
  clicks++; card.classList.add('open'); card.setAttribute('aria-label',`Карточка ${index+1}: ${card.dataset.symbol}`); card.disabled=true;
  if (!first) { first=card; updateStats(); return; }
  second=card; moves++; locked=true;
  if (first.dataset.symbol===second.dataset.symbol) {
    first.classList.add('matched'); second.classList.add('matched'); matched++; first=second=null; locked=false;
    $('status').textContent='Есть совпадение! Ищем дальше.';
    if (matched===size*size/2) finish();
  } else {
    $('status').textContent='Запомни картинки — они ещё пригодятся.';
    hideTimer=setTimeout(()=>{ for (const c of [first,second]) { c.classList.remove('open'); c.disabled=false; c.setAttribute('aria-label',`Карточка ${Array.from($('board').children).indexOf(c)+1}, закрыта`); } first=second=null; locked=false; $('status').textContent='Попробуй другую пару.'; },850);
  }
  updateStats();
}
function finish() {
  elapsed=performance.now()-startedAt; startedAt=null;
  records[size]=[...(records[size] || []),{moves,time:elapsed,date:new Date().toISOString()}].sort((a,b)=>a.moves-b.moves || a.time-b.time).slice(0,5);
  let saved=true; try { localStorage.setItem(STORAGE_KEY,JSON.stringify(records)); } catch { saved=false; }
  renderRecords(); $('status').textContent=saved ? 'Все пары найдены. Результат сохранён!' : 'Все пары найдены! Хранилище недоступно: рекорд сохранён только до закрытия страницы.';
  $('result').textContent=`Все ${matched} пар за ${moves} ход. и ${formatTime(elapsed)}. Кликов: ${clicks}.`;
  $('victory').showModal();
}
$('difficulty').addEventListener('change',newGame); $('theme').addEventListener('change',newGame); $('restart').addEventListener('click',newGame); $('again').addEventListener('click',newGame); $('close-dialog').addEventListener('click',()=>$('victory').close());
setInterval(()=>{if(startedAt!==null){elapsed=performance.now()-startedAt; $('time').textContent=formatTime(elapsed);}},200);
newGame();
