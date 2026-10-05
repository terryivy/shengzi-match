/* 生字消消乐 - 三年级上册人教版 */
(function(){
"use strict";
var CHARS = (typeof CHARS_3A !== 'undefined') ? CHARS_3A : [];
var PER_LEVEL = 10;
var LEVELS = [];
for (var i = 0; i < CHARS.length; i += PER_LEVEL) LEVELS.push(CHARS.slice(i, i + PER_LEVEL));

/* ---------- 存档 ---------- */
var SAVE_KEY = 'shengzi_save_v1';
var save = { stars: {match:{}, pinyin:{}, dictation:{}}, unlocked: {match:0, pinyin:0, dictation:0}, mistakes: {} };
try {
  var s = localStorage.getItem(SAVE_KEY);
  if (s) { var p = JSON.parse(s); for (var k in p) save[k] = p[k]; }
} catch(e){}
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
var SFX = {
  click: function(){ var t=now(); tone(600,t,0.08,'triangle',0.2); },
  select: function(){ var t=now(); tone(520,t,0.09,'triangle',0.22); tone(780,t+0.07,0.1,'triangle',0.18); },
  correct: function(){ var t=now(); [523,659,784].forEach(function(f,i){ tone(f,t+i*0.09,0.16,'triangle',0.25); }); },
  wrong: function(){ var t=now(); tone(220,t,0.2,'sawtooth',0.12); tone(160,t+0.12,0.25,'sawtooth',0.12); },
  combo: function(n){ var t=now(); var base=500+Math.min(n,10)*60; [0,1,2].forEach(function(i){ tone(base*(1+i*0.25),t+i*0.06,0.12,'square',0.12); }); },
  hint: function(){ var t=now(); [880,1174,1568].forEach(function(f,i){ tone(f,t+i*0.07,0.14,'sine',0.15); }); },
  win: function(){ var t=now(); [523,659,784,1047,784,1047].forEach(function(f,i){ tone(f,t+i*0.12,0.2,'triangle',0.25); }); },
  star: function(i){ var t=now(); tone(900+i*250,t,0.25,'sine',0.25); tone((900+i*250)*1.5,t+0.08,0.2,'sine',0.15); },
  pop: function(){ var t=now(); tone(300,t,0.06,'square',0.15); tone(900,t+0.05,0.12,'sine',0.2); }
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
var screens=['screen-home','screen-levels','screen-match','screen-pinyin','screen-dictation','screen-mistakes'];
function show(id){ screens.forEach(function(s){document.getElementById(s).classList.toggle('active',s===id);}); }
function el(id){ return document.getElementById(id); }
function shuffle(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;} return a; }
function centerOf(e){ var r=e.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; }

function refreshHome(){
  el('total-chars').textContent = CHARS.length;
  var n = Object.keys(save.mistakes).length;
  el('mistake-count').textContent = n;
}

/* ---------- 关卡选择 ---------- */
var curMode=null;
var MODE_NAMES={match:'配对消消乐',pinyin:'看拼音选字',dictation:'听写闯关'};
document.querySelectorAll('.mode-card').forEach(function(btn){
  btn.addEventListener('click',function(){
    SFX.click();
    var m=btn.getAttribute('data-mode');
    if(m==='mistakes'){ renderMistakes(); show('screen-mistakes'); return; }
    curMode=m; renderLevels(); show('screen-levels');
  });
});
el('levels-back').addEventListener('click',function(){SFX.click();show('screen-home');});
function renderLevels(){
  el('levels-title').textContent = MODE_NAMES[curMode];
  var g=el('level-grid'); g.innerHTML='';
  LEVELS.forEach(function(lv,idx){
    var b=document.createElement('button');
    var locked = idx > save.unlocked[curMode];
    b.className='level-btn'+(locked?' locked':'');
    var st = save.stars[curMode][idx]||0;
    var stars = st? '★'.repeat(st)+'☆'.repeat(3-st) : '☆☆☆';
    b.innerHTML='<span>第 '+(idx+1)+' 关</span><span class="stars" style="color:#ffa94d">'+stars+'</span><span style="font-size:12px;color:#8a6f5c;font-weight:400">'+lv.length+'字</span>';
    if(!locked) b.addEventListener('click',function(){SFX.click();startLevel(curMode,idx);});
    g.appendChild(b);
  });
}
function startLevel(mode,idx){
  if(mode==='match') Match.start(idx);
  else if(mode==='pinyin') PinyinQ.start(idx);
  else if(mode==='dictation') Dict.start(idx);
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
    this.idx=idx; this.chars=LEVELS[idx]; this.score=0; this.combo=0; this.hints=3;
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
    this.idx=idx; this.qs=shuffle(LEVELS[idx].slice()); this.qi=0; this.score=0; this.correctCount=0;
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
    var chars=LEVELS[idx];
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
el('home-mascot').addEventListener('click',function(){SFX.pop();confetti();});
refreshHome();
show('screen-home');
})();
