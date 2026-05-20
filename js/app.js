const CIRC=131.95;
const QUIZ_COUNT=20;
const state={
  idx:0,
  todayWords:[],seen:{},
  learnItems:[],
  quizQs:[],quizIdx:0,quizAnswers:[],
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
function getDailyWords(ds){return seededShuffle([...WORDS],hashStr(ds)).slice(0,10);}
function getDailyQuizWords(ds){return seededShuffle([...WORDS],hashStr(ds)+9999).slice(0,QUIZ_COUNT);}

function blankWord(sentence,word){
  const esc=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  let r=sentence.replace(new RegExp('\\b'+esc+'\\b','gi'),'_____');
  if(r!==sentence)return r;
  r=sentence.replace(new RegExp('\\b'+esc+'(?:s|es|d|ed|ing|tion|ment|ive|al|ity|ly)?\\b','gi'),'_____');
  return r!==sentence?r:sentence.replace(new RegExp(esc,'gi'),'_____');
}

function init(){
  const today=todayStr();
  state.todayWords=getDailyWords(today);
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
    d.className='dot'+(state.seen[state.todayWords[i].id]?' done':i===state.idx?' current':'');
  });
}

function updateRing(){
  const done=Object.keys(state.seen).length;
  const offset=CIRC*(1-done/10);
  document.getElementById('dp-fill').style.strokeDashoffset=offset;
  document.getElementById('dp-text').textContent=done+'/10';
}

function buildLearnItems(){
  state.learnItems=state.todayWords.map((w,i)=>{
    const sentence=blankWord(w.example,w.word);
    const others=seededShuffle(WORDS.filter(x=>x.id!==w.id),w.id*31+i*7).slice(0,3);
    const opts=seededShuffle([w.word,...others.map(x=>x.word)],w.id+i*13+200);
    return{w,sentence,opts,correctIdx:opts.indexOf(w.word)};
  });
}

function renderLearnCard(){
  if(state.idx>=state.todayWords.length){
    document.getElementById('learn-card').style.display='none';
    document.getElementById('learn-opts').style.display='none';
    document.getElementById('done-banner').classList.add('show');
    return;
  }
  const item=state.learnItems[state.idx];
  const blanked=item.sentence.replace('_____','<span class="blank">_____</span>');
  document.getElementById('lc-korean').textContent=item.w.example_ko||item.w.korean;
  document.getElementById('lc-sentence').innerHTML=blanked;
  document.getElementById('learn-feedback').style.display='none';
  document.getElementById('learn-card').style.display='block';
  document.getElementById('learn-opts').style.display='grid';
  const el=document.getElementById('learn-opts');
  el.innerHTML='';
  item.opts.forEach((opt,i)=>{
    const b=document.createElement('button');
    b.className='lopt';
    b.textContent=opt;
    b.onclick=()=>pickLearn(i);
    el.appendChild(b);
  });
  updateDots();
  updateRing();
}

function pickLearn(sel){
  const item=state.learnItems[state.idx];
  const ok=sel===item.correctIdx;
  document.querySelectorAll('.lopt').forEach((b,i)=>{
    b.disabled=true;
    if(i===item.correctIdx)b.classList.add('correct');
    if(i===sel&&!ok)b.classList.add('wrong');
  });
  state.seen[item.w.id]=ok?'know':'again';
  const fb=document.getElementById('learn-feedback');
  fb.style.display='flex';
  fb.className='learn-feedback '+(ok?'fb-ok':'fb-wrong');
  document.getElementById('lf-word').textContent=(ok?'✅ ':'❌ ')+item.w.word+' — '+item.w.korean;
  document.getElementById('lf-def').textContent=item.w.definition;
  if(ok){
    setTimeout(nextLearnCard,1400);
    document.getElementById('btn-next').style.display='none';
  }else{
    document.getElementById('btn-next').style.display='inline-block';
  }
  updateDots();
  updateRing();
}

function nextLearnCard(){state.idx++;renderLearnCard();}
function goQuiz(){switchTab('quiz');startQuiz();}

function switchTab(tab){
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active',p.id==='tab-'+tab));
  document.querySelectorAll('.bn-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  if(tab==='stats')renderStats();
}

function startQuiz(){
  const quizWords=getDailyQuizWords(todayStr());
  state.quizQs=buildQuiz(quizWords);
  state.quizIdx=0;
  state.quizAnswers=[];
  document.getElementById('q-intro').style.display='none';
  document.getElementById('q-play').style.display='block';
  document.getElementById('q-result').style.display='none';
  renderQ();
}

function buildQuiz(words){
  return words.map((w,i)=>{
    const others=seededShuffle(WORDS.filter(x=>x.id!==w.id),w.id*31+i*7).slice(0,3);
    const sentence=blankWord(w.example,w.word);
    const opts=seededShuffle([w.word,...others.map(x=>x.word)],w.id+i*13+200);
    return{w,sentence,hint:w.example_ko||w.korean,opts,correctIdx:opts.indexOf(w.word)};
  });
}

function renderQ(){
  const q=state.quizQs[state.quizIdx];
  const cur=state.quizIdx+1,total=state.quizQs.length;
  document.getElementById('qp-num').textContent=cur+'/'+total;
  document.getElementById('qp-bar-fill').style.width=(cur/total*100)+'%';
  document.getElementById('qp-type').textContent='빈칸 채우기';
  document.getElementById('q-hint').textContent='🇰🇷 '+q.hint;
  const blanked=q.sentence.replace('_____','<span class="blank">_____</span>');
  document.getElementById('q-main').innerHTML='<div class="q-sentence">'+blanked+'</div>';
  const el=document.getElementById('q-opts');
  el.innerHTML='';
  q.opts.forEach((opt,i)=>{
    const b=document.createElement('button');
    b.className='opt';
    b.textContent=opt;
    b.onclick=()=>pick(i);
    el.appendChild(b);
  });
}

function pick(sel){
  const q=state.quizQs[state.quizIdx];
  const ok=sel===q.correctIdx;
  state.quizAnswers.push({w:q.w,ok});
  document.querySelectorAll('.opt').forEach((b,i)=>{
    b.disabled=true;
    if(i===q.correctIdx)b.classList.add('correct');
    if(i===sel&&!ok)b.classList.add('wrong');
  });
  setTimeout(()=>{
    if(state.quizIdx<state.quizQs.length-1){state.quizIdx++;renderQ();}else showResult();
  },800);
}

function showResult(){
  const score=state.quizAnswers.filter(a=>a.ok).length;
  const total=state.quizAnswers.length;
  state.prog.correct+=score;
  state.prog.answered+=total;
  state.prog.history.push({date:todayStr(),score,total});
  saveProg();
  document.getElementById('q-play').style.display='none';
  document.getElementById('q-result').style.display='flex';
  document.getElementById('qr-num').textContent=score;
  const pct=score/total;
  const msgs=[[1,'완벽해요! 🎉','20개 모두 정답!'],[0.8,'훌륭해요! 👏','거의 다 맞혔어요'],[0.6,'잘 했어요! 😊','조금 더 연습해요'],[0,'계속 화이팅! 💪','복습이 필요해요']];
  const [,m,s]=msgs.find(([t])=>pct>=t);
  document.getElementById('qr-msg').textContent=m;
  document.getElementById('qr-sub').textContent=s;
  document.getElementById('qr-list').innerHTML=state.quizAnswers.map(a=>
    `<div class="qr-row"><span class="qr-word">${a.w.word}</span><span class="qr-ko">${a.w.korean}</span><span>${a.ok?'✅':'❌'}</span></div>`
  ).join('');
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
  document.getElementById('st-words').textContent=p.dates.length*10;
  document.getElementById('st-streak').textContent=p.streak;
  document.getElementById('st-acc').textContent=p.answered>0?Math.round(p.correct/p.answered*100)+'%':'-';
  const hist=[...p.history].reverse().slice(0,10);
  document.getElementById('st-hist-list').innerHTML=hist.length
    ?hist.map(h=>`<div class="hi"><span class="hi-date">${h.date}</span><span class="hi-score">${h.score}/${h.total||20}</span></div>`).join('')
    :'<p class="no-data">퀴즈 기록이 없어요</p>';
}

document.addEventListener('DOMContentLoaded',init);