/* MWAudio — sound for the Arcade (assets/battle/battle.js) and its hyperspace-jump loader (assets/battle/lightspeed.js).
   Web Audio only, no library. Nothing is fetched until the visitor opens the arcade, and nothing plays before a user gesture
   (the Arcade planet click is that gesture). Sound is ON by default and the choice persists in localStorage['mw_sound'].

   What plays:
     jumpStart() / jumpReveal()  hyperspace enter, loop under the loading screen, exit at the white-out (galaxy view → game only)
     arcadeStart()               hero-select ambience: two muted layers (space-battle bed + hangar interior)
     stage('play')               gameplay ambience, spatialised: its left/right channels are two virtual speakers that stay fixed in the
                                 BATTLE, so orbiting the camera (setYaw) swings the sound field around the listener
     arrive(loc,cls)             a Star Destroyer-style hyperspace exit cue; a handful of the capital/support arrivals get one, staggered
     boom(kind,loc,rebel)        fighter destruction (random from a pool; rebel ships also get an astromech scream 1 time in 10)
     deathStart/Layer/Final      support + capital destruction (see DEATH): a lead-up sequence OR small layers + a big final
     hero*                       the flown ship: engine idle/active crossfade, tap/hold fire, laser hit, collision, destruction
     stop()                      fade everything out (arcade teardown)

   loc = {pan,gain,p:[x,y,z]} from battle.js: p is the source's direction in CAMERA space, so one-shots are HRTF-positioned in 3D
   (left/right, above/below, in front/behind) and long ones are re-aimed every frame with track() as the ship/camera move.

   The clip → role tables (FILES, POOL_FIGHTER, DEATH, HERO, HERO_SHARED) are the review page's assignments (Battle Sound Review);
   change them here only. */
(function(){
'use strict';
var BASE='assets/audio/';
var FILES={
  ambSelA:'amb-select-a', ambSelB:'amb-select-b', ambPlay:'amb-play',
  hsEnter:'hs-enter', hsLoop:'hs-loop', hsExit:'hs-exit', capArrive:'cap-arrive', r2:'r2-scream'
};
/* fighter destruction: one at random; rebel ships also get the astromech scream 1 time in 10 */
var POOL_FIGHTER=['exp-14','exp-15','exp-16','exp-17','exp-18'];
var R2_CHANCE=.1;
/* support / capital destruction. seq = a full lead-up that already contains its finale (the ship's break-up is timed to it);
   fin = the clip needs a short big explosion appended at the break-up; small = quick explosions layered over the hull chain;
   final = single big explosions, used on their own at the break-up when no sequence plays */
var DEATH={
  support:{ seq:[{k:'exp-19'},{k:'exp-21'},{k:'exp-22d'}],
            small:['exp-01','exp-03','exp-07b','exp-08','exp-22b'], final:['exp-02','exp-06','exp-07a','exp-12'] },
  capital:{ seq:[{k:'cap-going-down'},{k:'exp-23'},{k:'exp-idris',fin:true}],
            small:['exp-01','exp-03','exp-22b'], final:['exp-02','exp-04','exp-05'] }
};
var SEQ_TAIL=1.1;      // seconds of a sequence clip left to ring out after the ship breaks apart (and the big final lands) — tune by ear
var SEQ_CHANCE=.6;     // otherwise: small layers + a final
/* the flown ship. Only the Millennium Falcon has its own clips so far; ships not listed here are silent for engine / fire. */
var HERO={
  /* idle/active = engine loops (idle may be missing: that ship is silent when still). fire1 = tap sounds. fireN = hold bursts; ships
     without one set chain:[...] instead, and every bolt fired while held plays one of those clips (short, rapid) to fake a burst. */
  'mil-falcon':{ idle:'falcon-idle', active:'falcon-active',
    fire1:['falcon-fire-single-01','falcon-fire-single-02','falcon-fire-double-01','falcon-fire-double-02','falcon-fire-burst'],
    fireN:['falcon-turret-01','falcon-turret-02','falcon-turret-03','falcon-turret-05','falcon-turret-07','falcon-turret-08'] },
  'n1':{ idle:'n1-idle', active:'n1-active',
    fire1:['n1-fire-1','n1-fire-2','n1-fire-3'], chain:['n1-fire-1','n1-fire-2','n1-fire-3'] },
  'razorcrest':{ idle:null, active:'razor-active',                              // no idle engine clip yet
    fire1:['razor-fire-1','razor-fire-2','razor-fire-3'], chain:['razor-fire-1'] },   // chain with the true single only
  'slave-1':{ idle:'slave-idle', active:'slave-active',
    fire1:['slave-fire-1','slave-fire-3'], fireN:['slave-fire-dbl'] }
};
var HERO_SHARED={
  hitLaser:['exp-10'],
  collide:['impact-01','impact-02','impact-03','impact-04','impact-05','impact-06','impact-07','impact-08'],
  destroyed:['exp-01','exp-02','exp-03'],
  lowHealth:['lowhealth-chime']
};
var LEVEL={ ambSelA:.5, ambSelB:.34, ambPlay:.7, hsLoop:.55, hsEnter:.8, hsExit:.8, capArrive:.5, r2:.5,
  fighter:.42, seq:.8, small:.4, final:.85, hitLaser:.6, collide:.8, destroyed:.9, lowHealth:.7, chain:.5, idle:.32, selIdle:.2, active:.5, fire1:.55, fireN:.5 };
var SPEAKER_AZ=56*Math.PI/180, SPEAKER_DIST=4;   // virtual speakers: ±56° from the battle's centre line

var ctx=null, master=null, duck=null, comp=null, bufs={}, loading={}, muted=false, started=false, stageName='select', yaw=0;
var amb={sel:null,play:null}, selShip=null, jump=null, voices=0, arriveLeft=0, lastFighter=0, lastLayer=0, wired=false, heroSnd=null;
try{ muted=localStorage.getItem('mw_sound')==='off'; }catch(e){}

function now(){ return ctx?ctx.currentTime:0; }
function ensure(){
  if(!ctx){
    var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false;
    ctx=new AC();
    master=ctx.createGain(); master.gain.value=muted?0:1;
    comp=ctx.createDynamicsCompressor(); comp.threshold.value=-14; comp.knee.value=18; comp.ratio.value=4; comp.attack.value=.004; comp.release.value=.25;   // many explosions at once must not clip
    master.connect(comp); comp.connect(ctx.destination);
    duck=ctx.createGain(); duck.connect(master);   // everything except the big destruction sounds goes through here and is ducked under them
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
/* Duck every other sound under a big destruction sound so it cuts through: quick dip, hold for the clip, slow recovery. */
var DUCK_LEVEL=.22, duckUntil=0;
function duckFor(sec){
  if(!ctx||!duck) return; var t=now(), end=t+sec; if(end<duckUntil-.05&&duck.gain.value<DUCK_LEVEL+.05) return; duckUntil=Math.max(duckUntil,end);
  duck.gain.cancelScheduledValues(t); duck.gain.setTargetAtTime(DUCK_LEVEL,t,.07); duck.gain.setTargetAtTime(1,duckUntil,.5);
}
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
/* shuffle-bag draw: every clip in a list plays once before any repeats, and never the same one twice in a row */
var bags={};
function draw(name,list){
  var b=bags[name];
  if(!b||!b.q.length){
    var q=list.slice(); for(var i=q.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=q[i]; q[i]=q[j]; q[j]=t; }
    if(b&&q.length>1&&q[q.length-1]===b.last){ var t2=q[0]; q[0]=q[q.length-1]; q[q.length-1]=t2; }
    b=bags[name]={q:q,last:b&&b.last};
  }
  var v=b.q.pop(); b.last=v; return v;
}
function rr(a,b){ return a+Math.random()*(b-a); }
function setPannerPos(pn,p,glide){
  var x=num(p[0],0), y=num(p[1],0), z=num(p[2],-4), t=now();
  if(pn.positionX){ if(glide){ pn.positionX.setTargetAtTime(x,t,.05); pn.positionY.setTargetAtTime(y,t,.05); pn.positionZ.setTargetAtTime(z,t,.05); } else { pn.positionX.value=x; pn.positionY.value=y; pn.positionZ.value=z; } }
  else pn.setPosition(x,y,z);
}

/* ── one-shots ── */
function num(v,d){ return (typeof v==='number'&&isFinite(v))?v:d; }
function oneShot(key,o){ try{ return oneShot_(key,o); }catch(e){ if(window.console) console.warn('MWAudio: sound skipped',key,e); return null; } }   // audio must never be able to break the game's frame loop
function oneShot_(key,o){
  o=o||{}; if(!ensure()||muted&&!o.force) return null;
  o.gain=num(o.gain,1); o.rate=num(o.rate,1);
  if(voices>=18) return null;
  var buf=bufs[key]; if(!buf){ load(key); return null; }   // first use just warms the cache
  var s=ctx.createBufferSource(); s.buffer=buf; if(o.rate) s.playbackRate.value=o.rate;
  var g=gainNode(o.gain==null?1:o.gain), tail=g;
  var pn=null;
  if(o.loc&&o.loc.p){ pn=ctx.createPanner(); pn.panningModel='HRTF'; pn.distanceModel='linear'; pn.rolloffFactor=0; pn.coneInnerAngle=360; setPannerPos(pn,o.loc.p,false); g.connect(pn); tail=pn; }   // 3D: direction only, loudness is set by o.gain
  else if(o.loc&&ctx.createStereoPanner){ var p=ctx.createStereoPanner(); p.pan.value=Math.max(-1,Math.min(1,num(o.loc.pan,0))); g.connect(p); tail=p; }
  if(o.lowpass){ var f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=o.lowpass; tail.connect(f); tail=f; }
  s.connect(g); tail.connect(o.dest||duck); voices++;
  var h={src:s,gain:g,panner:pn,dur:buf.duration/(o.rate||1)};
  s.onended=function(){ voices--; if(h.onend) h.onend(); try{ s.disconnect(); tail.disconnect(); g.disconnect(); }catch(e){} };
  var t0=now()+(o.delay||0); s.start(t0);
  if(o.maxDur&&o.maxDur<h.dur){ g.gain.setValueAtTime(g.gain.value,t0+o.maxDur-.08); g.gain.linearRampToValueAtTime(0,t0+o.maxDur); s.stop(t0+o.maxDur+.02); }   // cut a long clip short with a quick fade
  return h;
}

/* ── loops ── */
/* AAC decoders can leave a few ms of digital silence at the end of a clip; a looping source would replay it as a gap.
   Find the last audible sample of every channel and loop up to there. */
function loopEnd(b){
  if(b._loopEnd!=null) return b._loopEnd;
  var n=b.length, keep=0;
  for(var c=0;c<b.numberOfChannels;c++){ var d=b.getChannelData(c), i=n-1; while(i>0&&Math.abs(d[i])<1e-4) i--; if(i+1>keep) keep=i+1; }
  return (b._loopEnd=keep/b.sampleRate);
}
function loopSource(key,dest,gainTo,fadeSec){
  var g=gainNode(0); g.connect(dest);
  var h={g:g,src:null,key:key,dead:false};
  load(key).then(function(b){
    if(!b||h.dead) return;
    var s=ctx.createBufferSource(); s.buffer=b; s.loop=true; s.loopStart=0; s.loopEnd=loopEnd(b); s.connect(g); s.start(now()); h.src=s; fade(g,gainTo,fadeSec);
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
  var bus=gainNode(1); bus.connect(duck);
  amb.sel={ bus:bus, a:loopSource('ambSelA',bus,LEVEL.ambSelA,2.2), b:loopSource('ambSelB',bus,LEVEL.ambSelB,3) };
}
/* gameplay ambience: L and R of the stereo loop become two HRTF-panned virtual speakers anchored in the battle */
function startPlay(){
  stopGroup('play');
  var bus=gainNode(1); bus.connect(duck);
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
  if(which==='sel'&&selShip){ endLoop(selShip.loop,.4); selShip=null; }
  if(which==='sel'){ endLoop(g.a,1.2); endLoop(g.b,1.2); }
  else endLoop(g.h,1.2);
  setTimeout(function(){ try{ g.bus.disconnect(); if(g.inG) g.inG.disconnect(); }catch(e){} },1500);
}

/* ── the flown ship ── */
function stopBurst(h,sec){ if(h.curBurst){ try{ fade(h.curBurst.gain,0,sec); h.curBurst.src.stop(now()+sec+.02); }catch(e){} h.curBurst=null; } }
function heroStop(fadeSec){
  var h=heroSnd; if(!h) return; heroSnd=null; fadeSec=fadeSec||.4;
  if(h.idle) endLoop(h.idle,fadeSec); if(h.active) endLoop(h.active,fadeSec); h.chain=false; stopBurst(h,.1);
  setTimeout(function(){ try{ h.bus.disconnect(); }catch(e){} },fadeSec*1000+200);
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
    load('hsLoop').then(function(){ if(jump&&!jump.loop){ jump.loop=loopSource('hsLoop',duck,LEVEL.hsLoop,1.2); } });
  },
  jumpReveal:function(){
    if(!jump) return; var j=jump; jump=null; endLoop(j.loop,.9); oneShot('hsExit',{gain:LEVEL.hsExit}); if(!amb.sel&&!amb.play&&stageName==='select'&&started) startSelect();
  },
  jumpCancel:function(){ if(!jump) return; var j=jump; jump=null; endLoop(j.loop,.4); },

  /* arcade session */
  arcadeStart:function(){ if(!ensure()) return; arriveLeft=3+Math.round(Math.random()); stageName='select'; yaw=0; if(!jump) startSelect(); },   // under a hyperspace jump the ambience waits for the exit (jumpReveal)
  stage:function(st){
    if(!ctx||st===stageName) return; stageName=st;
    if(st==='play'){ stopGroup('sel'); startPlay(); } else { stopGroup('play'); heroStop(.3); startSelect(); }
  },
  /* hero select: the ship on the carousel idles quietly under the ambience; cycling swaps it. battle.js calls this every frame (cheap: deduped by id). */
  carouselShip:function(id){
    if(!ctx||stageName!=='select'||!id||!amb.sel||(selShip&&selShip.id===id)) return;
    if(selShip) endLoop(selShip.loop,.3);
    var def=HERO[id]; selShip={ id:id, loop:def?loopSource(def.idle,amb.sel.bus,LEVEL.selIdle,.7):null };
  },
  /* camera yaw around the battle in radians (battle.js passes galaxy.rotation.y − its value at entry); only matters in play */
  setYaw:function(r){ if(amb.play){ yaw=r; applyYaw(false); } },
  stop:function(){
    if(!ctx) return; MWAudio.jumpCancel(); heroStop(.3); stopGroup('sel'); stopGroup('play'); stageName='select'; voices=0;
  },

  /* a Star Destroyer-style hyperspace exit for a handful of intro arrivals, staggered and slightly detuned */
  arrive:function(loc,cls){
    if(!ctx||arriveLeft<=0||Math.random()>(cls==='capital'?.75:.35)) return;
    arriveLeft--; oneShot('capArrive',{loc:loc,gain:LEVEL.capArrive*rr(.7,1.1),rate:rr(.9,1.1),delay:Math.random()*.9});
  },

  /* fighter destruction. rebel: the ship was on the rebel side → 1 in 10 also screams. */
  boom:function(kind,loc,rebel){
    if(!ctx||kind!=='fighter'||!loc) return; var g=num(loc.gain,1), t=now();
    if(t-lastFighter<.12) return; lastFighter=t;
    var key=draw('fighter',POOL_FIGHTER); if(!bufs[key]) load(key); else oneShot(key,{loc:loc,gain:LEVEL.fighter*g*rr(.8,1.1),rate:rr(.88,1.14),lowpass:g<.5?3500:0});
    if(rebel&&Math.random()<R2_CHANCE){ if(!bufs.r2) load('r2'); else oneShot('r2',{loc:loc,gain:LEVEL.r2*Math.max(.4,g),rate:rr(.94,1.08),delay:.12}); }
  },

  /* support / capital destruction. deathStart picks the plan and returns how long the ship should take to die (or null: use the default).
     The plan goes back into deathLayer (each hull explosion) and deathFinal (the break-up); plan.h is the lead-up's voice, re-aimed with track().
     Everything is drawn from shuffle bags and detuned/re-timed per ship so no two deaths sound alike. */
  deathStart:function(cls,loc){
    if(!ctx||!loc) return null; var set=DEATH[cls]; if(!set) return null; var g=num(loc.gain,1);
    var plan={cls:cls,seq:null,fin:false,h:null};
    var ready=set.seq.filter(function(c){ return bufs[c.k]; });
    if(ready.length&&Math.random()<rr(.45,.7)){
      var k=draw('seq-'+cls,ready.map(function(c){ return c.k; })), c=ready.filter(function(x){ return x.k===k; })[0], rate=rr(.94,1.07);
      plan.seq=c; plan.fin=!!c.fin; plan.dur=bufs[c.k].duration/rate;
      plan.h=oneShot(c.k,{loc:loc,gain:LEVEL.seq*g,rate:rate,dest:master}); duckFor(plan.dur);
      return {plan:plan, dur:Math.max(3,plan.dur-SEQ_TAIL)};
    }
    set.seq.forEach(function(c){ load(c.k); }); duckFor(cls==='capital'?8:4.5);   // layers + final: duck for the whole hull chain (the ship's default death time)
    return {plan:plan, dur:null};
  },
  track:function(h,loc){ if(h&&h.panner&&loc&&loc.p) setPannerPos(h.panner,loc.p,true); },   // follow a long sound's source
  deathLayer:function(plan,loc){
    if(!ctx||!plan||!loc) return; var t=now(); if(t-lastLayer<.3) return; if(Math.random()>(plan.seq?.35:.7)) return; lastLayer=t;
    var key=draw('small-'+plan.cls,DEATH[plan.cls].small); if(!bufs[key]){ load(key); return; }
    oneShot(key,{loc:loc,gain:LEVEL.small*num(loc.gain,1)*rr(.55,1.2),rate:rr(.78,1.3),delay:Math.random()*.15,lowpass:Math.random()<.2?rr(2500,5000):0,dest:master}); duckFor(1.2);
  },
  deathFinal:function(plan,cls,loc){
    if(!ctx||!loc) return; var g=num(loc.gain,1), set=DEATH[cls], longest=0, key=draw('final-'+cls,set.final);   // every support/capital death ends on a big explosion, lead-up sequence or not
    if(!bufs[key]){ load(key); return; }
    var v=oneShot(key,{loc:loc,gain:LEVEL.final*g*rr(.9,1.05),rate:rr(.86,1.14),lowpass:Math.random()<.25?rr(3000,6000):0,dest:master}); if(v) longest=v.dur;
    // a capital breaks up in two blasts a beat apart; a support ship sometimes does; either may rumble on with a deep aftershock
    if(cls==='capital'||Math.random()<.35){
      var k2=draw('final2-'+cls,set.final.filter(function(x){ return x!==key; }));
      if(bufs[k2]){ var v2=oneShot(k2,{loc:loc,gain:LEVEL.final*(cls==='capital'?.75:.6)*g,rate:rr(.85,1.12),delay:rr(.08,.34),dest:master}); if(v2) longest=Math.max(longest,v2.dur+.3); }
    }
    if(Math.random()<.3){ var k3=draw('small-'+cls,set.small); if(bufs[k3]) oneShot(k3,{loc:loc,gain:LEVEL.small*g*.9,rate:rr(.68,.88),delay:rr(.35,.75),dest:master}); }
    duckFor(longest||3);
  },

  /* the flown ship. id = model id ('mil-falcon'…). Ships without clips in HERO stay silent for engine / fire. */
  heroStart:function(id){
    if(!ensure()) return; heroStop(.1); var def=HERO[id]; if(!def) return;
    var bus=gainNode(1); bus.connect(duck);
    heroSnd={ id:id, def:def, bus:bus, idle:def.idle?loopSource(def.idle,bus,LEVEL.idle,1.2):null, active:def.active?loopSource(def.active,bus,0,1.2):null, k:0, held:0, chain:false, curBurst:null, lastShot:-9, lowDone:false };
    preload(def.fire1.concat(def.fireN||[]).concat(def.chain||[]));
    ['hitLaser','collide','destroyed','lowHealth'].forEach(function(k){ preload(HERO_SHARED[k]); });
  },
  heroStop:function(){ heroStop(.4); },
  /* thrust 0..1 (from the ship's speed): crossfades idle → active, equal power */
  heroEngine:function(k){
    var h=heroSnd; if(!h) return; k=Math.max(0,Math.min(1,num(k,0))); if(Math.abs(k-h.k)<.01) return; h.k=k;
    var t=now(), a=Math.sin(k*Math.PI/2), i=Math.cos(k*Math.PI/2);
    if(h.idle) h.idle.g.gain.setTargetAtTime(LEVEL.idle*i,t,.18); if(h.active) h.active.g.gain.setTargetAtTime(LEVEL.active*(h.idle?a:Math.max(a,.0)),t,.18);
  },
  /* fire. Ships with a fireN set: a tap plays one fire1 clip, holding (>0.4 s) chains fireN bursts until release.
     Ships with chain clips instead: heroShot() is called for every bolt the ship fires — an isolated shot plays a full fire1 clip, and
     shots in quick succession play short (~0.5 s) chain clips, so holding fire sounds like a burst of singles. */
  heroFireDown:function(){
    var h=heroSnd; if(!h) return; h.held=now(); h.chain=true;
    if(!h.def.chain) oneShot(pick(h.def.fire1),{gain:LEVEL.fire1,rate:.97+Math.random()*.06});
  },
  heroFireHeld:function(){
    var h=heroSnd; if(!h||!h.chain||!h.def.fireN||now()-h.held<.4||h.curBurst) return;
    var key=pick(h.def.fireN); if(!bufs[key]){ load(key); return; }
    var v=oneShot(key,{gain:LEVEL.fireN}); if(!v) return; h.curBurst=v; v.onend=function(){ if(h.curBurst===v) h.curBurst=null; };
  },
  heroShot:function(){
    var h=heroSnd; if(!h||!h.def.chain) return; var t=now(), gap=t-h.lastShot; h.lastShot=t;
    if(gap>.6) oneShot(draw('shot1-'+h.id,h.def.fire1),{gain:LEVEL.fire1,rate:rr(.97,1.04)});
    else oneShot(draw('chain-'+h.id,h.def.chain),{gain:LEVEL.chain,rate:rr(.94,1.08),maxDur:.5});
  },
  heroFireUp:function(){ var h=heroSnd; if(!h) return; h.chain=false; stopBurst(h,.14); },
  /* low hull: the chime plays once per life, the first time the hero drops to its last hit point */
  heroLowHealth:function(){ var h=heroSnd; if(!h||h.lowDone) return; h.lowDone=true; oneShot(pick(HERO_SHARED.lowHealth),{gain:LEVEL.lowHealth}); },
  heroHitLaser:function(){ oneShot(pick(HERO_SHARED.hitLaser),{gain:LEVEL.hitLaser,rate:.94+Math.random()*.12}); },
  heroCollide:function(){ oneShot(pick(HERO_SHARED.collide),{gain:LEVEL.collide,rate:.96+Math.random()*.08}); },
  heroDestroyed:function(){ heroStop(.15); oneShot(pick(HERO_SHARED.destroyed),{gain:LEVEL.destroyed}); },

  /* fetch the destruction clips in the background once the arcade is open */
  warm:function(){
    if(!ensure()) return;
    preload(POOL_FIGHTER); preload(['r2']);
    Object.keys(DEATH).forEach(function(c){ var d=DEATH[c]; d.seq.forEach(function(x){ load(x.k); }); preload(d.small); preload(d.final); });
  },
  _loopEnd:function(key){ var b=bufs[key]; return b?{end:loopEnd(b),dur:b.duration}:null; },
  _state:function(){ return {duck:duck?+duck.gain.value.toFixed(2):null, ctx:ctx&&ctx.state, muted:muted, stage:stageName, yaw:yaw, loaded:Object.keys(bufs).length, voices:voices, play:!!amb.play, sel:!!amb.sel, selShip:selShip&&selShip.id, jump:!!jump, hero:heroSnd?{id:heroSnd.id,k:+heroSnd.k.toFixed(2),burst:!!heroSnd.curBurst,low:heroSnd.lowDone}:null, spk:amb.play?[amb.play.pl.node.positionX.value,amb.play.pl.node.positionZ.value,amb.play.pr.node.positionX.value,amb.play.pr.node.positionZ.value].map(function(v){return Math.round(v*100)/100;}):null}; },
  _bufs:function(){ return Object.keys(bufs); },
  _analyser:function(){ if(!ctx) return null; var a=ctx.createAnalyser(); a.fftSize=1024; comp.connect(a); return a; }
};

/* the first real gesture anywhere unlocks audio (browsers keep the context suspended until then) */
function gesture(){ if(wired) return; wired=true; window.removeEventListener('pointerdown',gesture,true); window.removeEventListener('keydown',gesture,true); if(window.__mwArcade||MWAudio._want) MWAudio.unlock(); }
window.addEventListener('pointerdown',gesture,true); window.addEventListener('keydown',gesture,true);
document.addEventListener('visibilitychange',function(){ if(!ctx) return; if(document.hidden) ctx.suspend(); else if(window.__mwArcade) ctx.resume(); });
window.MWAudio=MWAudio;
})();
