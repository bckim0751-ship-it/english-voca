const CIRC=131.95;
const DAY_COUNT=20;
const state={
  idx:0,
  todayWords:[],seen:{},answers:[],
  learnItems:[],
  prog:loadProg()
};

function loadProg(){try{return JSON.parse(localStorage.getItem('evProg'))||fresh();}catch(e){return fresh();}}
function fresh(){return{streak:0,lastDate:null,dates:[],correct:0,answered:0,history:[]};}
function saveProg(){localStorage.setItem('evProg',JSON.stringify(state.prog));}
function todayStr(){const d=new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());}
function p2(n){return String(n).padStart(2,'0');}
function dateStr(o){const d=new Date();d.setDate(d.getDate()+o);return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());}

function seededShuffle(arr,seed){
  const r=[...arr];let s=seed>>>0;
  for(let i=r.length-1;i>0;i--){s=(s*1664525+1013904223)>>>0;const j=s%(i+1);[r[i],r[j]]=[r[j],r[i]];}
  return r;
}
function hashStr(s){let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return Math.abs(h);}
function getDailyWords(ds){return seededShuffle([...WORDS],hashStr(ds)).slice(0,DAY_COUNT);}

function blankWord(sentence,word){
  const esc=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  let r=sentence.replace(new RegExp('\\b'+esc+'\\b','gi'),'_____');
  if(r!==sentence)return r;
  r=sentence.replace(new RegExp('\\b'+esc+'(?:s|es|d|ed|ing|tion|ment|ive|al|ity|ly)?\\b','gi'),'_____');
  return r!==sentence?r:sentence.replace(new RegExp(esc,'gi'),'_____');
}

function letterHint(word){
  const first=word[0].toUpperCase();
  const dashes='_ '.repeat(word.length-1).trim();
  return first+' '+dashes+'  ('+word.length+'글자)';
}

function init(){
  const today=todayStr();
  state.todayWords=getDailyWords(today);
  state.idx=0;state.seen={};state.answers=[];
  updateStreak(today);
  document.getElementById('streak-count').textContent=state.prog.streak;
  const fmt={month:'long',day:'numeric',weekday:'short'};
  document.getElementById('today-date').textContent=new Date().toLocaleDateString('ko-KR',fmt);
  renderStepDots();
  buildLearnItems();
  renderLearnCard();
  renderWordList();
}

function updateStreak(today){
  const yest=dateStr(-1);
  if(state.prog.lastDate===today)return;
  state.prog.streak=(state.prog.lastDate===yest)?state.prog.streak+1:1;
  if(!state.prog.dates.includes(today))state.prog.dates.push(today);
  state.prog.lastDate=today;
  saveProg();
}

function renderStepDots(){
  const el=document.getElementById('step-dots');
  el.innerHTML=state.todayWords.map((_,i)=>`<div class="dot" id="dot-${i}"></div>`).join('');
}

function updateDots(){
  state.todayWords.forEach((_,i)=>{
    const d=document.getElementById('dot-'+i);
    if(!d)return;
    const wid=state.todayWords[i].id;
    d.className='dot'+(state.seen[wid]?(state.seen[wid]==='know'?' done':' miss'):i===state.idx?' current':'');
  });
}

function updateRing(){
  const done=Object.keys(state.seen).length;
  const offset=CIRC*(1-done/DAY_COUNT);
  document.getElementById('dp-fill').style.strokeDashoffset=offset;
  document.getElementById('dp-text').textContent=done+'/'+DAY_COUNT;
}

function buildLearnItems(){
  state.learnItems=state.todayWords.map((w,i)=>{
    const sentence=blankWord(w.example,w.word);
    return{w,sentence};
  });
}

function showHint(){
  const item=state.learnItems[state.idx];
  document.getElementById('lc-letter-hint').textContent=letterHint(item.w.word);
  document.getElementById('hint-btn').style.display='none';
}

function renderLearnCard(){
  document.getElementById('result-screen').style.display='none';
  if(state.idx>=state.todayWords.length){showResult();return;}

  const item=state.learnItems[state.idx];
  const blanked=item.sentence.replace('_____','<span class="blank">_____</span>');

  document.getElementById('lc-korean').textContent=item.w.example_ko||item.w.korean;
  document.getElementById('lc-sentence').innerHTML=blanked;

  // 힌트 초기화 - 숨김
  document.getElementById('lc-letter-hint').textContent='';
  document.getElementById('hint-btn').style.display='inline-flex';

  const inp=document.getElementById('answer-input');
  inp.value='';inp.disabled=false;inp.className='answer-input';

  document.getElementById('learn-feedback').style.display='none';
  document.getElementById('learn-card').style.display='block';
  document.getElementById('answer-area').style.display='flex';

  updateDots();updateRing();
  setTimeout(()=>inp.focus(),100);
}

function submitAnswer(){
  const item=state.learnItems[state.idx];
  const inp=document.getElementById('answer-input');
  const val=inp.value.trim();
  if(!val)return;

  const ok=val.toLowerCase()===item.w.word.toLowerCase();
  inp.disabled=true;
  inp.className='answer-input '+(ok?'inp-correct':'inp-wrong');

  state.seen[item.w.id]=ok?'know':'miss';
  state.answers.push({w:item.w,ok,typed:val});

  const fb=document.getElementById('learn-feedback');
  fb.style.display='flex';
  fb.className='learn-feedback '+(ok?'fb-ok':'fb-wrong');
  document.getElementById('lf-word').textContent=(ok?'✅ ':'❌ ')+item.w.word+' — '+item.w.korean;
  document.getElementById('lf-def').textContent=ok?item.w.definition:'정답: '+item.w.word+'  /  '+item.w.definition;

  if(ok){
    document.getElementById('btn-next').style.display='none';
    setTimeout(nextLearnCard,1400);
  }else{
    document.getElementById('btn-next').style.display='inline-block';
  }
  updateDots();updateRing();
}

function nextLearnCard(){state.idx++;renderLearnCard();}

function showResult(){
  const score=state.answers.filter(a=>a.ok).length;
  const total=state.answers.length;
  state.prog.correct+=score;
  state.prog.answered+=total;
  state.prog.history.push({date:todayStr(),score,total});
  saveProg();

  document.getElementById('learn-card').style.display='none';
  document.getElementById('answer-area').style.display='none';
  document.getElementById('learn-feedback').style.display='none';
  document.getElementById('result-screen').style.display='flex';

  document.getElementById('rs-num').textContent=score;
  const pct=score/total;
  const msgs=[[1,'완벽해요! 🎉','20개 모두 정답!'],[0.8,'훌륭해요! 👏','거의 다 맞혔어요'],[0.6,'잘 했어요! 😊','조금 더 연습해보요'],[0,'화이팅! 💪','복습하면 늘 늘어요']];
  const [,m,s]=msgs.find(([t])=>pct>=t);
  document.getElementById('rs-msg').textContent=m;
  document.getElementById('rs-sub').textContent=s;
  document.getElementById('rs-list').innerHTML=state.answers.map(a=>{
    return `<div class="rs-row"><span class="rs-word">${a.w.word}</span><span class="rs-typed ${a.ok?'rs-ok':'rs-bad'}">${a.typed}</span><span class="rs-ko">${a.w.korean}</span><span>${a.ok?'✅':'❌'}</span></div>`;
  }).join('');
}

function restartLearn(){
  state.idx=0;state.seen={};state.answers=[];
  buildLearnItems();renderLearnCard();updateDots();updateRing();
}

function switchTab(tab){
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active',p.id==='tab-'+tab));
  document.querySelectorAll('.bn-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  if(tab==='stats')renderStats();
}

let curLv='all';
function renderWordList(lv){
  if(lv!==undefined)curLv=lv;
  const ws=curLv==='all'?WORDS:WORDS.filter(w=>w.level===curLv);
  const sorted=[...ws].sort((a,b)=>a.word.localeCompare(b.word));
  document.getElementById('wl-cnt').textContent='('+sorted.length+'개)';
  const lbl={1:'기초',2:'중급',3:'고급'};
  const pos={v:'v.',n:'n.',adj:'adj.',adv:'adv.',prep:'prep.'};
  document.getElementById('wl-list').innerHTML=sorted.map(w=>
    `<div class="wi"><div class="wi-l"><div class="wi-word">${w.word}<span class="wi-pos">${pos[w.pos]||w.pos}</span></div><div class="wi-ko">${w.korean}</div><div class="wi-def">${w.definition}</div></div><span class="lv lv-${w.level}">${lbl[w.level]}</span></div>`
  ).join('');
}
function setLv(lv,btn){
  document.querySelectorAll('.flt').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderWordList(lv==='all'?'all':Number(lv));
}

function renderStats(){
  const p=state.prog;
  document.getElementById('st-days').textContent=p.dates.length;
  document.getElementById('st-words').textContent=p.dates.length*20;
  document.getElementById('st-streak').textContent=p.streak;
  document.getElementById('st-acc').textContent=p.answered>0?Math.round(p.correct/p.answered*100)+'%':'-';
  const hist=[...p.history].reverse().slice(0,10);
  document.getElementById('st-hist-list').innerHTML=hist.length
    ?hist.map(h=>`<div class="hi"><span class="hi-date">${h.date}</span><span class="hi-score">${h.score}/${h.total||20}</span></div>`).join('')
    :'<p class="no-data">학습 기록이 없어요</p>';
}

document.addEventListener('DOMContentLoaded',init);