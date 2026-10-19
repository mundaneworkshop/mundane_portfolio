/* ──────────────────────────────────────────────────────────────────────────────────────────────
   MWBattle — entry-gate space battle (Imperials left, Rebel Alliance right) fought around the MW
   monogram. Lives in the SAME three.js scene as the monogram, so the page's pixelize + posterize
   pass applies to it for free.

   Wiring (index.html, inside bootHolotable) — this is the ARCADE mode of the galaxy map:
     MWBattle.init(ctx)      when the Arcade planet is opened (re-entrant: init → hyperspace/dispose → init …)
     MWBattle.update(t)      every frame, before the scene renders (t = clock elapsed seconds)
     MWBattle.hyperspace()   on exit (button / ESC) — battle stops, every ship jumps off page, then disposes + ctx.onDone()
     MWBattle.dispose()      immediate teardown

   Zones (distance from the monogram):
     1  fighters          swarm the monogram — randomised pursue / evade / wander dogfights
     2  support ships     mid-field, slow patrol around an anchor
     3  capital ships     far left / right edges; the Death Star is a single far-back base station
   Hero ships are user-piloted (mouse aims, WASD thrust/strafe, Space/click fires). Minikits spawn
   anywhere, can be clicked or shot by a hero, and unlock a reward (hook: MWBattle.onUnlock / the
   'mw:minikit' window event — reward itself is TBD).

   Nose axis: every model is authored nose-+Z (glTF forward) except where MODELS[].rot says otherwise.
   Use tools/battle-orient.html to re-check a model.
   ────────────────────────────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

var BASE='assets/battle/models/';
var IMP=0, REB=1, HERO=2;
var LS_KEY='mw_battle_cfg';

// id, file, team, cls, size (max bbox dimension in world units @ scale 1), n (default count @ density 1),
// turn/spd/fire = per-type agility / speed / fire-rate multipliers, rot = [x,y,z] pre-rotation (radians) to point the nose at +Z
var MODELS=[
  // zone 1 — fighters
  {id:'a-wing',            file:'nano-awing',                  team:REB, cls:'fighter', size:.30, n:3, bright:.75},
  {id:'b-wing',            file:'nano-bwing',                  team:REB, cls:'fighter', size:.38, n:2, bright:1.35, turn:.8},
  {id:'x-wing',            file:'nano-xwing',                  team:REB, cls:'fighter', size:.33, n:3, bright:.75},
  {id:'y-wing',            file:'nano-ywing',                  team:REB, cls:'fighter', size:.38, n:2, bright:.8, turn:.75, spd:.85},
  {id:'u-wing',            file:'nano-uwing',                  team:REB, cls:'fighter', size:.35, n:2, bright:.75, turn:.7,  spd:.85},
  {id:'tie-interceptor',   file:'nano-tie-interceptor',        team:IMP, cls:'fighter', size:.30, n:3, lift:1, turn:1.3, spd:1.25},
  {id:'tie-fighter',       file:'nano-tie-fighter',            team:IMP, cls:'fighter', size:.28, n:3, lift:1},
  {id:'tie-defender',      file:'nano-tie-defender',           team:IMP, cls:'fighter', size:.35, n:2, lift:1, turn:.9,  spd:1.1, fire:1.3},
  {id:'tie-dagger',        file:'nano-tie-dagger',             team:IMP, cls:'fighter', size:.28, n:3, lift:1},
  {id:'lambda-shuttle',    file:'nano-lambda-shuttle',         team:IMP, cls:'fighter', size:.40, n:1, bright:.75, turn:.45, spd:.6,  fire:.5},
  // zone 2 — support
  {id:'blockade-runner',   file:'nano-blockade-runner',        team:REB, cls:'support', size:1.25, n:6},
  {id:'nebulon-b',         file:'nano-nebulon-b',              team:REB, cls:'support', size:1.4, n:6},
  {id:'acclamator',        file:'nano-acclamator',             team:IMP, cls:'support', size:1.5, n:6},
  {id:'imperial-light-cruiser', file:'nano-imperial-light-cruiser', team:IMP, cls:'support', size:1.25, n:6},
  // zone 3 — capital + base
  {id:'mc80',              file:'nano-mc80',                   team:REB, cls:'capital', size:2.7, n:4},
  {id:'mc80a',             file:'nano-mc80a',                  team:REB, cls:'capital', size:2.7, n:2},
  {id:'mc85',              file:'nano-mc85',                   team:REB, cls:'capital', size:3.0, n:2},
  {id:'star-destroyer',    file:'nano-star-destroyer',         team:IMP, cls:'capital', size:2.9, n:10},
  {id:'death-star',        file:'nano-death-star',             team:IMP, cls:'base',    size:2.8, n:1, max:1},
  // heroes (user-spawned)
  {id:'mil-falcon',        file:'nano-mil-falcon',             team:HERO, cls:'hero',   size:.30, n:0, label:'Millennium Falcon'},
  {id:'n1',                file:'nano-n1',                     team:HERO, cls:'hero',   size:.30, n:0, label:"Mandalorian's N-1", rot:[0,Math.PI,0]},
  {id:'razorcrest',        file:'nano-razorcrest',             team:HERO, cls:'hero',   size:.30, n:0, label:'Razor Crest'},
  {id:'slave-1',           file:'nano-slave-1',                team:HERO, cls:'hero',   size:.30, n:0, label:'Slave I', rot:[Math.PI/2,0,Math.PI], order:'ZYX'},
  // pickup
  {id:'minikit',           file:'minikit',                     team:-1,  cls:'minikit', size:.20, n:0}
];
var BYID={}; MODELS.forEach(function(m){ BYID[m.id]=m; });

var CLS={   // per-class feel: base fire interval (s), weapon range, bolt aim spread (rad), hp (fighters die + respawn)
  fighter:{ int:.65, range:3.6, spread:.05, hp:3 },
  support:{ int:.55, range:16, spread:.10, hp:30 },    // support + capital ships are destructible by the HERO only (AI-vs-AI hits just spark) — Death Star never is
  capital:{ int:.22, range:24, spread:.12, hp:100 },
  hero:   { int:.13, range:99,  spread:.015 }
};

var DEFAULTS={
  on:true, density:1, speed:1, scale:1.5, laser:1, laserSpeed:1, boltSize:1, arena:1,
  scaleFighter:.5, scaleSupport:1, scaleCapital:1, scaleBase:1, scaleHero:1.6, scaleKit:1,
  speedFighter:.5, speedSupport:1, speedCapital:1,
  laserFighter:1, laserSupport:1, laserCapital:1,
  lightFill:.1, lightKey:1.35, lightRim:.25, lightScene:.25, exposure:1, fogK:.25, envInt:.5, rough:.55, sunAz:-35, sunEl:35, matBright:1, matEmissive:1, matFighter:.9, dsDim:.45, clear:1, darkLift:.6,
  kitRate:.3, kitMax:2, deathStar:true, jumpStep:.045,
  counts:{}, ver:9
};
MODELS.forEach(function(m){ if(m.n) DEFAULTS.counts[m.id]=m.n; });

var P=null, ctx=null, T=null, active=false, dead=false;
var G=null, lights=[], clockT=0, lastT=null, hyper=null, glowTex=null, sess=0, S=1, envTex=null, sunW=null;
var LREF=4.3;   // the battle is authored for a camera 4.3 units from its centre; G is scaled by (real distance / 4.3) so it reads the same from any camera
var cache={}, loading={}, loadQ=[], inflight=0;
var ships=[], heroShip=null, kits=[], kitTimer=4, kitCount=0;
var bolts=[], boltFree=[[],[],[]], sparks=null, spN=420, spI=0, flashes=[];
var anchorsDirty=true, reconT=0;
var ptr={x:0,y:0,nx:0,ny:0,in:false,down:0,downX:0,downY:0};
var keys={}, fireHeld=false;
var uiEl=null, hudEl=null, panelEl=null, styleEl=null, listeners=[];
var BOLT_COL=[0x39ff5a /*imp green*/, 0xff2a2a /*reb red*/, 0xffe14a /*hero yellow*/];
var CX=0, CY=0, CZ=0;   // battle centre in G's local frame = the monogram's entry spot (G sits there, oriented to the entry camera: +x right, +y up, +z toward the viewer)
var baseQ=null, _ryQ=null;
var L=4.3;              // entry-camera distance to the centre

var _v1, _v2, _v3, _v4, _ray, _plane, _q, _zero, _up;

/* ───────────────────────────── utils ───────────────────────────── */
function rnd(a,b){ return a+Math.random()*(b-a); }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,k){ return a+(b-a)*k; }
function capName(c){ return c.charAt(0).toUpperCase()+c.slice(1); }
function loadCfg(){
  var o=JSON.parse(JSON.stringify(DEFAULTS));
  try{ var s=JSON.parse(localStorage.getItem(LS_KEY)||'null');
    if(s&&s.ver!==DEFAULTS.ver){ delete s.counts; ['lightFill','lightKey','lightRim','lightScene','matBright','matEmissive','matFighter','darkLift','exposure','envInt','rough','sunAz','sunEl','scale','scaleFighter','speedFighter','fogK','scaleHero','kitRate','dsDim'].forEach(function(k){ delete s[k]; }); }   // defaults changed — drop stale saved values
    if(s){ Object.keys(s).forEach(function(k){ if(k==='counts'){ Object.keys(s.counts||{}).forEach(function(i){ o.counts[i]=s.counts[i]; }); } else if(k in o&&k!=='ver') o[k]=s[k]; }); }
  }catch(e){}
  return o;
}
function saveCfg(){ try{ localStorage.setItem(LS_KEY,JSON.stringify(P)); }catch(e){} }
function on(target,ev,fn,opt){ target.addEventListener(ev,fn,opt); listeners.push([target,ev,fn,opt]); }

// world geometry of the visible battlefield, from the ENTRY camera (so layout is responsive but doesn't chase user orbit/zoom)
function monoR(){ return ctx.monoRadius()/S; }   // clearance radius of the hologram, in battle-local units
function halfH(z){ return Math.tan(ctx.camera.fov*Math.PI/360)*(L-z); }
function halfW(z){ return halfH(z)*Math.max(1.15,ctx.camera.aspect); }
function anchorWorld(u,v,z,out){ return out.set(u*halfW(z), CY+v*halfH(z), z); }

var matList=[], sceneBase=[], DARKLIFT=null, DARKGLOW=null, HAZE=null;
function trackMaterials(obj,mdl){
  obj.traverse(function(o){ if(!o.isMesh) return; (Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){
    if(m.userData.b0) return; m.userData.b0=m.color?m.color.clone():null; m.userData.e0=m.emissiveIntensity!=null?m.emissiveIntensity:1;
    m.userData.r0=m.roughness!=null?m.roughness:1; patchMaterial(m); if(envTex) m.envMap=envTex;
    m.userData.k=mdl.bright||1; m.userData.far=mdl.cls==='base'; m.userData.fighter=mdl.cls==='fighter'; m.userData.dark=false;
    if(mdl.lift&&m.color&&(m.color.r*.3+m.color.g*.59+m.color.b*.11)<.1) m.userData.dark=true;   // TIE panels/frames: near-black plastic vanishes against the void
    matList.push(m); }); });
}
var fogBase=0, camFar=100;
var BTU={ exp:{value:1} };
function patchMaterial(m){   // battle-only filmic curve: highlights roll off instead of clipping, and it does NOT touch the hologram's materials (a global renderer.toneMapping would)
  if(m.userData.btPatched||!m.isMeshStandardMaterial) return; m.userData.btPatched=true;
  m.onBeforeCompile=function(sh){
    sh.uniforms.btExp=BTU.exp;
    sh.fragmentShader='uniform float btExp;\nvec3 btAces(vec3 x){ x*=btExp; return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }\n'+sh.fragmentShader.replace('#include <tonemapping_fragment>','gl_FragColor.rgb=btAces(gl_FragColor.rgb);');
  };
  m.customProgramCacheKey=function(){ return 'btaces1'; };
  m.needsUpdate=true;
}
function sunDir(out){   // sun in WORLD space, fixed in the camera frame at init (so ships turn under it when the galaxy rotates)
  var az=P.sunAz*Math.PI/180, el=P.sunEl*Math.PI/180;
  return out.set(Math.cos(el)*Math.sin(az),Math.sin(el),Math.cos(el)*Math.cos(az)).applyQuaternion(baseQ);
}
function buildEnv(){   // tiny dark-space environment: one hard sun, faint teal fill, a dim cool back-glow — gives metals/plastic something to reflect
  if(!ctx.renderer||!T.PMREMGenerator) return;
  // Built from MeshBasicMaterial meshes (not a raw ShaderMaterial): PMREM renders into an RGBM-encoded target and only built-in materials encode for it.
  var sc=new T.Scene(), sd=sunDir(new T.Vector3()), geo=new T.SphereGeometry(50,32,16), pos=geo.attributes.position, col=new Float32Array(pos.count*3), d=new T.Vector3();
  for(var i=0;i<pos.count;i++){
    d.fromBufferAttribute(pos,i).normalize(); var up=d.y*.5+.5, back=Math.pow(Math.max(-d.dot(sd),0),3), sn=Math.pow(Math.max(d.dot(sd),0),6);   // values stay <1: RGBM-safe
    col[i*3]=.01+.03*up+.05*back+.55*sn; col[i*3+1]=.02+.09*up+.12*back+.52*sn; col[i*3+2]=.025+.1*up+.18*back+.46*sn;
  }
  geo.setAttribute('color',new T.BufferAttribute(col,3));
  var mat=new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,fog:false}); sc.add(new T.Mesh(geo,mat));
  var pm=new T.PMREMGenerator(ctx.renderer), old=envTex, rt=pm.fromScene(sc,0,.1,100);
  envTex=rt.texture; pm.dispose(); geo.dispose(); mat.dispose(); 
  matList.forEach(function(m){ m.envMap=envTex; m.needsUpdate=true; });
  if(old) old.dispose();
}
function applyLook(){
  BTU.exp.value=P.exposure; if(ctx.fog&&fogBase) ctx.fog.density=fogBase*P.fogK;   // scene fog is what made far capital ships fade to black
  if(lights[1]){ sunDir(_v1); lights[1].position.copy(_v1).multiplyScalar(30); lights[2].position.copy(_v1).multiplyScalar(-30); }
  matList.forEach(function(m){ m.envMapIntensity=P.envInt; if(m.roughness!=null) m.roughness=Math.min(1,m.userData.r0*P.rough); });
  matList.forEach(function(m){ var u=m.userData;
    if(u.b0){ if(u.dark) m.color.copy(u.b0).lerp(DARKLIFT,P.darkLift); else m.color.copy(u.b0);
      m.color.multiplyScalar(P.matBright*u.k*(u.fighter?P.matFighter:1));
      if(u.far){ m.color.lerp(HAZE,.28*(1-P.dsDim)).multiplyScalar(P.dsDim); } }   // atmospheric perspective: the Death Star is the farthest thing, so it's dimmed and cooled toward the haze
    if(u.dark&&m.emissive){ m.emissive.copy(DARKGLOW).multiplyScalar(P.darkLift); } if(m.emissiveIntensity!=null) m.emissiveIntensity=m.userData.e0*P.matEmissive*(u.far?P.dsDim:1); });
  if(lights[0]){ lights[0].intensity=P.lightFill; lights[1].intensity=P.lightKey; lights[2].intensity=P.lightRim; }
  sceneBase.forEach(function(b){ b.l.intensity=b.i*P.lightScene; });
}
var _aimM=null;
function aim(obj,dir){   // point obj's +Z along dir (local space) — Object3D.lookAt works in world space, which G's tilt would break
  _aimM.lookAt(dir,_zero,_up); obj.quaternion.setFromRotationMatrix(_aimM);
}

/* ───────────────────────────── loading ───────────────────────────── */
function glowTexture(){
  if(glowTex) return glowTex;
  var c=document.createElement('canvas'); c.width=c.height=64; var g=c.getContext('2d');
  var gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.3,'rgba(215,255,250,.8)'); gr.addColorStop(.65,'rgba(150,235,228,.28)'); gr.addColorStop(1,'rgba(90,191,184,0)');
  g.fillStyle=gr; g.fillRect(0,0,64,64);
  glowTex=new T.CanvasTexture(c); return glowTex;
}
function requestModel(id){
  var m=BYID[id]; if(!m||cache[id]||loading[id]) return;
  loading[id]=true; loadQ.push(m);
}
function pumpLoads(){
  while(inflight<3 && loadQ.length){
    var m=loadQ.shift(); inflight++; var mySess=sess;
    (function(m){
      ctx.createLoader().load(BASE+m.file+'.glb',function(g){
        if(mySess!==sess) return; inflight--; delete loading[m.id]; if(dead) return;
        var obj=g.scene, pre=new T.Group(); pre.add(obj);
        if(m.rot){ if(m.order) pre.rotation.order=m.order; pre.rotation.set(m.rot[0],m.rot[1],m.rot[2]); }
        pre.updateMatrixWorld(true);
        var box=new T.Box3().setFromObject(pre), sz=box.getSize(new T.Vector3()), ctr=box.getCenter(new T.Vector3());
        var s=m.size/Math.max(sz.x,sz.y,sz.z);
        obj.position.sub(ctr.clone().applyQuaternion(pre.quaternion.clone().invert()));   // centre the bbox on the pivot (in pre-rotated space)
        var inner=new T.Group(); inner.add(pre); inner.scale.setScalar(s);
        cache[m.id]={ proto:inner, hx:sz.x*s/2, hy:sz.y*s/2, hz:sz.z*s/2, r:Math.max(sz.x,sz.y,sz.z)*s/2 };
        trackMaterials(inner,m); if(m.cls==='base') inner.traverse(function(o){ if(o.isMesh) [].concat(o.material).forEach(function(mt){ mt.fog=false; }); }); applyLook();
        anchorsDirty=true; reconT=0;
      },undefined,function(e){ if(mySess!==sess) return; inflight--; delete loading[m.id]; console.warn('[battle] failed to load',m.file,e); });
    })(m);
  }
}

/* ───────────────────────────── scene objects ───────────────────────────── */
function wantCount(m){
  if(m.cls==='base') return P.deathStar?1:0;
  if(m.cls==='hero'||m.cls==='minikit') return 0;
  return Math.round((P.counts[m.id]||0)*P.density);
}
function makeShip(m){
  var c=cache[m.id]; var root=new T.Group(), bank=new T.Group(), fx=new T.Group();
  var model=c.proto.clone(true);
  fx.add(model); bank.add(fx); root.add(bank); G.add(root);
  var s={ m:m, id:m.id, team:m.team, cls:m.cls, root:root, bank:bank, fx:fx, c:c, pos:root.position, dir:new T.Vector3(m.team===IMP?1:-1,0,0),
          spd:0, alive:true, hp:(CLS[m.cls]||{}).hp||1, target:null, tT:0, mode:'wander', mT:0, wp:new T.Vector3(), cd:rnd(0,1), ph:rnd(0,6.28), ph2:rnd(0,6.28),
          yawRate:0, bankV:0, respawn:0, jump:null, au:0, av:0, az:0, vel:new T.Vector3(), prev:new T.Vector3(), side:m.team===IMP?-1:1, spawnK:0 };
  s.k=(m.cls==='fighter'||m.cls==='hero')?1:0;
  if(m.cls==='base'){ s.pos.set(0,0,0); }
  ships.push(s); return s;
}
function spawnFighterPos(s,out){
  var ax=arenaAx(), ay=arenaAy(), az=arenaAz();
  return out.set(s.side*rnd(.2,.95)*ax, CY+rnd(-.8,.8)*ay, rnd(-.9,.9)*az);
}
function arenaAx(){ return halfW(0)*1.2*P.arena; }
function arenaAy(){ return halfH(0)*1.2*P.arena; }
function arenaAz(){ return 2.4*P.arena; }

function reconcile(){
  var order={fighter:0,support:1,capital:2,base:3};
  MODELS.slice().sort(function(a,b){ return (order[a.cls]||9)-(order[b.cls]||9); }).forEach(function(m){
    if(m.cls==='hero'||m.cls==='minikit') return;
    var want=wantCount(m); if(want>0&&!cache[m.id]){ requestModel(m.id); return; }
    var mine=ships.filter(function(s){ return s.id===m.id&&!s.leaving; });
    if(mine.length<want&&cache[m.id]){ var s=makeShip(m); initShip(s); anchorsDirty=true; }
    else if(mine.length>want){ var x=mine[mine.length-1]; x.leaving=true; anchorsDirty=true; }
  });
  if(!cache.minikit) requestModel('minikit');
  pumpLoads();
}
function initShip(s){
  if(s.cls==='fighter'){ spawnFighterPos(s,s.pos); s.dir.set(-s.side,rnd(-.3,.3),rnd(-.3,.3)).normalize(); s.spd=1.5; s.mT=rnd(.5,2); s.mode='wander'; pickWp(s); }
  else if(s.cls==='base'){ s.spin=.035; }
  s.spawnK=0;
}
var _ap=null, _bp=null, _cp=null;
function depthCompPos(p){ _cp.set(0,0,L); return Math.pow(Math.max(1,p.distanceTo(_cp)/(L+6)),.8); }   // far ships get a size boost so they don't shrink to specks
function effR(s,p){ return s.c.r*P.scale*P['scale'+capName(s.cls)]*depthCompPos(p); }
function gauss(){ return (Math.random()+Math.random()+Math.random()+Math.random()-2)*1.2; }
// Support/capital ships live in a big SHELL around the hologram — all the way around it, in every direction, not just in front of the
// default camera — so orbiting the camera always finds them. Imperials take the -x half-space, rebels +x. Each new ship tries many spots
// and keeps the one furthest (in ship-radii) from every ship already placed.
function shellPos(s,out){
  var side=s.team===IMP?-1:1, sup=s.cls==='support', best=null, bd=-1;
  if(!_ap){ _ap=new T.Vector3(); _bp=new T.Vector3(); _cp=new T.Vector3(); }
  for(var k=0;k<200;k++){
    var r=sup?rnd(10,26):rnd(14,36);
    _ap.set(gauss()*1.6,gauss()*.7,gauss()); if(_ap.lengthSq()<1e-4) continue; _ap.normalize();
    _ap.x=Math.abs(_ap.x)*side; if(Math.random()<.6&&_ap.z>0) _ap.z=-_ap.z;      // most of them start in the half the default camera faces
    _ap.normalize().multiplyScalar(r);
    var md=1e9, er=effR(s,_ap);
    for(var i=0;i<ships.length;i++){ var o=ships[i]; if(o===s||!o.hasA||!o.alive||o.cls==='base'||o.cls==='fighter'||o.cls==='hero') continue;
      md=Math.min(md,_ap.distanceTo(o.pos)/((effR(o,o.pos)+er)*.5+.6)); }
    if(md>bd){ bd=md; best=_ap.clone(); }
  }
  return out.copy(best||_ap.set(side*r_fallback(),0,-12));
}
function r_fallback(){ return 14; }
// A heading toward the far side of the field whose straight line misses the hologram by a comfortable margin.
function chooseHeading(s,out){
  var sx=s.pos.x>=0?-1:1;
  for(var k=0;k<16;k++){
    _v3.set(sx*rnd(4,34),rnd(-20,20),rnd(-32,32)).sub(s.pos); var len=_v3.length(); if(len<10) continue; _v3.multiplyScalar(1/len);
    var t=-s.pos.dot(_v3); if(t>0){ _v4.copy(s.pos).addScaledVector(_v3,t); if(_v4.length()<16) continue; }
    return out.copy(_v3);
  }
  return out.set(sx,rnd(-.2,.2),rnd(-.5,.5)).normalize();
}
// Fresh ships all point at the enemy fleet: a tight cone around the +/-x axis, nudged just enough to keep clear of the hologram.
// (Later turn-arounds use chooseHeading's wider random aim, so the formations loosen into a melee as the battle drags on.)
function initialHeading(s,out){
  var sx=s.pos.x>=0?-1:1;
  out.set(sx,rnd(-.07,.07),rnd(-.1,.1)).normalize();
  var t=-s.pos.dot(out);
  if(t>0){ _v4.copy(s.pos).addScaledVector(out,t); var m=_v4.length();
    if(m<16){ if(m<1e-3) _v4.set(0,rnd(-1,1),rnd(-1,1)); _v4.x=0; _v4.normalize(); out.addScaledVector(_v4,.3*(1-m/16)+.05).normalize(); } }
  return out;
}
function placeLarge(s){
  shellPos(s,s.pos); s.hasA=true;
  s.hd=initialHeading(s,new T.Vector3()); s.dir.copy(s.hd); s.turn=null; s.R=rnd(36,42);
  s.hp=CLS[s.cls].hp; s.maxhp=s.hp; s.dying=null;
}
function assignAnchors(){
  ships.forEach(function(s){ if((s.cls==='support'||s.cls==='capital')&&!s.leaving&&!s.hasA) placeLarge(s); });
  // Death Star: the FARTHEST object in the battle (beyond the outer edge of the capital ships' shell, so nothing can pass behind it), kept on the
  // same sight-line it used to sit on and scaled up by the distance ratio so it still reads at the same size.
  ships.forEach(function(s){ if(s.cls==='base'&&!s.hasA){
    if(!_ap){ _ap=new T.Vector3(); _bp=new T.Vector3(); _cp=new T.Vector3(); }
    anchorWorld(-.42,.36,-11,_v1); _cp.set(0,0,L); _v2.copy(_v1).sub(_cp); var d0=_v2.length(); _v2.normalize();
    var Dn=80; s.pos.copy(_cp).addScaledVector(_v2,Dn); s.dsK=Dn/d0; s.hasA=true; } });
  anchorsDirty=false;
}

function enemies(s){ return ships.filter(function(e){ return e.alive&&!e.leaving&&e.cls!=='base'&&e.team!==s.team&&e.team!==HERO&&!e.jump; }); }
function pickTarget(s){
  var list=enemies(s); if(!list.length){ s.target=null; return; }
  var fighters=list.filter(function(e){ return e.cls==='fighter'; });
  var pool=(s.cls==='fighter'&&fighters.length)?fighters:list;
  pool=pool.map(function(e){ return {e:e,d:e.pos.distanceToSquared(s.pos)}; }).sort(function(a,b){ return a.d-b.d; });
  var k=s.cls==='fighter'?Math.min(pool.length,3):1;
  s.target=pool[Math.floor(Math.random()*k)].e;
  s.tT=s.cls==='fighter'?rnd(2,5):rnd(.7,1.4);
}
function muzzle(s,out){
  var c=s.c, sc=s.root.scale.x;
  if(s.cls==='fighter'||s.cls==='hero'){ s.gun=(s.gun||0)^1; out.set((s.gun?1:-1)*c.hx*.7,0,c.hz*.6); }
  else out.set(rnd(-.7,.7)*c.hx,rnd(-.2,.9)*c.hy,rnd(-.8,.8)*c.hz);   // capitals/support: random hull battery
  s.root.updateMatrix();
  return out.applyMatrix4(s.root.matrix);   // G-local
}
function fireInterval(s){
  var cl=CLS[s.cls]; var rate=P.laser*(P['laser'+capName(s.cls)]||1)*(s.m.fire||1);
  if(rate<=0.001) return 1e9;
  return cl.int*rnd(.6,1.4)/rate;
}
function spawnBolt(team,pos,dir,hero){
  var idx=hero?2:team, free=boltFree[idx], b;
  if(free.length) b=free.pop(); else { b=bolts.filter(function(x){ return x.idx===idx; })[0]; if(!b) return; bolts.splice(bolts.indexOf(b),1); }
  b.idx=idx; b.team=hero?HERO:team; b.life=3.4; b.vel.copy(dir).multiplyScalar(7*P.laserSpeed); b.mesh.position.copy(pos); b.prev.copy(pos);
  b.mesh.scale.set(.02*P.boltSize,.02*P.boltSize,.2*P.boltSize); aim(b.mesh,dir); b.mesh.visible=true; bolts.push(b);
}
function fireAt(s,tpos,tvel){
  if(hyper) return;
  var mp=muzzle(s,_v1.set(0,0,0)); var cl=CLS[s.cls];
  var d=_v2.copy(tpos); if(tvel){ var dist=d.distanceTo(mp); d.addScaledVector(tvel,dist/(7*P.laserSpeed)*.7); }
  d.sub(mp).normalize();
  d.x+=rnd(-1,1)*cl.spread; d.y+=rnd(-1,1)*cl.spread; d.z+=rnd(-1,1)*cl.spread; d.normalize();
  spawnBolt(s.team,mp,d,false);
}
function burst(p,col,n,spd,life){
  var pos=sparks.geometry.attributes.position.array, vel=sparks.userData.vel, cl=sparks.geometry.attributes.color.array, lf=sparks.userData.life;
  var c=new T.Color(col);
  for(var i=0;i<n;i++){
    var j=spI; spI=(spI+1)%spN;
    pos[j*3]=p.x; pos[j*3+1]=p.y; pos[j*3+2]=p.z;
    var a=rnd(0,6.283), e=rnd(-1,1), r=Math.sqrt(1-e*e), s=rnd(.3,1)*spd;
    vel[j*3]=Math.cos(a)*r*s; vel[j*3+1]=e*s; vel[j*3+2]=Math.sin(a)*r*s;
    lf[j*2]=rnd(.5,1)*life; lf[j*2+1]=lf[j*2];
    cl[j*3]=c.r; cl[j*3+1]=c.g; cl[j*3+2]=c.b; sparks.userData.base[j*3]=c.r; sparks.userData.base[j*3+1]=c.g; sparks.userData.base[j*3+2]=c.b;
  }
}
function updSparks(dt){
  var pos=sparks.geometry.attributes.position.array, vel=sparks.userData.vel, cl=sparks.geometry.attributes.color.array, lf=sparks.userData.life, base=sparks.userData.base;
  for(var i=0;i<spN;i++){
    if(lf[i*2]<=0){ pos[i*3+1]=-999; continue; }
    lf[i*2]-=dt; var k=Math.max(0,lf[i*2]/lf[i*2+1]);
    pos[i*3]+=vel[i*3]*dt; pos[i*3+1]+=vel[i*3+1]*dt; pos[i*3+2]+=vel[i*3+2]*dt;
    vel[i*3]*=.96; vel[i*3+1]*=.96; vel[i*3+2]*=.96;
    cl[i*3]=base[i*3]*k; cl[i*3+1]=base[i*3+1]*k; cl[i*3+2]=base[i*3+2]*k;
  }
  sparks.geometry.attributes.position.needsUpdate=true; sparks.geometry.attributes.color.needsUpdate=true;
}
function killShip(s){
  burst(s.pos,0xffa040,26,1.7,.85); burst(s.pos,0xffffff,10,2.4,.45);
  s.alive=false; s.root.visible=false; s.respawn=rnd(2.5,5.5); s.target=null;
}
// ── capital / support destruction: a long chain of explosions along the hull, then it breaks apart
var debris=[], shardGeo=null, shardMat=null;
function startDying(s){
  if(s.dying||!s.hasA) return;
  s.alive=false; s.target=null; s.hpShow=0; if(s.barEl) s.barEl.style.display='none';
  s.dying={t:0,dur:s.cls==='capital'?8:4.5,nx:0,base:s.pos.clone()};
}
function hullPoint(s,out){
  var c=s.c; out.set(rnd(-1,1)*c.hx,rnd(-.6,1)*c.hy,rnd(-1,1)*c.hz); s.root.updateMatrix(); return out.applyMatrix4(s.root.matrix);
}
function updDying(s,dt){
  var D=s.dying; D.t+=dt; var k=Math.min(1,D.t/D.dur), sz=Math.max(s.c.hx,s.c.hy,s.c.hz)*s.root.scale.x, big=s.cls==='capital';
  var amp=(.004+.03*k)*sz; s.pos.set(D.base.x+rnd(-1,1)*amp,D.base.y+rnd(-1,1)*amp,D.base.z+rnd(-1,1)*amp);   // the hull shudders harder as it goes
  D.nx-=dt;
  while(D.nx<=0){
    D.nx+=(.55-.4*k)*rnd(.6,1.4)/(big?1:.8);
    hullPoint(s,_v1);
    burst(_v1,0xff9a3a,14+Math.round(26*k),1.2+sz*.5,.9); burst(_v1,0xffffff,5,2+sz*.4,.4);
    flash(_v1,sz*(.35+.5*k)*rnd(.7,1.3),0xffa850);
    if(k>.6&&Math.random()<.35){ hullPoint(s,_v2); flash(_v2,sz*.9,0xffe2a0); burst(_v2,0xffd070,40,2.4+sz*.6,1.1); }   // secondary blasts late in the sequence
  }
  if(D.t>=D.dur) breakApart(s);
}
function breakApart(s){
  var sz=Math.max(s.c.hx,s.c.hy,s.c.hz)*s.root.scale.x, big=s.cls==='capital';
  flash(s.pos,sz*3.2,0xfff0c0); burst(s.pos,0xffa040,90,3+sz,1.6); burst(s.pos,0xffffff,40,4+sz,.8);
  if(!shardGeo){ shardGeo=new T.BoxGeometry(1,1,1); shardMat=new T.MeshStandardMaterial({color:0x6a7077,roughness:.8,metalness:.2}); }
  s.root.updateMatrixWorld(true);
  // 1) the hull's own layers (one mesh per material) peel apart…
  s.root.traverse(function(o){
    if(!o.isMesh) return;
    var pg=new T.Group(); pg.position.copy(s.pos); pg.quaternion.copy(s.root.quaternion); pg.scale.copy(s.root.scale);
    var rel=new T.Matrix4().copy(s.root.matrixWorld).invert().multiply(o.matrixWorld), m2=o.clone(); rel.decompose(m2.position,m2.quaternion,m2.scale); pg.add(m2); G.add(pg);
    var v=new T.Vector3(rnd(-1,1),rnd(-1,1),rnd(-1,1)).normalize().multiplyScalar(sz*rnd(.08,.22)*(big?1:1.3));
    debris.push({g:pg,v:v,spin:new T.Vector3(rnd(-1,1),rnd(-1,1),rnd(-1,1)).multiplyScalar(.25),t:0,life:rnd(5.5,7)});
  });
  // 2) …and shards fly out fast
  for(var i=0;i<(big?22:12);i++){
    var m=new T.Mesh(shardGeo,shardMat); hullPoint(s,m.position); m.scale.set(rnd(.04,.14)*sz,rnd(.03,.1)*sz,rnd(.05,.18)*sz); m.quaternion.setFromEuler(new T.Euler(rnd(0,6),rnd(0,6),rnd(0,6)));
    G.add(m); debris.push({g:m,v:_v3.copy(m.position).sub(s.pos).normalize().multiplyScalar(sz*rnd(.25,.7)),spin:new T.Vector3(rnd(-3,3),rnd(-3,3),rnd(-3,3)),t:0,life:rnd(3,5.5)});
  }
  s.dying=null; s.root.visible=false; s.respawn=rnd(28,45);
}
function updDebris(dt){
  for(var i=debris.length-1;i>=0;i--){
    var d=debris[i]; d.t+=dt; d.g.position.addScaledVector(d.v,dt); d.v.multiplyScalar(1-.25*dt);
    d.g.rotation.x+=d.spin.x*dt; d.g.rotation.y+=d.spin.y*dt; d.g.rotation.z+=d.spin.z*dt;
    var fade=Math.max(0,Math.min(1,(d.life-d.t)/(d.life*.3))); if(fade<1){ d.g.visible=fade>.02; if(d.g.userData.base===undefined) d.g.userData.base=d.g.scale.clone(); d.g.scale.copy(d.g.userData.base).multiplyScalar(fade); }
    if(d.t>=d.life){ G.remove(d.g); debris.splice(i,1); }
  }
}
function explodeRandom(cls){
  var list=ships.filter(function(s){ return s.cls===cls&&s.alive&&!s.dying&&s.hasA; }); if(!list.length) return;
  var s=list[Math.floor(Math.random()*list.length)]; startDying(s); kills=kills; if(hudEl) updHud(false);
}
function hitShip(s,b){
  burst(b.mesh.position,BOLT_COL[b.idx],7,1.1,.4);
  if(s.cls==='fighter'){ s.hp--; if(s.hp<=0){ killShip(s); if(b.team===HERO){ kills++; updHud(true); } } }
  else if((s.cls==='support'||s.cls==='capital')&&b.team===HERO){
    s.hp--; s.hpShow=3.2;
    if(s.hp<=0){ startDying(s); kills++; updHud(true); }
  }
}
// ── floating health bars (DOM) over large ships that have just been hit by the hero
var barsEl=null;
function updBars(dt){
  if(!barsEl) return;
  var r=ctx.dom.getBoundingClientRect();
  ships.forEach(function(s){
    if(!(s.cls==='support'||s.cls==='capital')) return;
    if(s.hpShow>0&&s.alive&&!hyper){
      s.hpShow-=dt;
      if(!s.barEl){ s.barEl=document.createElement('div'); s.barEl.className='bt-bar'; s.barEl.innerHTML='<i></i>'; barsEl.appendChild(s.barEl); }
      _hF.copy(s.pos); _hF.y+=s.c.r*s.root.scale.x*1.1+.15; G.localToWorld(_hF); _hF.project(ctx.camera);
      if(_hF.z>1){ s.barEl.style.display='none'; return; }
      var pct=Math.max(0,s.hp/s.maxhp);
      s.barEl.style.display='block'; s.barEl.style.left=((_hF.x+1)/2*r.width+r.left)+'px'; s.barEl.style.top=((1-_hF.y)/2*r.height+r.top)+'px';
      s.barEl.style.opacity=Math.min(1,s.hpShow*1.2);
      var f=s.barEl.firstChild; f.style.width=(pct*100)+'%'; f.style.background='hsl('+Math.round(pct*110)+',90%,55%)';
    } else if(s.barEl&&s.barEl.style.display!=='none') s.barEl.style.display='none';
  });
}
function updBolts(dt){
  var D=dt*P.laserSpeed;
  for(var i=bolts.length-1;i>=0;i--){
    var b=bolts[i]; b.life-=dt;
    b.prev.copy(b.mesh.position); b.mesh.position.addScaledVector(b.vel,dt);
    var hit=null;
    if(b.life>0){
      for(var j=0;j<ships.length;j++){
        var s=ships[j]; if(!s.alive||s.cls==='base'||s.jump||s.leaving) continue;
        if(b.team===HERO){ if(s.team===HERO) continue; } else if(s.team===b.team||s.team===HERO) continue;
        var rad=s.c.r*s.root.scale.x*(s.cls==='fighter'?.9:.6);
        // segment (prev→cur) vs sphere
        _v1.copy(b.mesh.position).sub(b.prev); var l2=_v1.lengthSq()||1e-6;
        var tt=clamp(_v2.copy(s.pos).sub(b.prev).dot(_v1)/l2,0,1);
        _v3.copy(b.prev).addScaledVector(_v1,tt);
        if(_v3.distanceToSquared(s.pos)<rad*rad){ hit=s; break; }
      }
      if(!hit&&b.team===HERO){ for(var q=0;q<kits.length;q++){ var kk=kits[q]; if(!kk.opening&&kk.pos.distanceTo(b.mesh.position)<.34*kk.root.scale.x+.12){ openKit(kk,'blast'); hit=kk; break; } } }
    }
    if(hit||b.life<=0){ if(hit&&hit.root&&hit.cls) hitShip(hit,b); b.mesh.visible=false; bolts.splice(i,1); boltFree[b.idx].push(b); }
  }
}

/* ───────────────────────────── AI: movement ───────────────────────────── */
function keepNorm(p){   // <1 means inside the clearance ellipsoid around the monogram (wide in x, tighter in y — the arena is shorter than it is wide)
  var r=monoR()*P.clear; var x=(p.x-CX)/(r*4.4), y=(p.y-CY)/(r*2.3), z=(p.z-CZ)/(r*7);   // z barely counts: the clearance is on-screen, so a fighter in front of or behind the mark still counts as hugging it
  return Math.sqrt(x*x+y*y+z*z);
}
function pickWp(s){ for(var i=0;i<8;i++){ s.wp.set(rnd(-1,1)*arenaAx()*.9, CY+rnd(-1,1)*arenaAy()*.9, rnd(-1,1)*arenaAz()*.9); if(keepNorm(s.wp)>1.5) break; } }
function nextMode(s){
  var r=Math.random();
  if(r<.58 && enemies(s).length){ s.mode='pursue'; s.mT=rnd(2.5,6); if(!s.target||!s.target.alive) pickTarget(s); }
  else if(r<.82){ s.mode='evade'; s.mT=rnd(1.1,2.4); pickWp(s); }
  else { s.mode='wander'; s.mT=rnd(1.5,3); pickWp(s); }
}
var _steer=null, _sep=null;
function updFighter(s,dt){
  var m=s.m, turn=3.2*(m.turn||1), base=1.9*(m.spd||1)*P.speed*P.speedFighter;
  s.tT-=dt; if(s.mode==='pursue'&&(!s.target||!s.target.alive||s.tT<=0)) pickTarget(s);
  s.mT-=dt; if(s.mT<=0||(s.mode==='pursue'&&!s.target)) nextMode(s);
  var steer=_steer.set(0,0,0), spd=base;
  if(s.mode==='pursue'&&s.target){ steer.copy(s.target.pos).addScaledVector(s.target.vel,.3).sub(s.pos); spd=base*1.18; }
  else if(s.mode==='evade'){ steer.copy(s.wp).sub(s.pos); steer.x+=Math.sin(clockT*5+s.ph)*.6; steer.y+=Math.cos(clockT*4.3+s.ph2)*.6; spd=base*1.45; if(steer.lengthSq()<.2) pickWp(s); }
  else { steer.copy(s.wp).sub(s.pos); if(steer.lengthSq()<.25) pickWp(s); }
  steer.normalize();
  // separation
  for(var i=0;i<ships.length;i++){ var o=ships[i]; if(o===s||!o.alive||o.cls!=='fighter'&&o.cls!=='hero') continue;
    _sep.copy(s.pos).sub(o.pos); var d2=_sep.lengthSq(); if(d2<1.44&&d2>1e-6){ var dd=Math.sqrt(d2); steer.addScaledVector(_sep,(1-dd/1.2)*1.6/dd); } }
  // arena bound (soft ellipsoid)
  var ax=arenaAx(), ay=arenaAy(), az=arenaAz();
  var px=s.pos.x/ax, py=(s.pos.y-CY)/ay, pz=s.pos.z/az, r2=px*px+py*py+pz*pz;
  if(r2>.8){ var w=(r2-.8)*5; steer.x-=px*w; steer.y-=py*w; steer.z-=pz*w; }
  // monogram keep-out
  var kn=keepNorm(s.pos);
  if(kn<1.25){ _sep.set(s.pos.x-CX,s.pos.y-CY,s.pos.z-CZ).normalize(); steer.addScaledVector(_sep,(1.25-kn)*6+.3); }
  steer.normalize();
  // turn toward steer (rate limited)
  s.prev.copy(s.dir);
  var ang=s.dir.angleTo(steer);
  if(ang>1e-4){ var k=Math.min(1,turn*dt/ang); s.dir.lerp(steer,k).normalize(); }
  s.spd=lerp(s.spd,spd,Math.min(1,dt*2));
  s.vel.copy(s.dir).multiplyScalar(s.spd);
  s.pos.addScaledVector(s.vel,dt);
  var yr=(s.prev.z*s.dir.x-s.prev.x*s.dir.z)/Math.max(dt,1e-3);
  s.yawRate=lerp(s.yawRate,yr,Math.min(1,dt*6));
  aim(s.root,s.dir);
  s.bankV=lerp(s.bankV,clamp(s.yawRate*.55,-1.1,1.1),Math.min(1,dt*5)); s.bank.rotation.z=s.bankV;
  // fire
  s.cd-=dt;
  if(s.cd<=0&&s.target&&s.target.alive){
    var to=_v2.copy(s.target.pos).sub(s.pos), dist=to.length();
    if(dist<CLS.fighter.range && s.dir.angleTo(to.normalize())<.28){ fireAt(s,s.target.pos,s.target.vel); s.cd=fireInterval(s); }
  } else if(s.cd<=0&&!s.target){ s.cd=.4; }
}
function updShipLarge(s,dt){   // support + capital: dead-straight, very slow passage across the field; a slow wide turn once past the far edge
  var sp=(s.cls==='support'?.16:.08)*P.speed*(s.cls==='support'?P.speedSupport:P.speedCapital);
  var d=s.pos.length();
  if(!s.turn&&d>s.R&&s.pos.dot(s.hd)>0){ s.turn=chooseHeading(s,new T.Vector3()); }
  if(s.turn){
    var ang=s.hd.angleTo(s.turn); s.hd.lerp(s.turn,Math.min(1,(s.cls==='support'?.07:.05)*dt/Math.max(ang,1e-3))).normalize();
    if(ang<.03) s.turn=null;
  }
  if(d<12){ s.hd.lerp(_v2.copy(s.pos).normalize(),Math.min(1,.5*dt)).normalize(); }   // safety: never drift through the hologram
  s.prev.copy(s.pos); s.pos.addScaledVector(s.hd,sp*dt);
  s.vel.copy(s.hd).multiplyScalar(sp); s.dir.copy(s.hd);
  aim(s.root,s.hd); s.bank.rotation.z=0;
  s.tT-=dt; if(!s.target||!s.target.alive||s.tT<=0) pickTarget(s);
  s.cd-=dt;
  if(s.cd<=0){
    if(s.target&&s.target.alive&&s.target.pos.distanceTo(s.pos)<CLS[s.cls].range){ fireAt(s,s.target.pos,s.target.vel); }
    s.cd=fireInterval(s);
  }
}
// large ships never overlap: soft positional separation on bounding spheres (they move so slowly that this resolves gradually)
function lr(s){ return Math.max(s.c.hx,s.c.hy,s.c.hz)*s.root.scale.x*.85; }
function sepLarge(){
  var L=[]; for(var i=0;i<ships.length;i++){ var s=ships[i]; if((s.cls==='support'||s.cls==='capital')&&s.hasA&&(s.alive||s.dying)&&!s.leaving) L.push(s); }
  for(var a=0;a<L.length;a++) for(var b=a+1;b<L.length;b++){
    var A=L[a], B=L[b]; _v1.copy(A.pos).sub(B.pos); var d=_v1.length(), r=lr(A)+lr(B);
    if(d<r&&d>1e-4){ var push=(r-d)*.25/d; _v1.multiplyScalar(push); A.pos.add(_v1); B.pos.sub(_v1); }
  }
}
function updBase(s,dt){
  aim(s.root,_v1.set(CX-s.pos.x,CY-s.pos.y,CZ-s.pos.z).normalize());   // superlaser dish is the model's +Z — always trained on the hologram
  s.bank.rotation.z=0;                                                    // no roll: keeps the dish on the upper hemisphere
}

/* ───────────────────────────── hero + stages ───────────────────────────── */
// stage 'select': the hologram's head is replaced by a carousel of the playable hero ships (◄ PLAY ► under the cone).
// stage 'play'  : every hologram artifact hides (ctx.onStage) and the chosen hero flies — it travels toward the mouse, fires where you click.
var HEROES=['mil-falcon','n1','razorcrest','slave-1'];
var stage='select', carIdx=0, carGroup=null, carWrap=null, carModel=null, carModelId=null, carK=0, kills=0, carUi=null, hintEl=null, pendingHero=null;
var _ro=null, _rd=null, _hT=null, _hF=null;
function setStage(st){ if(stage===st) return; stage=st; if(ctx.onStage) ctx.onStage(st); syncUi(); }
function stepCar(d){ carIdx=(carIdx+d+HEROES.length)%HEROES.length; carK=0; }
function playHero(){ spawnHero(HEROES[carIdx]); }
function spawnHero(id){
  ejectHero(true);
  var m=BYID[id]; if(!m) return;
  if(!cache[id]){ requestModel(id); pumpLoads(); pendingHero=id; return; }
  var s=makeShip(m); heroShip=s; s.hero=true; s.hp=1e9;
  s.pos.set(0,0,0); s.dir.set(1,.12,-.1).normalize(); s.spd=0; s.spawnK=0; s.cd=0; s.gun=0;
  burst(s.pos,0xaaf5ee,18,1.4,.6); fireHeld=false;
  setStage('play');
}
function changeHero(){ ejectHero(false); fireHeld=false; setStage('select'); }
function ejectHero(silent){
  if(!heroShip) return; burst(heroShip.pos,0xaaf5ee,14,1.2,.5);
  G.remove(heroShip.root); ships.splice(ships.indexOf(heroShip),1); heroShip=null;
}
// pointer → ray in G-local space
function localRay(nx,ny){
  _ray.setFromCamera(_v4.set(nx,ny,.5),ctx.camera);
  _ro.copy(_ray.ray.origin); G.worldToLocal(_ro);
  _rd.copy(_ray.ray.direction).applyQuaternion(_q.copy(G.quaternion).invert()).normalize();
}
// What is the pointer on? An object (ship / minikit) gives a real XYZ; empty space is approximated by the plane at the hero's depth.
// Writes the target into `out` (G-local) and returns the object hit, or null.
function pickAt(nx,ny,out){
  localRay(nx,ny); var best=null, bt=1e9;
  function test(c,r,o){ _hF.copy(c).sub(_ro); var tca=_hF.dot(_rd); if(tca<0) return; var d2=_hF.lengthSq()-tca*tca; if(d2>r*r) return; var t=tca-Math.sqrt(r*r-d2); if(t<bt){ bt=t; best=o; } }
  ships.forEach(function(sh){ if(!sh.alive||sh.hero||sh.jump||sh.leaving) return; test(sh.pos,Math.max(sh.c.r*sh.root.scale.x*1.25,.2),sh); });
  kits.forEach(function(k){ if(!k.opening) test(k.pos,.38*k.root.scale.x+.1,k); });
  if(best){ out.copy(best.pos); return best; }
  var z=heroShip?heroShip.pos.z:0, t=Math.abs(_rd.z)>1e-4?(z-_ro.z)/_rd.z:6; if(!(t>.2)) t=6;
  out.copy(_ro).addScaledVector(_rd,t); return null;
}
function updHero(s,dt){
  var o=pickAt(ptr.nx,ptr.ny,_hT);
  if(!ptr.in) _hT.copy(s.pos).addScaledVector(s.dir,1);               // pointer off the canvas: coast on
  var to=_v2.copy(_hT).sub(s.pos), d=to.length();
  if(!o) to.z-=s.pos.z*.5;                                              // the cursor can't say how deep: drift back toward mid-depth unless pointing at something
  s.prev.copy(s.dir);
  if(d>.15){ to.normalize(); var ang=s.dir.angleTo(to); if(ang>1e-4){ s.dir.lerp(to,Math.min(1,3.6*dt/ang)).normalize(); } }
  var want=d<.2?0:clamp(d*1.6,.3,3.2)*P.speed; if(o&&d<.9) want=Math.min(want,.4);   // hovering an object: ease in, don't ram it
  s.spd=lerp(s.spd,want,Math.min(1,dt*3));
  s.vel.copy(s.dir).multiplyScalar(s.spd); s.pos.addScaledVector(s.vel,dt);
  var ax=arenaAx()*1.12, ay=arenaAy()*1.1, az=arenaAz();
  s.pos.x=clamp(s.pos.x,-ax,ax); s.pos.y=clamp(s.pos.y,CY-ay,CY+ay); s.pos.z=clamp(s.pos.z,-az,az*.9);
  var yr=(s.prev.z*s.dir.x-s.prev.x*s.dir.z)/Math.max(dt,1e-3);
  s.yawRate=lerp(s.yawRate,yr,Math.min(1,dt*6));
  aim(s.root,s.dir);
  s.bankV=lerp(s.bankV,clamp(s.yawRate*.5,-1.2,1.2),Math.min(1,dt*5)); s.bank.rotation.z=s.bankV;
  s.cd-=dt;
  if(!hyper&&fireHeld&&s.cd<=0){   // fire toward wherever the pointer is on (an object's XYZ, or the depth-plane point)
    pickAt(ptr.nx,ptr.ny,_hT);
    var mp=muzzle(s,_v1.set(0,0,0)); var dd=_v2.copy(_hT).sub(mp); if(dd.lengthSq()<1e-4) dd.copy(s.dir); dd.normalize();
    dd.x+=rnd(-1,1)*CLS.hero.spread; dd.y+=rnd(-1,1)*CLS.hero.spread; dd.normalize();
    spawnBolt(HERO,mp,dd,true); s.cd=CLS.hero.int/Math.max(.2,P.laser);
  }
}
// ── carousel (the hologram's head is hidden by ctx.onStage while stage==='select')
function ensureCarousel(){
  if(!carGroup){ carGroup=new T.Group(); G.add(carGroup); }
  HEROES.forEach(requestModel); pumpLoads();
}
function updCarousel(dt){
  if(!carGroup) return;
  var show=stage==='select'&&!hyper; carGroup.visible=show; if(!show) return;
  var id=HEROES[carIdx];
  if(carModelId!==id&&cache[id]){
    if(carWrap) carGroup.remove(carWrap);
    carWrap=new T.Group(); carModel=cache[id].proto.clone(true); carWrap.add(carModel); carGroup.add(carWrap); carModelId=id; carK=0;
    if(carUi){ var nm=carUi.querySelector('.bt-name'); if(nm) nm.textContent=BYID[id].label; }
  }
  if(!carWrap) return;
  carK=Math.min(1,carK+dt*3.2); var pop=1-Math.pow(1-carK,3);
  carWrap.scale.setScalar((1.45/S)/BYID[id].size*(.2+.8*pop)*(P.scaleHero>0?1:1));
  carWrap.rotation.y+=dt*.9; carWrap.rotation.x=.22; carGroup.position.y=Math.sin(clockT*1.3)*.05/S;
  if(carUi){   // sit the ◄ PLAY ► row just under the hologram's emitter
    _hF.set(0,(.8-ctx.center[1])/S,0); G.localToWorld(_hF); _hF.project(ctx.camera);
    var r=ctx.dom.getBoundingClientRect(); carUi.style.left=((_hF.x+1)/2*r.width+r.left)+'px'; carUi.style.top=((1-_hF.y)/2*r.height+r.top)+'px';
  }
}
function syncUi(){
  var sel=stage==='select'&&!hyper, pl=stage==='play'&&!hyper;
  if(carUi) carUi.style.display=sel?'flex':'none';
  if(hintEl) hintEl.style.display=pl?'flex':'none';
  if(hudEl) hudEl.style.opacity=pl?1:0;
}

/* ───────────────────────────── minikits ───────────────────────────── */
function spawnKit(){
  var c=cache.minikit; if(!c) return;
  var root=new T.Group(), model=c.proto.clone(true); root.add(model);
  var glow=new T.Sprite(new T.SpriteMaterial({map:glowTexture(),blending:T.AdditiveBlending,depthWrite:false,fog:false,transparent:true,opacity:.7,color:0xffe7a0}));
  glow.scale.setScalar(.7); root.add(glow);
  var hit=new T.Mesh(new T.SphereGeometry(.34,8,6),new T.MeshBasicMaterial({visible:false})); hit.userData.kit=true; root.add(hit);
  var zone=Math.random(), p=new T.Vector3();
  if(zone<.5) p.set(rnd(-1,1)*arenaAx()*.9,CY+rnd(-1,1)*arenaAy()*.9,rnd(-1,.9)*arenaAz());
  else p.set(rnd(-1,1)*halfW(-1.8)*.85,CY+rnd(-1,1)*halfH(-1.8)*.8,rnd(-2.4,-1.2));
  if(Math.hypot(p.x,p.y-CY)<monoR()*1.2) p.x+=Math.sign(p.x||1)*monoR()*1.3;
  root.position.copy(p); G.add(root);
  var k={root:root,model:model,glow:glow,hit:hit,pos:root.position,life:rnd(16,24),age:0,opening:0,spin:rnd(.6,1.2),ph:rnd(0,6.28),base:p.clone()};
  hit.userData.kitRef=k; kits.push(k);
}
function openKit(k,via){
  if(k.opening) return; k.opening=.001; k.via=via;
  burst(k.pos,0xffe14a,30,2,.9); burst(k.pos,0xffffff,12,2.6,.5);
  kitCount++; updHud(true);
  try{ window.dispatchEvent(new CustomEvent('mw:minikit',{detail:{total:kitCount,via:via,reward:null}})); }catch(e){}
  if(typeof MWBattle.onUnlock==='function'){ try{ MWBattle.onUnlock({total:kitCount,via:via,reward:null}); }catch(e){} }
}
function updKits(dt){
  kitTimer-=dt;
  if(kitTimer<=0&&!hyper){ var live=kits.filter(function(k){ return !k.opening; }).length; if(live<P.kitMax&&P.kitRate>0&&cache.minikit) spawnKit(); kitTimer=rnd(6,12)/Math.max(.05,P.kitRate); }
  var sc=P.scale*P.scaleKit;
  for(var i=kits.length-1;i>=0;i--){
    var k=kits[i]; k.age+=dt;
    k.model.rotation.y+=k.spin*dt; k.model.rotation.x=.4;
    k.pos.y=k.base.y+Math.sin(clockT*1.4+k.ph)*.08;
    var s=sc, a=.7;
    if(k.age<.5) s*=k.age/.5;
    var fadeAt=k.life-2.5; if(k.age>fadeAt) a=(Math.floor(clockT*8)%2)?.2:.7;
    if(k.opening){ k.opening+=dt; var u=k.opening/.45; s*=1+u*1.4; k.model.rotation.y+=dt*18; a=.7*(1-u); k.model.visible=u<.6; if(u>=1){ G.remove(k.root); kits.splice(i,1); continue; } }
    else if(k.age>k.life){ G.remove(k.root); kits.splice(i,1); continue; }
    k.root.scale.setScalar(s); k.glow.material.opacity=a; k.glow.scale.setScalar(.7+.12*Math.sin(clockT*5+k.ph));
  }
}
function kitAt(clientX,clientY){
  var r=ctx.dom.getBoundingClientRect(); var nx=((clientX-r.left)/r.width)*2-1, ny=-((clientY-r.top)/r.height)*2+1;
  _ray.setFromCamera(_v4.set(nx,ny,.5),ctx.camera);
  var hits=[]; kits.forEach(function(k){ if(!k.opening) hits.push(k.hit); });
  var h=_ray.intersectObjects(hits,false); return h.length?h[0].object.userData.kitRef:null;
}

/* ───────────────────────────── hyperspace exit ───────────────────────────── */
function hyperspace(fast){
  if(!active||hyper) return;
  hyper={t:0}; ejectKeys(); var fk=fast?.45:1;
  bolts.forEach(function(b){ b.mesh.visible=false; boltFree[b.idx].push(b); }); bolts.length=0;
  kits.forEach(function(k){ if(!k.opening) openKitSilent(k); });
  var rank={fighter:0,support:1,capital:2,base:3,hero:0};
  var list=ships.filter(function(s){ return s.alive; });
  list.sort(function(a,b){ return Math.atan2(a.pos.y-CY,a.pos.x)-Math.atan2(b.pos.y-CY,b.pos.x); });   // sweep around the monogram
  var perClass={};
  list.forEach(function(s){
    var cr=rank[s.cls]; perClass[cr]=(perClass[cr]||0)+1;
    var dirX=s.pos.x>=0?1:-1, away=new T.Vector3(dirX*rnd(.85,1),(s.pos.y-CY)*.18,-rnd(.12,.45)).normalize();
    s.jump={ delay:(cr*.55+perClass[cr]*P.jumpStep+rnd(0,.06))*fk, t:0, phase:0, away:away, flash:false, v:s.spd||1 };
  });
}
function openKitSilent(k){ k.opening=.001; k.life=.01; }
function updHyper(s,dt){
  var j=s.jump; j.t+=dt;
  if(j.phase===0){   // keep drifting until our turn
    if(j.t>=j.delay){ j.phase=1; j.t=0; }
    return false;
  }
  if(j.phase===1){   // align nose with the exit vector
    var u=Math.min(1,j.t/.38); s.dir.lerp(j.away,Math.min(1,dt*6)).normalize();
    aim(s.root,s.dir); s.fx.scale.set(1,1,1+u*.5);
    if(s.cls!=='fighter'&&s.cls!=='hero'&&s.cls!=='base'){ s.pos.addScaledVector(s.dir,-.25*dt); }
    if(j.t>=.38){ j.phase=2; j.t=0; flash(s.pos,s.cls==='capital'||s.cls==='base'?1.6:.8); }
    return false;
  }
  var big=(s.cls==='capital'||s.cls==='base')?.55:(s.cls==='support'?.8:1);
  j.v=lerp(j.v,70*big,Math.min(1,dt*(s.cls==='capital'||s.cls==='base'?3.2:5)))+dt*40*big;
  s.dir.lerp(j.away,Math.min(1,dt*10)).normalize();
  s.pos.addScaledVector(s.dir,j.v*dt);
  var st=1+Math.min(14,j.v*.22*(1/(big+.4))*.6); s.fx.scale.set(Math.max(.35,1-st*.04),Math.max(.35,1-st*.04),st);
  aim(s.root,s.dir);
  if(Math.abs(s.pos.x)>halfW(s.pos.z)*2.2||s.pos.z<-45||j.t>5){ s.root.visible=false; s.alive=false; return true; }
  return false;
}
function flash(p,size,col){
  var sp=new T.Sprite(new T.SpriteMaterial({map:glowTexture(),blending:T.AdditiveBlending,depthWrite:false,fog:false,transparent:true,opacity:1,color:col||0xcff8ff}));
  sp.position.copy(p); sp.scale.setScalar(.1); G.add(sp); flashes.push({sp:sp,t:0,size:size});
}
function updFlashes(dt){
  for(var i=flashes.length-1;i>=0;i--){ var f=flashes[i]; f.t+=dt; var u=f.t/.35;
    f.sp.scale.setScalar(.1+f.size*Math.sin(Math.min(1,u)*Math.PI)); f.sp.material.opacity=1-u;
    if(u>=1){ G.remove(f.sp); f.sp.material.dispose(); flashes.splice(i,1); } }
}
function ejectKeys(){ keys={}; fireHeld=false; }

/* ───────────────────────────── frame ───────────────────────────── */
function update(t){
  if(!active||dead) return;
  var dt=lastT==null?0.016:Math.min(.05,Math.max(0,t-lastT)); lastT=t; clockT+=dt;
  if(ctx.getRot){ if(!_ryQ) _ryQ=new T.Quaternion(); _ryQ.setFromAxisAngle(_up,ctx.getRot()); G.quaternion.copy(_ryQ).multiply(baseQ); }   // the whole battle turns with the horizontal drag-orbit
  G.updateMatrixWorld(true);
  G.visible=P.on;
  if(!P.on&&!hyper) return;
  if(!hyper){
    reconT-=dt; if(reconT<=0){ reconcile(); reconT=.5; }
    if(pendingHero&&cache[pendingHero]){ var h=pendingHero; pendingHero=null; spawnHero(h); }
  } else pumpLoads();
  if(anchorsDirty) assignAnchors();

  var allGone=true;
  for(var i=ships.length-1;i>=0;i--){
    var s=ships[i];
    // global/class scale
    var base=s.cls==='hero'?P.scaleHero:s.cls==='base'?P.scaleBase:P['scale'+capName(s.cls)];
    var sc=P.scale*base*((s.cls==='support'||s.cls==='capital')&&s.hasA?depthCompPos(s.pos):1)*(s.cls==='base'?(s.dsK||1):1);
    if(s.spawnK<1){ s.spawnK=Math.min(1,s.spawnK+dt*1.6); }
    if(s.leaving){ s.spawnK=Math.max(0,s.spawnK-dt*3); if(s.spawnK<=0){ G.remove(s.root); ships.splice(i,1); anchorsDirty=true; continue; } }
    s.root.scale.setScalar(sc*s.spawnK*(s.spawnK<1?1:1)+1e-4);
    if(s.dying){ updDying(s,dt); continue; }
    if(!s.alive){
      if(!hyper){ s.respawn-=dt; if(s.respawn<=0&&(s.cls==='support'||s.cls==='capital')){ s.hasA=false; placeLarge(s); s.alive=true; s.root.visible=true; s.spawnK=0; s.target=null; flash(s.pos,1.2); }
        if(s.respawn<=0&&s.cls==='fighter'){ s.alive=true; s.hp=CLS.fighter.hp; s.root.visible=true; spawnFighterPos(s,s.pos); s.spawnK=0; s.target=null; s.mode='wander'; s.mT=1; pickWp(s); s.vel.set(0,0,0); burst(s.pos,0xaaf5ee,8,1,.4); } }
      continue;
    }
    allGone=false;
    if(!s.jump||s.jump.phase===0){
      if(s.cls==='fighter') updFighter(s,dt);
      else if(s.cls==='hero') updHero(s,dt);
      else if(s.cls==='base') updBase(s,dt);
      else updShipLarge(s,dt);
    }
    if(s.jump) updHyper(s,dt);
    continue;
  }
  sepLarge(); updDebris(dt);
  updKits(dt); updCarousel(dt); updBars(dt);
  updBolts(dt); updSparks(dt); updFlashes(dt);
  if(hyper){
    if(hyper.t===0) syncUi();
    hyper.t+=dt; var any=ships.some(function(s){ return s.alive; });
    if(!any&&hyper.t>.4){ var done=ctx.onDone; MWBattle.dispose(); if(done) done(); }
  }
}

/* ───────────────────────────── input ───────────────────────────── */
function isTyping(e){ var t=e.target; return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable); }
function bindInput(){
  on(window,'pointermove',function(e){ var r=ctx.dom.getBoundingClientRect(); ptr.nx=((e.clientX-r.left)/r.width)*2-1; ptr.ny=-((e.clientY-r.top)/r.height)*2+1; ptr.in=e.target===ctx.dom;
    if(ptr.in&&!hyper){ if(kitAt(e.clientX,e.clientY)) ctx.dom.style.cursor='pointer'; else if(stage==='play') ctx.dom.style.cursor='crosshair'; } });
  on(window,'pointerdown',function(e){ ptr.downX=e.clientX; ptr.downY=e.clientY; ptr.down=performance.now();
    if(stage==='play'&&heroShip&&!hyper&&e.button===0&&e.target===ctx.dom){ fireHeld=true; heroShip.cd=0; } });   // left button = fire (hold to keep firing)
  on(window,'pointerup',function(e){ if(e.button===0) fireHeld=false; });
  on(ctx.dom,'contextmenu',function(e){ e.preventDefault(); });          // right-drag pans the camera; no browser menu
  on(ctx.dom,'click',function(e){
    if(hyper||!active) return;
    if(Math.hypot(e.clientX-ptr.downX,e.clientY-ptr.downY)>6) return;   // a drag, not a click
    var k=kitAt(e.clientX,e.clientY); if(k){ openKit(k,'click'); e.stopImmediatePropagation(); }
  },true);
  on(window,'keydown',function(e){
    if(isTyping(e)||hyper) return;
    if(stage==='select'){
      if(e.code==='ArrowLeft'){ stepCar(-1); e.preventDefault(); }
      else if(e.code==='ArrowRight'){ stepCar(1); e.preventDefault(); }
      else if(e.code==='Enter'||e.code==='Space'){ playHero(); e.preventDefault(); }
    } else if(e.code==='Space'){ changeHero(); e.preventDefault(); if(document.activeElement&&document.activeElement.blur) document.activeElement.blur(); }
  });
  on(window,'blur',ejectKeys);
}

/* ───────────────────────────── UI: hero picker, HUD, debug panel ───────────────────────────── */
function updHud(pulse){
  if(!hudEl) return; hudEl.innerHTML='<span class="bt-hl">KILLS</span><span class="bt-hn">'+kills+'</span>';
  if(pulse){ hudEl.classList.remove('pulse'); void hudEl.offsetWidth; hudEl.classList.add('pulse'); }
}
function injectCss(){
  styleEl=document.createElement('style'); styleEl.textContent=[
    'body:not(.mw-arcade) #bt-car, body:not(.mw-arcade) #bt-hud, body:not(.mw-arcade) #bt-hints, body:not(.mw-arcade) #bt-bars{display:none!important}',
    'body.mw-arcade #dbg-battle{display:block}',
    '#bt-car{position:fixed;z-index:16;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;font-family:var(--display,sans-serif)}',
    '#bt-car .bt-name{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--holo,#AAF5EE);white-space:nowrap}',
    '#bt-car .bt-row{display:flex;gap:34px;align-items:center}',
    '#bt-car .bt-sub{font-family:var(--mono,monospace);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted,#6b8a85);opacity:.85;white-space:nowrap}',
    '#bt-car .bt-sub b{font-weight:400;color:var(--holo,#AAF5EE)}',
    '#bt-hints{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:16;display:flex;gap:30px;align-items:center;padding:12px 26px;pointer-events:none;background:color-mix(in srgb,var(--panel,#0a1212) 82%,transparent);border:1px solid var(--border,rgba(90,191,184,.35));backdrop-filter:blur(6px);font-family:var(--display,sans-serif);font-size:13px;letter-spacing:2.5px;text-transform:uppercase;color:var(--text,#E8F7F5);white-space:nowrap}',
    '#bt-hints .bt-h{display:flex;align-items:center;gap:11px}',
    '#bt-hints svg{color:var(--holo,#AAF5EE);flex:none}',
    '#bt-hud{position:absolute;right:24px;top:64px;z-index:16;display:flex;flex-direction:column;align-items:flex-end;line-height:1;pointer-events:none;opacity:0;transition:opacity .3s}',
    '#bt-hud .bt-hl{font-family:var(--display,sans-serif);font-size:11px;letter-spacing:4px;color:var(--muted,#6b8a85);margin-bottom:6px}',
    '#bt-hud .bt-hn{font-family:var(--mono,monospace);font-size:56px;letter-spacing:2px;color:var(--amber-hot,#F0D080);text-shadow:0 0 16px rgba(240,208,128,.45)}',
    '#bt-hud.pulse .bt-hn{animation:btPulse .4s steps(4)}@keyframes btPulse{0%{transform:scale(1.35);transform-origin:right center}100%{transform:scale(1);transform-origin:right center}}',
    '#bt-bars{position:fixed;inset:0;z-index:15;pointer-events:none}',
    '#bt-bars .bt-bar{position:fixed;width:72px;height:7px;margin:-7px 0 0 -36px;border:1px solid rgba(255,255,255,.65);background:rgba(0,0,0,.55);transition:opacity .2s}',
    '#bt-bars .bt-bar i{display:block;height:100%;width:100%}',
    '#dbg-battle details{margin:0 0 10px}#dbg-battle summary{cursor:pointer;font-family:var(--display);font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px}',
    '#dbg-battle .ctl.tight{margin-bottom:8px}'
  ].join('\n'); document.head.appendChild(styleEl);
}
function buildUi(){
  injectCss();
  carUi=document.createElement('div'); carUi.id='bt-car';
  carUi.innerHTML='<div class="bt-name"></div><div class="bt-row"><button type="button" class="bric-btn bric-btn--secondary" data-d="-1" aria-label="Previous hero ship">\u25C4</button><button type="button" class="bric-btn bric-btn--primary bt-play">PLAY</button><button type="button" class="bric-btn bric-btn--secondary" data-d="1" aria-label="Next hero ship">\u25BA</button></div><div class="bt-sub"><b>enter</b> to play</div>';
  [].forEach.call(carUi.querySelectorAll('button[data-d]'),function(b){ b.addEventListener('click',function(e){ e.stopPropagation(); stepCar(+b.dataset.d); b.blur(); }); });
  carUi.querySelector('.bt-play').addEventListener('click',function(e){ e.stopPropagation(); this.blur(); playHero(); });
  document.body.appendChild(carUi);
  hintEl=document.createElement('div'); hintEl.id='bt-hints'; hintEl.style.display='none';
  hintEl.innerHTML='<div class="bt-h"><svg viewBox="0 0 24 32" width="26" height="34" aria-hidden="true"><rect x="3" y="2" width="18" height="28" rx="9" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="12" y1="2" x2="12" y2="13" stroke="currentColor" stroke-width="1.4"/><line x1="3" y1="13" x2="21" y2="13" stroke="currentColor" stroke-width="1.4"/><path d="M12 20 m-3 0 h6 M12 17 v6" stroke="currentColor" stroke-width="1.4" fill="none"/></svg><span>Move + aim</span></div><div class="bt-h"><svg viewBox="0 0 24 32" width="26" height="34" aria-hidden="true"><rect x="3" y="2" width="18" height="28" rx="9" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="12" y1="2" x2="12" y2="13" stroke="currentColor" stroke-width="1.4"/><line x1="3" y1="13" x2="21" y2="13" stroke="currentColor" stroke-width="1.4"/><path d="M12 2 A9 9 0 0 0 3 11 L3 13 L12 13 Z" fill="currentColor"/></svg><span>Click to fire</span></div><div class="bt-h"><svg viewBox="0 0 24 32" width="26" height="34" aria-hidden="true"><rect x="3" y="2" width="18" height="28" rx="9" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="12" y1="2" x2="12" y2="13" stroke="currentColor" stroke-width="1.4"/><line x1="3" y1="13" x2="21" y2="13" stroke="currentColor" stroke-width="1.4"/><path d="M12 2 A9 9 0 0 1 21 11 L21 13 L12 13 Z" fill="currentColor"/></svg><span>Right-click + drag · pan</span></div><div class="bt-h"><svg viewBox="0 0 24 32" width="26" height="34" aria-hidden="true"><rect x="3" y="2" width="18" height="28" rx="9" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="12" y1="2" x2="12" y2="13" stroke="currentColor" stroke-width="1.4"/><line x1="3" y1="13" x2="21" y2="13" stroke="currentColor" stroke-width="1.4"/><rect x="10.4" y="4.6" width="3.2" height="6.4" rx="1.6" fill="currentColor"/><path d="M9 16.5 l3 -2.6 l3 2.6 M9 22 l3 2.6 l3 -2.6" stroke="currentColor" stroke-width="1.3" fill="none"/></svg><span>Scroll · zoom</span></div><div class="bt-h"><svg viewBox="0 0 56 24" width="58" height="26" aria-hidden="true"><rect x="1.5" y="3" width="53" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14 12.5 v3 h28 v-3" stroke="currentColor" stroke-width="1.5" fill="none"/></svg><span>Spacebar · change ship</span></div>';
  document.body.appendChild(hintEl);
  barsEl=document.createElement('div'); barsEl.id='bt-bars'; document.body.appendChild(barsEl);
  hudEl=document.createElement('div'); hudEl.id='bt-hud'; document.body.appendChild(hudEl); updHud();
  buildPanel();
}
function buildPanel(){
  var host=ctx.debugEl; if(!host) return;
  panelEl=document.createElement('div'); panelEl.className='dbg-ctx'; panelEl.id='dbg-battle';
  function sec(t){ var d=document.createElement('div'); d.className='ctl sec'; d.innerHTML='<label>'+t+'</label>'; return d; }
  function slider(parent,label,get,set,min,max,step,fix){
    var d=document.createElement('div'); d.className='ctl tight';
    var v=get(); d.innerHTML='<label>'+label+' <b>'+Number(v).toFixed(fix)+'</b></label><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'">';
    var inp=d.querySelector('input'), b=d.querySelector('b');
    inp.addEventListener('input',function(){ var x=parseFloat(inp.value); b.textContent=x.toFixed(fix); set(x); saveCfg(); });
    parent.appendChild(d); return d;
  }
  function check(parent,label,get,set){
    var d=document.createElement('div'); d.className='ctl tight'; d.innerHTML='<label class="chk"><input type="checkbox"> '+label+'</label>';
    var inp=d.querySelector('input'); inp.checked=!!get(); inp.addEventListener('change',function(){ set(inp.checked); saveCfg(); }); parent.appendChild(d);
  }
  function key(k,label,min,max,step,fix,after){ slider(panelEl,label,function(){ return P[k]; },function(x){ P[k]=x; if(after) after(); },min,max,step,fix); }
  panelEl.appendChild(sec('Space battle · entry gate'));
  check(panelEl,'Battle enabled',function(){ return P.on; },function(x){ P.on=x; });
  key('density','Density (instance multiplier)',0,2.5,.05,2,function(){ reconT=0; });
  key('speed','Speed',.1,3,.05,2);
  key('scale','Size (all ships)',.3,3,.05,2);
  key('arena','Fighter arena radius',.4,1.4,.02,2);
  key('clear','Fighter clearance around mark',.4,2,.05,2);
  key('laser','Laser frequency',0,4,.05,2);
  key('laserSpeed','Laser speed',.3,3,.05,2);
  key('boltSize','Laser size',.4,3,.05,2);
  var cls=document.createElement('details'); cls.innerHTML='<summary>Per-zone size · speed · fire</summary>'; panelEl.appendChild(cls);
  [['Fighter','scaleFighter','speedFighter','laserFighter'],['Support','scaleSupport','speedSupport','laserSupport'],['Capital','scaleCapital','speedCapital','laserCapital']].forEach(function(r){
    slider(cls,r[0]+' size',function(){ return P[r[1]]; },function(x){ P[r[1]]=x; },.3,3,.05,2);
    slider(cls,r[0]+' speed',function(){ return P[r[2]]; },function(x){ P[r[2]]=x; },0,3,.05,2);
    slider(cls,r[0]+' laser rate',function(){ return P[r[3]]; },function(x){ P[r[3]]=x; },0,3,.05,2);
  });
  slider(cls,'Death Star size',function(){ return P.scaleBase; },function(x){ P.scaleBase=x; },.3,3,.05,2);
  slider(cls,'Hero size',function(){ return P.scaleHero; },function(x){ P.scaleHero=x; },.3,4,.05,2);
  [['Zone 1 · rebel fighters','fighter',REB],['Zone 1 · imperial fighters','fighter',IMP],['Zone 2 · rebel support','support',REB],['Zone 2 · imperial support','support',IMP],['Zone 3 · rebel capital','capital',REB],['Zone 3 · imperial capital','capital',IMP]].forEach(function(g){
    var d=document.createElement('details'); d.innerHTML='<summary>'+g[0]+'</summary>'; panelEl.appendChild(d);
    MODELS.filter(function(m){ return m.cls===g[1]&&m.team===g[2]; }).forEach(function(m){
      slider(d,m.id,function(){ return P.counts[m.id]||0; },function(x){ P.counts[m.id]=x; reconT=0; },0,m.cls==='fighter'?10:(m.cls==='capital'||m.cls==='support'?14:6),1,0);
    });
  });
  var ld=document.createElement('details'); ld.innerHTML='<summary>Lighting</summary>'; panelEl.appendChild(ld);
  var envT=null; function envSoon(){ clearTimeout(envT); envT=setTimeout(buildEnv,120); }
  [['fogK','Distance fog (0 = none, 1 = page default)',0,1.5,.05,0],['exposure','Exposure (filmic)',.3,2.5,.05,0],['lightKey','Sun intensity',0,4,.05,0],['sunAz','Sun azimuth \u00b0',-180,180,5,1],['sunEl','Sun elevation \u00b0',-60,85,5,1],['lightFill','Ambient',0,1.5,.02,0],['lightRim','Cool back fill',0,2,.05,0],
   ['envInt','Reflections (env map)',0,3,.05,0],['rough','Roughness (gloss \u2194 matte)',.15,1,.05,0],['lightScene','Scene lights \u00d7 (ambient/key/warm)',0,1.5,.05,0],
   ['matBright','Hull brightness',.2,1.5,.05,0],['matEmissive','Glow / emissive',0,2,.05,0],['matFighter','Fighter brightness',.2,1.5,.05,0],['dsDim','Death Star dimming (atmospheric perspective)',.1,1,.05,0],['darkLift','Dark plastic lift (TIEs)',0,1,.05,0]].forEach(function(r){
    slider(ld,r[1],function(){ return P[r[0]]; },function(x){ P[r[0]]=x; applyLook(); if(r[0]==='sunAz'||r[0]==='sunEl') envSoon(); },r[2],r[3],r[4],2);
  });
  check(panelEl,'Death Star (only ever one)',function(){ return P.deathStar; },function(x){ P.deathStar=x; reconT=0; });
  var kd=document.createElement('details'); kd.innerHTML='<summary>Minikits · hero</summary>'; panelEl.appendChild(kd);
  slider(kd,'Minikit spawn rate',function(){ return P.kitRate; },function(x){ P.kitRate=x; },0,4,.05,2);
  slider(kd,'Minikits at once',function(){ return P.kitMax; },function(x){ P.kitMax=x; },0,8,1,0);
  slider(kd,'Minikit size',function(){ return P.scaleKit; },function(x){ P.scaleKit=x; },.4,4,.05,2);
  var b=document.createElement('button'); b.className='resetbtn bric-btn bric-btn--sm bric-btn--secondary'; b.textContent='↺ Reset battle sliders';
  b.addEventListener('click',function(){ P=JSON.parse(JSON.stringify(DEFAULTS)); saveCfg(); panelEl.remove(); buildPanel(); reconT=0; });
  panelEl.appendChild(b);
  var xb=document.createElement('button'); xb.className='resetbtn bric-btn bric-btn--sm bric-btn--secondary'; xb.textContent='\u2739 Explode a random capital ship'; xb.addEventListener('click',function(){ explodeRandom('capital'); }); panelEl.appendChild(xb);
  var xs=document.createElement('button'); xs.className='resetbtn bric-btn bric-btn--sm bric-btn--secondary'; xs.style.marginTop='6px'; xs.textContent='\u2739 Explode a random support ship'; xs.addEventListener('click',function(){ explodeRandom('support'); }); panelEl.appendChild(xs);
  var mdiv=document.createElement('div'); mdiv.className='menudiv'; panelEl.appendChild(mdiv);
  var h3=host.querySelector('h3'); host.insertBefore(panelEl,h3?h3.nextSibling:host.firstChild);
}

/* ───────────────────────────── lifecycle ───────────────────────────── */
function makeSparks(){
  var g=new T.BufferGeometry(), pos=new Float32Array(spN*3), col=new Float32Array(spN*3);
  for(var i=0;i<spN;i++) pos[i*3+1]=-999;
  g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setAttribute('color',new T.BufferAttribute(col,3));
  sparks=new T.Points(g,new T.PointsMaterial({size:3,sizeAttenuation:false,vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false}));
  sparks.frustumCulled=false; sparks.userData={vel:new Float32Array(spN*3),life:new Float32Array(spN*2),base:new Float32Array(spN*3)};
  G.add(sparks);
}
function makeBolts(){
  var geo=new T.BoxGeometry(1,1,1);
  [0,1,2].forEach(function(i){
    var mat=new T.MeshBasicMaterial({color:BOLT_COL[i],fog:false});
    for(var n=0;n<200;n++){ var m=new T.Mesh(geo,mat); m.visible=false; m.frustumCulled=false; G.add(m); boltFree[i].push({mesh:m,vel:new T.Vector3(),prev:new T.Vector3(),idx:i,life:0,team:i}); }
  });
}

function resetState(){
  ships=[]; heroShip=null; kits=[]; kitTimer=4; bolts=[]; boltFree=[[],[],[]]; sparks=null; spI=0; flashes=[];
  cache={}; loading={}; loadQ=[]; inflight=0; matList=[]; sceneBase=[]; lights=[]; hyper=null; lastT=null; clockT=0;
  debris=[]; anchorsDirty=true; reconT=0; keys={}; fireHeld=false; pendingHero=null; _ap=null; envTex=null; listeners=[]; sess++;
}
var MWBattle={
  init:function(c){
    if(active) return; dead=false; resetState(); ctx=c; T=c.THREE; P=loadCfg();
    _v1=new T.Vector3(); _v2=new T.Vector3(); _v3=new T.Vector3(); _v4=new T.Vector3(); _ray=new T.Raycaster(); _plane=new T.Plane(); _q=new T.Quaternion(); _zero=new T.Vector3(); _up=new T.Vector3(0,1,0); _aimM=new T.Matrix4(); _ro=new T.Vector3(); _rd=new T.Vector3(); _hT=new T.Vector3(); _hF=new T.Vector3(); DARKLIFT=new T.Color(.30,.38,.44); DARKGLOW=new T.Color(.03,.07,.08); HAZE=new T.Color(.04,.10,.12); _steer=new T.Vector3(); _sep=new T.Vector3();
    G=new T.Group(); G.name='mw-battle'; c.scene.add(G);
    // Stage the battle in the camera's frame at init (includes the saved galaxy-view elevation) so the layout reads the same
    // whatever that elevation is. G is scaled so a camera at ANY distance sees the battle as if it were 4.3 units away.
    var ctr=new T.Vector3().fromArray(c.center), eye=c.pose.pos.clone();
    S=eye.distanceTo(ctr)/LREF; L=LREF; G.position.copy(ctr); G.scale.setScalar(S);
    var m=new T.Matrix4().lookAt(eye,ctr,new T.Vector3(0,1,0)); G.quaternion.setFromRotationMatrix(m);
    baseQ=G.quaternion.clone(); G.updateMatrixWorld(true);
    var hemi=new T.HemisphereLight(0xcfeeea,0x24403e,P.lightFill), key=new T.DirectionalLight(0xfff4e0,P.lightKey);
    var rim=new T.DirectionalLight(0x7fb8e8,P.lightRim);
    [hemi,key,rim].forEach(function(l){ c.scene.add(l); lights.push(l); });
    (c.sceneLights||[]).forEach(function(l){ sceneBase.push({l:l,i:l.intensity}); }); buildEnv(); applyLook();
    kills=0; stage='select'; carIdx=0; carGroup=carWrap=carModel=carModelId=null;
    camFar=c.camera.far; c.camera.far=800; c.camera.updateProjectionMatrix();   // far ships (and the far Death Star) vanished past the page's 100-unit draw distance
    fogBase=c.fog?c.fog.density:0; makeBolts(); makeSparks(); bindInput(); buildUi(); ensureCarousel(); applyLook(); updHud(); syncUi();
    active=true; kitTimer=5; if(c.onStage) c.onStage('select');
    window.MWBattle=MWBattle;
  },
  update:update,
  hyperspace:hyperspace,
  dispose:function(){
    if(dead||!ctx) return; dead=true; active=false;
    listeners.forEach(function(l){ l[0].removeEventListener(l[1],l[2],l[3]); }); listeners.length=0;
    sceneBase.forEach(function(b){ b.l.intensity=b.i; }); sceneBase.length=0;
    lights.forEach(function(l){ ctx.scene.remove(l); }); lights.length=0;
    if(G){ ctx.scene.remove(G); G.traverse(function(o){ if(o.geometry) o.geometry.dispose(); if(o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){ if(m.map&&m.map!==glowTex) m.map.dispose(); m.dispose(); }); } }); }
    if(envTex){ envTex.dispose(); envTex=null; }
    if(ctx.fog&&fogBase) ctx.fog.density=fogBase;
    if(ctx.camera){ ctx.camera.far=camFar; ctx.camera.updateProjectionMatrix(); }
    [carUi,hintEl,hudEl,barsEl,panelEl,styleEl].forEach(function(e){ if(e&&e.parentNode) e.parentNode.removeChild(e); });
    ships.length=0; bolts.length=0; kits.length=0; cache={}; matList=[]; heroShip=null; G=null; sess++;
  },
  isActive:function(){ return active; },
  _ships:function(){ return ships; }, _env:function(){ return envTex; }, _renderer:function(){ return ctx.renderer; }, _ndc:function(s){ return G.localToWorld(s.pos.clone()).project(ctx.camera).toArray(); }, _cam:function(){ return ctx.camera; }, _group:function(){ return G; },
  stats:function(){ return { ships:ships.length, alive:ships.filter(function(s){ return s.alive; }).length, bolts:bolts.length, kits:kits.length, cached:Object.keys(cache).length, cfg:P }; },
  spawnHero:spawnHero, openKit:function(){ if(kits[0]) openKit(kits[0],'api'); },
  onUnlock:null
};
window.MWBattle=MWBattle;
})();
