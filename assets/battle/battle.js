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
  {id:'mil-falcon',        file:'nano-mil-falcon',             team:HERO, cls:'hero',   size:.30, n:0, label:'Millennial Hawk'},
  {id:'n1',                file:'nano-n1',                     team:HERO, cls:'hero',   size:.30, n:0, label:"Bounty Hunter’s M-1", rot:[0,Math.PI,0]},
  {id:'razorcrest',        file:'nano-razorcrest',             team:HERO, cls:'hero',   size:.30, n:0, label:"Razor’s Edge"},
  {id:'slave-1',           file:'nano-slave-1',                team:HERO, cls:'hero',   size:.30, n:0, label:'Indentured Servant 1'},   /* as authored: the neon-orange engine sits at the -Z end, so the nose is +Z with the wings folded vertical (no pre-rotation) */
  // pickup
  {id:'minikit',           file:'minikit',                     team:-1,  cls:'minikit', size:.20, n:0}
];
var BYID={}; MODELS.forEach(function(m){ BYID[m.id]=m; });

// fighters hunting the hero: chance each (re)target picks the hero, max simultaneous hunters, aim spread multiplier, fire-interval multiplier
var HUNT={ chance:.15, max:2, spread:2.4, slow:2.8, lock:[22,34], cool:[5,9], stand:3.8, min:2.8, range:5.2 };   // lock = seconds a hunter stays on the hero, cool = pause before it may hunt again, stand/min = preferred / minimum distance from the hero, range = how far a hunter can shoot at it
var _hs1=null, _hs2=null;
var CLS={   // per-class feel: base fire interval (s), weapon range, bolt aim spread (rad), hp (fighters die + respawn)
  fighter:{ int:.65, range:3.6, spread:.05, hp:3 },
  support:{ int:.55, range:16, spread:.10, hp:30 },    // support + capital ships are destructible by the HERO only (AI-vs-AI hits just spark) — Death Star never is
  capital:{ int:.22, range:24, spread:.12, hp:100 },
  hero:   { int:.13, range:99,  spread:.015 }
};

/* Score = fighter-kill equivalents: a fighter is the base unit, a support ship is worth 3, a capital ship 7 (tune here; the results screen reads these). */
var SCORE={ fighter:1, support:3, capital:7 };
/* Support/capital ships fire BACK at the hero for RETAL.sec after the hero last hit them, in VOLLEYS: each volley is a run of bolts from random hull
   batteries, staggered by RETAL.stagger seconds, then a pause (RETAL.gap) before the next. Aim error is RETAL.spread x the class spread, so most bolts
   miss but a volley that finds you hurts (hero hull = 3 collisions or 15 laser hits). */
var RETAL={ sec:8, spread:1.0, rangeK:1.5, stagger:.06, volley:{support:[3,5],capital:[7,12]}, gap:{support:[1.4,2.2],capital:[1,1.7]} };

var DEFAULTS={
  on:true, density:1, speed:1, scale:1.5, laser:1, laserSpeed:1, boltSize:1, arena:1.7,
  scaleFighter:.5, scaleSupport:1, scaleCapital:1, scaleBase:1, scaleHero:1.6, scaleKit:1,
  speedFighter:.5, speedSupport:1, speedCapital:1,
  laserFighter:1, laserSupport:1, laserCapital:1,
  lightFill:.1, lightKey:1.35, lightRim:.25, lightScene:.25, exposure:1, fogK:.25, envInt:.5, rough:.55, sunAz:20, sunEl:10, matBright:1, matEmissive:1, matFighter:.9, dsDim:.7, clear:1, darkLift:.6,
  kitRate:.3, kitMax:2, deathStar:true, jumpStep:.045, fighterBurn:.35, minBoom:.6, fighterDuck:.35,
  planetOn:true, planetR:22, planetAng:55, planetTilt:-15, planetAlt:.5, planetBright:.8, planetSpin:1.5, dsAng:70, dsTilt:-40, sunStar:true, sunFollow:true,   /* backdrop planet: radius (battle units), planetAng/Tilt = where the planet sits relative to the Death Star's old spot, dsAng/dsTilt = where the Death Star orbits round the planet (negative tilt = BEHIND it from the camera, so the dish faces us), orbit height in Death Star radii above the hull, brightness, spin deg/s; sunStar = the visible star; sunAz/sunEl (null = start opposite the planet, behind the camera at an offset) place the ONE sun that lights the scene and the star sits at; sunFollow = it stays put in the battle when you orbit (off = fixed to the screen) */
  counts:{}, ver:11
};
MODELS.forEach(function(m){ if(m.n) DEFAULTS.counts[m.id]=m.n; });

var P=null, ctx=null, T=null, active=false, dead=false;
var G=null, lights=[], clockT=0, lastT=null, hyper=null, glowTex=null, sess=0, S=1, envTex=null, sunW=null;
var LREF=4.3;   // the battle is authored for a camera 4.3 units from its centre; G is scaled by (real distance / 4.3) so it reads the same from any camera
var cache={}, loading={}, loadQ=[], inflight=0, failed={};
var ships=[], heroShip=null, kits=[], kitTimer=4, kitCount=0;
var bolts=[], boltMats=[], boltFree=[[],[],[]], sparks=null, spN=420, spI=0, flashes=[];
var anchorsDirty=true, reconT=0;
var ptr={x:0,y:0,nx:0,ny:0,in:false,down:0,downX:0,downY:0,out:false};
/* Edge orbit: keep the cursor in the outer ~30% of the screen (each side) for EDGE_DWELL seconds and the camera turns that way, a full 360 and over the top, so the
   player can swing round to the rest of the field. index.html adds MWBattle.getPan() (camera-plane world units) to the camera's LOOK point (the camera turns in place, it does not move). Easing back to the middle
   does not recentre it: the pan stays where the player left it until they pan back, change hero or restart. */
var EDGE_ZONE=.4, EDGE_DWELL=.5, EDGE_RAMP=.9, PAN_SPEED=1.3, PAN_REACH=.45;
var pan={x:0,y:0,vx:0,vy:0,dwell:0}, _panW={x:0,y:0}, orbit={yaw:0,pitch:0}, _orb={yaw:0,pitch:0};
var ORBIT_SPEED=1.2;   // rad/s at full edge pressure (a full turn in ~4 s)
var keys={}, fireHeld=false;
var uiEl=null, hudEl=null, vigEl=null, panelEl=null, styleEl=null, listeners=[];
var BOLT_COL=[0x39ff5a /*imp green*/, 0xff2a2a /*reb red*/, 0xffe14a /*hero yellow*/];
var CX=0, CY=0, CZ=0;   // battle centre in G's local frame = the monogram's entry spot (G sits there, oriented to the entry camera: +x right, +y up, +z toward the viewer)
var baseQ=null, _ryQ=null, rot0=0, rot0T=0;   // rot0 = the galaxy rotation the battle is measured from: the angle when the arcade opened, re-zeroed (eased) when a game starts, so each game opens on the designed framing
var L=4.3;              // entry-camera distance to the centre

var _rf=null;
var _v1, _v2, _v3, _v4, _ray, _plane, _q, _zero, _up;

/* ───────────────────────────── utils ───────────────────────────── */
function rnd(a,b){ return a+Math.random()*(b-a); }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,k){ return a+(b-a)*k; }
function capName(c){ return c.charAt(0).toUpperCase()+c.slice(1); }
function loadCfg(){
  var o=JSON.parse(JSON.stringify(DEFAULTS));
  try{ var s=JSON.parse(localStorage.getItem(LS_KEY)||'null');
    if(s&&s.ver!==DEFAULTS.ver){ delete s.counts; ['lightFill','lightKey','lightRim','lightScene','matBright','matEmissive','matFighter','darkLift','exposure','envInt','rough','sunAz','sunEl','planetSpin','scale','scaleFighter','speedFighter','fogK','scaleHero','kitRate','dsDim','arena'].forEach(function(k){ delete s[k]; }); }   // defaults changed — drop stale saved values
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
var fogBase=0, camFar=100, camNear=.1;
var introHold=true, introT0=0, outroOn=false, introScheduled=false, introGroups=[[],[]], introWant=null, heroMax=3, LASER_DMG=.2,   /* hero hull: 3 = three collisions (any ship, 1 each); an enemy laser hit chips LASER_DMG */  timers=[];
function quiet(){ return !!hyper||outroOn; }                       // nobody fires once the exit starts
function here(s){ return !(s.arriveAt>clockT); }   // false while a ship is still waiting to jump in
// audio (assets/battle/audio.js): where a ship is on screen -> stereo pan + loudness by camera distance
var audioRot0=0, _aw=null, _av=null;
function audioAt(s,big){   // -> {pan,gain,p:[x,y,z]} for MWAudio. p = the ship's direction in CAMERA space (x right, y up, -z ahead), so sounds are 3D-positioned;
                           // big = a support/capital ship: heard clearly from anywhere (they sit far out, mostly off-screen) — only positioned
  if(!window.MWAudio||!ctx||!G) return null;
  if(!_aw){ _aw=new T.Vector3(); _av=new T.Vector3(); }
  _aw.copy(s.pos); G.localToWorld(_aw); var d=ctx.camera.position.distanceTo(_aw);
  _av.copy(_aw).applyMatrix4(ctx.camera.matrixWorldInverse); var L=_av.length();
  var p=L>1e-6?[_av.x/L*4,_av.y/L*4,_av.z/L*4]:[0,0,-4];
  _aw.project(ctx.camera);
  if(!isFinite(_aw.x)||!isFinite(d)||!isFinite(p[0])||!isFinite(p[1])||!isFinite(p[2])) return null;
  var g=Math.max(.12,Math.min(1,16/Math.max(d,1)));
  if(big) return { pan:Math.max(-1,Math.min(1,_aw.z>1?-_aw.x:_aw.x)), gain:.7+.3*g, p:p };
  return { pan:Math.max(-1,Math.min(1,_aw.x)), gain:g*(Math.abs(_aw.x)>1.2||_aw.z>1?.5:1), p:p };
}
var BTU={ exp:{value:1} }, SELDIM=.3;
function patchMaterial(m){   // battle-only filmic curve: highlights roll off instead of clipping, and it does NOT touch the hologram's materials (a global renderer.toneMapping would)
  if(m.userData.btPatched||!m.isMeshStandardMaterial) return; m.userData.btPatched=true;
  m.onBeforeCompile=function(sh){
    sh.uniforms.btExp=BTU.exp;
    sh.fragmentShader='uniform float btExp;\nvec3 btAces(vec3 x){ x*=btExp; return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }\n'+sh.fragmentShader.replace('#include <tonemapping_fragment>','gl_FragColor.rgb=btAces(gl_FragColor.rgb);');
  };
  m.customProgramCacheKey=function(){ return 'btaces1'; };
  m.needsUpdate=true;
}
function sunAzEl(){ return { az:P.sunAz!=null?P.sunAz:(PL?PL.sunAz:35), el:P.sunEl!=null?P.sunEl:(PL?PL.sunEl:35) }; }   // null = start opposite the planet (layoutPlanet)
function sunLocal(out){   // the sun's direction in the BATTLE's own frame (+z = toward the viewer at the designed framing; az 0 = straight behind the camera, + = right)
  var a=sunAzEl(), az=a.az*Math.PI/180, el=a.el*Math.PI/180;
  return out.set(Math.cos(el)*Math.sin(az),Math.sin(el),Math.cos(el)*Math.cos(az));
}
function sunDir(out){   // the same in WORLD space: it turns with the battle when you orbit (sunFollow), or stays fixed to the camera frame at init (ships then turn under it)
  return sunLocal(out).applyQuaternion(P.sunFollow&&G?G.quaternion:baseQ);
}
var envQ=null, envPrev=null, envIdle=0;
function sunEnvWatch(dt){   // the env map bakes the sun's reflection: rebuild it once the battle has turned ~10 degrees from the angle it was built at and stopped moving
  if(!envQ) return;
  var moving=1-Math.abs(envPrev.dot(G.quaternion))>2e-6; envPrev.copy(G.quaternion);
  if(1-Math.abs(envQ.dot(G.quaternion))<.004){ envIdle=0; return; }
  envIdle=moving?0:envIdle+dt; if(envIdle>.3){ envIdle=0; buildEnv(); }
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
  if(G){ envQ=G.quaternion.clone(); envPrev=envQ.clone(); }
}
function applyLook(){
  BTU.exp.value=P.exposure; if(ctx.fog&&fogBase) ctx.fog.density=fogBase*P.fogK;   // scene fog is what made far capital ships fade to black
  if(lights[1]){ sunDir(_v1); lights[1].position.copy(_v1).multiplyScalar(30); lights[2].position.copy(_v1).multiplyScalar(-30); }
  placeSun();
  var SD=stage==='select'?SELDIM:1;   // hero-select page: the whole background fleet is dimmed (the carousel ship has its own un-dimmed materials)
  boltMats.forEach(function(m,i){ m.color.setHex(BOLT_COL[i]).multiplyScalar(SD); });   // lasers dim with the fleet on the select page
  matList.forEach(function(m){ m.envMapIntensity=P.envInt*SD; if(m.roughness!=null) m.roughness=Math.min(1,m.userData.r0*P.rough); });
  matList.forEach(function(m){ var u=m.userData;
    if(u.b0){ if(u.dark) m.color.copy(u.b0).lerp(DARKLIFT,P.darkLift); else m.color.copy(u.b0);
      m.color.multiplyScalar(P.matBright*u.k*(u.fighter?P.matFighter:1));
      if(u.far){ m.color.lerp(HAZE,.28*(1-P.dsDim)).multiplyScalar(P.dsDim); }
      m.color.multiplyScalar(SD); }   // atmospheric perspective: the Death Star is the farthest thing, so it's dimmed and cooled toward the haze
    if(u.dark&&m.emissive){ m.emissive.copy(DARKGLOW).multiplyScalar(P.darkLift); } if(m.emissiveIntensity!=null) m.emissiveIntensity=m.userData.e0*P.matEmissive*(u.far?P.dsDim:1)*SD; });
  planetMats.forEach(function(m){ m.color.setScalar(P.planetBright*SD); });   // the planet dims with the fleet on the hero-select page
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
      },undefined,function(e){ if(mySess!==sess) return; inflight--; delete loading[m.id]; failed[m.id]=true; console.warn('[battle] failed to load',m.file,e); });
    })(m);
  }
}

/* ───────────────────────────── scene objects ───────────────────────────── */
function wantCount(m){
  if(m.cls==='base') return P.deathStar?1:0;
  if(m.cls==='hero'||m.cls==='minikit') return 0;
  if(m.cls==='fighter'&&introWant&&!session.played) return introWant[m.id]||0;   // intro: just one small group per side until a hero is chosen
  return Math.round((P.counts[m.id]||0)*P.density);
}
function pickIntro(){
  introWant={}; [IMP,REB].forEach(function(team){ var pool=MODELS.filter(function(m){ return m.cls==='fighter'&&m.team===team; }); for(var i=0;i<3;i++){ var m=pool[Math.floor(Math.random()*pool.length)]; introWant[m.id]=(introWant[m.id]||0)+1; } });
}
function makeShip(m){
  var c=cache[m.id]; var root=new T.Group(), bank=new T.Group(), fx=new T.Group();
  var model=c.proto.clone(true);
  fx.add(model); bank.add(fx); root.add(bank); G.add(root);
  var s={ m:m, id:m.id, team:m.team, cls:m.cls, root:root, bank:bank, fx:fx, c:c, pos:root.position, dir:new T.Vector3(m.team===IMP?1:-1,0,0),
          arrived:false, arriveAt:0, spd:0, alive:true, hp:(CLS[m.cls]||{}).hp||1, target:null, tT:0, mode:'wander', mT:0, wp:new T.Vector3(), cd:rnd(0,1), ph:rnd(0,6.28), ph2:rnd(0,6.28),
          yawRate:0, bankV:0, respawn:0, jump:null, au:0, av:0, az:0, vel:new T.Vector3(), prev:new T.Vector3(), side:m.team===IMP?-1:1, spawnK:0 };
  s.k=(m.cls==='fighter'||m.cls==='hero')?1:0;
  if(m.cls==='base'){ s.pos.set(0,0,0); }
  ships.push(s); return s;
}
function spawnFighterPos(s,out){
  var ax=arenaAx(), ay=arenaAy(), az=arenaAz();
  return out.set(s.side*rnd(.2,.95)*ax, CY+rnd(-.8,.8)*ay, rnd(-.9,.9)*az);
}
function arenaAx(){ return halfW(0)*3.6*P.arena; }   // one shared play volume: fighters, the hero and minikits all use it (x2 of the previous fighter arena)
function arenaAy(){ return halfH(0)*3.6*P.arena; }
function arenaAz(){ return 7.2*P.arena; }

function reconcile(){
  var order={fighter:0,support:1,capital:2,base:3};
  MODELS.slice().sort(function(a,b){ return (order[a.cls]||9)-(order[b.cls]||9); }).forEach(function(m){
    if(m.cls==='hero'||m.cls==='minikit') return;
    var want=wantCount(m); if(want>0&&!cache[m.id]){ requestModel(m.id); return; }
    var mine=ships.filter(function(s){ return s.id===m.id&&!s.leaving; });
    while(mine.length<want&&cache[m.id]){ var s=makeShip(m); initShip(s); mine.push(s); anchorsDirty=true; }
    for(var q=want;q<mine.length;q++){ mine[q].leaving=true; anchorsDirty=true; }
  });
  if(!cache.minikit) requestModel('minikit');
  pumpLoads();
}
function initShip(s){
  s.arrived=false; s.arriveAt=0; s.spawnK=1;                         // ships appear by jumping in (see the arrival effect in update), not by scaling up
  if(s.cls==='fighter'){
    if(introWant&&!session.played) setupFormation(s);
    else { spawnFighterPos(s,s.pos); s.dir.set(-s.side,rnd(-.3,.3),rnd(-.3,.3)).normalize(); s.spd=1.5; s.mT=rnd(.5,2); s.mode='wander'; pickWp(s); s.arriveAt=clockT+(session.played?rnd(.2,2.4):.3); }
  }
  else if(s.cls==='base'){ s.spin=.035; }
  else if(s.cls==='support'||s.cls==='capital'){ s.arriveAt=introScheduled?clockT:1e9; s.lateSpawn=introScheduled; }   // held back until the intro schedules the staggered hyperspace arrivals
}
// ── intro: one V-formation of 3 per side zig-zags around the hologram until the player picks a hero ──
function setupFormation(s){
  var g=introGroups[s.team===IMP?0:1], idx=g.length, side=s.side, ax=arenaAx(), ay=arenaAy(), az=arenaAz();
  g.push(s);
  if(idx===0) s.pos.set(side*ax*.85,CY+rnd(-.25,.25)*ay,rnd(-.3,.3)*az);
  else s.pos.copy(g[0].pos).add(_v1.set(side*.8*idx,idx%2?.5:-.5,rnd(-.3,.3)));
  s.dir.set(-side,0,0); s.spd=1; s.mode='wander'; s.form={idx:idx,leader:idx===0?null:g[0],flip:1,wp:null}; s.arriveAt=clockT+.5+idx*.15;
}
function updFormation(s,dt){
  var F=s.form, m=s.m, lead=F.leader, steer=_steer, spd=1.15*(m.spd||1)*P.speed, turn=2.4*(m.turn||1);
  if(lead&&(!lead.alive||!lead.form)){ F.leader=lead=null; }
  s.tT-=dt; if(!s.target||!s.target.alive||s.tT<=0) pickTarget(s);
  if(!lead){
    if(!F.wp||s.pos.distanceTo(F.wp)<.9){ F.flip=-(F.flip||1); F.wp=F.wp||new T.Vector3(); F.wp.set(F.flip*rnd(.35,.8)*arenaAx(),CY+rnd(-.7,.7)*arenaAy(),rnd(-.6,.6)*arenaAz()); }
    steer.copy(F.wp).sub(s.pos);
  } else {
    _v2.set(0,1,0).cross(lead.dir).normalize();
    _v3.copy(lead.pos).addScaledVector(lead.dir,-.9).addScaledVector(_v2,(F.idx%2?1:-1)*.75);
    steer.copy(_v3).sub(s.pos); spd=lead.spd+clamp((steer.length()-.15)*2,-.25,1.6); turn*=2.2;
  }
  steer.normalize();
  var kn=keepNorm(s.pos); if(kn<1.25){ _sep.set(s.pos.x-CX,s.pos.y-CY,s.pos.z-CZ).normalize(); steer.addScaledVector(_sep,(1.25-kn)*6+.3).normalize(); }
  s.prev.copy(s.dir); var ang=s.dir.angleTo(steer); if(ang>1e-4) s.dir.lerp(steer,Math.min(1,turn*dt/ang)).normalize();
  s.spd=lerp(s.spd,spd,Math.min(1,dt*2.5)); s.vel.copy(s.dir).multiplyScalar(s.spd); s.pos.addScaledVector(s.vel,dt);
  var yr=(s.prev.z*s.dir.x-s.prev.x*s.dir.z)/Math.max(dt,1e-3); s.yawRate=lerp(s.yawRate,yr,Math.min(1,dt*6));
  aim(s.root,s.dir); s.bankV=lerp(s.bankV,clamp(s.yawRate*.55,-1.1,1.1),Math.min(1,dt*5)); s.bank.rotation.z=s.bankV;
  s.cd-=dt;
  if(s.cd<=0&&s.target&&s.target.alive){ var to=_v2.copy(s.target.pos).sub(s.pos), dist=to.length();
    if(dist<CLS.fighter.range*1.8&&s.dir.angleTo(to.normalize())<.6){ fireAt(s,s.target.pos,s.target.vel); s.cd=fireInterval(s); } }
  else if(s.cd<=0) s.cd=.4;
}
function endIntro(){
  introWant=null; ships.forEach(function(s){ if(s.form){ s.form=null; s.mode='wander'; s.mT=1; pickWp(s); } }); reconT=0;
}
function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
// intro: every support/capital ship jumps in from hyperspace one at a time, sides interleaved, spread across 3 seconds
function tryScheduleIntro(){
  var want=0, ready=true;
  MODELS.forEach(function(m){ if(m.cls==='support'||m.cls==='capital'){ var w=wantCount(m); want+=w; if(w>0&&!cache[m.id]) ready=false; } });
  var larges=ships.filter(function(s){ return (s.cls==='support'||s.cls==='capital')&&!s.leaving&&s.hasA; });
  if((!ready||larges.length<want)&&clockT-introT0<10) return;
  var a=shuffle(larges.filter(function(s){ return s.team===IMP; })), b=shuffle(larges.filter(function(s){ return s.team===REB; })), order=[];
  while(a.length||b.length){ if(a.length) order.push(a.pop()); if(b.length) order.push(b.pop()); }
  var n=order.length; order.forEach(function(s,i){ s.arriveAt=clockT+.4+(n>1?i/(n-1):0)*3+rnd(0,.06); });
  introScheduled=true;
}
function startArrive(s){
  var au=audioAt(s); if(au&&(s.cls==='capital'||s.cls==='support')) MWAudio.arrive(au,s.cls,s.lateSpawn);   // lateSpawn: after the opening fly-in, so always cued
  s.arr=0; flash(s.pos,Math.max(s.c.hx,s.c.hy,s.c.hz)*s.root.scale.x*(s.cls==='capital'?2.6:2)+.25,0xcff8ff);
}
function updArrive(s,dt){
  s.arr=Math.min(1,s.arr+dt/.375); /* 2x faster than the first version */ var e=1-s.arr, big=(s.cls==='capital'||s.cls==='base')?1:0;
  s.fx.scale.set(Math.max(.4,1-e*.6),Math.max(.4,1-e*.6),1+e*(big?10:6));
  s.fx.position.z=-(e*e)*(big?30:18)/Math.max(s.root.scale.x,.01);
  if(s.arr>=1){ s.fx.scale.set(1,1,1); s.fx.position.set(0,0,0); }
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
/* ── backdrop planet + the sun ──
   One of the planets in assets/battle/models/planets (unit spheres, textured, lit like any hull) hangs far behind the battle. The Death Star sits in low orbit
   over it with its dish facing the surface, and the sun is opposite the planet: it comes from the far side of the scene (in front of and above the battle), so the
   whole fleet is lit from one direction and the planet's lit face is the one turned toward us. Everything is derived from layoutPlanet() so the debug sliders keep the three consistent. */
var PLANETS=['desert_tan','ice_white','jungle_craters','ocean_blue','swamp_green','twilight_gas','volcanic_bands'];
var PL=null, planet=null, planetMats=[], planetState=0;   // PL = layout; planetState 0 = not requested, 1 = loading, 2 = ready, 3 = failed
function layoutPlanet(){
  var cp=new T.Vector3(0,0,L), a=anchorWorld(-.42,.36,-11,new T.Vector3()), v=a.clone().sub(cp), d0=v.length(); v.normalize();
  var Dn=80, D0=cp.clone().addScaledVector(v,Dn), dsK0=Dn/d0;   // the Death Star's classic spot and its scale factor (apparent size = model size / d0 at any distance)
  var R=P.planetR, alt=1+P.planetAlt, dsR0=1.4*P.scale*P.scaleBase*dsK0;   // model size 2.8 / 2 = radius 1.4
  // planet: placed relative to the classic spot (planetAng = screen direction from the planet's centre to that spot, planetTilt = toward the camera)
  var ang=P.planetAng*Math.PI/180, tl=P.planetTilt*Math.PI/180;
  var u=new T.Vector3(Math.cos(ang)*Math.cos(tl),Math.sin(ang)*Math.cos(tl),Math.sin(tl));
  var Pc=D0.clone().addScaledVector(u,-(R+dsR0*alt));
  // Death Star: in low orbit round the planet, BEHIND it from the camera (dsTilt < 0), so its dish (which faces the planet) turns toward us: a 3/4 front view.
  // It is farther from the camera than the classic spot, so it is rescaled by the distance ratio to keep the same apparent size (a few passes: orbit height depends on its size).
  var da=P.dsAng*Math.PI/180, dt=P.dsTilt*Math.PI/180, w=new T.Vector3(Math.cos(da)*Math.cos(dt),Math.sin(da)*Math.cos(dt),Math.sin(dt));
  var dsK=dsK0, D=D0.clone(), dsR=dsR0;
  for(var i=0;i<4;i++){ dsR=1.4*P.scale*P.scaleBase*dsK; D.copy(Pc).addScaledVector(w,R+dsR*alt); dsK=D.distanceTo(cp)/d0; }
  // sun: opposite the planet. Light: azimuth mirrors the planet's (at least 40° off the camera axis so there is real shading), elevation lifts above the battle.
  var dp=Pc.clone().sub(new T.Vector3(CX,CY,CZ)).normalize(), azP=Math.atan2(dp.x,dp.z), elP=Math.asin(clamp(dp.y,-1,1));
  var az=azP+Math.PI; if(az>Math.PI) az-=2*Math.PI; var sg=az<0?-1:1; az=sg*Math.max(Math.abs(az),40*Math.PI/180);
  var el=clamp(-elP+20*Math.PI/180,30*Math.PI/180,55*Math.PI/180);
  PL={ D0:D, dsK:dsK, dsR:dsR, Pc:Pc, R:R, sunAz:az*180/Math.PI, sunEl:el*180/Math.PI };   // sunAz/El = the default sun: opposite the planet, so behind the camera, offset to the side the planet is not on
}
var SUN_DIST=150;   // how far from the battle's centre the star sits, along the sun's direction (battle units; camera.far is raised to reach it)
var sunObj=null;
function makeSun(){   // a hot white core with a warm glow and a faint halo: additive sprites, no fog, far behind everything
  var c=document.createElement('canvas'); c.width=c.height=128; var g=c.getContext('2d'), gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.12,'rgba(255,252,235,1)'); gr.addColorStop(.28,'rgba(255,226,160,.55)'); gr.addColorStop(.6,'rgba(255,190,110,.14)'); gr.addColorStop(1,'rgba(255,170,90,0)');
  g.fillStyle=gr; g.fillRect(0,0,128,128);
  var tex=new T.CanvasTexture(c); sunObj=new T.Group(); sunObj.name='mw-sun';
  [[26,1],[56,.2]].forEach(function(r){ var sp=new T.Sprite(new T.SpriteMaterial({map:tex,blending:T.AdditiveBlending,depthWrite:false,fog:false,transparent:true,opacity:r[1]})); sp.scale.set(r[0],r[0],1); sunObj.add(sp); });
  G.add(sunObj); placeSun();
}
function placeSun(){ if(!sunObj) return; sunLocal(_v2).multiplyScalar(SUN_DIST); sunObj.position.copy(_v2); sunObj.visible=P.sunStar; }   // the star sits where the light comes from, in the battle's frame
function pickPlanet(){
  var last=null; try{ last=sessionStorage.getItem('mw_planet'); }catch(e){}
  var pool=PLANETS.filter(function(n){ return n!==last; }), n=pool[Math.floor(Math.random()*pool.length)];
  try{ sessionStorage.setItem('mw_planet',n); }catch(e){}
  return n;
}
function loadPlanet(){
  if(!P.planetOn||planetState) return; planetState=1; var mySess=sess, name=pickPlanet();
  ctx.createLoader().load(BASE+'planets/'+name+'.glb',function(g){
    if(mySess!==sess||dead) return;
    var mesh=null; g.scene.traverse(function(o){ if(o.isMesh&&!mesh) mesh=o; });
    if(!mesh){ planetState=3; return; }
    [].concat(mesh.material).forEach(function(m){
      m.side=T.FrontSide; m.fog=false; m.metalness=0; m.envMap=null; m.envMapIntensity=0;   // far behind everything: no fog haze, no env reflections (the sun's own light does the shading)
      patchMaterial(m); planetMats.push(m); });
    var spin=new T.Group(), tilt=new T.Group(); spin.add(g.scene); tilt.add(spin); tilt.rotation.set(.22,0,.35);   // axial tilt
    planet=new T.Group(); planet.name='mw-planet'; planet.add(tilt); planet.userData.spin=spin;
    planet.position.copy(PL.Pc); planet.scale.setScalar(PL.R); G.add(planet); planetState=2; applyLook();
  },undefined,function(e){ if(mySess!==sess) return; planetState=3; console.warn('[battle] failed to load planet',name,e); });
}
function updPlanet(dt){ if(!planet) return; planet.visible=P.planetOn; planet.userData.spin.rotation.y+=dt*P.planetSpin*Math.PI/180; }
function relayoutPlanet(){   // debug sliders: move the planet, re-seat the Death Star in its orbit, re-aim the sun
  layoutPlanet(); if(planet){ planet.position.copy(PL.Pc); planet.scale.setScalar(PL.R); }
  ships.forEach(function(s){ if(s.cls==='base'&&s.hasA){ s.pos.copy(PL.D0); s.dsK=PL.dsK; } });
  applyLook();
}
function assignAnchors(){
  ships.forEach(function(s){ if((s.cls==='support'||s.cls==='capital')&&!s.leaving&&!s.hasA) placeLarge(s); });
  // Death Star: the FARTHEST ship in the battle (beyond the outer edge of the capital ships' shell, so nothing can pass behind it), in LOW ORBIT over the
  // backdrop planet. It keeps the sight-line it always sat on, scaled up by the distance ratio so it reads at the same size; the planet is built around it.
  ships.forEach(function(s){ if(s.cls==='base'&&!s.hasA){ s.pos.copy(PL.D0); s.dsK=PL.dsK; s.hasA=true; } });   // low orbit over the backdrop planet (layoutPlanet)
  anchorsDirty=false;
}

function enemies(s){ return ships.filter(function(e){ return e.alive&&!e.leaving&&e.cls!=='base'&&e.team!==s.team&&e.team!==HERO&&!e.jump&&here(e); }); }
function pickTarget(s){
  if(s.cls==='fighter'&&heroShip&&heroShip.alive&&!quiet()&&!s.form&&!(s.huntCool>0)&&Math.random()<HUNT.chance){
    var hn=0; for(var hi=0;hi<ships.length;hi++){ if(ships[hi]!==s&&ships[hi].alive&&ships[hi].cls==='fighter'&&ships[hi].target===heroShip) hn++; }   // only fighters count toward the hunter cap (large ships retaliate separately)
    if(hn<HUNT.max){ s.target=heroShip; s.tT=99; s.huntT=rnd(HUNT.lock[0],HUNT.lock[1]); s.orbit=Math.random()<.5?1:-1; s.mode='pursue'; s.mT=1; return; }   // a few fighters at a time break off to hunt the hero
  }
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
  if(quiet()) return;
  var mp=muzzle(s,_v1.set(0,0,0)); var cl=CLS[s.cls];
  var d=_v2.copy(tpos); if(tvel){ var dist=d.distanceTo(mp); d.addScaledVector(tvel,dist/(7*P.laserSpeed)*.7); }
  d.sub(mp).normalize();
  var sp=cl.spread*((s.target&&s.target.hero)?(s.cls==='fighter'?HUNT.spread:RETAL.spread):1); d.x+=rnd(-1,1)*sp; d.y+=rnd(-1,1)*sp; d.z+=rnd(-1,1)*sp; d.normalize();
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
  var au=audioAt(s); if(au) MWAudio.boom('fighter',au,s.team===REB);
  burst(s.pos,0xffa040,26,1.7,.85); burst(s.pos,0xffffff,10,2.4,.45);
  shatter(s,{small:true}); s.form=null;
  s.alive=false; s.root.visible=false; s.respawn=rnd(2.5,5.5); s.target=null;
}
// ── fighter death sequence (random): like the hero's, a doomed fighter doesn't always just pop. With chance P.fighterBurn it catches fire, tumbles out of control
// trailing flame and smoke for about 1-2 s, then explodes. No material changes (fighters share materials with their prototype), only particles and flashes.
var BURN_MAX=4.7;   // longest a burning death runs (s). Death-sequence clips are pre-compressed to fit under this (see docs); anything longer is faded out as a safety
function fighterDown(s){
  if(!quiet()&&!s.burnDeath&&Math.random()<P.fighterBurn) startBurn(s); else killShip(s);
}
function startBurn(s){
  s.alive=false; s.target=null; s.form=null;   // out of the fight at once: not targetable, no collisions, no more shots
  s.burnDeath={t:0,dur:rnd(1.1,2.3),ph:[rnd(0,6.3),rnd(0,6.3),rnd(0,6.3)],roll:rnd(8,15)*(Math.random()<.5?-1:1),nextHit:rnd(.25,.5),spd0:Math.max(.4,s.spd||.5)};
  burst(s.pos,0xff8030,14,1.2,.6); flash(s.pos,.35,0xffb060);
  var au=audioAt(s), B=s.burnDeath;
  if(au&&window.MWAudio){
    if(MWAudio.hitLaserAt) MWAudio.hitLaserAt(au);   // the laser-hit sound(s) the hero gets, placed at the fighter
    var sd=MWAudio.fighterDeath?MWAudio.fighterDeath(s.id,au,BURN_MAX):null;   // this ship's own death-sequence clip (Battle Sound Review page)
    if(sd){ B.dur=Math.max(.9,sd.dur-.1); B.snd=sd.h; }   // ...sets how long the sequence runs; the starfighter explosion then ends it
    if(MWAudio.duckFighter) MWAudio.duckFighter(B.dur+1.2);   // the rest of the mix sits down for the whole burn and the explosion after it
  }
}
function updFighterBurn(s,dt){
  var B=s.burnDeath, k=Math.min(1,B.t/B.dur); B.t+=dt;
  if(B.snd&&window.MWAudio){ var at=audioAt(s); if(at) MWAudio.track(B.snd,at); }   // the death sound follows the tumbling ship
  _v1.set(Math.sin(B.t*3.1+B.ph[0]),Math.sin(B.t*4.3+B.ph[1]),Math.sin(B.t*3.7+B.ph[2])); if(_v1.lengthSq()<1e-4) _v1.set(0,1,0); _v1.normalize();
  s.dir.applyAxisAngle(_v1,(3+9*k)*(.6+.4*Math.sin(B.t*8))*dt).normalize();   // erratic loops, tighter as it goes
  s.spd=B.spd0*(1+.6*k); s.vel.copy(s.dir).multiplyScalar(s.spd); s.pos.addScaledVector(s.vel,dt);
  aim(s.root,s.dir); s.bank.rotation.z+=dt*B.roll*(.6+k);   // corkscrewing roll
  s.root.visible=true;
  burst(s.pos,0xff5a14,2,.8,.45); burst(s.pos,0xffb030,1,1.1,.35); if(Math.random()<.5) burst(s.pos,0x4a4a4a,2,.45,.9);   // flames and smoke
  if(Math.random()<.12) flash(s.pos,.22+.25*k,0xff8a30);
  if(B.t>=B.nextHit){ B.nextHit=B.t+rnd(.25,.5); burst(s.pos,0xffe08a,8,1.3,.45); }   // the odd tearing flare
  if(B.t>=B.dur){ s.burnDeath=null; burst(s.pos,0xffe08a,18,2,.7); killShip(s); }   // then the usual explosion + break-up
}
// ── capital / support destruction: a long chain of explosions along the hull, then it breaks apart
var debris=[], shardGeo=null, shardMat=null, tagHeroDebris=false;   // tagHeroDebris: pieces added while true belong to the hero's break-up (the game-over card waits for them)
function startDying(s){
  if(s.dying||!s.hasA) return;
  s.alive=false; s.target=null; s.hpShow=0; if(s.barEl) s.barEl.style.display='none';
  s.dying={t:0,dur:s.cls==='capital'?8:4.5,nx:0,base:s.pos.clone()};
  var au=audioAt(s,true); if(au&&window.MWAudio){ var ad=MWAudio.deathStart(s.cls,au); if(ad){ s.dying.aud=ad.plan; if(ad.dur) s.dying.dur=ad.dur; } }   // a lead-up sequence sets how long the ship takes to die
}
function hullPoint(s,out){
  var c=s.c; out.set(rnd(-1,1)*c.hx,rnd(-.6,1)*c.hy,rnd(-1,1)*c.hz); s.root.updateMatrix(); return out.applyMatrix4(s.root.matrix);
}
function updDying(s,dt){
  var D=s.dying; D.t+=dt; var k=Math.min(1,D.t/D.dur), sz=Math.max(s.c.hx,s.c.hy,s.c.hz)*s.root.scale.x, big=s.cls==='capital';
  var amp=(.003+.02*k)*sz; if(!D.ph) D.ph=[rnd(0,6.3),rnd(0,6.3),rnd(0,6.3),rnd(0,6.3)];
  s.pos.set(D.base.x+amp*(Math.sin(D.t*5.3+D.ph[0])+.5*Math.sin(D.t*11.7+D.ph[3])), D.base.y+amp*(Math.sin(D.t*6.1+D.ph[1])+.5*Math.sin(D.t*9.4+D.ph[0])), D.base.z+amp*(Math.sin(D.t*4.7+D.ph[2])+.5*Math.sin(D.t*12.9+D.ph[1])));   // the hull shudders harder as it goes — smooth low-frequency wobble, not per-frame noise
  if(D.aud&&D.aud.h&&window.MWAudio){ var au3=audioAt(s,true); if(au3) MWAudio.track(D.aud.h,au3); }   // the lead-up sound follows the dying ship (and the camera orbit)
  D.nx-=dt;
  while(D.nx<=0){
    D.nx+=(.55-.4*k)*rnd(.6,1.4)/(big?1:.8);
    hullPoint(s,_v1);
    if(D.aud){ var au2=audioAt(s,true); if(au2) MWAudio.deathLayer(D.aud,au2); }
    burst(_v1,0xff9a3a,14+Math.round(26*k),1.2+sz*.5,.9); burst(_v1,0xffffff,5,2+sz*.4,.4);
    flash(_v1,sz*(.35+.5*k)*rnd(.7,1.3),0xffa850);
    if(k>.6&&Math.random()<.35){ hullPoint(s,_v2); flash(_v2,sz*.9,0xffe2a0); burst(_v2,0xffd070,40,2.4+sz*.6,1.1); }   // secondary blasts late in the sequence
  }
  if(D.t>=D.dur) breakApart(s);
}
function addDebris(g,v,spin,life,drag){
  debris.push({g:g,v:v,spin:spin,t:0,life:life,drag:drag==null?.25:drag,hero:tagHeroDebris});
  while(debris.length>700){ var o=debris.shift(); G.remove(o.g); }
}
// pieces fly off a destroyed ship: its hull layers (one mesh per material) plus shards. small:true = fighter-sized cloud.
function shatter(s,o){
  var sz=Math.max(s.c.hx,s.c.hy,s.c.hz)*s.root.scale.x, small=!!o.small, big=s.cls==='capital';
  if(!shardGeo){ shardGeo=new T.BoxGeometry(1,1,1); shardMat=new T.MeshStandardMaterial({color:0x6a7077,roughness:.8,metalness:.2}); }
  s.root.updateMatrixWorld(true);
  s.root.traverse(function(m){
    if(!m.isMesh) return;
    var pg=new T.Group(); pg.position.copy(s.pos); pg.quaternion.copy(s.root.quaternion); pg.scale.copy(s.root.scale);
    var rel=new T.Matrix4().copy(s.root.matrixWorld).invert().multiply(m.matrixWorld), m2=m.clone(); rel.decompose(m2.position,m2.quaternion,m2.scale); pg.add(m2); G.add(pg);
    var sp=small?rnd(.5,1.5):sz*rnd(.08,.22)*(big?1:1.3);
    addDebris(pg,new T.Vector3(rnd(-1,1),rnd(-1,1),rnd(-1,1)).normalize().multiplyScalar(sp),new T.Vector3(rnd(-1,1),rnd(-1,1),rnd(-1,1)).multiplyScalar(small?1.2:.25),small?rnd(1.6,2.8):rnd(5.5,7));
  });
  var n=small?12:(big?24:13);
  for(var i=0;i<n;i++){
    var m=new T.Mesh(shardGeo,shardMat); hullPoint(s,m.position); m.scale.set(rnd(.04,.14)*sz,rnd(.03,.1)*sz,rnd(.05,.18)*sz); m.quaternion.setFromEuler(new T.Euler(rnd(0,6),rnd(0,6),rnd(0,6)));
    G.add(m); addDebris(m,_v3.copy(m.position).sub(s.pos).normalize().multiplyScalar(small?rnd(.6,2.2):sz*rnd(.25,.7)),new T.Vector3(rnd(-3,3),rnd(-3,3),rnd(-3,3)),small?rnd(1.4,3):rnd(3,5.5));
  }
}

// ── real fragmentation for capital/support ships. The model's triangles are split into "atoms" (connected islands — bricks, studs,
//    turrets; oversized islands are cut on a fine grid), cached per model. At break-up a random handful of atoms fly free as individual
//    pieces, and the rest are grouped on a randomly offset coarse grid into a few large sub-constructions. Every piece gets its own
//    velocity (away from a random blast point + noise), spin, drag and lifetime, so nothing moves as one group.
function buildAtoms(s){
  var c=cache[s.id]; if(c.atoms) return c.atoms;
  s.root.updateMatrixWorld(true);
  var inv=new T.Matrix4().copy(s.root.matrixWorld).invert(), meshes=[], mn=new T.Vector3(1e9,1e9,1e9), mx=new T.Vector3(-1e9,-1e9,-1e9), v=new T.Vector3();
  s.root.traverse(function(m){
    if(!m.isMesh||!m.geometry||!m.geometry.attributes.position||Array.isArray(m.material)) return;
    var g=m.geometry, pa=g.attributes.position, mat=new T.Matrix4().multiplyMatrices(inv,m.matrixWorld), lp=new Float32Array(pa.count*3);
    for(var i=0;i<pa.count;i++){ v.fromBufferAttribute(pa,i).applyMatrix4(mat); lp[3*i]=v.x; lp[3*i+1]=v.y; lp[3*i+2]=v.z; mn.min(v); mx.max(v); }
    var ix=g.index?g.index.array:null;
    meshes.push({m:m,g:g,lp:lp,ix:ix,nt:Math.floor((ix?ix.length:pa.count)/3),nm:new T.Matrix3().getNormalMatrix(mat)});
  });
  var ext=Math.max(mx.x-mn.x,mx.y-mn.y,mx.z-mn.z)||1, q=20000/ext, total=0; meshes.forEach(function(M){ total+=M.nt; });
  var bigT=Math.max(400,total*.05), fine=ext/9, atoms=[];
  meshes.forEach(function(M,mi){
    var lp=M.lp, ix=M.ix, nv=lp.length/3, wid=new Int32Array(nv), W=new Map(), nw=0;
    for(var i=0;i<nv;i++){ var key=(Math.round((lp[3*i]-mn.x)*q)*20011+Math.round((lp[3*i+1]-mn.y)*q))*20011+Math.round((lp[3*i+2]-mn.z)*q); var w=W.get(key); if(w===undefined){ w=nw++; W.set(key,w); } wid[i]=w; }
    var par=new Int32Array(nw); for(i=0;i<nw;i++) par[i]=i;
    function find(a){ while(par[a]!==a){ par[a]=par[par[a]]; a=par[a]; } return a; }
    function tv(t,k){ return ix?ix[3*t+k]:3*t+k; }
    for(var t=0;t<M.nt;t++){ var a=find(wid[tv(t,0)]), b=find(wid[tv(t,1)]), cc=find(wid[tv(t,2)]); if(a!==b) par[b]=a; b=find(b); if(a!==cc) par[find(cc)]=find(a); }
    var isl=new Map();
    for(t=0;t<M.nt;t++){ var r=find(wid[tv(t,0)]), L=isl.get(r); if(!L){ L=[]; isl.set(r,L); } L.push(t); }
    function mk(tris){   // atom = triangle list + centroid
      var sx=0,sy=0,sz=0; for(var j=0;j<tris.length;j++){ var a0=tv(tris[j],0); sx+=lp[3*a0]; sy+=lp[3*a0+1]; sz+=lp[3*a0+2]; }
      atoms.push({mi:mi,tris:tris,x:sx/tris.length,y:sy/tris.length,z:sz/tris.length});
    }
    isl.forEach(function(L){
      if(L.length<=bigT){ mk(L); return; }
      var cells=new Map();   // oversized island (a welded hull): cut it into fine-grid cells so it can still break into bits
      for(var j=0;j<L.length;j++){ var a0=tv(L[j],0), k=(Math.floor((lp[3*a0]-mn.x)/fine)*64+Math.floor((lp[3*a0+1]-mn.y)/fine))*64+Math.floor((lp[3*a0+2]-mn.z)/fine), C=cells.get(k); if(!C){ C=[]; cells.set(k,C); } C.push(L[j]); }
      cells.forEach(mk);
    });
  });
  return (c.atoms={meshes:meshes,list:atoms,ext:ext,cx:(mn.x+mx.x)/2,cy:(mn.y+mx.y)/2,cz:(mn.z+mx.z)/2,mn:mn.clone()});
}
function pieceGeo(M,tris,cx,cy,cz){   // non-indexed geometry of the given triangles, in ship-local space, recentred on (cx,cy,cz)
  var g=M.g, lp=M.lp, ix=M.ix, nA=g.attributes.normal, cA=g.attributes.color, uA=g.attributes.uv, n=tris.length*3;
  var pos=new Float32Array(n*3), nor=nA?new Float32Array(n*3):null, col=cA?new Float32Array(n*3):null, uv=uA?new Float32Array(n*2):null, o=0, _n=new T.Vector3();
  for(var i=0;i<tris.length;i++) for(var k=0;k<3;k++,o++){
    var vi=ix?ix[3*tris[i]+k]:3*tris[i]+k;
    pos[3*o]=lp[3*vi]-cx; pos[3*o+1]=lp[3*vi+1]-cy; pos[3*o+2]=lp[3*vi+2]-cz;
    if(nor){ _n.set(nA.getX(vi),nA.getY(vi),nA.getZ(vi)).applyMatrix3(M.nm).normalize(); nor[3*o]=_n.x; nor[3*o+1]=_n.y; nor[3*o+2]=_n.z; }
    if(col){ col[3*o]=cA.getX(vi); col[3*o+1]=cA.getY(vi); col[3*o+2]=cA.getZ(vi); }
    if(uv){ uv[2*o]=uA.getX(vi); uv[2*o+1]=uA.getY(vi); }
  }
  var geo=new T.BufferGeometry(); geo.setAttribute('position',new T.BufferAttribute(pos,3));
  if(nor) geo.setAttribute('normal',new T.BufferAttribute(nor,3)); else geo.computeVertexNormals();
  if(col) geo.setAttribute('color',new T.BufferAttribute(col,3)); if(uv) geo.setAttribute('uv',new T.BufferAttribute(uv,2));
  return geo;
}
function fragment(s,vk,lk){
  vk=vk||1; lk=lk||1;   // vk = throw speed multiplier, lk = piece lifetime multiplier (the hero's break-up is a close-up: faster, shorter)
  var A=buildAtoms(s); if(!A.list.length) return false;
  var sz=Math.max(s.c.hx,s.c.hy,s.c.hz)*s.root.scale.x, big=s.cls==='capital', q=s.root.quaternion, sc=s.root.scale;
  var list=A.list.slice(), nFree=Math.min(list.length>>1,big?160:80), free=[];
  for(var i=0;i<nFree;i++){ var j=i+Math.floor(Math.random()*(list.length-i)), t=list[i]; list[i]=list[j]; list[j]=t; free.push(list[i]); }
  var rest=list.slice(nFree);
  // a couple of blast points inside the hull: pieces are thrown away from the nearest one
  var blasts=[]; for(i=0;i<3;i++) blasts.push(new T.Vector3(A.cx+rnd(-.4,.4)*A.ext,A.cy+rnd(-.2,.2)*A.ext*.5,A.cz+rnd(-.4,.4)*A.ext));
  function launch(parts,cx,cy,cz,smallPiece){
    var g=new T.Group(); parts.forEach(function(P){ g.add(new T.Mesh(pieceGeo(A.meshes[P.mi],P.tris,cx,cy,cz),A.meshes[P.mi].m.material)); });
    g.position.set(cx*sc.x,cy*sc.y,cz*sc.z).applyQuaternion(q).add(s.pos); g.quaternion.copy(q); g.scale.copy(sc); G.add(g);
    var b=blasts[0], bd=1e9; blasts.forEach(function(B){ var d=(B.x-cx)*(B.x-cx)+(B.y-cy)*(B.y-cy)+(B.z-cz)*(B.z-cz); if(d<bd){ bd=d; b=B; } });
    var dir=new T.Vector3(cx-b.x,cy-b.y,cz-b.z); if(dir.lengthSq()<1e-8) dir.set(rnd(-1,1),rnd(-1,1),rnd(-1,1));
    dir.normalize().multiplyScalar(rnd(.4,1)).add(new T.Vector3(rnd(-1,1),rnd(-1,1),rnd(-1,1)).multiplyScalar(smallPiece?.9:.5)).normalize().applyQuaternion(q);
    var sp=(smallPiece?sz*rnd(.1,.8):sz*rnd(.04,.22))*vk, spin=smallPiece?rnd(1.2,4.5):rnd(.15,.7);
    addDebris(g,dir.multiplyScalar(sp),new T.Vector3(rnd(-1,1),rnd(-1,1),rnd(-1,1)).multiplyScalar(spin),(smallPiece?rnd(2.2,7):rnd(5.5,9.5))*lk,smallPiece?rnd(.05,.35):rnd(.1,.3));
  }
  free.forEach(function(a){ launch([{mi:a.mi,tris:a.tris}],a.x,a.y,a.z,true); });
  // the rest: grouped on a randomly offset coarse grid into a handful of large sub-constructions
  var cell=A.ext/rnd(2.2,3.4), ox=rnd(0,cell), oy=rnd(0,cell), oz=rnd(0,cell), cells=new Map();
  rest.forEach(function(a){
    var k=(Math.floor((a.x-A.mn.x+ox)/cell)*64+Math.floor((a.y-A.mn.y+oy)/cell))*64+Math.floor((a.z-A.mn.z+oz)/cell), C=cells.get(k);
    if(!C){ C={parts:{},sx:0,sy:0,sz:0,n:0}; cells.set(k,C); }
    var P=C.parts[a.mi]; if(!P) P=C.parts[a.mi]={mi:a.mi,tris:[]}; for(var i=0;i<a.tris.length;i++) P.tris.push(a.tris[i]);
    C.sx+=a.x; C.sy+=a.y; C.sz+=a.z; C.n++;
  });
  cells.forEach(function(C){ launch(Object.keys(C.parts).map(function(k){ return C.parts[k]; }),C.sx/C.n,C.sy/C.n,C.sz/C.n,false); });
  return true;
}
function later(delay,fn){ timers.push({t:delay,fn:fn}); }
function breakApart(s){
  var au=audioAt(s,true); if(au) MWAudio.deathFinal(s.dying&&s.dying.aud,s.cls,au);
  var sz=Math.max(s.c.hx,s.c.hy,s.c.hz)*s.root.scale.x, big=s.cls==='capital', pos=s.pos.clone();
  // THE big one: as the hull shatters — an enormous white flash, a ring of blasts across the hull, then two delayed aftershocks
  flash(pos,sz*6,0xffffff); burst(pos,0xffffff,70,5+sz,.9); burst(pos,0xffa040,220,3.5+sz*1.2,1.9);
  for(var i=0;i<(big?10:6);i++){ hullPoint(s,_v1); flash(_v1,sz*rnd(1.2,2.2),0xffb060); burst(_v1,0xffd070,50,2.8+sz*.7,1.2); }
  later(.22,function(){ flash(pos,sz*4.5,0xffe2a0); burst(pos,0xffa040,150,3+sz,1.5); });
  later(.5,function(){ flash(pos,sz*3,0xff9040); burst(pos,0xff7020,90,2.4+sz*.8,1.4); });
  var okF=false; try{ okF=fragment(s); }catch(e){ if(window.console) console.warn('fragment failed',e); }
  if(!okF) shatter(s,{});
  s.dying=null; s.root.visible=false; s.respawn=rnd(28,45);
}
function updTimers(dt){ for(var i=timers.length-1;i>=0;i--){ timers[i].t-=dt; if(timers[i].t<=0){ var f=timers[i].fn; timers.splice(i,1); f(); } } }
function updDebris(dt){
  for(var i=debris.length-1;i>=0;i--){
    var d=debris[i]; d.t+=dt; d.g.position.addScaledVector(d.v,dt); d.v.multiplyScalar(Math.max(0,1-d.drag*dt));
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
  if(s.hero){ if(b.team===HERO||s.inv>0) return; s.hp-=LASER_DMG; if(window.MWAudio){ MWAudio.heroHitLaser(); if(s.hp<=1+1e-6&&s.hp>1e-6) MWAudio.heroLowHealth(); } flash(s.pos,.25,0xffd090); heroHit(s,false); updHud(false); hudHurt(); if(s.hp<=1e-6) heroDeath(s); return; }
  if(s.form&&b.team!==HERO) return;   // the intro formations can't be shot down by the AI
  if(b.team===HERO&&window.MWReticle) MWReticle.hit();   // a hero laser landed: hit marker in the reticle
  if(s.cls==='fighter'){ s.hp--; if(b.team===HERO) s.hpShow=2.4; if(s.hp<=0){ fighterDown(s); s.hpShow=0; if(s.barEl) s.barEl.style.display='none'; if(b.team===HERO){ kills+=SCORE.fighter; tally.fighter++; updHud(true); } } }
  else if((s.cls==='support'||s.cls==='capital')&&b.team===HERO){
    s.hp--; s.hpShow=3.2; s.provT=clockT+RETAL.sec;   // the hero is shooting at us: shoot back for a few seconds
    if(s.hp<=0){ startDying(s); kills+=SCORE[s.cls]; tally[s.cls]++; updHud(true); }
  }
}
// ── floating health bars (DOM) over large ships that have just been hit by the hero
var barsEl=null;
function updBars(dt){
  if(!barsEl) return;
  var r=ctx.dom.getBoundingClientRect();
  ships.forEach(function(s){
    if(!(s.cls==='support'||s.cls==='capital'||s.cls==='fighter')) return;
    if(s.hpShow>0&&s.alive&&!quiet()){
      s.hpShow-=dt;
      if(!s.barEl){ s.barEl=document.createElement('div'); s.barEl.className='bt-bar'; s.barEl.innerHTML='<i></i>'; barsEl.appendChild(s.barEl); }
      _hF.copy(s.pos); _hF.y+=s.c.r*s.root.scale.x*1.1+.15; G.localToWorld(_hF); _hF.project(ctx.camera);
      if(_hF.z>1){ s.barEl.style.display='none'; return; }
      var pct=Math.max(0,s.hp/(s.maxhp||CLS.fighter.hp)); if(s.cls==='fighter') s.barEl.classList.add('sm');
      s.barEl.style.display='block'; s.barEl.style.left=((_hF.x+1)/2*r.width+r.left)+'px'; s.barEl.style.top=((1-_hF.y)/2*r.height+r.top)+'px';
      s.barEl.style.opacity=Math.min(1,s.hpShow*1.2);
      var f=s.barEl.firstChild; f.style.width=(pct*100)+'%'; f.style.background='hsl('+Math.round(pct*110)+',90%,55%)';
    } else if(s.barEl&&s.barEl.style.display!=='none') s.barEl.style.display='none';
    // red flashing crosshair above any fighter that is hunting the hero
    var hunting=s.cls==='fighter'&&s.alive&&!s.dying&&heroShip&&heroShip.alive&&s.target===heroShip&&!quiet()&&stage==='play'&&here(s);
    if(hunting){
      if(!s.xhEl){ s.xhEl=document.createElement('div'); s.xhEl.className='bt-xh'; s.xhEl.innerHTML='<svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><circle cx="14" cy="14" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14 1v8M14 19v8M1 14h8M19 14h8" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>'; barsEl.appendChild(s.xhEl); }
      _hF.copy(s.pos); _hF.y+=s.c.r*s.root.scale.x*1.1+.42; G.localToWorld(_hF); _hF.project(ctx.camera);
      if(_hF.z>1){ s.xhEl.style.display='none'; }
      else{ s.xhEl.style.display='block'; s.xhEl.style.left=((_hF.x+1)/2*r.width+r.left)+'px'; s.xhEl.style.top=((1-_hF.y)/2*r.height+r.top)+'px'; }
    } else if(s.xhEl&&s.xhEl.style.display!=='none') s.xhEl.style.display='none';
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
        var s=ships[j]; if(!s.alive||s.cls==='base'||s.jump||s.leaving||!here(s)) continue;
        if(b.team===HERO){ if(s.team===HERO) continue; } else if(s.team===b.team) continue;   // enemy lasers can now hit the hero too
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
  if(s.out){ updLeave(s,dt); return; }
  if(s.form){ updFormation(s,dt); return; }
  var m=s.m, turn=3.2*(m.turn||1), base=1.9*(m.spd||1)*P.speed*P.speedFighter;
  if(s.target&&s.target.hero&&s.target.alive){   // hunting the hero: hold the lock for the whole hunt, then back off for a while
    s.huntT-=dt; s.mode='pursue'; s.mT=1;
    if(s.huntT<=0){ s.target=null; s.huntCool=rnd(HUNT.cool[0],HUNT.cool[1]); s.mode='wander'; s.mT=rnd(1,2); pickWp(s); }
  } else if(s.huntCool>0) s.huntCool-=dt;
  s.tT-=dt; if(s.mode==='pursue'&&(!s.target||!s.target.alive||s.tT<=0)) pickTarget(s);
  s.mT-=dt; if(s.mT<=0||(s.mode==='pursue'&&!s.target)) nextMode(s);
  var steer=_steer.set(0,0,0), spd=base;
  if(s.mode==='pursue'&&s.target&&s.target.hero){   // keep a standoff distance: close in to ~stand, then circle; back right off if the hero gets inside min
    if(!_hs1){ _hs1=new T.Vector3(); _hs2=new T.Vector3(); }
    _hs1.copy(s.target.pos).sub(s.pos); var hd=_hs1.length()||1e-3; _hs1.multiplyScalar(1/hd);
    _hs2.crossVectors(_hs1,_hs2.set(0,1,0)); if(_hs2.lengthSq()<1e-4) _hs2.set(1,0,0); _hs2.normalize().multiplyScalar((s.orbit||1)*.7);
    if(hd<HUNT.min) steer.copy(_hs1).multiplyScalar(-1.6).add(_hs2.multiplyScalar(.4)); else steer.copy(_hs1).multiplyScalar(clamp((hd-HUNT.stand)/.8,-1.2,1)).add(_hs2);
    spd=base*(hd<HUNT.min?1.35:1.0);
  }
  else if(s.mode==='pursue'&&s.target){ steer.copy(s.target.pos).addScaledVector(s.target.vel,.3).sub(s.pos); spd=base*1.18; }
  else if(s.mode==='evade'){ steer.copy(s.wp).sub(s.pos); steer.x+=Math.sin(clockT*5+s.ph)*.6; steer.y+=Math.cos(clockT*4.3+s.ph2)*.6; spd=base*1.45; if(steer.lengthSq()<.2) pickWp(s); }
  else { steer.copy(s.wp).sub(s.pos); if(steer.lengthSq()<.25) pickWp(s); }
  steer.normalize();
  // separation (fighters keep ~2.2 units from each other)
  for(var i=0;i<ships.length;i++){ var o=ships[i]; if(o===s||!o.alive||o.cls!=='fighter'&&o.cls!=='hero') continue;
    _sep.copy(s.pos).sub(o.pos); var d2=_sep.lengthSq(); if(d2<4.84&&d2>1e-6){ var dd=Math.sqrt(d2); steer.addScaledVector(_sep,(1-dd/2.2)*2.2/dd); } }
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
    if(dist<(s.target.hero?HUNT.range:CLS.fighter.range) && s.dir.angleTo(to.normalize())<(s.target.hero?1.3:.28)){ fireAt(s,s.target.pos,s.target.vel); s.cd=fireInterval(s)*(s.target.hero?HUNT.slow:1); }
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
  // provoked (the hero hit us within RETAL.sec): aim at the hero instead of the usual AI target
  var angry=s.provT>clockT&&heroShip&&heroShip.alive&&!quiet()&&stage==='play';
  if(angry){ if(s.target!==heroShip){ s.target=heroShip; } s.tT=Math.max(s.tT,.3); }
  else if(s.target&&s.target.hero){ s.target=null; s.tT=0; }
  s.tT-=dt; if(!s.target||!s.target.alive||s.tT<=0) pickTarget(s);
  s.cd-=dt;
  if(s.cd<=0){
    var tg=s.target&&s.target.alive?s.target:null, hunting=!!(tg&&tg.hero), rng=CLS[s.cls].range*(hunting?RETAL.rangeK:1);
    if(tg&&tg.pos.distanceTo(s.pos)<rng){ if(hunting) fireVolley(s); else fireAt(s,tg.pos,tg.vel); }
    s.cd=hunting?rnd(RETAL.gap[s.cls][0],RETAL.gap[s.cls][1]):fireInterval(s);
  }
}
function fireVolley(s){   // a barrage at the hero: many bolts from random hull batteries over ~half a second
  var v=RETAL.volley[s.cls]||RETAL.volley.support, n=Math.round(rnd(v[0],v[1]));
  for(var i=0;i<n;i++) later(i*RETAL.stagger+rnd(0,.03),function(){ if(s.alive&&!s.dying&&heroShip&&heroShip.alive&&!quiet()) fireAt(s,heroShip.pos,heroShip.vel); });
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
  if(PL) aim(s.root,_v1.copy(PL.Pc).sub(s.pos).normalize());   // in orbit: the superlaser dish (the model's +Z) faces the planet below it
  else aim(s.root,_v1.set(CX-s.pos.x,CY-s.pos.y,CZ-s.pos.z).normalize());   // no planet: trained on the hologram
  s.bank.rotation.z=0;                                                    // no roll: keeps the dish on the upper hemisphere
}

/* ───────────────────────────── hero + stages ───────────────────────────── */
// stage 'select': the hologram's head is replaced by a carousel of the playable hero ships (◄ PLAY ► under the cone).
// stage 'play'  : every hologram artifact hides (ctx.onStage) and the chosen hero flies — it travels toward the mouse, fires where you click.
var HEROES=['mil-falcon','n1','razorcrest','slave-1'];
var session={played:false,hero:null,heroes:[],heroIds:[],t0:0}, stage='select', carIdx=0, carGroup=null, carWrap=null, carModel=null, carModelId=null, carK=0, kills=0, tally={fighter:0,support:0,capital:0}, carUi=null, hintEl=null, pendingHero=null;
var _ro=null, _rd=null, _hT=null, _hF=null;
function reticleDom(playing){ if(!ctx||!ctx.dom) return; if(playing&&window.MWReticle){ ctx.dom.setAttribute('data-mw-reticle','arcade'); ctx.dom.style.cursor='none'; } else { ctx.dom.removeAttribute('data-mw-reticle'); ctx.dom.style.cursor=''; } }   // data-mw-reticle: the site-wide reticle (index.html) steps aside over the canvas while the arcade reticle is up
function setStage(st){ if(stage===st) return; stage=st; if(st==='play'&&ctx&&ctx.getRot) rot0T=ctx.getRot(); reticleDom(st==='play'); if(window.MWAudio) MWAudio.stage(st); if(G) applyLook(); if(st==='play') endIntro(); if(ctx.onStage) ctx.onStage(st); syncUi(); }
function stepCar(d){ carIdx=(carIdx+d+HEROES.length)%HEROES.length; carK=0; }
function playHero(){ spawnHero(HEROES[carIdx]); }
function spawnHero(id){
  ejectHero(true); cam.death=false; cam.breakup=false; cam.snap=false;
  var m=BYID[id]; if(!m) return;
  if(!cache[id]){ requestModel(id); pumpLoads(); pendingHero=id; return; }
  var s=makeShip(m); heroShip=s; s.hero=true; s.hp=heroMax;
  s.pos.set(0,0,0); s.dir.set(1,.12,-.1).normalize(); s.spd=0; s.spawnK=1; s.cd=0; s.gun=0; s.hp=heroMax; s.maxhp=heroMax; s.inv=0;
  burst(s.pos,0xaaf5ee,18,1.4,.6); fireHeld=false; if(window.MWAudio) MWAudio.heroStart(id);
  if(!session.played){ session.played=true; session.t0=performance.now(); }
  session.hero={id:m.id,label:m.label}; if(session.heroes.indexOf(m.label)<0) session.heroes.push(m.label); if(session.heroIds.indexOf(m.id)<0) session.heroIds.push(m.id);
  setStage('play');
}
function changeHero(){ ejectHero(false); fireHeld=false; setStage('select'); }
function ejectHero(silent){
  if(!heroShip) return; heroShip.inv=0; heroFlash(heroShip);   // the hero model's materials are shared with its prototype: put the opacity back
  if(window.MWAudio&&!silent) MWAudio.heroStop(); heroFxReset(heroShip); heroShip.alive=false; burst(heroShip.pos,0xaaf5ee,14,1.2,.5);
  G.remove(heroShip.root); ships.splice(ships.indexOf(heroShip),1); heroShip=null;
}
// pointer → ray in G-local space
function localRay(nx,ny){
  _ray.setFromCamera(_v4.set(nx,ny,.5),ctx.camera);
  _ro.copy(_ray.ray.origin); G.worldToLocal(_ro);
  _rd.copy(_ray.ray.direction).applyQuaternion(_q.copy(G.quaternion).invert()).normalize();
  if(!_rf) _rf=new T.Vector3(); ctx.camera.getWorldDirection(_rf).applyQuaternion(_q).normalize();   // the camera's forward, in G-local
}
// What is the pointer on? An object (ship / minikit) gives a real XYZ; empty space is approximated by the plane at the hero's depth.
// Writes the target into `out` (G-local) and returns the object hit, or null.
function pickAt(nx,ny,out){
  localRay(nx,ny); var best=null, bt=1e9;
  function test(c,r,o){ _hF.copy(c).sub(_ro); var tca=_hF.dot(_rd); if(tca<0) return; var d2=_hF.lengthSq()-tca*tca; if(d2>r*r) return; var t=tca-Math.sqrt(r*r-d2); if(t<bt){ bt=t; best=o; } }
  ships.forEach(function(sh){ if(!sh.alive||sh.hero||sh.jump||sh.leaving||!here(sh)) return; test(sh.pos,Math.max(sh.c.r*sh.root.scale.x*1.25,.2),sh); });
  kits.forEach(function(k){ if(!k.opening) test(k.pos,.38*k.root.scale.x+.1,k); });
  if(!best){   // forgiving pick: nearest ship/kit to the cursor in screen space (works for targets whose sphere the ray misses, e.g. just behind or beside the hero)
    var bd=.085;
    var asp=ctx.camera.aspect||1;
    var cand=function(o,p){ _hF.copy(p); G.localToWorld(_hF); _hF.project(ctx.camera); if(_hF.z>1) return; var dx=(_hF.x-nx)*asp, dy=_hF.y-ny, dd=Math.sqrt(dx*dx+dy*dy); if(dd<bd){ bd=dd; best=o; } };
    ships.forEach(function(sh){ if(!sh.alive||sh.hero||sh.jump||sh.leaving||sh.cls==='base'||!here(sh)) return; cand(sh,sh.pos); });
    kits.forEach(function(k){ if(!k.opening) cand(k,k.pos); });
  }
  if(best){ out.copy(best.pos); return best; }
  // empty space: the point under the cursor on the plane through the hero PERPENDICULAR TO THE VIEW (a fixed-z plane degenerates as the hero nears the camera,
  // which threw the target around and made the ship slow down and wobble)
  var den=_rd.dot(_rf), t=6; if(heroShip&&den>1e-4){ t=_hF.copy(heroShip.pos).sub(_ro).dot(_rf)/den; if(!(t>.3)) t=.3; }
  out.copy(_ro).addScaledVector(_rd,t); return null;
}
var INV_COLLIDE=3;   // seconds of invulnerability (to ships AND lasers) after a collision; the hero's opacity pulses while it lasts
function heroFlash(s){   // opacity pulse during invulnerability, restored to each material's own opacity afterwards
  var on=s.inv>0, a=on?.3+.7*(.5+.5*Math.sin(clockT*26)):1;
  if(!on&&!s._flash) return; s._flash=on;
  s.root.traverse(function(m){ if(!m.isMesh||!m.material) return;
    (Array.isArray(m.material)?m.material:[m.material]).forEach(function(mt){
      var d=mt.userData; if(!d.op0) d.op0={t:mt.transparent,o:mt.opacity};
      var tr=a<1||d.op0.t; if(mt.transparent!==tr){ mt.transparent=tr; mt.needsUpdate=true; }
      mt.opacity=d.op0.o*a; }); });
}
function heroCollide(s,dt){   // bumping other ships hurts (nothing actively targets the hero — yet)
  s.inv-=dt; s.root.visible=true; heroFlash(s);
  var hr=Math.max(s.c.hx,s.c.hz)*s.root.scale.x*.8;
  for(var i=0;i<ships.length;i++){ var o=ships[i];
    if(o===s||!o.alive||o.dying||o.jump||o.leaving||!here(o)||o.cls==='base'||o.cls==='hero') continue;
    var r=o.cls==='fighter'?Math.max(o.c.hx,o.c.hz)*o.root.scale.x*.8:lr(o)*.9;
    _v1.copy(s.pos).sub(o.pos); var d=_v1.length(); if(d>=hr+r) continue;
    var n=d>1e-4?_v1.multiplyScalar(1/d):_v1.set(0,1,0); s.pos.addScaledVector(n,hr+r-d+.02);
    if(s.inv<=0){ s.inv=INV_COLLIDE; s.hp-=1; s.spd*=.25; if(window.MWAudio){ MWAudio.heroCollide(); if(s.hp<=1+1e-6&&s.hp>1e-6) MWAudio.heroLowHealth(); } s.dir.lerp(n,.5).normalize();
      burst(_v2.copy(s.pos).addScaledVector(n,-hr*.5),0xffc060,18,1.4,.6); flash(s.pos,hr*3,0xffd090); heroHit(s,true); updHud(false); hudHurt();
      if(s.hp<=0){ heroDeath(s); return; } }
  }
}
// damage feedback: sparks, a shake of the model, and a red emissive pulse (restored when it ends); `big` = collision, else laser chip
function heroHit(s,big){
  burst(s.pos,0xffc060,big?34:12,big?2.2:1.4,big?.7:.4); burst(s.pos,0xff3020,big?16:5,big?1.6:1,.5);
  s.shake=Math.max(s.shake||0,big?1:.4); s.hurtT=Math.max(s.hurtT||0,big?1:.55); s.hurtDur=s.hurtT;
}
function heroFx(s,dt){
  if(s.shake>0){ s.shake=Math.max(0,s.shake-dt*2.4); var a=s.shake*.09*(s.c.r||.3), t=clockT*70; s.bank.position.set(Math.sin(t)*a,Math.sin(t*1.31+1)*a,Math.sin(t*.87+2)*a); }
  else if(s.bank.position.lengthSq()>0) s.bank.position.set(0,0,0);
  var on=s.hurtT>0; if(on) s.hurtT=Math.max(0,s.hurtT-dt);
  var k=on?Math.abs(Math.sin((1-s.hurtT/s.hurtDur)*Math.PI*(s.hurtDur>.8?3:2)))*Math.min(1,s.hurtT/s.hurtDur*2.5):0;   // two/three red pulses that fade out
  s.root.traverse(function(m){ if(!m.isMesh||!m.material||!m.material.emissive) return; var mt=m.material;
    if(!mt.userData.hurt0) mt.userData.hurt0={e:mt.emissive.clone(),i:mt.emissiveIntensity};
    if(k>0){ mt.emissive.setRGB(1,.08,.04); mt.emissiveIntensity=Math.max(mt.userData.hurt0.i,2.2*k); }
    else if(mt.userData.hurt1){ mt.emissive.copy(mt.userData.hurt0.e); mt.emissiveIntensity=mt.userData.hurt0.i; }
    mt.userData.hurt1=k>0; });
}
function heroFxReset(s){ if(!s) return; s.hurtT=0; s.shake=0; s.root.traverse(function(m){ if(!m.isMesh||!m.material||!m.material.userData.hurt0) return; var mt=m.material; mt.emissive.copy(mt.userData.hurt0.e); mt.emissiveIntensity=mt.userData.hurt0.i; mt.userData.hurt1=false; }); }
function hudHurt(){ if(!hudEl) return; hudEl.classList.add('hurt'); setTimeout(function(){ if(hudEl) hudEl.classList.remove('hurt'); },320); }
/* ── camera assist ──
   index.html reads MWBattle.getCamAssist() each frame: zoom (multiplies the camera's distance from the look point), yaw (a galaxy rotation to ease toward, or null),
   focus + fk (the death close-up: the camera swings its pivot onto the dying ship by fk 0..1).
   • dynamic zoom: the further the hero is from the camera (toward the back of the play volume) the closer the camera comes in; it relaxes back as the hero returns.
   • auto snap: a hero flying at the camera that reaches the screen before the volume's edge keeps its heading, and the camera swings round to face that way.
   • death: zooms right in on the burning ship, then holds on the break-up. */
var cam={follow:0,z:1,zT:1,snap:false,snapT:0,aligned:0,cool:0,yaw:null,fk:0,death:false,breakup:false,focusL:null,focusW:null,out:{zoom:1,yaw:null,fk:0,focus:null}};
var _camL=null, _camRef=null, _cen=null, _hd=null;
function camReset(){ cam.z=cam.zT=1; cam.snap=false; cam.snapT=0; cam.cool=0; cam.follow=0; cam.yaw=null; cam.fk=0; cam.death=false; cam.breakup=false; }
function smooth01(x){ x=clamp(x,0,1); return x*x*(3-2*x); }
function updHeroSnap(s,dt){   // returns true while the hero is held on its heading by the snap
  cam.cool=Math.max(0,cam.cool-dt); cam.yaw=null; cam.zT=1;
  if(!_camL){ _camL=new T.Vector3(); _camRef=new T.Vector3(); _cen=new T.Vector3(); _hd=new T.Vector3(); }
  if(reduceMotion()||stage!=='play'||quiet()||s.burning){ cam.snap=false; return false; }
  _cen.set(CX,CY,CZ); G.worldToLocal(_camL.copy(ctx.camera.position));
  _camRef.copy(_camL).sub(_cen).divideScalar(cam.z).add(_cen);                 // where the camera sits WITHOUT the auto zoom, so the zoom doesn't feed back into its own trigger
  var dCen=_camRef.distanceTo(_cen)||1, dShip=_camRef.distanceTo(s.pos), r=dShip/dCen;
  var dFar=clamp((dShip-dCen)/(arenaAz()*.5),0,1), dNear=clamp((dCen-dShip)/(dCen*.55),0,1);   // how far into the back of the volume / how close to the lens (the camera is only L from the centre, so "near" is measured against that, not the arena depth)
  cam.zT=1-.6*smooth01(dFar)+.8*smooth01(dNear);                               // far: come all the way in (.4x); near: pull back out (1.8x) so the ship stays framed
  var ax=arenaAx()*1.12, ay=arenaAy()*1.1, az=arenaAz();
  var atEdge=s.pos.z>=az*.9-.06||Math.abs(s.pos.x)>=ax-.06||Math.abs(s.pos.y-CY)>=ay-.06;
  _hd.copy(_camRef).sub(s.pos).normalize(); var toward=s.dir.dot(_hd);
  _v4.copy(s.dir).applyQuaternion(G.quaternion); var hz=Math.hypot(_v4.x,_v4.z);   // heading in WORLD space; the camera looks down -z
  var err=Math.abs(Math.atan2(Math.sin(Math.PI-Math.atan2(_v4.x,_v4.z)),Math.cos(Math.PI-Math.atan2(_v4.x,_v4.z))));   // how far the camera still has to swing
  if(!cam.snap){ if(cam.cool<=0&&toward>.4&&dShip<.6*dCen&&!atEdge&&hz>.25){ cam.snap=true; cam.snapT=0; cam.aligned=0; } }
  else {   // hold the heading until the camera has swung round (the swing itself moves the camera, so don't judge "toward" mid-turn), then give control back
    cam.snapT+=dt; cam.aligned=err<.08?cam.aligned+dt:0;
    if(cam.aligned>.5||atEdge||cam.snapT>3||hz<.2){ cam.snap=false; cam.cool=2; } }
  if(cam.snap){ cam.yaw=(ctx.getRot?ctx.getRot():0)+(Math.PI-Math.atan2(_v4.x,_v4.z)); }   // rotate the battle so the heading points straight away from the camera
  return cam.snap;
}
function updCamAssist(dt){
  var s=heroShip;
  if(s&&s.alive&&!s.burning&&!cam.death) { /* zT / yaw are set by updHeroSnap during updHero */ }
  else if(!cam.death){ cam.snap=false; cam.yaw=null; cam.zT=1; }
  if(cam.snap) cam.follow=2.5; else cam.follow=Math.max(0,cam.follow-dt);
  var fkT=cam.death?1:0;
  if(!cam.death&&cam.follow>0&&s&&s.alive){ if(!cam.focusL) cam.focusL=new T.Vector3(); cam.focusL.copy(s.pos); fkT=.7; }   // after a snap, keep the hero framed while the camera settles behind it
  if(cam.death){ cam.zT=cam.breakup?.45:.3; cam.yaw=null; if(s&&s.burning) cam.focusL.copy(s.pos); }
  var rm=reduceMotion();
  if(cam.death&&rm){ cam.z=.6; cam.fk=1; }
  else { cam.z+=(cam.zT-cam.z)*(1-Math.exp(-dt*(cam.death?2.4:2.6))); cam.fk+=(fkT-cam.fk)*(1-Math.exp(-dt*(cam.death?2.2:3))); }
  cam.out.zoom=cam.z; cam.out.yaw=cam.yaw; cam.out.fk=cam.fk;
  if(cam.focusL){ if(!cam.focusW) cam.focusW=new T.Vector3(); cam.focusW.copy(cam.focusL); G.localToWorld(cam.focusW); cam.out.focus=cam.focusW; } else cam.out.focus=null;
}
function waitHeroDebris(t){   // the game-over card waits for the hero's pieces to finish flying (capped)
  for(var i=0;i<debris.length;i++) if(debris[i].hero&&t<5) { later(.25,function(){ waitHeroDebris(t+.25); }); return; }
  later(.5,function(){
    if(dead||!active) return;
    if(window.MWAudio&&MWAudio.gameOver) MWAudio.gameOver(); if(ctx.onGameOver) ctx.onGameOver();
  });
}
// The hero doesn't just vanish at 0 hull: it catches fire, tumbles and zooms erratically in loops for ~3.4 s while the camera dives in on it, then it explodes and breaks into pieces; the game-over card appears once they have flown.
function heroDeath(s){
  if(s.burning) return;
  s.burning={t:0,dur:3.4,ph:[rnd(0,6.3),rnd(0,6.3),rnd(0,6.3)],nextHit:.35}; s.inv=1e9; s.hp=0; fireHeld=false; updHud(false);
  if(window.MWAudio){ MWAudio.heroFireUp(); MWAudio.heroDying(); }
  burst(s.pos,0xff8030,40,2,.9); flash(s.pos,.9,0xffb060);
  cam.death=true; cam.breakup=false; cam.snap=false; cam.focusL=cam.focusL||new T.Vector3(); cam.focusL.copy(s.pos);   // death close-up
}
function updHeroBurn(s,dt){
  var B=s.burning, k=Math.min(1,B.t/B.dur); B.t+=dt;
  _v1.set(Math.sin(B.t*3.7+B.ph[0]),Math.sin(B.t*5.1+B.ph[1]),Math.sin(B.t*4.3+B.ph[2])); if(_v1.lengthSq()<1e-4) _v1.set(0,1,0); _v1.normalize();
  s.dir.applyAxisAngle(_v1,(4+7*k)*(.6+.4*Math.sin(B.t*9))*dt).normalize();                 // wrenches through erratic loops, tighter and faster as it goes
  s.spd=lerp(s.spd,2.2+1.6*k,Math.min(1,dt*3));
  s.vel.copy(s.dir).multiplyScalar(s.spd); s.pos.addScaledVector(s.vel,dt);
  var ax=arenaAx()*1.12, ay=arenaAy()*1.1, az=arenaAz();
  s.pos.x=clamp(s.pos.x,-ax,ax); s.pos.y=clamp(s.pos.y,CY-ay,CY+ay); s.pos.z=clamp(s.pos.z,-az,az*.9);
  aim(s.root,s.dir); s.bank.rotation.z+=dt*(7+11*k);                                           // corkscrewing roll
  s.root.visible=true;
  // fire: a hot orange emissive pulse, a trail of flames and smoke, the odd flare
  var pl=.5+.5*Math.sin(B.t*30);
  s.root.traverse(function(m){ if(!m.isMesh||!m.material||!m.material.emissive) return; var mt=m.material;
    if(!mt.userData.hurt0) mt.userData.hurt0={e:mt.emissive.clone(),i:mt.emissiveIntensity};
    mt.emissive.setRGB(1,.3+.25*pl,.04); mt.emissiveIntensity=1.5+1.8*pl; mt.userData.hurt1=true; });
  burst(s.pos,0xff5a14,3,.9,.55); burst(s.pos,0xffb030,2,1.3,.4); if(Math.random()<.6) burst(s.pos,0x4a4a4a,2,.5,1);
  if(Math.random()<.18) flash(s.pos,.3+.4*k,0xff8a30);
  if(B.t>=B.nextHit){ B.nextHit=B.t+rnd(.45,.85); burst(s.pos,0xffe08a,12,1.6,.5); }   // metal tearing apart (visual only: the death-sequence sound comes from heroDying)
  if(window.MWAudio) MWAudio.heroEngine(clamp((s.spd-.1)/.9,0,1));
  if(B.t>=B.dur) finishHeroDeath(s);
}
function finishHeroDeath(s){
  if(window.MWAudio) MWAudio.heroDestroyed();
  var pos=s.pos.clone();
  burst(pos,0xffa040,110,3.4,1.6); burst(pos,0xffffff,40,4.4,.9); flash(pos,2.4,0xfff0c0);
  later(.2,function(){ flash(pos,1.6,0xffe2a0); burst(pos,0xffa040,70,2.6,1.3); });
  later(.45,function(){ flash(pos,1.1,0xff9040); burst(pos,0xff7020,50,2,1.2); });
  var okF=false; tagHeroDebris=true;   // the hull comes apart into its real pieces (same fragmenting as the big ships), thrown harder and shorter-lived for the close-up
  try{ okF=fragment(s,2.4,.7); }catch(e){ if(window.console) console.warn('hero fragment failed',e); }
  if(!okF) shatter(s,{});
  tagHeroDebris=false;
  cam.breakup=true; cam.focusL.copy(pos);
  ejectHero(true); fireHeld=false; session.died=true; updHud(false);
  waitHeroDebris(0);   // let the whole explosion + break-up play out before the game over card and sting
}
function updHero(s,dt){
  if(s.burning){ updHeroBurn(s,dt); return; }
  var hold=updHeroSnap(s,dt);   // auto camera snap: while held the hero ignores the pointer and flies on along its heading
  var o=pickAt(ptr.nx,ptr.ny,_hT);
  if(!ptr.in) _hT.copy(s.pos).addScaledVector(s.dir,1);               // pointer off the canvas: coast on
  var to=_v2.copy(_hT).sub(s.pos), d=to.length();
  if(!o&&!hold&&_rf){ var dz=_hF.copy(s.pos).sub(_cen.set(CX,CY,CZ)).dot(_rf); if(dz>0) to.addScaledVector(_rf,-dz*.5); }   // the cursor can't say how deep: drift back toward mid-depth when the hero is FAR side; never pull it back from the near side (it must fly right up to the camera)
  s.prev.copy(s.dir);
  if(d>.15&&!hold){ to.normalize(); var ang=s.dir.angleTo(to);   // true rotation toward the target, so a target directly behind still turns the ship around (a straight lerp stalls near 180°)
    if(ang>1e-4){ var tax=_v3.crossVectors(s.dir,to); if(tax.lengthSq()<1e-6) tax.crossVectors(s.dir,_up); if(tax.lengthSq()<1e-6) tax.set(1,0,0); tax.normalize();
      var rate=3.6*(ang>2?1.6:1); s.dir.applyAxisAngle(tax,Math.min(ang,rate*dt)).normalize(); } }
  var HSPD=.5;   // hero speed: half of the original, easier to control
  var want=d<.2?0:clamp(d*1.6,.3,3.2)*P.speed*HSPD; if(o&&d<.9) want=Math.min(want,.4*HSPD);   // hovering an object: ease in, don't ram it
  if(hold) want=Math.max(want,s.spd,.5);
  s.spd=lerp(s.spd,want,Math.min(1,dt*3));
  s.vel.copy(s.dir).multiplyScalar(s.spd); s.pos.addScaledVector(s.vel,dt);
  var ax=arenaAx()*1.12, ay=arenaAy()*1.1, az=arenaAz();   // same volume the fighters fly in (fighters' soft bound sits just inside)
  s.pos.x=clamp(s.pos.x,-ax,ax); s.pos.y=clamp(s.pos.y,CY-ay,CY+ay); s.pos.z=clamp(s.pos.z,-az,az*.9);
  var yr=(s.prev.z*s.dir.x-s.prev.x*s.dir.z)/Math.max(dt,1e-3);
  s.yawRate=lerp(s.yawRate,yr,Math.min(1,dt*6));
  aim(s.root,s.dir);
  s.bankV=lerp(s.bankV,clamp(s.yawRate*.5,-1.2,1.2),Math.min(1,dt*5)); s.bank.rotation.z=s.bankV;
  heroFx(s,dt);
  if(window.MWAudio){ MWAudio.heroEngine(clamp((s.spd-.1)/.9,0,1)); if(fireHeld&&!quiet()) MWAudio.heroFireHeld(); }
  s.cd-=dt;
  if(!quiet()&&fireHeld&&s.cd<=0){   // fire toward wherever the pointer is on (an object's XYZ, or the depth-plane point)
    pickAt(ptr.nx,ptr.ny,_hT);
    var mp=muzzle(s,_v1.set(0,0,0)); var dd=_v2.copy(_hT).sub(mp); if(dd.lengthSq()<1e-4) dd.copy(s.dir); dd.normalize();
    dd.x+=rnd(-1,1)*CLS.hero.spread; dd.y+=rnd(-1,1)*CLS.hero.spread; dd.normalize();
    spawnBolt(HERO,mp,dd,true); s.cd=CLS.hero.int/Math.max(.2,P.laser); if(window.MWAudio) MWAudio.heroShot();   // ships without a burst clip chain their singles per bolt
  }
  heroCollide(s,dt);
}
// ── carousel (the hologram's head is hidden by ctx.onStage while stage==='select')
function ensureCarousel(){
  if(!carGroup){ carGroup=new T.Group(); G.add(carGroup); }
  HEROES.forEach(requestModel); pumpLoads();
}
function updCarousel(dt){
  if(!carGroup) return;
  var show=stage==='select'&&!quiet(); carGroup.visible=show; if(!show) return;
  var id=HEROES[carIdx];
  if(window.MWAudio&&carModelId) MWAudio.carouselShip(carModelId);   // the ship on show idles quietly under the hero-select ambience
  if(carModelId!==id&&cache[id]){
    if(carWrap) carGroup.remove(carWrap);
    carWrap=new T.Group(); carModel=cache[id].proto.clone(true);   /* proto materials are currently dimmed: undo it on the carousel copies */ carModel.traverse(function(o){ if(!o.isMesh||!o.material) return; var mm=o.material.clone(); mm.userData=Object.assign({},o.material.userData,{btPatched:false}); mm.envMap=envTex; var un=stage==='select'?1/SELDIM:1; mm.color.multiplyScalar(un); mm.envMapIntensity*=un; if(mm.emissiveIntensity!=null) mm.emissiveIntensity*=un; patchMaterial(mm); o.material=mm; }); carWrap.add(carModel); carGroup.add(carWrap); carModelId=id; carK=0;
    if(carUi){ var nm=carUi.querySelector('.bt-name'); if(nm) nm.textContent=BYID[id].label; }
  }
  if(!carWrap) return;
  carK=Math.min(1,carK+dt*3.2); var pop=1-Math.pow(1-carK,3);
  carWrap.scale.setScalar((1.45/S)/BYID[id].size*(.2+.8*pop)*(P.scaleHero>0?1:1));
  carWrap.rotation.y+=dt*.9; carWrap.rotation.x=.22; carGroup.position.y=Math.sin(clockT*1.3)*.05/S;
  if(carUi){   // sit the ◄ PLAY ► row just under the hologram's emitter
    _hF.set(0,(.8-ctx.center[1])/S,0); G.localToWorld(_hF); _hF.project(ctx.camera);
    var r=ctx.dom.getBoundingClientRect(); var cl=Math.round((_hF.x+1)/2*r.width+r.left), ct=Math.round((1-_hF.y)/2*r.height+r.top);   // whole pixels, written only on change: the row used to creep a fraction of a pixel every frame under the cursor
    if(cl!==carUi.__l){ carUi.__l=cl; carUi.style.left=cl+'px'; } if(ct!==carUi.__t){ carUi.__t=ct; carUi.style.top=ct+'px'; }
  }
}
function syncUi(){
  var sel=stage==='select'&&!quiet(), pl=stage==='play'&&!quiet();
  if(carUi) carUi.style.display=sel?'flex':'none';
  if(hintEl) hintEl.style.display=(sel||pl)?'flex':'none';
  if(hudEl) hudEl.style.opacity=pl?1:0;
  updCritical();
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
  var au=audioAt(k); if(au&&window.MWAudio&&MWAudio.kitOpen) MWAudio.kitOpen(au);   // the reward cue (Battle Sound Review: Minikit opens)
  kitCount++; updHud(true);
  try{ window.dispatchEvent(new CustomEvent('mw:minikit',{detail:{total:kitCount,via:via,reward:null}})); }catch(e){}
  if(typeof MWBattle.onUnlock==='function'){ try{ MWBattle.onUnlock({total:kitCount,via:via,reward:null}); }catch(e){} }
}
function updKits(dt){
  kitTimer-=dt;
  if(kitTimer<=0&&!quiet()){ var live=kits.filter(function(k){ return !k.opening; }).length; if(live<P.kitMax&&P.kitRate>0&&cache.minikit) spawnKit(); kitTimer=rnd(6,12)/Math.max(.05,P.kitRate); }
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
// OUTRO: no hyperspace jump. Everyone stops firing, fighters (and the hero) fly off screen, the support/capital ships stay put (still drifting).
function outro(){
  if(!active||outroOn) return; outroOn=true; fireHeld=false; ejectKeys();
  kits.forEach(function(k){ if(!k.opening) openKitSilent(k); });
  ships.forEach(function(s){ if(s.barEl) s.barEl.style.display='none'; });
  syncUi();
}
function updLeave(s,dt){
  if(!s.outDir){ s.outDir=new T.Vector3(s.pos.x-CX,(s.pos.y-CY)*.5,s.pos.z-CZ); if(s.outDir.lengthSq()<.01) s.outDir.set(rnd(-1,1),rnd(-.3,.3),rnd(-1,1)); s.outDir.normalize(); }
  s.dir.lerp(s.outDir,Math.min(1,2.2*dt)).normalize(); s.spd=lerp(s.spd,34,Math.min(1,dt*1.3)); s.pos.addScaledVector(s.dir,s.spd*dt); aim(s.root,s.dir);
  if(s.pos.length()>150){ s.alive=false; s.root.visible=false; s.respawn=1e9; }
}

function reduceMotion(){ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }   // the pan is a camera glide: off under reduced motion (right-drag still orbits)
function updPan(dt){   // edge dwell: the camera ORBITS the battle without limit (yaw round, pitch over/under) toward the edge the cursor sits in; index.html reads getOrbit()
  var on_=!reduceMotion()&&stage==='play'&&!quiet()&&heroShip&&heroShip.alive&&!heroShip.burning&&ptr.in&&!ptr.out;
  var dx=0,dy=0;
  if(on_){ dx=clamp((Math.abs(ptr.nx)-EDGE_ZONE)/(1-EDGE_ZONE),0,1); dy=clamp((Math.abs(ptr.ny)-EDGE_ZONE)/(1-EDGE_ZONE),0,1); }
  if(dx>0||dy>0) pan.dwell+=dt; else pan.dwell=Math.max(0,pan.dwell-dt*3);   // a quick graze of the edge fades out instead of counting
  var k=clamp((pan.dwell-EDGE_DWELL)/EDGE_RAMP,0,1); k=k*k*(3-2*k);           // smoothstep: nothing for the first half second, then eases up to full speed
  var tx=ptr.nx<0?-dx:dx, ty=ptr.ny<0?-dy:dy;
  var a=Math.min(1,dt*2.5); pan.vx+=(k*tx*ORBIT_SPEED-pan.vx)*a; pan.vy+=(k*ty*ORBIT_SPEED-pan.vy)*a;   // angular velocity, rad/s
  orbit.yaw+=pan.vx*dt; orbit.pitch-=pan.vy*dt;
  if(stage!=='play'){ pan.vx=pan.vy=pan.dwell=0; }
}
function takeOrbit(){ _orb.yaw=orbit.yaw; _orb.pitch=orbit.pitch; orbit.yaw=orbit.pitch=0; return _orb; }

/* ───────────────────────────── frame ───────────────────────────── */
function update(t){
  if(window.MWAudio&&active&&stage==='play'&&ctx&&ctx.getRot) MWAudio.setYaw(ctx.getRot()-audioRot0);   // camera orbit swings the gameplay ambience's soundstage
  if(!active||dead) return;
  var dt=lastT==null?0.016:Math.min(.05,Math.max(0,t-lastT)); lastT=t; clockT+=dt;
  if(rot0!==rot0T){ rot0+=(rot0T-rot0)*(1-Math.exp(-dt*3.5)); if(Math.abs(rot0T-rot0)<.002) rot0=rot0T; }   // ease the re-zero
  if(ctx.getRot){ if(!_ryQ) _ryQ=new T.Quaternion(); _ryQ.setFromAxisAngle(_up,ctx.getRot()-rot0); G.quaternion.copy(_ryQ).multiply(baseQ); }   // the whole battle turns with the horizontal drag-orbit, relative to the angle the galaxy had when the arcade opened, so every game starts on the designed framing (planet, Death Star and sun in place)
  G.updateMatrixWorld(true);
  if(P.sunFollow&&lights[1]){ sunDir(_v1); lights[1].position.copy(_v1).multiplyScalar(30); lights[2].position.copy(_v1).multiplyScalar(-30); sunEnvWatch(dt); }   // the sun turns with the battle
  G.visible=P.on;
  if(!P.on&&!hyper) return;
  if(!hyper){
    reconT-=dt; if(reconT<=0&&!outroOn){ reconcile(); reconT=.5; }
    if(pendingHero&&cache[pendingHero]){ var h=pendingHero; pendingHero=null; spawnHero(h); }
  } else pumpLoads();
  if(anchorsDirty) assignAnchors();
  if(!introScheduled&&!hyper&&!introHold) tryScheduleIntro();

  updPan(dt);
  if(window.MWReticle) MWReticle.setActive(stage==='play'&&!quiet()&&!!heroShip&&ptr.in&&!ptr.out);   // arcade reticle: only while the hero flies and the pointer is over the battle
  var allGone=true;
  for(var i=ships.length-1;i>=0;i--){
    var s=ships[i];
    // global/class scale
    var base=s.cls==='hero'?P.scaleHero:s.cls==='base'?P.scaleBase:P['scale'+capName(s.cls)];
    var sc=P.scale*base*((s.cls==='support'||s.cls==='capital')&&s.hasA?depthCompPos(s.pos):1)*(s.cls==='base'?(s.dsK||1):1);
    if(s.spawnK<1){ s.spawnK=Math.min(1,s.spawnK+dt*1.6); }
    if(s.leaving){ s.spawnK=Math.max(0,s.spawnK-dt*3); if(s.spawnK<=0){ G.remove(s.root); ships.splice(i,1); anchorsDirty=true; continue; } }
    s.root.scale.setScalar(sc*s.spawnK*(s.spawnK<1?1:1)+1e-4);
    if(s.arriveAt>clockT){ s.root.visible=false; continue; }            // still waiting to jump in
    if(!s.arrived){ s.arrived=true; if(s.alive){ s.root.visible=true; startArrive(s); } }
    if(s.arr!==undefined&&s.arr<1) updArrive(s,dt);
    if(s.burnDeath){ updFighterBurn(s,dt); allGone=false; continue; }
    if(s.dying){ updDying(s,dt); continue; }
    if(!s.alive){
      if(!hyper&&!outroOn){ s.respawn-=dt;
        if(s.respawn<=0&&(s.cls==='support'||s.cls==='capital')){ s.hasA=false; placeLarge(s); s.alive=true; s.arrived=false; s.arriveAt=clockT; s.lateSpawn=true; s.target=null; }
        if(s.respawn<=0&&s.cls==='fighter'){ s.alive=true; s.hp=CLS.fighter.hp; spawnFighterPos(s,s.pos); s.arrived=false; s.arriveAt=clockT; s.target=null; s.mode='wander'; s.mT=1; pickWp(s); s.vel.set(0,0,0); } }
      continue;
    }
    allGone=false;
    if(outroOn&&(s.cls==='fighter'||s.cls==='hero')){ updLeave(s,dt); continue; }   // outro: fighters + hero fly off screen
    if(!s.jump||s.jump.phase===0){
      if(s.cls==='fighter') updFighter(s,dt);
      else if(s.cls==='hero') updHero(s,dt);
      else if(s.cls==='base') updBase(s,dt);
      else updShipLarge(s,dt);
    }
    if(s.jump) updHyper(s,dt);
    continue;
  }
  sepLarge(); updDebris(dt); updTimers(dt); updPlanet(dt); updCamAssist(dt);
  updKits(dt); updCarousel(dt); updBars(dt);
  updBolts(dt); updSparks(dt); updFlashes(dt);
  if(hyper){
    if(hyper.t===0) syncUi();
    hyper.t+=dt; var any=ships.some(function(s){ return s.alive; });
    if(!any&&hyper.t>.4){ var done=ctx.onDone; MWBattle.dispose(); if(done) done(); }
  }
}

/* ───────────────────────────── input ───────────────────────────── */
// Only real text entry blocks the game keys. A focused debug slider / checkbox / button must NOT (that's what made ← → ignore the carousel until a button was clicked).
function isTyping(e){ var t=e.target; if(!t) return false; if(t.isContentEditable||t.tagName==='TEXTAREA') return true; return t.tagName==='INPUT'&&/^(text|search|url|email|password|number|tel)$/i.test(t.type||'text'); }
function bindInput(){
  on(window,'pointermove',function(e){ var r=ctx.dom.getBoundingClientRect(); ptr.nx=((e.clientX-r.left)/r.width)*2-1; ptr.ny=-((e.clientY-r.top)/r.height)*2+1; ptr.in=e.target===ctx.dom;
    if(ptr.in&&!hyper&&stage==='play') ctx.dom.style.cursor=window.MWReticle?'none':'crosshair'; });
  on(document.documentElement,'mouseleave',function(){ ptr.out=true; });   // the cursor left the window: it must not keep panning from its last edge position
  on(document.documentElement,'mouseenter',function(){ ptr.out=false; });
  on(window,'pointerdown',function(e){ ptr.downX=e.clientX; ptr.downY=e.clientY; ptr.down=performance.now();
    if(stage==='play'&&heroShip&&!heroShip.burning&&!quiet()&&e.button===0&&e.target===ctx.dom){ fireHeld=true; heroShip.cd=0; if(window.MWAudio) MWAudio.heroFireDown(); } });   // left button = fire (hold to keep firing)
  on(window,'pointerup',function(e){ if(e.button===0){ fireHeld=false; if(window.MWAudio) MWAudio.heroFireUp(); } });
  on(ctx.dom,'contextmenu',function(e){ e.preventDefault(); });          // right-drag pans the camera; no browser menu
  // (minikits no longer respond to mouse clicks — only to the hero ship's lasers)
  on(window,'keydown',function(e){
    if(isTyping(e)||hyper) return;
    if(e.target&&e.target.closest&&e.target.closest('.mw-sound-switch')) return;   // Enter/Space on the sound switch flips it; it must not also start the game
    if(/^(ArrowLeft|ArrowRight|Enter|Space)$/.test(e.code)&&e.target&&e.target!==document.body&&e.target.blur&&e.target.tagName!=='A'){ e.target.blur(); }   // take focus off a slider/button so it doesn't also act on the key
    if(stage==='select'){
      if(e.code==='ArrowLeft'){ stepCar(-1); if(window.MWAudio) MWAudio.ui('step',false,{dir:-1}); e.preventDefault(); }
      else if(e.code==='ArrowRight'){ stepCar(1); if(window.MWAudio) MWAudio.ui('step',false,{dir:1}); e.preventDefault(); }
      else if(e.code==='Enter'||e.code==='Space'){ if(window.MWAudio) MWAudio.ui('confirm'); playHero(); e.preventDefault(); }
    } else if(e.code==='Space'){ changeHero(); e.preventDefault(); if(document.activeElement&&document.activeElement.blur) document.activeElement.blur(); }
  });
  on(window,'blur',ejectKeys);
}

/* ───────────────────────────── UI: hero picker, HUD, debug panel ───────────────────────────── */
function updCritical(){ if(vigEl) vigEl.style.display=(stage==='play'&&!quiet()&&heroShip&&heroShip.alive&&heroShip.hp<=1+1e-6)?'block':'none'; }   // 1 collision or less from death
function updHud(pulse){
  updCritical(); if(!hudEl) return; var pct=heroShip?Math.max(0,heroShip.hp/heroMax)*100:100;
  hudEl.innerHTML='<span class="bt-hl">SCORE</span><span class="bt-hn">'+kills+'</span><div class="bt-hull"><span class="bt-hl">HULL</span><div class="bt-hbar"><i style="width:'+pct+'%;background:hsl('+Math.round(pct*1.1)+',90%,55%)"></i></div></div>';
  if(pulse){ hudEl.classList.remove('pulse'); void hudEl.offsetWidth; hudEl.classList.add('pulse'); }
}
function injectCss(){
  styleEl=document.createElement('style'); styleEl.textContent=[
    'body:not(.mw-arcade) #bt-car, body:not(.mw-arcade) #bt-hud, body:not(.mw-arcade) #bt-hints, body:not(.mw-arcade) #bt-bars{display:none!important}',
    'body.mw-arcade #dbg-battle{display:block}',
    '#bt-car .bric-btn,#arcadeExit .bric-btn,#arcadeResult .bric-btn{touch-action:manipulation}',
    '#bt-car{position:fixed;z-index:16;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;font-family:var(--display,sans-serif)}',
    '#bt-car .bt-name{margin-bottom:18px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--holo,#AAF5EE);white-space:nowrap}',
    '#bt-car .bt-row{display:flex;gap:34px;align-items:center}',
    '#bt-car .mw-sound-switch{margin-top:var(--bric-space-3-stud,24px)}',
    '#bt-car .bt-lb{margin-top:26px;padding-left:var(--bric-space-3-stud);padding-right:var(--bric-space-3-stud)}',
    '#bt-car .bt-sub{font-family:var(--mono,monospace);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted,#6b8a85);opacity:.85;white-space:nowrap}',
    '#bt-car .bt-sub b{font-weight:400;color:var(--holo,#AAF5EE)}',
    '#bt-hints{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:16;display:flex;gap:30px;align-items:center;padding:12px 26px;pointer-events:none;background:color-mix(in srgb,var(--panel,#0a1212) 82%,transparent);border:1px solid var(--border,rgba(90,191,184,.35));backdrop-filter:blur(6px);font-family:var(--display,sans-serif);font-size:13px;letter-spacing:2.5px;text-transform:uppercase;color:var(--text,#E8F7F5);white-space:nowrap}',
    '#bt-hints .bt-h{display:flex;align-items:center;gap:11px}',
    '#bt-hints svg{color:var(--holo,#AAF5EE);flex:none}',
    '#bt-vig{position:fixed;inset:0;z-index:15;pointer-events:none;background:radial-gradient(ellipse at center,transparent 52%,rgba(255,30,20,.35) 80%,rgba(255,20,10,.7) 100%);animation:btvig 1s ease-in-out infinite alternate}',
    '@keyframes btvig{from{opacity:.35}to{opacity:1}}',
    '@media (prefers-reduced-motion:reduce){#bt-vig{animation:none;opacity:.8}}',
    '#bt-hud{position:absolute;right:24px;top:64px;z-index:16;display:flex;flex-direction:column;align-items:flex-end;line-height:1;pointer-events:none;opacity:0;transition:opacity .3s}',
    '#bt-hud .bt-hl{font-family:var(--display,sans-serif);font-size:11px;letter-spacing:4px;color:var(--muted,#6b8a85);margin-bottom:6px}',
    '#bt-hud .bt-hn{font-family:var(--mono,monospace);font-size:56px;letter-spacing:2px;color:var(--amber-hot,#F0D080);text-shadow:0 0 16px rgba(240,208,128,.45)}',
    '#bt-hud .bt-hull{display:flex;align-items:center;gap:10px;margin-top:14px}',
    '#bt-hud .bt-hull .bt-hl{margin:0;font-size:10px}',
    '#bt-hud .bt-hbar{width:150px;height:9px;border:1px solid rgba(255,255,255,.6);background:rgba(0,0,0,.5)}',
    '#bt-hud .bt-hbar i{display:block;height:100%}',
    '#bt-hud.hurt .bt-hbar{border-color:#ff4d4d;box-shadow:0 0 12px rgba(255,77,77,.8)}',
    '#bt-hud.pulse .bt-hn{animation:btPulse .4s steps(4)}@keyframes btPulse{0%{transform:scale(1.35);transform-origin:right center}100%{transform:scale(1);transform-origin:right center}}',
    '#bt-bars{position:fixed;inset:0;z-index:15;pointer-events:none}',
    '#bt-bars .bt-bar{position:fixed;width:72px;height:7px;margin:-7px 0 0 -36px;border:1px solid rgba(255,255,255,.65);background:rgba(0,0,0,.55);transition:opacity .2s}',
    '#bt-bars .bt-bar.sm{width:40px;height:5px;margin:-5px 0 0 -20px}',
    '#bt-bars .bt-xh{position:fixed;width:28px;height:28px;margin:-14px 0 0 -14px;color:#ff2a2a;filter:drop-shadow(0 0 4px rgba(255,42,42,.8));animation:btxh .5s ease-in-out infinite alternate}',
    '@keyframes btxh{from{opacity:1}to{opacity:.12}}',
    '@media (prefers-reduced-motion:reduce){#bt-bars .bt-xh{animation:none}}',
    '#bt-bars .bt-bar i{display:block;height:100%;width:100%}',
    '#dbg-battle details{margin:0 0 10px}#dbg-battle summary{cursor:pointer;font-family:var(--display);font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px}',
    '#dbg-battle .ctl.tight{margin-bottom:8px}'
  ].join('\n'); document.head.appendChild(styleEl);
}
function buildUi(){
  injectCss();
  carUi=document.createElement('div'); carUi.id='bt-car';
  carUi.innerHTML='<div class="bt-name"></div><div class="bt-row"><button type="button" class="bric-btn bric-btn--secondary" data-d="-1" aria-label="Previous hero ship">\u25C4</button><button type="button" class="bric-btn bric-btn--primary bt-play">PLAY</button><button type="button" class="bric-btn bric-btn--secondary" data-d="1" aria-label="Next hero ship">\u25BA</button></div><div class="bt-sub"><b>enter</b> to play</div><button type="button" class="bric-btn bric-btn--secondary bt-lb">Leaderboard</button><div class="sw mw-sound-switch mw-sound-switch--lg on" role="switch" aria-checked="true" tabindex="0" title="Sound on or off (M)"><span class="sw-track"><span class="sw-thumb"></span></span><span class="sw-lbl">Sound on</span></div>';
  if(window.__mwSyncSound) window.__mwSyncSound();
  [].forEach.call(carUi.querySelectorAll('button[data-d]'),function(b){ b.addEventListener('click',function(e){ e.stopPropagation(); stepCar(+b.dataset.d); b.blur(); }); });
  carUi.querySelector('.bt-lb').addEventListener('click',function(e){ e.stopPropagation(); this.blur(); if(ctx.showLeaderboard) ctx.showLeaderboard(); });
  carUi.querySelector('.bt-play').addEventListener('click',function(e){ e.stopPropagation(); this.blur(); playHero(); });
  document.body.appendChild(carUi);
  hintEl=document.createElement('div'); hintEl.id='bt-hints'; hintEl.style.display='none';
  hintEl.innerHTML='<div class="bt-h"><svg viewBox="0 0 24 32" width="26" height="34" aria-hidden="true"><rect x="3" y="2" width="18" height="28" rx="9" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="12" y1="2" x2="12" y2="13" stroke="currentColor" stroke-width="1.4"/><line x1="3" y1="13" x2="21" y2="13" stroke="currentColor" stroke-width="1.4"/><path d="M12 20 m-3 0 h6 M12 17 v6" stroke="currentColor" stroke-width="1.4" fill="none"/></svg><span>Move + aim</span></div><div class="bt-h"><svg viewBox="0 0 24 32" width="26" height="34" aria-hidden="true"><rect x="3" y="2" width="18" height="28" rx="9" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="12" y1="2" x2="12" y2="13" stroke="currentColor" stroke-width="1.4"/><line x1="3" y1="13" x2="21" y2="13" stroke="currentColor" stroke-width="1.4"/><path d="M12 2 A9 9 0 0 0 3 11 L3 13 L12 13 Z" fill="currentColor"/></svg><span>Click to fire</span></div><div class="bt-h"><svg viewBox="0 0 24 32" width="26" height="34" aria-hidden="true"><rect x="3" y="2" width="18" height="28" rx="9" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="12" y1="2" x2="12" y2="13" stroke="currentColor" stroke-width="1.4"/><line x1="3" y1="13" x2="21" y2="13" stroke="currentColor" stroke-width="1.4"/><path d="M12 2 A9 9 0 0 1 21 11 L21 13 L12 13 Z" fill="currentColor"/></svg><span>Right-click + drag · pan</span></div><div class="bt-h"><svg viewBox="0 0 24 32" width="26" height="34" aria-hidden="true"><rect x="3" y="2" width="18" height="28" rx="9" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="12" y1="2" x2="12" y2="13" stroke="currentColor" stroke-width="1.4"/><line x1="3" y1="13" x2="21" y2="13" stroke="currentColor" stroke-width="1.4"/><rect x="10.4" y="4.6" width="3.2" height="6.4" rx="1.6" fill="currentColor"/><path d="M9 16.5 l3 -2.6 l3 2.6 M9 22 l3 2.6 l3 -2.6" stroke="currentColor" stroke-width="1.3" fill="none"/></svg><span>Scroll · zoom</span></div><div class="bt-h"><svg viewBox="0 0 56 24" width="58" height="26" aria-hidden="true"><rect x="1.5" y="3" width="53" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14 12.5 v3 h28 v-3" stroke="currentColor" stroke-width="1.5" fill="none"/></svg><span>Spacebar · change ship</span></div><div class="bt-h"><svg viewBox="0 0 40 24" width="42" height="26" aria-hidden="true"><rect x="1.5" y="2.5" width="37" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="20" y="16" text-anchor="middle" font-family="monospace" font-size="10" font-weight="700" fill="currentColor">ESC</text></svg><span>Esc \u00b7 exit game</span></div>';
  document.body.appendChild(hintEl);
  barsEl=document.createElement('div'); barsEl.id='bt-bars'; document.body.appendChild(barsEl);
  vigEl=document.createElement('div'); vigEl.id='bt-vig'; vigEl.style.display='none'; document.body.appendChild(vigEl);
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
  key('arena','Fighter arena radius',.4,2.6,.02,2);
  key('fighterBurn','Fighter burning-death chance (0 = always pops)',0,1,.05,2);
  key('minBoom','Hit + explosion minimum loudness (far away)',0,1,.05,2,function(){ if(window.MWAudio&&MWAudio.setMinLoud) MWAudio.setMinLoud(P.minBoom); });
  key('fighterDuck','Fighter death: how far the rest of the mix ducks (1 = none)',.05,1,.05,2,function(){ if(window.MWAudio&&MWAudio.setFighterDuck) MWAudio.setFighterDuck(P.fighterDuck); });
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
  if(window.MWReticle){   // arcade reticle tunables (persisted by reticle.js)
    var rd=document.createElement('details'); rd.innerHTML='<summary>Arcade reticle</summary>'; panelEl.appendChild(rd);
    MWReticle.controls().forEach(function(c){ slider(rd,c[1].replace('Reticle: ',''),function(){ return MWReticle.get(c[0]); },function(x){ MWReticle.set(c[0],x); },c[2],c[3],c[4],c[4]<1?2:0); });
  }
  var ld=document.createElement('details'); ld.innerHTML='<summary>Lighting</summary>'; panelEl.appendChild(ld);
  var envT=null; function envSoon(){ clearTimeout(envT); envT=setTimeout(buildEnv,120); }
  [['fogK','Distance fog (0 = none, 1 = page default)',0,1.5,.05,0],['exposure','Exposure (filmic)',.3,2.5,.05,0],['lightKey','Sun intensity',0,4,.05,0],['sunAz','Sun azimuth \u00b0 (0 = straight behind the camera, + = right)',-180,180,5,1],['sunEl','Sun elevation \u00b0 (0 = level, + = above)',-60,85,5,1],['lightFill','Ambient',0,1.5,.02,0],['lightRim','Cool back fill',0,2,.05,0],
   ['envInt','Reflections (env map)',0,3,.05,0],['rough','Roughness (gloss \u2194 matte)',.15,1,.05,0],['lightScene','Scene lights \u00d7 (ambient/key/warm)',0,1.5,.05,0],
   ['matBright','Hull brightness',.2,1.5,.05,0],['matEmissive','Glow / emissive',0,2,.05,0],['matFighter','Fighter brightness',.2,1.5,.05,0],['dsDim','Death Star dimming (atmospheric perspective)',.1,1,.05,0],['darkLift','Dark plastic lift (TIEs)',0,1,.05,0]].forEach(function(r){
    slider(ld,r[1],function(){ if(r[0]==='sunAz'||r[0]==='sunEl'){ var a=sunAzEl(); return Math.round(r[0]==='sunAz'?a.az:a.el); } return P[r[0]]; },function(x){ P[r[0]]=x; applyLook(); if(r[0]==='sunAz'||r[0]==='sunEl') envSoon(); },r[2],r[3],r[4],2);
  });
  var pd=document.createElement('details'); pd.innerHTML='<summary>Planet · Death Star orbit · sun</summary>'; panelEl.appendChild(pd);
  check(pd,'Backdrop planet',function(){ return P.planetOn; },function(x){ P.planetOn=x; if(x&&!planetState) loadPlanet(); if(planet) planet.visible=x; });
  check(pd,'Visible sun (a bright star at the light\'s position: behind you at the start, so orbit round to see it)',function(){ return P.sunStar; },function(x){ P.sunStar=x; placeSun(); });
  check(pd,'Sun stays put in the battle when you orbit (off = fixed to the screen)',function(){ return P.sunFollow; },function(x){ P.sunFollow=x; applyLook(); envSoon(); });
  var sb=document.createElement('button'); sb.className='resetbtn bric-btn bric-btn--sm bric-btn--secondary'; sb.textContent='\u21BA Sun: back to opposite the planet'; sb.addEventListener('click',function(){ P.sunAz=null; P.sunEl=null; saveCfg(); applyLook(); envSoon(); panelEl.remove(); buildPanel(); }); pd.appendChild(sb);
  [['planetR','Planet radius',8,60,1,0,1],['planetAng','Death Star direction from planet centre \u00b0 (0 right, 90 up)',-180,180,5,0,1],['planetTilt','...tilt toward the camera \u00b0',-45,80,5,0,1],['dsAng','Death Star: direction from the planet \u00b0 (0 right, 90 up)',-180,180,5,0,1],['dsTilt','...tilt \u00b0 (negative = behind the planet, dish faces us)',-80,60,5,0,1],['planetAlt','Orbit height (Death Star radii above the surface)',0,4,.1,1,1],['planetBright','Planet brightness',.2,2,.05,2,0],['planetSpin','Planet spin \u00b0/s',0,6,.1,1,0]].forEach(function(r){
    slider(pd,r[1],function(){ return P[r[0]]; },function(x){ P[r[0]]=x; if(r[6]){ relayoutPlanet(); envSoon(); } else applyLook(); },r[2],r[3],r[4],r[5]);
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
    var mat=new T.MeshBasicMaterial({color:BOLT_COL[i],fog:false}); boltMats[i]=mat; mat.color.multiplyScalar(stage==='select'?SELDIM:1);
    for(var n=0;n<200;n++){ var m=new T.Mesh(geo,mat); m.visible=false; m.frustumCulled=false; G.add(m); boltFree[i].push({mesh:m,vel:new T.Vector3(),prev:new T.Vector3(),idx:i,life:0,team:i}); }
  });
}

function resetState(){
  ships=[]; heroShip=null; kits=[]; kitTimer=4; bolts=[]; boltMats=[]; boltFree=[[],[],[]]; sparks=null; spI=0; flashes=[];
  cache={}; loading={}; loadQ=[]; inflight=0; failed={}; matList=[]; sceneBase=[]; lights=[]; hyper=null; lastT=null; clockT=0;
  debris=[]; timers=[]; camReset(); introHold=true; introT0=0; outroOn=false; introScheduled=false; introGroups=[[],[]]; introWant=null; anchorsDirty=true; reconT=0; keys={}; fireHeld=false; pendingHero=null; _ap=null; envTex=null; listeners=[]; PL=null; planet=null; sunObj=null; envQ=envPrev=null; envIdle=0; planetMats=[]; planetState=0; sess++;
}
var MWBattle={
  init:function(c){
    if(active) return; dead=false; resetState(); pan.x=pan.y=pan.vx=pan.vy=pan.dwell=0; ptr.out=false; ctx=c; T=c.THREE; P=loadCfg(); if(window.MWReticle) MWReticle.init(); if(window.MWAudio&&MWAudio.setMinLoud) MWAudio.setMinLoud(P.minBoom); if(window.MWAudio&&MWAudio.setFighterDuck) MWAudio.setFighterDuck(P.fighterDuck);
    _v1=new T.Vector3(); _v2=new T.Vector3(); _v3=new T.Vector3(); _v4=new T.Vector3(); _ray=new T.Raycaster(); _plane=new T.Plane(); _q=new T.Quaternion(); _zero=new T.Vector3(); _up=new T.Vector3(0,1,0); _aimM=new T.Matrix4(); _ro=new T.Vector3(); _rd=new T.Vector3(); _hT=new T.Vector3(); _hF=new T.Vector3(); DARKLIFT=new T.Color(.30,.38,.44); DARKGLOW=new T.Color(.03,.07,.08); HAZE=new T.Color(.04,.10,.12); _steer=new T.Vector3(); _sep=new T.Vector3();
    G=new T.Group(); G.name='mw-battle'; c.scene.add(G);
    // Stage the battle in the camera's frame at init (includes the saved galaxy-view elevation) so the layout reads the same
    // whatever that elevation is. G is scaled so a camera at ANY distance sees the battle as if it were 4.3 units away.
    var ctr=new T.Vector3().fromArray(c.center), eye=c.pose.pos.clone();
    S=eye.distanceTo(ctr)/LREF; L=LREF; G.position.copy(ctr); G.scale.setScalar(S);
    var m=new T.Matrix4().lookAt(eye,ctr,new T.Vector3(0,1,0)); G.quaternion.setFromRotationMatrix(m);
    baseQ=G.quaternion.clone(); G.updateMatrixWorld(true); rot0=rot0T=c.getRot?c.getRot():0; layoutPlanet(); makeSun();
    var hemi=new T.HemisphereLight(0xcfeeea,0x24403e,P.lightFill), key=new T.DirectionalLight(0xfff4e0,P.lightKey);
    var rim=new T.DirectionalLight(0x7fb8e8,P.lightRim);
    [hemi,key,rim].forEach(function(l){ c.scene.add(l); lights.push(l); });
    (c.sceneLights||[]).forEach(function(l){ sceneBase.push({l:l,i:l.intensity}); }); buildEnv(); applyLook();
    kills=0; tally={fighter:0,support:0,capital:0}; session={played:false,hero:null,heroes:[],heroIds:[],t0:0,died:false}; stage='select'; pickIntro(); carIdx=0; carGroup=carWrap=carModel=carModelId=null;
    camFar=c.camera.far; camNear=c.camera.near; c.camera.far=Math.max(450,(Math.max(PL.Pc.distanceTo(_v1.set(0,0,L))+PL.R,SUN_DIST+L+60)+20)*S*1.05); c.camera.near=1.2; c.camera.updateProjectionMatrix();   // far ships need the longer far plane, but depth precision ~ d²/near: a big near plane stops the hull layers z-fighting at distance   // far ships (and the far Death Star) vanished past the page's 100-unit draw distance
    fogBase=c.fog?c.fog.density:0; makeBolts(); makeSparks(); bindInput(); buildUi(); ensureCarousel(); loadPlanet(); applyLook(); updHud(); syncUi();
    active=true; kitTimer=5; if(c.onStage) c.onStage('select');
    audioRot0=c.getRot?c.getRot():0; if(window.MWAudio){ MWAudio.arcadeStart(); MWAudio.warm(); }
    window.MWBattle=MWBattle;
  },
  update:update,
  hyperspace:hyperspace, outro:outro,
  dispose:function(){
    if(dead||!ctx) return; dead=true; active=false; if(window.MWReticle) MWReticle.dispose(); if(ctx.dom){ ctx.dom.style.cursor=''; ctx.dom.removeAttribute('data-mw-reticle'); } if(window.MWAudio) MWAudio.stop();
    listeners.forEach(function(l){ l[0].removeEventListener(l[1],l[2],l[3]); }); listeners.length=0;
    sceneBase.forEach(function(b){ b.l.intensity=b.i; }); sceneBase.length=0;
    lights.forEach(function(l){ ctx.scene.remove(l); }); lights.length=0;
    if(G){ ctx.scene.remove(G); G.traverse(function(o){ if(o.geometry) o.geometry.dispose(); if(o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){ if(m.map&&m.map!==glowTex) m.map.dispose(); m.dispose(); }); } }); }
    if(envTex){ envTex.dispose(); envTex=null; }
    if(ctx.fog&&fogBase) ctx.fog.density=fogBase;
    if(ctx.camera){ ctx.camera.far=camFar; ctx.camera.near=camNear; ctx.camera.updateProjectionMatrix(); }
    [carUi,hintEl,hudEl,vigEl,barsEl,panelEl,styleEl].forEach(function(e){ if(e&&e.parentNode) e.parentNode.removeChild(e); });
    ships.length=0; bolts.length=0; kits.length=0; cache={}; matList=[]; heroShip=null; G=null; sess++;
  },
  isActive:function(){ return active; },
  _camState:function(){ return cam; }, _dbg:function(){ return {rf:_rf&&_rf.toArray(),hT:_hT.toArray(),ro:_ro.toArray(),rd:_rd.toArray(),ptr:[ptr.nx,ptr.ny,ptr.in],cen:[CX,CY,CZ]}; }, _killHero:function(){ if(heroShip&&!heroShip.burning) heroDeath(heroShip); },
  getCamAssist:function(){ return cam.out; },   // {zoom, yaw|null, fk, focus|null}: auto zoom multiplier, galaxy rotation to ease toward, and the death close-up pivot (WORLD)
  getOrbit:function(){ return takeOrbit(); },   // {yaw,pitch} radians accumulated since the last call: the edge-dwell orbit, unbounded (right edge turns the view right, top edge looks up)
  getPan:function(){ _panW.x=pan.x*S; _panW.y=pan.y*S; return _panW; },   // {x,y}: edge-pan camera offset in WORLD units (battle units x G's scale), along the camera's right / up
  startIntro:function(){ if(!introHold) return; introHold=false; introT0=clockT; },   // capital/support fly-in is held until the hero-select page is actually visible (loader reveal)
  assetsReady:function(){ return active&&(planetState!==1)&&HEROES.every(function(id){ return cache[id]||failed[id]; }); },   // every hero model loaded (or failed) — the lightspeed loader waits on this
  // what a results screen / leaderboard submission needs: kills, the last hero flown (and all used), time played
  summary:function(){ return { played:session.played, score:kills, kills:kills, minikits:kitCount, fighters:tally.fighter, support:tally.support, capital:tally.capital, weights:{fighter:SCORE.fighter,support:SCORE.support,capital:SCORE.capital}, hero:session.hero, heroes:session.heroes.slice(), heroIds:session.heroIds.slice(), died:!!session.died, seconds:session.played?Math.round((performance.now()-session.t0)/1000):0 }; },
  _explode:function(s){ startDying(s); }, _debris:function(){ return debris.length; },
  _ships:function(){ return ships; }, _env:function(){ return envTex; }, _renderer:function(){ return ctx.renderer; }, _ndc:function(s){ return G.localToWorld(s.pos.clone()).project(ctx.camera).toArray(); }, _cam:function(){ return ctx.camera; }, _group:function(){ return G; },
  stats:function(){ return { ships:ships.length, alive:ships.filter(function(s){ return s.alive; }).length, bolts:bolts.length, kits:kits.length, cached:Object.keys(cache).length, cfg:P }; },
  spawnHero:spawnHero, openKit:function(){ if(kits[0]) openKit(kits[0],'api'); },
  onUnlock:null
};
window.MWBattle=MWBattle;
})();
