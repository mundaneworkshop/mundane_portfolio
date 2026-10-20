/* MWAudio — sound for the Arcade (assets/battle/battle.js) and its hyperspace-jump loader (assets/battle/lightspeed.js).
   Web Audio only, no library. Nothing is fetched until the visitor opens the arcade, and nothing plays before a user gesture
   (the Arcade planet click is that gesture). Sound is ON by default and the choice persists in localStorage['mw_sound'].

   What plays:
     jumpStart() / jumpReveal()  hyperspace enter, loop under the loading screen, exit at the white-out (galaxy view → game only)
     arcadeStart()               hero-select ambience: two muted layers (space-battle bed + hangar interior)
     stage('play')               gameplay ambience, spatialised: its left/right channels are two virtual speakers that stay fixed in the
                                 BATTLE, so orbiting the camera (setYaw) swings the sound field around the listener
     arrive(pan)                 a Star Destroyer-style hyperspace exit cue; a handful of the capital/support arrivals get one, staggered
     boom(kind,pan,gain)         destruction one-shots, picked at random from a pool per kind: 'fighter' | 'support' | 'capital'
     stop()                      fade everything out (arcade teardown)

   The clip → role mapping lives in FILES / POOLS below. The boom pools are placeholders chosen by clip length (short = fighter,
   long = capital) until each clip has been auditioned: reassign here, nowhere else. */
(function(){
'use strict';
var BASE='assets/audio/';
var FILES={
  ambSelA:'amb-select-a', ambSelB:'amb-select-b', ambPlay:'amb-play',
  hsEnter:'hs-enter', hsLoop:'hs-loop', hsExit:'hs-exit', capArrive:'cap-arrive', capGoingDown:'cap-going-down'
};
var POOLS={
  fighter:['boom-fighter-1','boom-fighter-2','boom-fighter-3','boom-fighter-4','boom-fighter-5','boom-fighter-6','boom-fighter-7','boom-fighter-8'],
  support:['boom-support-1','boom-support-2','boom-support-3','boom-support-4','boom-support-5','boom-support-6','boom-support-7'],
  capital:['boom-capital-1','boom-capital-2','boom-capital-3','boom-capital-4','boom-capital-5','boom-capital-6']
};
var LEVEL={ ambSelA:.5, ambSelB:.34, ambPlay:.7, hsLoop:.55, hsEnter:.8, hsExit:.8, capArrive:.5, capGoingDown:.8, fighter:.42, support:.62, capital:.85 };
var SPEAKER_AZ=56*Math.PI/180, SPEAKER_DIST=4;   // virtual speakers: ±56° from the battle's centre line

var ctx=null, master=null, comp=null, bufs={}, loading={}, muted=false, started=false, stageName='select', yaw=0, yawS=0;
var amb={sel:null,play:null}, jump=null, voices=0, arriveLeft=0, lastFighter=0, wired=false;
try{ muted=localStorage.getItem('mw_sound')==='off'; }catch(e){}

function now(){ return ctx?ctx.currentTime:0; }
function ensure(){
  if(!ctx){
    var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false;
    ctx=new AC();
    master=ctx.createGain(); master.gain.value=muted?0:1;
    comp=ctx.createDynamicsCompressor(); comp.threshold.value=-14; comp.knee.value=18; comp.ratio.value=4; comp.attack.value=.004; comp.release.value=.25;   // many explosions at once must not clip
    master.connect(comp); comp.connect(ctx.destination);
  }
  if(ctx.state==='suspended'){ var p=ctx.resume(); if(p&&p.catch) p.catch(function(){}); }
  return true;
}
function load(key){
  if(bufs[key]) return Promise.resolve(bufs[key]);
  if(loading[key]) return loading[key];
  var name=FILES[key]||key;
  loading[key]=fetch(BASE+name+'.m4a').then(function(r){ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(function(ab){ return new Promise(function(res,rej){ ctx.decodeAudioData(ab,res,rej); }); })
    .then(function(b){ bufs[key]=b; return b; })
    .catch(function(e){ if(window.console) console.warn('MWAudio: could not load',name,e); loading[key]=null; return null; });
  return loading[key];
}
function preload(keys){ keys.forEach(function(k){ load(k); }); }
function gainNode(v){ var g=ctx.createGain(); g.gain.value=v; return g; }
function fade(g,to,sec){ var t=now(); g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value,t); g.gain.linearRampToValueAtTime(to,t+Math.max(.02,sec)); }

/* ── one-shots ── */
function oneShot(key,o){
  o=o||{}; if(!ensure()||muted&&!o.force) return null;
  if(voices>=14) return null;
  var buf=bufs[key]; if(!buf){ load(key); return null; }   // first use just warms the cache
  var s=ctx.createBufferSource(); s.buffer=buf; if(o.rate) s.playbackRate.value=o.rate;
  var g=gainNode(o.gain==null?1:o.gain), tail=g;
  if(o.pan!=null&&ctx.createStereoPanner){ var p=ctx.createStereoPanner(); p.pan.value=Math.max(-1,Math.min(1,o.pan)); g.connect(p); tail=p; }
  if(o.lowpass){ var f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=o.lowpass; tail.connect(f); tail=f; }
  s.connect(g); tail.connect(o.dest||master); voices++;
  s.onended=function(){ voices--; try{ s.disconnect(); tail.disconnect(); g.disconnect(); }catch(e){} };
  s.start(now()+(o.delay||0)); return {src:s,gain:g};
}
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }

/* ── loops ── */
function loopSource(key,dest,gainTo,fadeSec){
  var g=gainNode(0); g.connect(dest);
  var h={g:g,src:null,key:key,dead:false};
  load(key).then(function(b){
    if(!b||h.dead) return;
    var s=ctx.createBufferSource(); s.buffer=b; s.loop=true; s.connect(g); s.start(now()); h.src=s; fade(g,gainTo,fadeSec);
  });
  return h;
}
function endLoop(h,sec){
  if(!h) return; h.dead=true; fade(h.g,0,sec);
  setTimeout(function(){ try{ if(h.src){ h.src.stop(); h.src.disconnect(); } h.g.disconnect(); }catch(e){} },sec*1000+80);
}

/* hero-select ambience: two muted layers, plain stereo */
function startSelect(){
  stopGroup('sel');
  var bus=gainNode(1); bus.connect(master);
  amb.sel={ bus:bus, a:loopSource('ambSelA',bus,LEVEL.ambSelA,2.2), b:loopSource('ambSelB',bus,LEVEL.ambSelB,3) };
}
/* gameplay ambience: L and R of the stereo loop become two HRTF-panned virtual speakers anchored in the battle */
function startPlay(){
  stopGroup('play');
  var bus=gainNode(1); bus.connect(master);
  var inG=gainNode(1), split=ctx.createChannelSplitter(2), pl=makePanner(-SPEAKER_AZ), pr=makePanner(SPEAKER_AZ);
  split.connect(pl.node,0); split.connect(pr.node,1); pl.node.connect(bus); pr.node.connect(bus); inG.connect(split);
  var h=loopSource('ambPlay',inG,LEVEL.ambPlay,2.5);
  amb.play={ bus:bus, h:h, inG:inG, pl:pl, pr:pr };
  applyYaw(true);
}
function makePanner(az){
  var n=ctx.createPanner(); n.panningModel='HRTF'; n.distanceModel='inverse'; n.refDistance=SPEAKER_DIST; n.rolloffFactor=0; n.coneInnerAngle=360;
  return {node:n,az:az};
}
function placePanner(p,yawRad,instant){
  var a=p.az-yawRad, x=SPEAKER_DIST*Math.sin(a), z=-SPEAKER_DIST*Math.cos(a), n=p.node, t=now();
  if(n.positionX){ if(instant){ n.positionX.value=x; n.positionY.value=0; n.positionZ.value=z; } else { n.positionX.setTargetAtTime(x,t,.05); n.positionZ.setTargetAtTime(z,t,.05); } }
  else n.setPosition(x,0,z);
}
function applyYaw(instant){
  var g=amb.play; if(!g) return;
  placePanner(g.pl,yaw,instant); placePanner(g.pr,yaw,instant);
}
function stopGroup(which){
  var g=amb[which]; if(!g) return; amb[which]=null;
  if(which==='sel'){ endLoop(g.a,1.2); endLoop(g.b,1.2); }
  else endLoop(g.h,1.2);
  setTimeout(function(){ try{ g.bus.disconnect(); if(g.inG) g.inG.disconnect(); }catch(e){} },1500);
}

var MWAudio={
  /* call from any user gesture; safe to call repeatedly */
  unlock:function(){ if(!ensure()) return; started=true; preload(['ambSelA','ambSelB','ambPlay','hsEnter','hsLoop','hsExit','capArrive']); },
  isMuted:function(){ return muted; },
  setMuted:function(m){
    muted=!!m; try{ localStorage.setItem('mw_sound',muted?'off':'on'); }catch(e){}
    if(master){ var t=now(); master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(muted?0:1,t,.06); }
    try{ window.dispatchEvent(new CustomEvent('mw:sound',{detail:{muted:muted}})); }catch(e){}
  },
  toggle:function(){ MWAudio.setMuted(!muted); return muted; },

  /* hyperspace jump (galaxy view → game) */
  jumpStart:function(){
    if(!ensure()) return; MWAudio.unlock(); jump={ loop:null };
    ['hsEnter','hsLoop','hsExit'].forEach(load);
    load('hsEnter').then(function(){ if(jump) oneShot('hsEnter',{gain:LEVEL.hsEnter}); });
    load('hsLoop').then(function(){ if(jump&&!jump.loop){ jump.loop=loopSource('hsLoop',master,LEVEL.hsLoop,1.2); } });
  },
  jumpReveal:function(){
    if(!jump) return; var j=jump; jump=null; endLoop(j.loop,.9); oneShot('hsExit',{gain:LEVEL.hsExit}); if(!amb.sel&&!amb.play&&stageName==='select'&&started) startSelect();
  },
  jumpCancel:function(){ if(!jump) return; var j=jump; jump=null; endLoop(j.loop,.4); },

  /* arcade session */
  arcadeStart:function(){ if(!ensure()) return; arriveLeft=3+Math.round(Math.random()); stageName='select'; yaw=0; if(!jump) startSelect(); },   // under a hyperspace jump the ambience waits for the exit (jumpReveal)
  stage:function(st){
    if(!ctx||st===stageName) return; stageName=st;
    if(st==='play'){ stopGroup('sel'); startPlay(); } else { stopGroup('play'); startSelect(); }
  },
  /* camera yaw around the battle in radians (battle.js passes galaxy.rotation.y − its value at entry); only matters in play */
  setYaw:function(r){ if(amb.play){ yaw=r; applyYaw(false); } },
  stop:function(){
    if(!ctx) return; MWAudio.jumpCancel(); stopGroup('sel'); stopGroup('play'); stageName='select'; voices=0;
  },

  /* a Star Destroyer-style hyperspace exit for a handful of intro arrivals, staggered and slightly detuned */
  arrive:function(pan,cls){
    if(!ctx||arriveLeft<=0||Math.random()>(cls==='capital'?.75:.35)) return;
    arriveLeft--; oneShot('capArrive',{pan:pan,gain:LEVEL.capArrive*(.7+Math.random()*.4),rate:.92+Math.random()*.16,delay:Math.random()*.9});
  },
  /* destruction. kind: 'fighter' | 'support' | 'capital' | 'capital-start'; pan -1..1 from the ship's screen x; gain 0..1 from its distance */
  boom:function(kind,pan,gain){
    if(!ctx) return; var g=(gain==null?1:gain);
    if(kind==='capital-start'){ return oneShot('capGoingDown',{pan:pan,gain:LEVEL.capGoingDown*g}); }
    var pool=POOLS[kind]; if(!pool) return;
    if(kind==='fighter'){ var t=now(); if(t-lastFighter<.12) return; lastFighter=t; }
    var key=pick(pool); if(!bufs[key]){ load(key); return; }
    oneShot(key,{pan:pan,gain:LEVEL[kind]*g,rate:.94+Math.random()*.12,lowpass:g<.5?3500:0});
  },
  /* fetch the destruction pools in the background once the arcade is open */
  warm:function(){ if(!ensure()) return; Object.keys(POOLS).forEach(function(k){ preload(POOLS[k]); }); load('capGoingDown'); },
  _state:function(){ return {ctx:ctx&&ctx.state, muted:muted, stage:stageName, yaw:yaw, loaded:Object.keys(bufs).length, voices:voices, play:!!amb.play, sel:!!amb.sel, jump:!!jump, spk:amb.play?[amb.play.pl.node.positionX.value,amb.play.pl.node.positionZ.value,amb.play.pr.node.positionX.value,amb.play.pr.node.positionZ.value].map(function(v){return Math.round(v*100)/100;}):null}; },
  _analyser:function(){ if(!ctx) return null; var a=ctx.createAnalyser(); a.fftSize=1024; comp.connect(a); return a; }
};

/* the first real gesture anywhere unlocks audio (browsers keep the context suspended until then) */
function gesture(){ if(wired) return; wired=true; window.removeEventListener('pointerdown',gesture,true); window.removeEventListener('keydown',gesture,true); if(window.__mwArcade||MWAudio._want) MWAudio.unlock(); }
window.addEventListener('pointerdown',gesture,true); window.addEventListener('keydown',gesture,true);
document.addEventListener('visibilitychange',function(){ if(!ctx) return; if(document.hidden) ctx.suspend(); else if(window.__mwArcade) ctx.resume(); });
window.MWAudio=MWAudio;
})();
