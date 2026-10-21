/*! Arcade targeting reticle (space battle, play stage only). The site-wide reticle (assets/bric-reticle.js) is untouched and steps aside over the battle canvas.
 *
 *   MWReticle.init()          create the overlay (battle.js init)
 *   MWReticle.setActive(on)   battle.js calls it every frame: true while the hero is flying and the pointer is over the canvas
 *   MWReticle.hit()           a hero laser landed on a target: flashes the hit marker (four ticks in an X, centre open)
 *   MWReticle.dispose()       remove the overlay
 *   MWReticle.controls() / get(k) / set(k,v)   tunables for the battle debug panel (persisted in localStorage 'mw_arcade_reticle')
 *
 * Look: an oval (the crosshair) between two perspective grids that show turn angle. The grids recede toward the oval and are placed by their gap from it, so they never
 * overlap. Pointer velocity + acceleration drive a damped spring per axis: the direction yaws / tilts the pair, the harder you steer the closer both swing to edge-on, and
 * everything settles back to rest when the pointer is still. The whole reticle refreshes at a low, stepped frame rate (8 fps by default) like the displays in the films.
 * Colours are the design tokens (--bric-register-amber-text); prefers-reduced-motion holds the grids still and fades the hit marker without motion.
 * Prototype and tuning page: tools/reticle-arcade.html
 */
(function(){
  'use strict';
  if(window.MWReticle) return;
  var LS='mw_arcade_reticle', VER=1;
  var DEF={ turn:53, pitch:40, rest:80, edge:1, edgeMax:86, accel:.5, stiff:90, damp:11, vref:900, cells:4, gw:80, gh:124, dist:24, persp:300,
            ovalW:13, ovalH:25, scale:1, weight:1.5, glow:8, tick0:6, tick1:15, hitW:4, fps:8 };
  var SCHEMA=[
    ['turn','Reticle: direction yaw at full steer (deg)',0,80,1],['pitch','Reticle: direction pitch at full steer (deg)',0,60,1],
    ['rest','Reticle: convergence toward the oval (deg)',0,80,1],['edge','Reticle: swing toward edge-on at full steer',0,1,.05],['edgeMax','Reticle: edge-on angle (deg)',70,89,1],
    ['accel','Reticle: acceleration weight',0,2,.05],['stiff','Reticle: response (spring stiffness)',20,300,5],['damp','Reticle: settle (damping)',2,30,.5],
    ['vref','Reticle: pointer speed for full steer (px/s)',200,2500,50],['cells','Reticle: grid cells',2,9,1],['gw','Reticle: grid width (px)',30,140,2],
    ['gh','Reticle: grid height (px)',60,220,2],['dist','Reticle: gap, centre to inner grid edge (px)',4,100,1],['persp','Reticle: perspective depth',200,900,10],
    ['ovalW','Reticle: oval half-width (px)',6,30,1],['ovalH','Reticle: oval half-height (px)',10,50,1],['hitW','Reticle: hit marker stroke (px)',1,8,.25],
    ['fps','Reticle: frame rate (fps; 60 = smooth)',4,60,1],['scale','Reticle: scale',.5,2,.05],['weight','Reticle: line weight (px)',.75,3,.25],['glow','Reticle: glow (px)',0,20,1]
  ];
  var CFG=load();
  function load(){
    var o=JSON.parse(JSON.stringify(DEF));
    try{ var s=JSON.parse(localStorage.getItem(LS)||'null'); if(s&&s.ver===VER) Object.keys(DEF).forEach(function(k){ if(typeof s[k]==='number'&&isFinite(s[k])) o[k]=s[k]; }); }catch(e){}
    return o;
  }
  function save(){ try{ localStorage.setItem(LS,JSON.stringify(Object.assign({ver:VER},CFG))); }catch(e){} }

  var cv=null, g=null, W=0, H=0, DPR=1, raf=0, want=false, alive=false, listeners=[];
  var AMBER='#E9A73E', px=-999, py=-999, lpx=-999, lpy=-999, vx=0, vy=0, ax=0, ay=0, sx=0, sy=0, svx=0, svy=0, last=0;
  var shown={sx:0,sy:0,now:0}, lastTick=-1e9, hitT=-1e9, D2R=Math.PI/180;
  var rmq=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):null;
  function reduced(){ return !!(rmq&&rmq.matches); }
  function clamp01(v){ return v<0?0:(v>1?1:v); }
  function on(t,ev,fn,o){ t.addEventListener(ev,fn,o); listeners.push([t,ev,fn,o]); }

  function resize(){
    if(!cv) return; DPR=Math.min(2,window.devicePixelRatio||1); W=window.innerWidth; H=window.innerHeight;
    cv.width=Math.round(W*DPR); cv.height=Math.round(H*DPR);
  }
  function init(){
    if(alive) return; alive=true; CFG=load();
    try{ var v=getComputedStyle(document.documentElement).getPropertyValue('--bric-register-amber-text').trim(); if(v) AMBER=v; }catch(e){}
    cv=document.createElement('canvas'); cv.id='mw-arcade-reticle'; cv.setAttribute('aria-hidden','true');
    cv.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:17';   // above the battle canvas and HUD (16), below the game-over card
    document.body.appendChild(cv); g=cv.getContext('2d'); resize();
    on(window,'resize',resize);
    on(window,'pointermove',function(e){ if(e.pointerType&&e.pointerType!=='mouse') return; px=e.clientX; py=e.clientY; },{passive:true});
    sx=sy=svx=svy=vx=vy=ax=ay=0; lpx=px; lpy=py; shown.sx=shown.sy=0; shown.now=performance.now(); hitT=-1e9;
  }
  function dispose(){
    alive=false; want=false; if(raf) cancelAnimationFrame(raf); raf=0;
    listeners.forEach(function(l){ l[0].removeEventListener(l[1],l[2],l[3]); }); listeners=[];
    if(cv&&cv.parentNode) cv.parentNode.removeChild(cv); cv=null; g=null;
  }
  function setActive(a){
    a=!!a&&alive; if(a===want) return; want=a;
    if(want){ last=performance.now(); lpx=px; lpy=py; vx=vy=ax=ay=0; if(!raf) raf=requestAnimationFrame(frame); }   // restart the steering from rest so the first frame never lurches
    else { if(g) g.clearRect(0,0,cv.width,cv.height); }
  }
  function hit(){ if(want) hitT=performance.now(); }

  // steering: pointer velocity + acceleration drive a damped spring per axis; it returns to 0 when the pointer is still
  function step(dt){
    var rvx=(px-lpx)/dt, rvy=(py-lpy)/dt; lpx=px; lpy=py;
    var k=Math.min(1,dt*22), nvx=vx+(rvx-vx)*k, nvy=vy+(rvy-vy)*k;
    ax+=(((nvx-vx)/dt)-ax)*k; ay+=(((nvy-vy)/dt)-ay)*k; vx=nvx; vy=nvy;
    var tx=Math.tanh((vx+CFG.accel*.05*ax)/CFG.vref), ty=Math.tanh((vy+CFG.accel*.05*ay)/CFG.vref);   // saturates: a harder flick = more parallax, never past full
    svx+=(CFG.stiff*(tx-sx)-CFG.damp*svx)*dt; svy+=(CFG.stiff*(ty-sy)-CFG.damp*svy)*dt; sx+=svx*dt; sy+=svy*dt;
    sx=Math.max(-1.25,Math.min(1.25,sx)); sy=Math.max(-1.25,Math.min(1.25,sy));   // a little overshoot reads as weight
  }
  // stepped frame rate: the pose and the hit marker only refresh every 1/fps s (the remainder is carried so the average rate is exact)
  function tick(now){
    var iv=1000/Math.max(4,CFG.fps);
    if(CFG.fps>=60||reduced()||now-lastTick>=iv-2){ lastTick=(now-lastTick<iv*2)?lastTick+iv:now; shown.sx=sx; shown.sy=sy; shown.now=now; }
  }

  function proj(x,y,z,yaw,pit){
    var cy=Math.cos(yaw), sy_=Math.sin(yaw), x1=x*cy+z*sy_, z1=-x*sy_+z*cy;
    var cp=Math.cos(pit), sp=Math.sin(pit), y2=y*cp-z1*sp, z2=y*sp+z1*cp;
    var k=CFG.persp/(CFG.persp+z2); return [x1*k,y2*k,k];
  }
  function drawGrid(side,yaw,pit,phiDeg,cx){
    var phi=phiDeg*D2R, ux=Math.cos(phi), uz=-side*Math.sin(phi), n=Math.round(CFG.cells), hw=CFG.gw/2, hh=CFG.gh/2;
    function P(a,b){ return proj(cx+ux*a,b,uz*a,yaw,pit); }   // inner edge sits farther away: both grids recede toward the oval, their vanishing point
    function line(a0,b0,a1,b1,w,al){ var p=P(a0,b0), q=P(a1,b1), k=(p[2]+q[2])/2; g.globalAlpha=al*Math.min(1,.35+k*.65); g.lineWidth=w*CFG.weight; g.beginPath(); g.moveTo(p[0],p[1]); g.lineTo(q[0],q[1]); g.stroke(); }
    for(var i=0;i<=n;i++){
      var edge=(i===0||i===n), a=-hw+CFG.gw*i/n, b=-hh+CFG.gh*i/n, w=edge?1:.6, al=edge?1:.7;
      line(a,-hh,a,hh,w,al); line(-hw,b,hw,b,w,al);
    }
  }
  function drawHit(now){
    var T=(now-hitT)/(reduced()?240:320); if(T<0||T>=1) return;
    var e=1-Math.pow(1-Math.min(1,T*2.2),3), off=reduced()?0:(1-e)*9, al=T<.35?1:1-(T-.35)/.65;   // snaps in from slightly outside, holds, fades
    g.save(); g.strokeStyle=AMBER; g.shadowColor=AMBER; g.shadowBlur=CFG.glow*.6; g.globalAlpha=al; g.lineWidth=CFG.hitW; g.lineCap='round';
    [[1,1],[-1,1],[-1,-1],[1,-1]].forEach(function(d){ var r0=CFG.tick0+off, r1=CFG.tick1+off, s=Math.SQRT1_2;   // four ticks on the diagonals, centre left open
      g.beginPath(); g.moveTo(d[0]*s*r0,d[1]*s*r0); g.lineTo(d[0]*s*r1,d[1]*s*r1); g.stroke(); });
    g.restore();
  }
  function frame(now){
    raf=0; if(!alive||!want||!g) return;
    var dt=Math.min(.05,Math.max(.001,(now-last)/1000)); last=now;
    step(dt); tick(now);
    g.setTransform(DPR,0,0,DPR,0,0); g.clearRect(0,0,W,H);
    if(px>-900){
      var steer=reduced()?0:1, yaw=shown.sx*CFG.turn*D2R*steer, pit=-shown.sy*CFG.pitch*D2R*steer;
      var spread=clamp01(Math.hypot(shown.sx,shown.sy))*steer;                        // how hard you are steering, any direction: 0 = rest, 1 = full
      var phi=CFG.rest+(CFG.edgeMax-CFG.rest)*spread*CFG.edge;                         // rest = the convergence setting; steering swings it toward edge-on
      var cx=CFG.dist+(CFG.gw/2)*Math.cos(phi*D2R);                                    // placed by the gap from the oval so the grids never overlap at any angle
      g.save(); g.translate(px,py); g.scale(CFG.scale,CFG.scale);
      g.strokeStyle=AMBER; g.shadowColor=AMBER; g.shadowBlur=CFG.glow; g.lineCap='round'; g.lineJoin='round';
      var order=[-1,1].sort(function(a,b){ return proj(a*cx,0,0,yaw,pit)[2]-proj(b*cx,0,0,yaw,pit)[2]; });   // farther grid first, so the nearer one overlaps it when yawed
      order.forEach(function(sd){ drawGrid(sd,yaw,pit,phi,sd*cx); });
      g.globalAlpha=1; g.lineWidth=CFG.weight*1.1; g.beginPath(); g.ellipse(0,0,CFG.ovalW,CFG.ovalH,0,0,6.2832); g.stroke();
      g.shadowBlur=0; drawHit(shown.now);
      g.restore();
    }
    raf=requestAnimationFrame(frame);
  }

  window.MWReticle={
    init:init, dispose:dispose, setActive:setActive, hit:hit,
    controls:function(){ return SCHEMA.slice(); }, get:function(k){ return CFG[k]; },
    set:function(k,v){ if(k in DEF&&typeof v==='number'&&isFinite(v)){ CFG[k]=v; save(); } },
    reset:function(){ CFG=JSON.parse(JSON.stringify(DEF)); save(); }
  };
})();
