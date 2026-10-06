/* 生字消消乐 - 三年级上册人教版 */
(function(){
"use strict";
var CHARS = (typeof CHARS_3A !== 'undefined') ? CHARS_3A : [];

/* 单元划分：2025年修订版（2026-10-05 按国家中小学智慧教育平台教材目录核对） */
var UNITS = [
  {name:"第一单元", title:"学校生活", lessons:["1 大青树下的小学","2 花的学校"]},
  {name:"第二单元", title:"金秋时节", lessons:["4 古诗三首","5 铺满金色巴掌的水泥道","6 秋天的雨"]},
  {name:"第三单元", title:"预测与猜想", lessons:["8 总也倒不了的老屋"]},
  {name:"第四单元", title:"童话世界", lessons:["11 宝葫芦的秘密（节选）","12 在牛肚子里旅行"]},
  {name:"第五单元", title:"留心观察", lessons:["14 搭船的鸟","15 金色的草地"]},
  {name:"第六单元", title:"祖国山河", lessons:["16 富饶的西沙群岛","17 海滨小城","18 美丽的小兴安岭"]},
  {name:"第七单元", title:"珍爱自然", lessons:["20 古诗三首","21 大自然的声音","22 读不完的大书"]},
  {name:"第八单元", title:"美好品质", lessons:["23 司马光","24 一定要争气","25 手术台就是阵地"]}
];
/* 每单元按课顺序取字，切成每关10字（末关不足5字并入上一关） */
var LEVELS = [];
UNITS.forEach(function(u, ui){
  var chars = [];
  u.lessons.forEach(function(ln){
    CHARS.forEach(function(c){ if(c.lesson===ln) chars.push(c); });
  });
  u.count = chars.length;
  var chunks = [];
  for (var i = 0; i < chars.length; i += 10) chunks.push(chars.slice(i, i+10));
  if (chunks.length > 1 && chunks[chunks.length-1].length < 5){
    chunks[chunks.length-2] = chunks[chunks.length-2].concat(chunks.pop());
  }
  chunks.forEach(function(ch, ci){
    LEVELS.push({unit: ui, unitLevel: ci, chars: ch});
  });
});

/* ---------- 存档 ---------- */
var SAVE_KEY = 'shengzi_save_v2';
var save = { stars: {match:{}, pinyin:{}, dictation:{}}, unlocked: {match:0, pinyin:0, dictation:0}, mistakes: {} };
try {
  var s = localStorage.getItem(SAVE_KEY);
  if (s) { var p = JSON.parse(s); for (var k in p) save[k] = p[k]; }
} catch(e){}
/* v1.3 新增模式存档迁移：老存档补上 monster / balloon */
['match','pinyin','dictation','monster','balloon','write'].forEach(function(m){
  if(!save.stars[m]) save.stars[m]={};
  if(save.unlocked[m]===undefined) save.unlocked[m]=0;
});
function persist(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch(e){} }
function addMistake(c){ save.mistakes[c] = (save.mistakes[c]||0) + 1; persist(); refreshHome(); }
function findChar(c){ for (var i=0;i<CHARS.length;i++) if (CHARS[i].c===c) return CHARS[i]; return null; }

/* ---------- 音效 (WebAudio 合成) ---------- */
var AC = null;
function ac(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC&&AC.state==='suspended') AC.resume(); return AC; }
function tone(freq, t0, dur, type, vol){
  var ctx = ac(); if(!ctx) return;
  var o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type||'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol||0.25, t0+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(t0); o.stop(t0+dur+0.05);
}
function now(){ var c=ac(); return c?c.currentTime:0; }
/* 噪声爆发（爆炸、碎裂用） */
function noiseBurst(t0, dur, vol, filterFreq){
  var ctx=ac(); if(!ctx) return;
  try{
    var len=Math.max(1,Math.floor(ctx.sampleRate*dur));
    var buf=ctx.createBuffer(1,len,ctx.sampleRate);
    var d=buf.getChannelData(0);
    for(var i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
    var src=ctx.createBufferSource(); src.buffer=buf;
    var f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=filterFreq||1000;
    var g=ctx.createGain(); g.gain.value=vol||0.3;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t0);
  }catch(e){}
}
var SFX = {
  click: function(){ var t=now(); tone(600,t,0.08,'triangle',0.2); },
  select: function(){ var t=now(); tone(520,t,0.09,'triangle',0.22); tone(780,t+0.07,0.1,'triangle',0.18); },
  correct: function(){ var t=now(); [523,659,784].forEach(function(f,i){ tone(f,t+i*0.09,0.16,'triangle',0.25); }); },
  wrong: function(){ var t=now(); tone(220,t,0.2,'sawtooth',0.12); tone(160,t+0.12,0.25,'sawtooth',0.12); },
  combo: function(n){ var t=now(); var base=500+Math.min(n,10)*60; [0,1,2].forEach(function(i){ tone(base*(1+i*0.25),t+i*0.06,0.12,'square',0.12); }); },
  hint: function(){ var t=now(); [880,1174,1568].forEach(function(f,i){ tone(f,t+i*0.07,0.14,'sine',0.15); }); },
  win: function(){ var t=now(); [523,659,784,1047,784,1047].forEach(function(f,i){ tone(f,t+i*0.12,0.2,'triangle',0.25); }); },
  star: function(i){ var t=now(); tone(900+i*250,t,0.25,'sine',0.25); tone((900+i*250)*1.5,t+0.08,0.2,'sine',0.15); },
  pop: function(){ var t=now(); tone(300,t,0.06,'square',0.15); tone(900,t+0.05,0.12,'sine',0.2); },
  /* v1.3 新增：战斗音效 */
  roar: function(){ var t=now(); var ctx=ac(); if(!ctx) return;
    try{
      var o=ctx.createOscillator(), g=ctx.createGain(), lfo=ctx.createOscillator(), lg=ctx.createGain();
      o.type='sawtooth'; o.frequency.setValueAtTime(95,t); o.frequency.linearRampToValueAtTime(58,t+0.5);
      lfo.type='sine'; lfo.frequency.value=26; lg.gain.value=22;
      lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.28,t+0.06);
      g.gain.exponentialRampToValueAtTime(0.0001,t+0.62);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t+0.65); lfo.start(t); lfo.stop(t+0.65);
    }catch(e){}
  },
  whoosh: function(){ var t=now(); var ctx=ac(); if(!ctx) return;
    try{
      var o=ctx.createOscillator(), g=ctx.createGain();
      o.type='sine'; o.frequency.setValueAtTime(180,t); o.frequency.exponentialRampToValueAtTime(1500,t+0.35);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.16,t+0.08);
      g.gain.exponentialRampToValueAtTime(0.0001,t+0.4);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+0.45);
    }catch(e){}
  },
  explosion: function(){ var t=now(); noiseBurst(t,0.5,0.38,750); tone(68,t,0.4,'sine',0.32); tone(48,t+0.05,0.5,'sine',0.28); },
  hurt: function(){ var t=now(); var ctx=ac(); if(!ctx) return;
    try{
      var o=ctx.createOscillator(), g=ctx.createGain();
      o.type='sawtooth'; o.frequency.setValueAtTime(420,t); o.frequency.exponentialRampToValueAtTime(130,t+0.3);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.2,t+0.03);
      g.gain.exponentialRampToValueAtTime(0.0001,t+0.36);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+0.4);
    }catch(e){}
  },
  laser: function(){ var t=now(); var ctx=ac(); if(!ctx) return;
    try{
      var o=ctx.createOscillator(), g=ctx.createGain();
      o.type='square'; o.frequency.setValueAtTime(920,t); o.frequency.exponentialRampToValueAtTime(230,t+0.11);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.06,t+0.012);
      g.gain.exponentialRampToValueAtTime(0.0001,t+0.13);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+0.15);
    }catch(e){}
  },
  shieldBreak: function(){ var t=now(); noiseBurst(t,0.28,0.3,3200); tone(1250,t,0.18,'square',0.1); tone(820,t+0.09,0.24,'square',0.09); },
  defeated: function(){ var t=now(); [392,523,659,784].forEach(function(f,i){ tone(f,t+i*0.08,0.15,'triangle',0.22); }); },
  stroke: function(){ var t=now(); noiseBurst(t,0.06,0.05,2500); },
  dart: function(){ var t=now(); var ctx=ac(); if(!ctx) return;
    try{
      var o=ctx.createOscillator(), g=ctx.createGain();
      o.type='sine'; o.frequency.setValueAtTime(500,t); o.frequency.exponentialRampToValueAtTime(1800,t+0.12);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.1,t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,t+0.15);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+0.17);
    }catch(e){}
  },
  balloonPop: function(){ var t=now(); noiseBurst(t,0.12,0.4,4000); tone(300,t,0.1,'square',0.18); tone(150,t+0.03,0.14,'square',0.14); }
};

/* ---------- 朗读 (听写用) ---------- */
function speak(text, rate){
  try{
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN'; u.rate = rate||0.8; u.pitch = 1.1;
    speechSynthesis.speak(u);
  }catch(e){}
}

/* ---------- 特效 ---------- */
var fxLayer = document.getElementById('fx-layer');
var COLORS = ['#ff6b6b','#ffa94d','#ffd43b','#69db7c','#4dabf7','#b197fc','#f783ac'];
function particles(x, y, n){
  n = n||24;
  for(var i=0;i<n;i++){
    var el = document.createElement('div');
    el.className='particle';
    var sz = 6+Math.random()*10;
    el.style.cssText='left:'+x+'px;top:'+y+'px;width:'+sz+'px;height:'+sz+'px;background:'+COLORS[i%COLORS.length];
    fxLayer.appendChild(el);
    (function(e){
      var ang=Math.random()*Math.PI*2, dist=60+Math.random()*120;
      var dx=Math.cos(ang)*dist, dy=Math.sin(ang)*dist-40;
      e.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+dx+'px,'+dy+'px) scale(0)',opacity:0}],{duration:700+Math.random()*400,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=function(){e.remove();};
    })(el);
  }
}
function confetti(){
  for(var i=0;i<70;i++){
    (function(){
      var el=document.createElement('div'); el.className='particle';
      var sz=6+Math.random()*8;
      el.style.cssText='left:'+(Math.random()*100)+'vw;top:-20px;width:'+sz+'px;height:'+(sz*1.6)+'px;background:'+COLORS[Math.floor(Math.random()*COLORS.length)]+';border-radius:2px';
      fxLayer.appendChild(el);
      el.animate([{transform:'translateY(0) rotate(0)',opacity:1},{transform:'translateY(110vh) rotate('+(Math.random()*720-360)+'deg)',opacity:.8}],{duration:1800+Math.random()*1600,easing:'linear'}).onfinish=function(){el.remove();};
    })();
  }
}
function floatScore(x,y,text){
  var el=document.createElement('div'); el.className='score-float'; el.textContent=text;
  el.style.left=x+'px'; el.style.top=y+'px'; fxLayer.appendChild(el);
  setTimeout(function(){el.remove();},1000);
}
var comboTimer=null;
function comboBanner(text){
  var b=document.getElementById('combo-banner');
  b.textContent=text; b.classList.remove('hidden','show'); void b.offsetWidth; b.classList.add('show');
  clearTimeout(comboTimer); comboTimer=setTimeout(function(){b.classList.add('hidden');},1000);
}

/* ---------- 屏幕 ---------- */
var screens=['screen-home','screen-category','screen-levels','screen-match','screen-pinyin','screen-dictation','screen-monster','screen-balloon','screen-write','screen-read','screen-reading','screen-mistakes'];

/* ---------- v1.8 分类 ---------- */
var CATEGORIES=[
  {id:'shengzi', name:'生字', games:['match','pinyin','write'], img:'img/companion-teach.jpg'},
  {id:'zuci', name:'组词', games:['dictation'], img:'img/companion-teach.jpg'},
  {id:'chuang', name:'词语闯关', games:['monster','balloon'], img:'img/companion-challenge.jpg'},
  {id:'langdu', name:'课文朗读', games:['read'], img:'img/companion-teach.jpg'}
];
var GAME_META={
  match:{name:'配对消消乐', desc:'汉字 ↔ 拼音连连看', emoji:'🀄'},
  pinyin:{name:'看拼音选字', desc:'拼音对了字才对', emoji:'🔤'},
  write:{name:'书写乐园', desc:'手指写字词', img:'img/melody.png'},
  dictation:{name:'听写闯关', desc:'听词语写汉字', emoji:'🎧'},
  monster:{name:'打怪兽', desc:'拼音答对打怪兽', img:'img/kuromi.png'},
  balloon:{name:'打气球', desc:'打气球认生字', img:'img/cinnamoroll.png'},
  read:{name:'课文朗读', desc:'大声读出来', emoji:'🔊'}
};
function show(id){ screens.forEach(function(s){document.getElementById(s).classList.toggle('active',s===id);}); }
function el(id){ return document.getElementById(id); }
function shuffle(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;} return a; }
function centerOf(e){ var r=e.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; }

function refreshHome(){
  var n = Object.keys(save.mistakes).length;
  el('mistake-count').textContent = n;
  var m2=el('mistake-count2'); if(m2) m2.textContent=n;
  /* 问候语 */
  var h=new Date().getHours();
  var hi = h<6?'夜深了，早点休息哦！':(h<12?'上午好，小朋友！':(h<14?'中午好，小朋友！':(h<18?'下午好，小朋友！':'晚上好，小朋友！')));
  var ghi=el('greet-hi'); if(ghi) ghi.textContent=hi;
}

/* ---------- 分类选择 ---------- */
var curCat=null;
var curMode=null;
var MODE_NAMES={match:'配对消消乐',pinyin:'看拼音选字',dictation:'听写闯关',monster:'打怪兽',balloon:'打气球',write:'书写乐园'};
document.querySelectorAll('.cat-card').forEach(function(btn){
  btn.addEventListener('click',function(){
    SFX.click();
    var c=btn.getAttribute('data-cat');
    openCategory(c);
  });
});
function openCategory(cid){
  curCat=CATEGORIES.find(function(c){return c.id===cid;});
  if(!curCat) return;
  if(curCat.games.length===1 && curCat.games[0]==='read'){ openRead(); return; }
  el('category-title').textContent=curCat.name;
  el('category-companion').src=curCat.img;
  var box=el('category-games'); box.innerHTML='';
  curCat.games.forEach(function(g){
    var meta=GAME_META[g];
    var b=document.createElement('button');
    b.className='cat-game-card';
    var iconHtml = meta.img ? '<img class="cat-game-img" src="'+meta.img+'">' : '<span class="cat-game-emoji">'+meta.emoji+'</span>';
    /* 本分类下各游戏最高星级 */
    var best=0, total=LEVELS.length;
    Object.keys(save.stars[g]||{}).forEach(function(k){ best+=save.stars[g][k]; });
    b.innerHTML=iconHtml+'<span class="cat-game-text"><span class="cat-game-name">'+meta.name+'</span><span class="cat-game-desc">'+meta.desc+'</span></span><span class="cat-game-stars">⭐ '+best+'/'+(total*3)+'</span>';
    b.addEventListener('click',function(){ SFX.click(); curMode=g; renderLevels(); show('screen-levels'); });
    box.appendChild(b);
  });
  show('screen-category');
}
el('category-back').addEventListener('click',function(){SFX.click();show('screen-home');});
el('home-mistakes-btn').addEventListener('click',function(){SFX.click();renderMistakes();show('screen-mistakes');});
el('home-mistake-strip').addEventListener('click',function(){SFX.click();renderMistakes();show('screen-mistakes');});

/* ---------- 课文朗读 ---------- */
function openRead(){
  var box=el('read-lessons'); box.innerHTML='';
  var lastUnit=-1;
  var lessons=[];
  CHARS.forEach(function(c){ if(lessons.indexOf(c.lesson)<0) lessons.push(c.lesson); });
  UNITS.forEach(function(u,ui){
    var h=document.createElement('div');
    h.className='unit-header';
    h.innerHTML='<span>'+u.name+' · '+u.title+'</span>';
    box.appendChild(h);
    u.lessons.forEach(function(ln){
      var chars=CHARS.filter(function(c){return c.lesson===ln;});
      if(!chars.length) return;
      var b=document.createElement('button');
      b.className='read-lesson-btn';
      b.innerHTML='<span class="read-lesson-name">'+ln+'</span><span class="read-lesson-count">'+chars.length+'字 🔊</span>';
      b.addEventListener('click',function(){ SFX.click(); openReading(ln,chars); });
      box.appendChild(b);
    });
  });
  show('screen-read');
}
el('read-back').addEventListener('click',function(){SFX.click();show('screen-home');});
var readingChars=[], readingLesson='';
function openReading(lesson,chars){
  readingLesson=lesson; readingChars=chars;
  el('reading-title').textContent=lesson;
  renderReading();
  show('screen-reading');
}
function renderReading(){
  var grid=el('reading-grid'); grid.innerHTML='';
  readingChars.forEach(function(ch){
    var d=document.createElement('button');
    d.className='reading-card';
    d.innerHTML='<span class="reading-char">'+ch.c+'</span><span class="reading-py">'+ch.py+'</span><span class="reading-words">'+ch.w.slice(0,2).join(' · ')+'</span>';
    d.addEventListener('click',function(){
      SFX.click();
      d.classList.add('reading-active');
      setTimeout(function(){d.classList.remove('reading-active');},800);
      speak(ch.c+'。'+ch.w.join('，'));
    });
    grid.appendChild(d);
  });
}
function readAll(){
  var i=0;
  SFX.click();
  el('reading-all').disabled=true;
  (function next(){
    if(i>=readingChars.length){ el('reading-all').disabled=false; return; }
    var ch=readingChars[i];
    var cards=el('reading-grid').children;
    if(cards[i]){ cards[i].classList.add('reading-active'); }
    speak(ch.c+'，'+ch.w[0]);
    i++;
    setTimeout(function(){ if(cards[i-1]) cards[i-1].classList.remove('reading-active'); next(); }, 2200);
  })();
}
el('reading-back').addEventListener('click',function(){SFX.click();try{speechSynthesis.cancel();}catch(e){}openRead();});
el('reading-play').addEventListener('click',function(){readAll();});
el('reading-all').addEventListener('click',function(){readAll();});
el('levels-back').addEventListener('click',function(){SFX.click();if(curCat) openCategory(curCat.id); else show('screen-home');});
function renderLevels(){
  el('levels-title').textContent = MODE_NAMES[curMode];
  var g=el('level-grid'); g.innerHTML='';
  var lastUnit=-1;
  LEVELS.forEach(function(lv,idx){
    if(lv.unit!==lastUnit){
      lastUnit=lv.unit;
      var h=document.createElement('div');
      h.className='unit-header';
      var t=UNITS[lv.unit].title ? ' · '+UNITS[lv.unit].title : '';
      h.innerHTML='<span>'+UNITS[lv.unit].name+t+'</span><span class="unit-count">'+UNITS[lv.unit].count+'字</span>';
      g.appendChild(h);
    }
    var b=document.createElement('button');
    var locked = idx > save.unlocked[curMode];
    b.className='level-btn'+(locked?' locked':'');
    var st = save.stars[curMode][idx]||0;
    var stars = st? '★'.repeat(st)+'☆'.repeat(3-st) : '☆☆☆';
    b.innerHTML='<span>第 '+(lv.unitLevel+1)+' 关</span><span class="stars" style="color:#ffa94d">'+stars+'</span><span style="font-size:12px;color:#8a6f5c;font-weight:400">'+lv.chars.length+'字</span>';
    if(!locked) b.addEventListener('click',function(){SFX.click();startLevel(curMode,idx);});
    g.appendChild(b);
  });
  /* 还有更多单元时显示滑动提示 */
  var hint=el('level-scroll-hint');
  if(hint){
    g.scrollTop=0;
    var showHint=function(){ hint.classList.toggle('hidden', g.scrollHeight<=g.clientHeight+10 || g.scrollTop>30); };
    g.onscroll=showHint;
    setTimeout(showHint,300);
  }
}
function startLevel(mode,idx){
  if(mode==='match') Match.start(idx);
  else if(mode==='pinyin') PinyinQ.start(idx);
  else if(mode==='dictation') Dict.start(idx);
  else if(mode==='monster') Monster.start(idx);
  else if(mode==='balloon') Balloon.start(idx);
  else if(mode==='write') Write.start(idx);
}

/* ---------- 过关 ---------- */
var winNext=null;
function showWin(stars, statsHtml, onNext){
  SFX.win(); confetti();
  var s=el('win-stars'); s.textContent='';
  for(var i=0;i<3;i++){
    (function(i){
      setTimeout(function(){
        s.textContent += (i<stars?'⭐':'☆');
        if(i<stars) SFX.star(i);
      }, 400+i*450);
    })(i);
  }
  el('win-stats').innerHTML=statsHtml;
  winNext=onNext;
  setTimeout(function(){ el('modal-win').classList.remove('hidden'); }, 900);
}
function hideWin(){ el('modal-win').classList.add('hidden'); }
el('win-replay').addEventListener('click',function(){SFX.click();hideWin(); if(winNext&&winNext.replay)winNext.replay();});
el('win-next').addEventListener('click',function(){SFX.click();hideWin(); if(winNext&&winNext.next)winNext.next();});
function finishLevel(mode,idx,stars){
  var prev=save.stars[mode][idx]||0;
  if(stars>prev) save.stars[mode][idx]=stars;
  if(idx+1<LEVELS.length && save.unlocked[mode]<idx+1) save.unlocked[mode]=idx+1;
  persist();
}
function levelNav(mode,idx){
  return {
    replay:function(){startLevel(mode,idx);},
    next:function(){ if(idx+1<LEVELS.length) startLevel(mode,idx+1); else {curMode=mode;renderLevels();show('screen-levels');} }
  };
}

/* ---------- 模式1: 配对消消乐 ---------- */
var Match={
  idx:0, chars:[], score:0, combo:0, hints:3, matched:0, total:0, first:null, lock:false, t0:0, timerId:null, errors:0,
  start:function(idx){
    this.idx=idx; this.chars=LEVELS[idx].chars; this.score=0; this.combo=0; this.hints=3;
    this.matched=0; this.total=this.chars.length; this.first=null; this.lock=false; this.errors=0;
    el('match-score').textContent='0'; el('match-hints').textContent='3';
    el('match-progress').style.width='0%';
    this.t0=Date.now(); this.tick();
    clearInterval(this.timerId);
    var self=this;
    this.timerId=setInterval(function(){self.tick();},1000);
    this.build(); show('screen-match');
  },
  tick:function(){
    var s=Math.floor((Date.now()-this.t0)/1000);
    el('match-time').textContent=Math.floor(s/60)+':'+('0'+s%60).slice(-2);
  },
  build:function(){
    var board=el('match-board'); board.innerHTML='';
    var cards=[];
    this.chars.forEach(function(ch,ci){
      cards.push({type:'char',text:ch.c,key:ci,ch:ch});
      cards.push({type:'pinyin',text:ch.py,key:ci,ch:ch});
    });
    var self=this;
    shuffle(cards).forEach(function(cd,i){
      var d=document.createElement('div');
      d.className='mcard'+(cd.type==='pinyin'?' pinyin-card':'');
      d.style.animationDelay=(i*0.03)+'s';
      if(cd.type==='char'){ d.textContent=cd.text; }
      else{ d.innerHTML='<span>'+cd.text+'</span>'; }
      d.addEventListener('click',function(){self.tap(d,cd);});
      board.appendChild(d); cd.el=d;
    });
    this.cards=cards;
  },
  tap:function(d,cd){
    if(this.lock||d.classList.contains('matched')||d===this.first) return;
    if(this.first&&this.first.key===cd.key&&this.first.type===cd.type) return;
    SFX.select();
    if(!this.first){ this.first=cd; d.classList.add('selected'); return; }
    var a=this.first, b=cd, self=this;
    this.first=null;
    document.querySelectorAll('.mcard.selected').forEach(function(x){x.classList.remove('selected');});
    if(a.key===b.key){
      this.lock=true;
      setTimeout(function(){
        a.el.classList.add('matched'); b.el.classList.add('matched');
        var p=centerOf(b.el);
        particles(p.x,p.y,26); SFX.pop();
        self.combo++;
        var gain=10+self.combo*5;
        self.score+=gain;
        el('match-score').textContent=self.score;
        floatScore(p.x,p.y,'+'+gain);
        if(self.combo>=2){ SFX.combo(self.combo); comboBanner(self.combo+' 连击！'); }
        else SFX.correct();
        self.matched++;
        el('match-progress').style.width=(self.matched/self.total*100)+'%';
        self.lock=false;
        if(self.matched>=self.total) self.win();
      },180);
    } else {
      this.combo=0; this.errors++;
      SFX.wrong();
      a.el.classList.add('wrong'); b.el.classList.add('wrong');
      setTimeout(function(){ a.el.classList.remove('wrong'); b.el.classList.remove('wrong'); },400);
      addMistake(a.ch.c); addMistake(b.ch.c);
    }
  },
  useHint:function(){
    if(this.hints<=0||this.lock) return;
    var rest=this.cards.filter(function(c){return !c.el.classList.contains('matched');});
    if(!rest.length) return;
    var pick=rest[Math.floor(Math.random()*rest.length)];
    var mate=rest.find(function(c){return c.key===pick.key&&c!==pick;});
    if(!mate) return;
    this.hints--; el('match-hints').textContent=this.hints;
    SFX.hint();
    pick.el.classList.add('hint-glow'); mate.el.classList.add('hint-glow');
    setTimeout(function(){pick.el.classList.remove('hint-glow');mate.el.classList.remove('hint-glow');},2000);
  },
  win:function(){
    clearInterval(this.timerId);
    var secs=Math.floor((Date.now()-this.t0)/1000);
    var stars = (this.errors===0&&secs<=90)?3 : (this.errors<=2)?2 : 1;
    finishLevel('match',this.idx,stars);
    var self=this;
    showWin(stars,'本关 '+this.total+' 个生字<br>用时 '+Math.floor(secs/60)+'分'+secs%60+'秒 · 得分 '+this.score, levelNav('match',this.idx));
  }
};
el('match-back').addEventListener('click',function(){SFX.click();clearInterval(Match.timerId);curMode='match';renderLevels();show('screen-levels');});
el('match-hint-btn').addEventListener('click',function(){Match.useHint();});

/* ---------- 模式2: 看拼音选字 ---------- */
function distractors(excludeChar, n, preferPy){
  var pool=CHARS.filter(function(c){return c.c!==excludeChar;});
  var scored=pool.map(function(c){
    var s=0;
    if(preferPy && c.py[0]===preferPy[0]) s+=2;
    if(preferPy && c.py.slice(1)===preferPy.slice(1)) s+=3;
    return {c:c,s:s+Math.random()};
  });
  scored.sort(function(a,b){return b.s-a.s;});
  return scored.slice(0,n).map(function(x){return x.c;});
}
var PinyinQ={
  idx:0, qs:[], qi:0, score:0, correctCount:0, lock:false,
  start:function(idx){
    this.idx=idx; this.qs=shuffle(LEVELS[idx].chars.slice()); this.qi=0; this.score=0; this.correctCount=0;
    el('pinyin-score').textContent='0';
    this.next(); show('screen-pinyin');
  },
  next:function(){
    if(this.qi>=this.qs.length){ this.win(); return; }
    this.lock=false;
    var ch=this.qs[this.qi];
    el('pinyin-q').textContent=(this.qi+1);
    el('pinyin-progress').style.width=(this.qi/this.qs.length*100)+'%';
    el('pinyin-question').textContent=ch.py;
    var w=ch.w.find(function(x){return x.indexOf(ch.c)>=0;})||ch.w[0];
    el('pinyin-word-hint').innerHTML='词语：'+w.replace(ch.c,'<b>□</b>');
    var opts=shuffle([ch].concat(distractors(ch.c,3,ch.py)));
    var box=el('pinyin-options'); box.innerHTML='';
    var self=this;
    opts.forEach(function(o){
      var b=document.createElement('button');
      b.className='opt-btn'; b.textContent=o.c;
      b.addEventListener('click',function(){self.answer(b,o,ch);});
      box.appendChild(b);
    });
    speak(ch.py.replace(/[āáǎà]/g,'a').replace(/[ēéěè]/g,'e').replace(/[īíǐì]/g,'i').replace(/[ōóǒò]/g,'o').replace(/[ūúǔù]/g,'u').replace(/[ǖǘǚǜ]/g,'v'));
  },
  answer:function(btn,o,ch){
    if(this.lock) return; this.lock=true;
    var self=this;
    if(o.c===ch.c){
      btn.classList.add('correct'); SFX.correct();
      var p=centerOf(btn); particles(p.x,p.y,20);
      this.score+=10; this.correctCount++;
      el('pinyin-score').textContent=this.score;
      floatScore(p.x,p.y,'+10');
    } else {
      btn.classList.add('wrong'); SFX.wrong();
      btn.parentNode.querySelectorAll('.opt-btn').forEach(function(x){
        if(x.textContent===ch.c) x.classList.add('correct');
        x.disabled=true;
      });
      addMistake(ch.c);
    }
    el('pinyin-progress').style.width=((this.qi+1)/this.qs.length*100)+'%';
    setTimeout(function(){ self.qi++; self.next(); }, o.c===ch.c?700:1600);
  },
  win:function(){
    var stars=this.correctCount>=this.qs.length?3:(this.correctCount>=this.qs.length*0.8?2:1);
    finishLevel('pinyin',this.idx,stars);
    showWin(stars,'答对 '+this.correctCount+' / '+this.qs.length+' 题<br>得分 '+this.score, levelNav('pinyin',this.idx));
  }
};
el('pinyin-back').addEventListener('click',function(){SFX.click();curMode='pinyin';renderLevels();show('screen-levels');});

/* ---------- 模式3: 听写闯关 ---------- */
var Dict={
  idx:0, qs:[], qi:0, score:0, correctCount:0, lock:false, word:'', picked:[],
  start:function(idx){
    this.idx=idx;
    var chars=LEVELS[idx].chars;
    this.qs=shuffle(chars.slice()).map(function(ch){
      var ws=ch.w.filter(function(w){return w.length>=2&&w.length<=3;});
      return {ch:ch, word:ws[Math.floor(Math.random()*ws.length)]||ch.w[0]};
    });
    this.qi=0; this.score=0; this.correctCount=0;
    el('dict-score').textContent='0';
    this.next(); show('screen-dictation');
  },
  next:function(){
    if(this.qi>=this.qs.length){ this.win(); return; }
    this.lock=false; this.picked=[];
    var q=this.qs[this.qi]; this.word=q.word;
    el('dict-q').textContent=(this.qi+1);
    el('dict-progress').style.width=(this.qi/this.qs.length*100)+'%';
    var slots=el('dict-slots'); slots.innerHTML='';
    for(var i=0;i<this.word.length;i++){
      var s=document.createElement('div'); s.className='dict-slot'; slots.appendChild(s);
    }
    var charsInWord=this.word.split('');
    var opts=shuffle(charsInWord.concat(distractors('',6).map(function(c){return c.c;})));
    var box=el('dict-options'); box.innerHTML='';
    var self=this;
    opts.forEach(function(c){
      var b=document.createElement('button');
      b.className='opt-btn'; b.textContent=c;
      b.addEventListener('click',function(){
        if(self.lock||b.classList.contains('used')) return;
        if(self.picked.length>=self.word.length) return;
        SFX.select();
        b.classList.add('used');
        self.picked.push({c:c,btn:b});
        self.renderSlots();
      });
      box.appendChild(b);
    });
    this.speakWord();
  },
  renderSlots:function(){
    var slots=el('dict-slots').children;
    for(var i=0;i<slots.length;i++){
      if(this.picked[i]){ slots[i].textContent=this.picked[i].c; slots[i].classList.add('filled'); }
      else { slots[i].textContent=''; slots[i].classList.remove('filled'); }
    }
  },
  speakWord:function(){ speak(this.word, 0.75); setTimeout(function(){},0); },
  submit:function(){
    if(this.lock) return;
    if(this.picked.length<this.word.length){ SFX.click(); return; }
    this.lock=true;
    var mine=this.picked.map(function(p){return p.c;}).join('');
    var self=this;
    if(mine===this.word){
      SFX.correct();
      var p=centerOf(el('dict-slots')); particles(p.x,p.y,24);
      this.score+=10; this.correctCount++;
      el('dict-score').textContent=this.score;
      floatScore(p.x,p.y,'+10');
      el('dict-progress').style.width=((this.qi+1)/this.qs.length*100)+'%';
      setTimeout(function(){self.qi++;self.next();},900);
    } else {
      SFX.wrong();
      el('dict-slots').style.animation='shake .4s';
      setTimeout(function(){el('dict-slots').style.animation='';},450);
      var self2=this;
      this.word.split('').forEach(function(c){ var f=findChar(c); if(f) addMistake(c); });
      setTimeout(function(){
        alert('正确答案：'+self.word);
        self.qi++; self.next();
      }, 900);
    }
  },
  clear:function(){
    if(this.lock) return;
    SFX.click();
    this.picked.forEach(function(p){p.btn.classList.remove('used');});
    this.picked=[]; this.renderSlots();
  },
  win:function(){
    var stars=this.correctCount>=this.qs.length?3:(this.correctCount>=this.qs.length*0.8?2:1);
    finishLevel('dictation',this.idx,stars);
    showWin(stars,'听写对 '+this.correctCount+' / '+this.qs.length+' 个<br>得分 '+this.score, levelNav('dictation',this.idx));
  }
};
el('dict-back').addEventListener('click',function(){SFX.click();try{speechSynthesis.cancel();}catch(e){}curMode='dictation';renderLevels();show('screen-levels');});
el('dict-speaker').addEventListener('click',function(){SFX.click();Dict.speakWord();});
el('dict-replay').addEventListener('click',function(){SFX.click();Dict.speakWord();});
el('dict-submit').addEventListener('click',function(){Dict.submit();});
el('dict-clear').addEventListener('click',function(){Dict.clear();});

/* ---------- 模式4: 打怪兽 ---------- */
function makeArenaStars(){
  var box=el('arena-stars'); if(!box||box.children.length) return;
  for(var i=0;i<30;i++){
    var s=document.createElement('div'); s.className='astar';
    s.style.left=(Math.random()*100)+'%'; s.style.top=(Math.random()*62)+'%';
    s.style.animationDelay=(Math.random()*3)+'s';
    var sz=(2+Math.random()*3)+'px'; s.style.width=sz; s.style.height=sz;
    box.appendChild(s);
  }
}
function dust(x,y){
  var colors=['#b8a88a','#9c8b70','#d6c9b0','#8a7a60'];
  for(var i=0;i<16;i++){
    var el2=document.createElement('div');
    el2.className='particle';
    var sz=5+Math.random()*9;
    el2.style.cssText='left:'+x+'px;top:'+y+'px;width:'+sz+'px;height:'+sz+'px;background:'+colors[i%colors.length];
    fxLayer.appendChild(el2);
    (function(e){
      var ang=-Math.PI/2+(Math.random()-0.5)*2.2, dist=40+Math.random()*90;
      var dx=Math.cos(ang)*dist, dy=Math.sin(ang)*dist*0.5;
      e.animate([{transform:'translate(0,0) scale(1)',opacity:.9},{transform:'translate('+dx+'px,'+dy+'px) scale(1.6)',opacity:0}],{duration:600+Math.random()*400,easing:'ease-out'}).onfinish=function(){e.remove();};
    })(el2);
  }
}
function shockwave(x,y,big){
  var r=document.createElement('div'); r.className='shockwave';
  var sz=big?60:40;
  r.style.cssText='left:'+x+'px;top:'+y+'px;width:'+sz+'px;height:'+sz+'px;';
  fxLayer.appendChild(r);
  r.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:'translate(-50%,-50%) scale('+(big?4:2.6)+')',opacity:0}],{duration:450,easing:'ease-out'}).onfinish=function(){r.remove();};
}
var Monster={
  idx:0, qs:[], qi:0, hp:3, score:0, errors:0, lock:false,
  faces:['👹','👺','👻','💀','🤖','👾','🐲','🦖','👿','🎃'],
  start:function(idx){
    this.idx=idx; this.qs=shuffle(LEVELS[idx].chars.slice());
    this.qi=0; this.hp=3; this.score=0; this.errors=0;
    el('monster-hp').textContent='3'; el('monster-score').textContent='0';
    makeArenaStars();
    this.next(); show('screen-monster');
  },
  next:function(){
    if(this.hp<=0){ this.fail(); return; }
    if(this.qi>=this.qs.length){ this.win(); return; }
    this.lock=false;
    var ch=this.qs[this.qi];
    el('monster-count').textContent=(this.qi+1)+'/'+this.qs.length;
    el('monster-progress').style.width=(this.qi/this.qs.length*100)+'%';
    el('monster-char').textContent=ch.c;
    var body=el('monster-body');
    body.classList.remove('enter','hit','defeated','lunge','angry');
    void body.offsetWidth;
    body.classList.add('enter');
    SFX.pop();
    setTimeout(function(){ SFX.roar(); }, 200);
    /* 落地震起尘土 */
    setTimeout(function(){
      var p=centerOf(body);
      dust(p.x, p.y+70);
      el('monster-arena').classList.add('shake-screen');
      setTimeout(function(){ el('monster-arena').classList.remove('shake-screen'); }, 500);
    }, 340);
    var opts=shuffle([ch].concat(distractors(ch.c,3,ch.py)));
    var box=el('monster-options'); box.innerHTML='';
    var self=this;
    opts.forEach(function(o,i){
      var b=document.createElement('button');
      b.className='opt-btn'; b.textContent=o.py;
      b.style.animationDelay=(i*0.07)+'s';
      b.addEventListener('click',function(){self.answer(b,o,ch);});
      box.appendChild(b);
    });
    speak(ch.py.replace(/[āáǎà]/g,'a').replace(/[ēéěè]/g,'e').replace(/[īíǐì]/g,'i').replace(/[ōóǒò]/g,'o').replace(/[ūúǔù]/g,'u').replace(/[ǖǘǚǜ]/g,'v'));
  },
  answer:function(btn,o,ch){
    if(this.lock) return; this.lock=true;
    var self=this;
    if(o.c===ch.c){
      btn.classList.add('correct'); SFX.correct();
      this.fireball(function(){
        self.score+=10; self.qi++;
        el('monster-score').textContent=self.score;
        el('monster-progress').style.width=(self.qi/self.qs.length*100)+'%';
        floatScore(window.innerWidth/2, window.innerHeight*0.35, '💥 +10');
        setTimeout(function(){self.next();},350);
      });
    } else {
      btn.classList.add('wrong'); SFX.wrong();
      this.errors++; this.hp--;
      el('monster-hp').textContent=Math.max(0,this.hp);
      addMistake(ch.c);
      btn.parentNode.querySelectorAll('.opt-btn').forEach(function(x){
        if(x.textContent===ch.py) x.classList.add('correct');
        x.disabled=true;
      });
      this.monsterAttack(function(){
        if(self.hp<=0){ self.fail(); }
        else { self.qi++; setTimeout(function(){self.next();},400); }
      });
    }
  },
  fireball:function(cb){
    var from=centerOf(el('player-side')), to=centerOf(el('monster-body'));
    /* 英雄出拳 */
    var pe=el('player-emoji');
    pe.classList.remove('punch'); void pe.offsetWidth; pe.classList.add('punch');
    var fb=document.createElement('div'); fb.className='fireball'; fb.textContent='🔥';
    fb.style.left=(from.x-20)+'px'; fb.style.top=(from.y-20)+'px';
    el('fx-layer').appendChild(fb);
    SFX.whoosh();
    /* 火球尾迹 */
    var trail=setInterval(function(){
      var r=fb.getBoundingClientRect();
      if(!r.width){ clearInterval(trail); return; }
      particles(r.left+r.width/2, r.top+r.height/2, 3);
    }, 70);
    var dx=to.x-from.x, dy=to.y-from.y;
    fb.animate([
      {transform:'translate(0,0) scale(.6) rotate(0deg)'},
      {transform:'translate('+dx*0.5+'px,'+(dy*0.5-40)+'px) scale(1) rotate(180deg)'},
      {transform:'translate('+dx+'px,'+dy+'px) scale(1.5) rotate(360deg)'}
    ],{duration:420,easing:'ease-in'}).onfinish=function(){
      clearInterval(trail);
      fb.remove();
      var body=el('monster-body');
      var arena=el('monster-arena');
      /* 顿帧：打击感 */
      arena.classList.add('hitstop');
      setTimeout(function(){ arena.classList.remove('hitstop'); }, 90);
      body.classList.add('hit');
      var p=centerOf(body);
      particles(p.x,p.y,32); shockwave(p.x,p.y,true);
      SFX.explosion(); SFX.defeated();
      setTimeout(function(){
        body.classList.remove('hit'); body.classList.add('defeated');
        setTimeout(cb, 320);
      }, 280);
    };
  },
  monsterAttack:function(cb){
    var arena=el('monster-arena');
    var body=el('monster-body');
    body.classList.add('lunge','angry');
    arena.classList.add('shake-screen');
    setTimeout(function(){ SFX.hurt(); },150);
    floatScore(window.innerWidth/2, window.innerHeight*0.4, '💔');
    setTimeout(function(){
      arena.classList.remove('shake-screen');
      body.classList.remove('lunge');
      cb();
    }, 750);
  },
  win:function(){
    var stars=this.errors===0?3:(this.errors===1?2:1);
    finishLevel('monster',this.idx,stars);
    showWin(stars,'打败 '+this.qs.length+' 只怪兽！<br>得分 '+this.score, levelNav('monster',this.idx));
  },
  fail:function(){
    if(confirm('😢 被怪兽打败了！再挑战一次吧？')){ this.start(this.idx); }
    else { curMode='monster'; renderLevels(); show('screen-levels'); }
  }
};
el('monster-back').addEventListener('click',function(){SFX.click();curMode='monster';renderLevels();show('screen-levels');});

/* ---------- 模式5: 打气球 ---------- */
/* 三丽鸥角色图（canvas 用） */
var SANRIO_IMG={};
['kuromi','melody','cinnamoroll'].forEach(function(n){
  var im=new Image(); im.src='img/'+n+'.png'; SANRIO_IMG[n]=im;
});
var Balloon={
  idx:0, chars:[], target:null, score:0, shield:3, pops:0, need:6,
  cv:null, ctx:null, W:0, H:0, raf:0, running:false, lastT:0,
  sx:0, balloons:[], darts:[], parts:[], clouds:[],
  lastSpawn:0, flash:0, shake:0,
  colors:['#ff6b8d','#ffa94d','#ffd43b','#69db7c','#6cb8f7','#b197fc','#f783ac'],
  start:function(idx){
    this.idx=idx; this.chars=LEVELS[idx].chars.slice();
    this.score=0; this.shield=3; this.pops=0;
    this.balloons=[]; this.darts=[]; this.parts=[]; this.clouds=[];
    this.shake=0;
    for(var i=0;i<4;i++) this.clouds.push({x:Math.random(),y:Math.random()*0.7,s:24+Math.random()*30,v:0.00012+Math.random()*0.0003});
    el('balloon-shield').textContent='3';
    el('balloon-kills').textContent='0/'+this.need;
    el('balloon-score').textContent='0';
    this.pickTarget();
    show('screen-balloon');
    this.initCanvas();
    this.running=true; this.lastT=performance.now();
    var self=this;
    cancelAnimationFrame(this.raf);
    var loop=function(t){ if(!self.running) return; self.frame(t); self.raf=requestAnimationFrame(loop); };
    this.raf=requestAnimationFrame(loop);
  },
  stop:function(){ this.running=false; cancelAnimationFrame(this.raf); },
  pickTarget:function(){
    var pool=this.chars.filter(function(c){return !this.target||c.c!==this.target.c;},this);
    this.target=(pool.length?pool:this.chars)[Math.floor(Math.random()*(pool.length?pool.length:this.chars.length))];
    el('balloon-target-py').textContent=this.target.py;
    var tb=document.querySelector('.balloon-target');
    if(tb){ tb.classList.remove('target-pulse'); void tb.offsetWidth; tb.classList.add('target-pulse'); }
  },
  initCanvas:function(){
    this.cv=el('balloon-canvas');
    this.W=this.cv.clientWidth||300; this.H=this.cv.clientHeight||400;
    var dpr=window.devicePixelRatio||1;
    this.cv.width=this.W*dpr; this.cv.height=this.H*dpr;
    this.ctx=this.cv.getContext('2d'); this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.sx=this.W/2;
    var self=this;
    var move=function(clientX){
      var r=self.cv.getBoundingClientRect();
      self.sx=Math.max(34,Math.min(self.W-34,clientX-r.left));
    };
    var tap=function(clientX,clientY){
      var r=self.cv.getBoundingClientRect();
      var x=clientX-r.left, y=clientY-r.top;
      /* 点中气球：直接发射追踪镖 */
      for(var i=0;i<self.balloons.length;i++){
        var b=self.balloons[i];
        if(Math.hypot(x-b.x,y-b.y)<b.r+14){ self.fireHoming(b); return; }
      }
    };
    this.cv.ontouchstart=function(e){e.preventDefault();var t=e.touches[0];move(t.clientX);self.touchSX=t.clientX;self.touchSY=t.clientY;};
    this.cv.ontouchmove=function(e){e.preventDefault();move(e.touches[0].clientX);};
    this.cv.ontouchend=function(e){
      var t=e.changedTouches[0];
      var moved=Math.hypot(t.clientX-self.touchSX,t.clientY-self.touchSY);
      if(moved<14 && t.clientY < self.cv.getBoundingClientRect().top + self.H*0.75) tap(t.clientX,t.clientY);
    };
    this.cv.onmousedown=function(e){move(e.clientX);};
    this.cv.onmousemove=function(e){if(e.buttons)move(e.clientX);};
    this.cv.onmouseup=function(e){
      var r=self.cv.getBoundingClientRect();
      if(e.clientY < r.top + self.H*0.75) tap(e.clientX,e.clientY);
    };
  },
  spawn:function(){
    var isTarget=Math.random()<0.5||!this.balloons.some(function(b){return b.ch.c===this.target.c;},this);
    var ch=isTarget?this.target:this.chars[Math.floor(Math.random()*this.chars.length)];
    this.balloons.push({
      x:44+Math.random()*(this.W-88), y:this.H+50,
      vy:-(0.55+Math.random()*0.65),
      ch:ch, r:32+Math.random()*8,
      color:this.colors[Math.floor(Math.random()*this.colors.length)],
      sway:Math.random()*6.28, swaySpd:0.02+Math.random()*0.02
    });
  },
  fire:function(){
    /* 手动发射：从射手头顶垂直向上 */
    this.darts.push({x:this.sx, y:this.H-96, vy:-8, homing:null});
    SFX.dart();
  },
  fireHoming:function(b){
    /* 点气球：发射追踪镖 */
    this.darts.push({x:this.sx, y:this.H-96, vy:0, homing:b});
    SFX.dart();
  },
  popFx:function(x,y,color,big){
    var n=big?22:14;
    for(var i=0;i<n;i++){
      var a=Math.random()*6.28, sp=1.5+Math.random()*(big?5:3);
      this.parts.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,c:color,s:3+Math.random()*5});
    }
    this.parts.push({ring:true,x:x,y:y,life:1,r:10,maxR:big?80:48});
  },
  frame:function(t){
    var dt=Math.min(50,t-this.lastT); this.lastT=t;
    var k=dt/16.7, ctx=this.ctx, self=this;
    /* ---- 更新 ---- */
    if(t-this.lastSpawn>1900&&this.balloons.length<4){ this.lastSpawn=t; this.spawn(); }
    /* 气球上升 */
    this.balloons.forEach(function(b){
      b.y+=b.vy*k; b.sway+=b.swaySpd*k;
      b.x+=Math.sin(b.sway)*0.7*k;
    });
    this.balloons=this.balloons.filter(function(b){return b.y>-70;});
    /* 飞镖 */
    for(var di=this.darts.length-1;di>=0;di--){
      var d=this.darts[di];
      if(d.homing){
        var hb=d.homing;
        if(this.balloons.indexOf(hb)<0){ this.darts.splice(di,1); continue; }
        var dx=hb.x-d.x, dy=hb.y-d.y, dist=Math.hypot(dx,dy)||1;
        var sp=11;
        d.x+=dx/dist*sp*k; d.y+=dy/dist*sp*k;
        if(dist<24){ this.hitBalloon(hb); this.darts.splice(di,1); }
      } else {
        d.y+=d.vy*k;
        var hit=false;
        for(var bi=this.balloons.length-1;bi>=0;bi--){
          var b2=this.balloons[bi];
          if(Math.hypot(d.x-b2.x,d.y-b2.y)<b2.r+6){ this.hitBalloon(b2); hit=true; break; }
        }
        if(hit||d.y<-20) this.darts.splice(di,1);
      }
    }
    /* 粒子 */
    this.parts.forEach(function(p){
      if(p.ring){ p.life-=0.07*k; p.r+=(p.maxR-p.r)*0.18*k; return; }
      p.x+=p.vx*k; p.y+=p.vy*k; p.vy+=0.1*k; p.life-=0.035*k;
    });
    this.parts=this.parts.filter(function(p){return p.life>0;});
    this.clouds.forEach(function(c){c.x+=c.v*dt; if(c.x>1.15){c.x=-0.15;c.y=Math.random()*0.7;}});
    if(this.flash>0) this.flash-=dt;
    if(this.shake>0) this.shake=Math.max(0,this.shake-dt*0.035);
    /* ---- 绘制 ---- */
    ctx.save();
    if(this.shake>0) ctx.translate((Math.random()-0.5)*this.shake,(Math.random()-0.5)*this.shake);
    ctx.clearRect(-20,-20,this.W+40,this.H+40);
    /* 白天天空 */
    var g=ctx.createLinearGradient(0,0,0,this.H);
    g.addColorStop(0,'#aee3ff'); g.addColorStop(.6,'#d8f0ff'); g.addColorStop(1,'#fff4e0');
    ctx.fillStyle=g; ctx.fillRect(-20,-20,this.W+40,this.H+40);
    /* 太阳 */
    ctx.font='52px serif'; ctx.textAlign='center';
    ctx.fillText('🌞',this.W-52,64);
    /* 云 */
    ctx.fillStyle='rgba(255,255,255,.92)';
    this.clouds.forEach(function(c){ctx.font=c.s+'px serif';ctx.fillText('☁️',c.x*self.W,c.y*self.H);});
    /* 气球 */
    this.balloons.forEach(function(b){
      /* 绳子 */
      ctx.strokeStyle='rgba(120,120,130,.7)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(b.x,b.y+b.r*0.92);
      ctx.quadraticCurveTo(b.x+8,b.y+b.r*0.92+22,b.x-4,b.y+b.r*0.92+40); ctx.stroke();
      /* 球体 */
      ctx.fillStyle=b.color;
      ctx.beginPath(); ctx.ellipse(b.x,b.y,b.r*0.82,b.r,0,0,6.29); ctx.fill();
      /* 高光 */
      ctx.fillStyle='rgba(255,255,255,.45)';
      ctx.beginPath(); ctx.ellipse(b.x-b.r*0.3,b.y-b.r*0.38,b.r*0.2,b.r*0.32,-0.4,0,6.29); ctx.fill();
      /* 结 */
      ctx.fillStyle=b.color;
      ctx.beginPath(); ctx.moveTo(b.x-6,b.y+b.r*0.94); ctx.lineTo(b.x+6,b.y+b.r*0.94); ctx.lineTo(b.x,b.y+b.r*0.94+9); ctx.closePath(); ctx.fill();
      /* 汉字 */
      ctx.font='bold 27px sans-serif';
      ctx.lineWidth=5; ctx.strokeStyle='rgba(0,0,0,.35)';
      ctx.strokeText(b.ch.c,b.x,b.y+2);
      ctx.fillStyle='#fff'; ctx.fillText(b.ch.c,b.x,b.y+2);
    });
    /* 飞镖 */
    ctx.strokeStyle='#e8590c'; ctx.lineWidth=4; ctx.lineCap='round';
    this.darts.forEach(function(d){
      ctx.beginPath(); ctx.moveTo(d.x,d.y+12); ctx.lineTo(d.x,d.y-10); ctx.stroke();
      ctx.fillStyle='#ff6b8d';
      ctx.beginPath(); ctx.moveTo(d.x,d.y-18); ctx.lineTo(d.x-5,d.y-8); ctx.lineTo(d.x+5,d.y-8); ctx.closePath(); ctx.fill();
    });
    /* 射手：大耳狗 */
    var psz=64;
    if(SANRIO_IMG.cinnamoroll.complete&&SANRIO_IMG.cinnamoroll.naturalWidth){
      ctx.drawImage(SANRIO_IMG.cinnamoroll,this.sx-psz/2,this.H-psz-16,psz,psz);
    } else { ctx.font='52px serif'; ctx.fillText('🐶',this.sx,this.H-40); }
    /* 粒子 */
    this.parts.forEach(function(p){
      if(p.ring){
        ctx.globalAlpha=Math.max(0,p.life)*0.9;
        ctx.strokeStyle='#fff'; ctx.lineWidth=4;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.29); ctx.stroke();
      } else {
        ctx.globalAlpha=Math.max(0,p.life); ctx.fillStyle=p.c;
        ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);
      }
    });
    ctx.globalAlpha=1;
    ctx.restore();
    if(this.flash>0){ ctx.fillStyle='rgba(255,60,60,'+(this.flash/300*0.35)+')'; ctx.fillRect(0,0,this.W,this.H); }
  },
  hitBalloon:function(b){
    var bi=this.balloons.indexOf(b);
    if(bi>=0) this.balloons.splice(bi,1);
    var cr=this.cv.getBoundingClientRect();
    if(b.ch.c===this.target.c){
      this.pops++; this.score+=100;
      el('balloon-kills').textContent=this.pops+'/'+this.need;
      el('balloon-score').textContent=this.score;
      this.popFx(b.x,b.y,b.color,true);
      SFX.balloonPop(); SFX.defeated();
      floatScore(cr.left+b.x, cr.top+b.y, '💥 +100');
      if(this.pops>=this.need){ this.win(); return; }
      this.pickTarget();
    } else {
      this.shield--;
      el('balloon-shield').textContent=Math.max(0,this.shield);
      this.popFx(b.x,b.y,b.color,false);
      SFX.shieldBreak(); this.flash=300; this.shake=8;
      addMistake(this.target.c);
      if(this.shield<=0){ this.fail(); return; }
    }
  },
  win:function(){
    this.stop();
    var stars=this.shield>=3?3:(this.shield===2?2:1);
    finishLevel('balloon',this.idx,stars);
    showWin(stars,'打破 '+this.pops+' 个汉字气球！<br>得分 '+this.score, levelNav('balloon',this.idx));
  },
  fail:function(){
    this.stop();
    if(confirm('😢 气球飞走了！再来一局吧？')){ this.start(this.idx); }
    else { curMode='balloon'; renderLevels(); show('screen-levels'); }
  }
};
el('balloon-back').addEventListener('click',function(){SFX.click();Balloon.stop();curMode='balloon';renderLevels();show('screen-levels');});
el('balloon-fire').addEventListener('click',function(){Balloon.fire();});

/* ---------- 模式6: 书写乐园 ---------- */
var Write={
  idx:0, qs:[], qi:0, ch:null, mode:'char', guide:true, color:'#4dabf7', text:'',
  cv:null, ctx:null, W:0, H:0, drawing:false, last:null, wrote:false,
  start:function(idx){
    this.idx=idx; this.qs=shuffle(LEVELS[idx].chars.slice()); this.qi=0;
    show('screen-write');
    this.initCanvas();
    this.next();
  },
  initCanvas:function(){
    this.cv=el('write-canvas');
    this.W=this.cv.clientWidth||300; this.H=this.cv.clientHeight||300;
    var dpr=window.devicePixelRatio||1;
    this.cv.width=this.W*dpr; this.cv.height=this.H*dpr;
    this.ctx=this.cv.getContext('2d'); this.ctx.setTransform(dpr,0,0,dpr,0,0);
    var self=this;
    var pos=function(e){
      var r=self.cv.getBoundingClientRect();
      var t=e.touches?e.touches[0]:e;
      return {x:t.clientX-r.left, y:t.clientY-r.top};
    };
    var start=function(e){ e.preventDefault(); self.drawing=true; self.wrote=true; self.last=pos(e); self.dot(self.last); SFX.stroke(); };
    var mv=function(e){ e.preventDefault(); if(!self.drawing) return; var p=pos(e); self.line(self.last,p); self.last=p; };
    var end=function(){ self.drawing=false; };
    this.cv.ontouchstart=start; this.cv.ontouchmove=mv; this.cv.ontouchend=end; this.cv.ontouchcancel=end;
    this.cv.onmousedown=function(e){ self.drawing=true; self.wrote=true; self.last=pos(e); self.dot(self.last); };
    this.cv.onmousemove=function(e){ if(self.drawing){ var p=pos(e); self.line(self.last,p); self.last=p; } };
    this.cv.onmouseup=end; this.cv.onmouseleave=end;
  },
  dot:function(p){ var ctx=this.ctx; ctx.fillStyle=this.color; ctx.beginPath(); ctx.arc(p.x,p.y,5,0,6.29); ctx.fill(); },
  line:function(a,b){
    var ctx=this.ctx;
    ctx.strokeStyle=this.color; ctx.lineWidth=10; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
  },
  drawGrid:function(){
    var ctx=this.ctx; ctx.clearRect(0,0,this.W,this.H);
    var n=this.text.length;
    var gap=14, size=Math.min((this.W-gap*(n-1))/n, this.H-20);
    var totalW=size*n+gap*(n-1);
    var x0=(this.W-totalW)/2, y0=(this.H-size)/2;
    for(var i=0;i<n;i++){
      var x=x0+i*(size+gap), y=y0;
      ctx.strokeStyle='#e8590c'; ctx.lineWidth=3.5;
      ctx.strokeRect(x,y,size,size);
      ctx.strokeStyle='#ced4da'; ctx.lineWidth=1.5; ctx.setLineDash([8,7]);
      ctx.beginPath();
      ctx.moveTo(x+size/2,y+4); ctx.lineTo(x+size/2,y+size-4);
      ctx.moveTo(x+4,y+size/2); ctx.lineTo(x+size-4,y+size/2);
      ctx.moveTo(x+6,y+6); ctx.lineTo(x+size-6,y+size-6);
      ctx.moveTo(x+size-6,y+6); ctx.lineTo(x+6,y+size-6);
      ctx.stroke(); ctx.setLineDash([]);
      if(this.guide){
        ctx.fillStyle='rgba(150,150,160,0.42)';
        ctx.font='700 '+Math.floor(size*0.7)+'px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(this.text[i], x+size/2, y+size/2+3);
      }
    }
  },
  updateText:function(){
    if(this.mode==='char'){ this.text=this.ch.c; }
    else {
      var w=null;
      for(var i=0;i<this.ch.w.length;i++){ if(this.ch.w[i].length===2){ w=this.ch.w[i]; break; } }
      this.text=w||this.ch.w[0].slice(0,2);
    }
    this.wrote=false;
    this.drawGrid();
  },
  next:function(){
    if(this.qi>=this.qs.length){ this.win(); return; }
    this.ch=this.qs[this.qi];
    el('write-q').textContent=(this.qi+1)+'/'+this.qs.length;
    el('write-progress').style.width=(this.qi/this.qs.length*100)+'%';
    el('write-char').textContent=this.ch.c;
    el('write-py').textContent=this.ch.py;
    el('write-words').textContent=this.ch.w.join(' · ');
    this.updateText();
    this.speakChar();
  },
  speakChar:function(){
    speak(this.ch.c+'。'+this.ch.w.join('，'));
  },
  clear:function(){ SFX.click(); this.wrote=false; this.drawGrid(); },
  done:function(){
    var self=this;
    SFX.correct();
    var r=this.cv.getBoundingClientRect();
    particles(r.left+r.width/2, r.top+60, 22);
    floatScore(r.left+r.width/2, r.top+80, '⭐ 写得好！');
    setTimeout(function(){ self.qi++; self.next(); }, 650);
  },
  win:function(){
    finishLevel('write',this.idx,3);
    showWin(3,'本关 '+this.qs.length+' 个字词<br>全部书写完成！', levelNav('write',this.idx));
  }
};
el('write-back').addEventListener('click',function(){SFX.click();curMode='write';renderLevels();show('screen-levels');});
el('write-speak').addEventListener('click',function(){SFX.click();Write.speakChar();});
el('write-clear').addEventListener('click',function(){Write.clear();});
el('write-next').addEventListener('click',function(){Write.done();});
el('write-toggle-guide').addEventListener('click',function(){
  Write.guide=!Write.guide;
  el('write-toggle-guide').textContent='描红：'+(Write.guide?'开':'关');
  SFX.click(); Write.drawGrid();
});
el('write-toggle-mode').addEventListener('click',function(){
  Write.mode=(Write.mode==='char')?'word':'char';
  el('write-toggle-mode').textContent=(Write.mode==='char')?'练字':'练词';
  SFX.click(); Write.updateText();
});
document.querySelectorAll('#write-colors .color-dot').forEach(function(d){
  d.addEventListener('click',function(){
    document.querySelectorAll('#write-colors .color-dot').forEach(function(x){x.classList.remove('sel');});
    d.classList.add('sel'); Write.color=d.getAttribute('data-c'); SFX.click();
  });
});

/* ---------- 错字本 ---------- */
function renderMistakes(){
  var list=el('mistake-list'); list.innerHTML='';
  var keys=Object.keys(save.mistakes).sort(function(a,b){return save.mistakes[b]-save.mistakes[a];});
  if(!keys.length){
    list.innerHTML='<div class="mistake-empty">🎉<br>错字本是空的<br>继续保持！</div>';
    return;
  }
  keys.forEach(function(c){
    var ch=findChar(c); if(!ch) return;
    var d=document.createElement('div'); d.className='mistake-card';
    d.innerHTML='<div class="mistake-char">'+c+'</div><div class="mistake-info"><div class="mistake-py">'+ch.py+'</div><div class="mistake-words">'+ch.w.join(' · ')+'</div></div><div class="mistake-count-badge">错 '+save.mistakes[c]+' 次</div>';
    d.addEventListener('click',function(){ SFX.click(); speak(c+'。'+ch.w.join('，')); });
    list.appendChild(d);
  });
}
el('mistakes-back').addEventListener('click',function(){SFX.click();show('screen-home');});
el('mistakes-clear').addEventListener('click',function(){
  if(!confirm('确定清空错字本吗？')) return;
  save.mistakes={}; persist(); refreshHome(); renderMistakes(); SFX.click();
});

/* ---------- 启动 ---------- */
document.addEventListener('touchmove',function(e){e.preventDefault();},{passive:false});
var sanrioRow=document.querySelector('.sanrio-row');
if(sanrioRow) sanrioRow.addEventListener('click',function(){SFX.pop();confetti();});
refreshHome();
show('screen-home');
})();
