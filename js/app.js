const CIRC = 138.23;

const state = {
  idx: 0,
  flipped: false,
  todayWords: [],
  seen: {},
  quizQs: [],
  quizIdx: 0,
  quizAnswers: [],
  prog: loadProg()
};

function loadProg() {
  try {
    return JSON.parse(localStorage.getItem('evProg')) || fresh();
  } catch(e) { return fresh(); }
}
function fresh() {
  return { streak:0, lastDate:null, dates:[], correct:0, answered:0, history:[] };
}
function saveProg() { localStorage.setItem('evProg', JSON.stringify(state.prog)); }

function todayStr() {
  const d = new Date();
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
function pad(n){ return String(n).padStart(2,'0'); }
function dateStr(offset) {
  const d = new Date(); d.setDate(d.getDate()+offset);
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}

function seededShuffle(arr, seed) {
  const r=[...arr]; let s=seed>>>0;
  for(let i=r.length-1;i>0;i--){
    s=(s*1664525+1013904223)>>>0;
    const j=s%(i+1);
    [r[i],r[j]]=[r[j],r[i]];
  }
  return r;
}

function hashStr(s) {
  let h=0;
  for(let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; }
  return Math.abs(h);
}

function getDailyWords(dateStr) {
  return seededShuffle([...WORDS], hashStr(dateStr)).slice(0,10);
}

function init() {
  const today = todayStr();
  state.todayWords = getDailyWords(today);
  updateStreak(today);
  document.getElementById('streak-count').textContent = state.prog.streak;
  const opts={year:'numeric',month:'long',day:'numeric',weekday:'short'};
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('ko-KR',opts);
  renderCard();
  renderWordList();
  document.querySelectorAll('.tab-btn').forEach(b=>{
    b.addEventListener('click',()=>switchTab(b.dataset.tab));
  });
}

function updateStreak(today) {
  const yest = dateStr(-1);
  if(state.prog.lastDate===today) return;
  if(state.prog.lastDate===yest) state.prog.streak++;
  else state.prog.streak=1;
  if(!state.prog.dates.includes(today)) state.prog.dates.push(today);
  state.prog.lastDate=today;
  saveProg();
}

function renderCard() {
  const w = state.todayWords[state.idx];
  state.flipped = false;
  document.getElementById('card-inner').classList.remove('flipped');
  document.getElementById('card-actions').classList.remove('visible');
  const lvlLabels = {1:'기초',2:'중급',3:'고급'};
  const posMap = {v:'verb',n:'noun',adj:'adjective',adv:'adverb',prep:'preposition'};
  document.getElementById('card-level').textContent = lvlLabels[w.level]||'';
  document.getElementById('card-pos-front').textContent = posMap[w.pos]||w.pos;
  document.getElementById('card-word-front').textContent = w.word;
  document.getElementById('card-word-back').textContent = w.word;
  document.getElementById('card-korean').textContent = w.korean;
  document.getElementById('card-def').textContent = w.definition;
  document.getElementById('card-example').textContent = w.example;
  document.getElementById('card-counter').textContent = (state.idx+1)+' / '+state.todayWords.length;
  updateRing();
}

function flipCard() {
  state.flipped = !state.flipped;
  document.getElementById('card-inner').classList.toggle('flipped');
  if(state.flipped) document.getElementById('card-actions').classList.add('visible');
  else document.getElementById('card-actions').classList.remove('visible');
}

function markWord(status) {
  const w = state.todayWords[state.idx];
  state.seen[w.id] = status;
  updateRing();
  const allSeen = state.todayWords.every(w=>state.seen[w.id]);
  if(allSeen) document.getElementById('all-done-box').classList.add('visible');
  setTimeout(()=>{
    if(state.idx < state.todayWords.length-1) { state.idx++; renderCard(); }
  }, 250);
}

function updateRing() {
  const cnt = Object.keys(state.seen).filter(id=>state.todayWords.find(w=>w.id==id)).length;
  const total = state.todayWords.length;
  const offset = CIRC*(1-cnt/total);
  document.getElementById('ring-fill').style.strokeDashoffset = offset;
  document.getElementById('ring-text').textContent = cnt+'/'+total;
}

function prevCard() { if(state.idx>0){state.idx--;renderCard();} }
function nextCard() { if(state.idx<state.todayWords.length-1){state.idx++;renderCard();} }

function goToQuiz() { switchTab('quiz'); startQuiz(); }

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active',p.id==='tab-'+tab));
  if(tab==='stats') renderStats();
}

// Quiz
function startQuiz() {
  state.quizQs = buildQuiz(state.todayWords);
  state.quizIdx = 0;
  state.quizAnswers = [];
  document.getElementById('quiz-intro').style.display='none';
  document.getElementById('quiz-play').style.display='block';
  document.getElementById('quiz-done').style.display='none';
  renderQ();
}

function buildQuiz(words) {
  return words.map((w,i)=>{
    const type = i%2===0 ? 'en-ko' : 'ko-en';
    const others = seededShuffle(WORDS.filter(x=>x.id!==w.id), w.id*31+i*7).slice(0,3);
    let q, correct, opts;
    if(type==='en-ko'){
      q=w.word; correct=w.korean;
      opts=seededShuffle([w.korean,...others.map(x=>x.korean)],w.id+i*13);
    } else {
      q=w.korean; correct=w.word;
      opts=seededShuffle([w.word,...others.map(x=>x.word)],w.id+i*13+100);
    }
    return {w,type,q,opts,correct,correctIdx:opts.indexOf(correct)};
  });
}

function renderQ() {
  const q = state.quizQs[state.quizIdx];
  const total = state.quizQs.length;
  const cur = state.quizIdx+1;
  document.getElementById('q-progress-txt').textContent = cur+' / '+total;
  document.getElementById('q-bar-fill').style.width = (cur/total*100)+'%';
  document.getElementById('q-type').textContent = q.type==='en-ko'?'영어 → 한국어':'한국어 → 영어';
  document.getElementById('q-text').textContent = q.q;
  const el = document.getElementById('options');
  el.innerHTML='';
  q.opts.forEach((opt,i)=>{
    const b=document.createElement('button');
    b.className='opt-btn';
    b.textContent=opt;
    b.onclick=()=>answer(i);
    el.appendChild(b);
  });
}

function answer(sel) {
  const q = state.quizQs[state.quizIdx];
  const ok = sel===q.correctIdx;
  state.quizAnswers.push({w:q.w,ok});
  document.querySelectorAll('.opt-btn').forEach((b,i)=>{
    b.disabled=true;
    if(i===q.correctIdx) b.classList.add('correct');
    if(i===sel&&!ok) b.classList.add('wrong');
  });
  setTimeout(()=>{
    if(state.quizIdx<state.quizQs.length-1){ state.quizIdx++; renderQ(); }
    else showResult();
  },900);
}

function showResult() {
  const score = state.quizAnswers.filter(a=>a.ok).length;
  state.prog.correct+=score;
  state.prog.answered+=state.quizAnswers.length;
  state.prog.history.push({date:todayStr(),score,total:10});
  saveProg();
  document.getElementById('quiz-play').style.display='none';
  document.getElementById('quiz-done').style.display='flex';
  document.getElementById('final-score').textContent=score;
  const msgs=[
    [10,'완벽해요! 🎉','모든 단어를 맞혔어요!'],
    [8,'훌륭해요! 👏','거의 다 맞혔어요!'],
    [6,'잘 했어요! 😊','조금 더 연습해보세요.'],
    [0,'계속 노력해요! 💪','복습이 필요해요.']
  ];
  const [,msg,sub]=msgs.find(([t])=>score>=t);
  document.getElementById('score-msg').textContent=msg;
  document.getElementById('score-sub').textContent=sub;
  document.getElementById('answer-review').innerHTML=
    state.quizAnswers.map(a=>`<div class="ans-row"><span class="ans-word">${a.w.word}</span><span class="ans-korean">${a.w.korean}</span><span>${a.ok?'✅':'❌'}</span></div>`).join('');
}

// Word list
let currentLevel='all';
function renderWordList(level) {
  if(level!==undefined) currentLevel=level;
  const words = currentLevel==='all' ? WORDS : WORDS.filter(w=>w.level===currentLevel);
  const sorted = [...words].sort((a,b)=>a.word.localeCompare(b.word));
  document.getElementById('review-count').textContent='('+sorted.length+'개)';
  const lv={1:'기초',2:'중급',3:'고급'};
  const pos={v:'v.',n:'n.',adj:'adj.',adv:'adv.',prep:'prep.'};
  document.getElementById('word-list').innerHTML=sorted.map(w=>`
    <div class="word-item">
      <div class="wi-left">
        <div class="wi-word">${w.word}<span class="wi-pos">${pos[w.pos]||w.pos}</span></div>
        <div class="wi-korean">${w.korean}</div>
        <div class="wi-def">${w.definition}</div>
      </div>
      <span class="lv-badge lv-${w.level}">${lv[w.level]}</span>
    </div>`).join('');
}

function setLevel(lv, btn) {
  document.querySelectorAll('.lvl-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderWordList(lv==='all'?'all':Number(lv));
}

// Stats
function renderStats() {
  const p = state.prog;
  document.getElementById('sc-days').textContent = p.dates.length;
  document.getElementById('sc-words').textContent = p.dates.length*10;
  document.getElementById('sc-streak').textContent = p.streak;
  const acc = p.answered>0 ? Math.round(p.correct/p.answered*100)+'%' : '-';
  document.getElementById('sc-acc').textContent = acc;
  const hist = [...p.history].reverse().slice(0,10);
  document.getElementById('quiz-history').innerHTML = hist.length
    ? hist.map(h=>`<div class="hist-item"><span class="hist-date">${h.date}</span><span class="hist-score">${h.score}/${h.total}</span></div>`).join('')
    : '<p class="no-data">아직 퀴즈 기록이 없어요</p>';
}

document.addEventListener('DOMContentLoaded', init);
