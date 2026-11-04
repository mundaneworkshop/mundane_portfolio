/* Mobile site. Runs instead of the galaxy when the mobile layout is on (the check at the top of index.html, flag: ?mobile=1). See docs/project-history/mobile-site.md */
const MARKUP=`<div id="sky" aria-hidden="true"></div>

<div id="gate" hidden>
  <div id="gateStage" aria-hidden="true"></div>
  <div id="gateHint" aria-hidden="true"></div>
  <div id="gateFoot">
    <button id="gateEnter" class="bric-btn bric-btn--primary sro" type="button">Enter</button>
    <div id="gateFail" hidden>
      <div class="micro" id="gateFailT"></div>
      <div id="gateWhy">Retry, or enter without them (missing models show as placeholders)</div>
      <div class="acts"><button class="bric-btn bric-btn--secondary" id="gateRetry" type="button">Retry</button><button class="bric-btn bric-btn--secondary" id="gateAnyway" type="button">Enter anyway</button></div>
    </div>
    <div class="sw" id="swGateSound" role="switch" aria-checked="false" tabindex="0"><span class="tr"><span class="th"></span></span><span class="lb">Sound on</span></div>
  </div>
  <div class="sro" id="gateLive" aria-live="polite" role="status"></div>
</div>

<header id="hdr">
  <a id="wm" href="/"><span class="bk" id="wmBk" hidden aria-hidden="true">&lsaquo;</span>Mundane Workshop</a>
  <button id="menuBtn" class="bric-btn bric-btn--secondary bric-btn--sm" type="button" aria-haspopup="dialog" aria-expanded="false">Menu</button>
</header>

<div id="app">
  <main id="v-index" class="flow" aria-label="Index"><div class="wrap">
    <div id="holo" role="img" aria-label="Hologram of Jason's minifigure. Drag sideways to rotate."><div class="status" id="holoSt"></div></div>
    <div class="appear"><a id="appearBtn" class="bric-btn bric-btn--secondary" href="/about/work">Change appearance</a></div>
    <div id="rows"></div>
  </div></main>

  <section id="v-outfit" class="split" aria-label="Outfit" hidden>
    <div class="stage" id="sOutfit">
      <div class="status" id="outfitSt"></div>
      <div class="ctrl">
        <button class="bric-btn bric-btn--secondary" id="oPrev" type="button" aria-label="Previous outfit">&lt;</button>
        <span class="lbl micro" id="oName" aria-live="polite"></span>
        <button class="bric-btn bric-btn--secondary" id="oNext" type="button" aria-label="Next outfit">&gt;</button>
      </div>
    </div>
    <div class="manual"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i><div class="pane" id="oPane" tabindex="0"></div></div>
  </section>

  <section id="v-case" class="split" aria-label="Case study" hidden>
    <div class="stage" id="sCase">
      <div class="status" id="caseSt"></div>
      <div class="ctrl">
        <button class="bric-btn bric-btn--secondary" id="cPrev" type="button" aria-label="Previous item">&lt;</button>
        <span class="lbl mono" id="cCount" aria-live="polite"></span>
        <button class="bric-btn bric-btn--secondary" id="cNext" type="button" aria-label="Next item">&gt;</button>
      </div>
    </div>
    <div class="manual"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i><div class="pane" id="cPane" tabindex="0"></div><div class="stick" id="cStick"></div></div>
  </section>

  <section id="v-cv" class="flow" aria-label="CV" hidden><div class="wrap">
    <div class="page-h" id="cvHero"></div>
    <div class="cv-cards" id="cvList"></div>
    <div class="cv-end" id="cvEnd"></div>
  </div></section>

  <section id="v-holonet" class="split" aria-label="HoloNet" hidden>
    <div class="manual"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
      <div class="pane" id="nPane" tabindex="0"><div class="micro kick">HoloNet</div><h2>Transmissions</h2><div id="msgs"></div><div id="msgState" class="mono"></div><p class="body note">These transmissions hold fixed positions in the galaxy. View this page on a desktop to see them in 3D space.</p></div>
      <div class="stick" id="nStick"><button class="bric-btn bric-btn--primary bric-btn--block" id="ctOpen" type="button" aria-haspopup="dialog">Send a transmission</button></div>
    </div>
  </section>

</div>

<div id="ctSheet" role="dialog" aria-modal="true" aria-label="HoloNet transmission">
  <div class="ct-scroll">
    <div class="ct-top"><div class="ct-title">HoloNet</div><button class="bric-btn bric-btn--secondary bric-btn--sm" id="ctClose" type="button">Close</button></div>
    <div class="ct-head" id="ctHead" data-state="off"><span class="ct-rec"></span><span class="ct-hint" id="ctHint"></span></div>
    <div class="ct-con">
      <div class="ct-scr" id="ctScr" aria-hidden="true">
          <svg class="ct-ly on" id="ctAlign" viewBox="0 0 200 272" fill="none">
            <g stroke="#D8CDEC" stroke-width="1.3" stroke-linejoin="round">
              <path id="ctCTL" d="M24.8 55.2L37.6 68.8M28.3 52.3L41.6 65.6"/>
              <path id="ctCTR" d="M175.2 55.2L162.4 68.8M171.7 52.3L158.4 65.6"/>
              <path id="ctCBL" d="M27.2 193.9L38.4 190.1L34.9 201.1Z"/>
              <path id="ctCBR" d="M172.8 193.9L161.6 190.1L165.1 201.1Z"/>
            </g>
            <g id="ctTower"><g class="ct-rot" id="ctDish">
              <path class="ct-flash" d="M100 121V3" stroke="#D8CDEC" stroke-width="1.6"/>
              <rect class="ct-flash" x="30.7" y="95.25" width="138.6" height="51.5" stroke="#D8CDEC" stroke-width="1.2"/>
              <path d="M30.7 121C37 128 60 139 100 140C140 139 163 128 169.3 121M42 128.6H158M53 133.1H147" stroke="#D8CDEC" stroke-width="1.2"/>
              <path d="M72.5 143.1H127.5" stroke="#D8CDEC" stroke-width="2.4" stroke-linecap="round"/>
              <path d="M30.7 121H169.3" stroke="#8FE6DC" stroke-width="2.8"/>
              <path d="M100 121V139M80 139.1H120" stroke="#8FE6DC" stroke-width="3"/>
            </g>
            <rect x="90.5" y="144.5" width="19" height="24.2" rx="3" stroke="#8FE6DC" stroke-width="2.2"/>
            <path d="M99.3 148.7l1.9 1.9-1.9 1.9-1.9-1.9z" fill="#8FE6DC"/>
            <rect x="97.3" y="157.6" width="4" height="8.8" stroke="#8FE6DC" stroke-width="1.4"/>
            <rect x="103.4" y="155" width="2.2" height="12" fill="#8FE6DC"/>
            <path d="M91.5 169L97.3 186V344M108.5 169L102.7 186V344" stroke="#D8CDEC" stroke-width="1.3"/></g>
            <text id="ctAln" x="14" y="257" text-anchor="start" fill="#D8CDEC" font-family="Space Mono, monospace" font-size="12">0000-0000</text>
          </svg>
          <svg class="ct-ly" id="ctRows" viewBox="0 0 200 272">
            <g id="ctRowsG" transform="translate(0 6)"></g>
            <text id="ctRowL" x="11" y="236" fill="#D8CDEC" font-family="Space Mono, monospace" font-size="7.5" letter-spacing="1.5">UPLINK</text>
            <text id="ctRowC" x="182" y="236" text-anchor="end" fill="#D8CDEC" font-family="Space Mono, monospace" font-size="9" letter-spacing="1">000</text>
            <text id="ctLost" x="100" y="258" text-anchor="middle" fill="#FF6B6B" font-family="Chakra Petch, sans-serif" font-weight="600" font-size="11" letter-spacing="3" opacity="0">SIGNAL LOST</text>
          </svg>
        </div>
      <div class="ct-fields">
        <div class="ct-fld"><input id="ctName" type="text" placeholder="Callsign" aria-label="Callsign" aria-describedby="ctNameCount" autocomplete="off" enterkeyhint="next"><span class="ct-count" id="ctNameCount">40 / 40</span></div>
        <div class="ct-fld"><textarea id="ctMsg" rows="5" placeholder="Message" aria-label="Message" aria-describedby="ctMsgCount"></textarea><span class="ct-count" id="ctMsgCount">280 / 280</span></div>
        <div class="ct-trap" aria-hidden="true"><label for="ctUrl">Leave this empty</label><input id="ctUrl" type="text" tabindex="-1" autocomplete="off"></div>
      </div>
    </div>
    <div class="ct-actions">
      <span class="ct-go" id="ctGo"><span class="ct-ring"></span><span class="ct-ring"></span><button class="ct-send bric-btn bric-btn--primary" id="ctSend" type="button" aria-disabled="true" aria-describedby="ctHint">Transmit</button></span>
      <span class="ct-links"><a class="bric-btn" href="mailto:jason@mundanework.shop">E-mail Jason</a><a class="bric-btn" href="https://calendly.com/jason-mundanework/30min" target="_blank" rel="noopener">Schedule call</a></span>
    </div>
    <div class="ct-sr" id="ctLive" aria-live="polite"></div>
  </div>
</div>

<div id="wrapS">
  <div id="scrim"></div>
  <div id="sheet" role="dialog" aria-modal="true" aria-label="Menu">
    <div id="grab" aria-hidden="true"><i></i></div>
    <div id="sheetBody"></div>
  </div>
</div>

<button id="perfChip" type="button" aria-expanded="false" aria-controls="perf">-- FPS</button>
<aside id="perf" aria-label="Performance settings" hidden>
  <div id="perfT"></div>
  <h4>Pixel size (CSS px)</h4>
  <div class="seg" id="segPixel"></div>
  <h4>Posterize levels</h4>
  <div class="seg" id="segLevels"></div>
  <h4>Screen wipe, ms to cover</h4>
  <div class="seg" id="segWipe"></div>
  <h4>Entry gate</h4>
  <div class="seg"><button class="bric-btn bric-btn--secondary bric-btn--sm" id="replayGate" type="button">Replay entry gate</button></div>
  <h4>Outfits</h4>
  <div class="sw" id="swUnlock" role="switch" aria-checked="false" tabindex="0"><span class="tr"><span class="th"></span></span><span class="lb">Unlock all</span></div>
  <h4>Entry gate memory test</h4>
  <div class="seg"><button class="bric-btn bric-btn--secondary bric-btn--sm" id="buildAll" type="button">Build all models</button></div>
</aside>
<div id="glLost" role="alert" hidden></div>`;
(async function(){
'use strict';
const BASE='/';
/* mount: the galaxy never boots on this path. Everything desktop-only leaves the page; #mw-seo, the head and the loaded scripts stay */
if(document.readyState==='loading') await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
await new Promise(res=>{ const l=document.createElement('link'); l.rel='stylesheet'; l.href='assets/mobile/mobile.css'; l.onload=l.onerror=res; document.head.appendChild(l); });
[...document.querySelectorAll('style')].forEach(s=>{ if(!/^bric-/.test(s.id||'')) s.remove(); });
[...document.body.children].forEach(el=>{ if(el.id!=='mw-seo'&&el.tagName!=='SCRIPT') el.remove(); });
document.body.className=''; document.body.removeAttribute('style');
document.body.insertAdjacentHTML('beforeend',MARKUP);
const NO_GATE=new URLSearchParams(location.search).get('gate')==='0';
{ let passed=false; try{ passed=sessionStorage.getItem('mw_gate_passed')==='1'; }catch(e){} if(!location.pathname.replace(/\/+/g,'')&&!passed&&!NO_GATE) document.documentElement.classList.add('gating'); }
const hold=document.getElementById('bric-mw-hold'); if(hold) hold.remove();
const $=(s,r)=>(r||document).querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const DATA=window.SITE_DATA;
const css=getComputedStyle(document.documentElement);
/* colours only ever come from the tokens */
function tok(name){ const v=css.getPropertyValue(name).trim(), m=v.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/); return m?new THREE.Color(m[1]/255,m[2]/255,m[3]/255):new THREE.Color(v); }
const COL={amber:tok('--bric-register-amber-solid'),teal:tok('--bric-register-teal-solid'),purple:tok('--bric-holonet-text'),line:tok('--bric-schematic-line'),edge:tok('--bric-register-teal-edge'),hot:tok('--bric-schematic-text-hot'),raised:tok('--bric-surface-raised'),base:tok('--bric-surface-base')};
function store(k,v){ try{ if(v===undefined){ return JSON.parse(localStorage.getItem('mw_m.'+k)); } localStorage.setItem('mw_m.'+k,JSON.stringify(v)); }catch(e){ return null; } }

/* ═════════ settings + counters ═════════ */
const SET={unlockAll:!!store('unlockAll'),pixel:store('pixel')||1.5,levels:store('levels')||24,wipe:store('wipe')||700};
/* pixel size: one notch under the site's 2 CSS px, snapped to whole device pixels so the grid stays crisp */
function px(){ const d=window.devicePixelRatio||1; return Math.max(1,Math.floor(SET.pixel*d+.25))/d; }
/* the site's public content, read the way the site reads it (publishable key, read-only). Falls back to the values below */
const SB='https://ynfkjppwpcnxuvjqmsun.supabase.co/rest/v1/', SB_KEY='sb_publishable_F-J3YhAcVl62xre8rW94HQ_QuddWwQF';
const sbGet=(q,ms)=>{ const c=new AbortController(), t=setTimeout(()=>c.abort(),ms||4000); return fetch(SB+q,{signal:c.signal,headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY}}).then(r=>{ clearTimeout(t); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }); };
const LIVE={planetfx:{ig:{hot:'#ff8ab1',tint:'#e1306c'},li:{hot:'#66c9ff',tint:'#0077B5'},w0:{hot:'#70baff',tint:'#0081FB'},w1:{hot:'#FFA47C',tint:'#FF4F00'},w2:{hot:'#ffffff',tint:'#ffffff'}},
  marqueeEn:'MUNDANE WORKSHOP \u00b7 DELIGHTFUL CONSUMER EXPERIENCES BY JASON HSIN \u00b7 ',cvHero:{chatLabel:'schedule a meeting'},cvUrl:'https://drive.google.com/file/d/1jP8VGkQoMkT4ID2klvWhhPnDFy3ih9xo/view?usp=sharing',
  head:{name:'Default',about:{title:'Big Head Mode',body:'I woke up like this. Learn more about me by unlocking different appearances through exploring the site!',ctaShow:true,ctaText:'e-mail jason',ctaUrl:'mailto:jason@mundanework.shop',extraLinks:[{url:'https://calendly.com/jason-mundanework/30min',label:'schedule a call'}]}},
  marq:{w0:'META HORIZON WORLDS ',w1:'SLATE AUTO: SLATEMAKER ',w2:'JOSH.AI LUXURY HOME AUTOMATION '},marqStyle:{bg:'#0C2B28',fg:'#AAF5EE',speed:.12}};
/* live content: the same seeded + server-reconciled copy the galaxy reads (BRICStore), so CMS edits reach this layout too */
const COPY=(()=>{ try{ if(window.BRICStore&&BRICStore.getCopy) return BRICStore.getCopy()||{}; return JSON.parse(localStorage.getItem('bric_copy'))||{}; }catch(e){ return {}; } })();
Promise.resolve(Object.keys(COPY).map(key=>({key,value:COPY[key]}))).then(rows=>{
  Object.keys(DATA.cases).forEach(id=>{ const c=DATA.cases[id]; ['title','body','tags','snapshot','extraLinks'].forEach(f=>{ const v=COPY['case:'+id+':'+f]; if(v!=null) c[f]=v; }); });
  if(Array.isArray(COPY.cvRoute)&&COPY.cvRoute.length) DATA.cv=COPY.cvRoute.filter(n=>!n.disabled&&!n.hidden).map(n=>Object.assign({snapshot:[],links:[]},n));
  rows.forEach(r=>{ const k=r.key, v=r.value, m=k.match(/^artmeta:moon:(w\d):(\d+)$/), q=k.match(/^case:(w\d):marquee$/);
    if(k==='planetfx') LIVE.planetfx=v; else if(k==='marqueeEn') LIVE.marqueeEn=v; else if(k==='cvHero') LIVE.cvHero=v;
    else if(k==='cvRoute'&&Array.isArray(v)){ const n=v.slice().reverse().find(x=>x.ctaUrl&&x.ctaUrl!=='#'); if(n) LIVE.cvUrl=n.ctaUrl; }
    else if(k==='outfitMeta'&&v&&v.meta&&v.meta.head&&v.meta.head.about) LIVE.head.about=v.meta.head.about;
    else if(q&&v&&v.text) LIVE.marq[q[1]]=v.text;
    else if(m){ const a=(DATA.cases[m[1]].artifacts||[])[+m[2]]; if(a&&v){ a.title=v.title||a.title; a.desc=v.desc||a.desc; a.links=(v.links||[]).filter(l=>l.url&&l.url!=='#'); } } });
}).catch(e=>console.warn('[mobile] live content unavailable, using the seed',e));
const G={axis:'-',cancels:0,pointers:0};
let lastLoad='-', ctxLost=0;

/* ═════════ gesture helper: one per surface, tracks pointers by pointerId ═════════
   Reports drag (with an axis locked after lockPx), pinch and tap. pointercancel ends a gesture with cancelled:true.
   Going from two fingers to one rebases the remaining finger, so the view never jumps. */
function gesture(el,h){
  const pts=new Map(), lockPx=h.lockPx==null?10:h.lockPx;
  let axis=null,moved=false,pinching=false,lastDist=0,samples=[],t0=0;
  const dist=()=>{ const a=[...pts.values()]; return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y); };
  function vel(){ const n=samples.length; if(n<2) return {vx:0,vy:0}; const now=samples[n-1]; let i=n-1; while(i>0&&now.t-samples[i-1].t<100) i--; const a=samples[i], dt=now.t-a.t; if(dt<8||performance.now()-now.t>60) return {vx:0,vy:0}; return {vx:(now.x-a.x)/dt,vy:(now.y-a.y)/dt}; }
  function finish(e,cancelled){ const v=vel(); if(h.end) h.end({vx:v.vx,vy:v.vy,axis:axis,cancelled:cancelled,moved:moved}); if(!cancelled&&!moved&&h.tap&&performance.now()-t0<400) h.tap(e); axis=null; moved=false; pinching=false; samples=[]; }
  el.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0) return;
    if(e.target.closest&&e.target.closest('button,a,input,.pane')) return;
    try{ el.setPointerCapture(e.pointerId); }catch(err){}
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY}); G.pointers=pts.size;
    if(pts.size===1){ axis=null; moved=false; pinching=false; samples=[]; t0=performance.now(); if(h.start) h.start(); }
    else if(pts.size===2){ pinching=true; moved=true; lastDist=dist(); }
  });
  el.addEventListener('pointermove',e=>{
    const p=pts.get(e.pointerId); if(!p) return;
    const dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;
    if(pts.size>=2){ const d=dist(); if(lastDist>0&&d>0&&h.pinch) h.pinch(d/lastDist); lastDist=d; return; }
    if(!axis){ const tx=p.x-p.x0, ty=p.y-p.y0; if(Math.hypot(tx,ty)<lockPx) return; axis=Math.abs(tx)>Math.abs(ty)?'h':'v'; moved=true; G.axis=axis; }
    samples.push({x:p.x,y:p.y,t:performance.now()}); if(samples.length>12) samples.shift();
    if(h.drag) h.drag(dx,dy,axis);
  });
  function release(e,cancelled){
    if(!pts.has(e.pointerId)) return; pts.delete(e.pointerId); G.pointers=pts.size;
    if(cancelled) G.cancels++;
    if(pts.size===0){ finish(e,cancelled); return; }
    if(pts.size===1){ const r=[...pts.values()][0]; r.x0=r.x; r.y0=r.y; axis=null; samples=[]; if(pinching) moved=true; lastDist=0; }
    else lastDist=dist();
  }
  el.addEventListener('pointerup',e=>release(e,false));
  el.addEventListener('pointercancel',e=>release(e,true));
  el.addEventListener('lostpointercapture',e=>release(e,false));
  el.addEventListener('contextmenu',e=>{ if(pts.size) e.preventDefault(); });
  el.addEventListener('gesturestart',e=>e.preventDefault());
  addEventListener('blur',()=>{ if(!pts.size) return; pts.clear(); G.pointers=0; G.cancels++; finish(null,true); });
}

/* ═════════ renderers ═════════ */
let stageR,rowR;
try{
  stageR=new THREE.WebGLRenderer({antialias:false,alpha:true,premultipliedAlpha:true});
  rowR=new THREE.WebGLRenderer({antialias:false,alpha:true,premultipliedAlpha:true,canvas:document.createElement('canvas')});
}catch(err){ $('#holoSt').textContent='WebGL is not available'; console.error(err); return; }
stageR.setPixelRatio(1); stageR.setClearColor(0x000000,0); stageR.info.autoReset=false;
rowR.setPixelRatio(1);   rowR.setClearColor(0x000000,0);   rowR.info.autoReset=false;
stageR.domElement.className='gl'; stageR.domElement.setAttribute('aria-hidden','true');
[[stageR,'stage'],[rowR,'rows']].forEach(([r,n])=>{
  r.domElement.addEventListener('webglcontextlost',e=>{ e.preventDefault(); ctxLost++; const b=$('#glLost'); b.hidden=false; b.textContent='WebGL context lost ('+n+'). Probably memory. Count: '+ctxLost; console.warn('context lost',n); });
  r.domElement.addEventListener('webglcontextrestored',()=>{ $('#glLost').hidden=true; });
});
const ROW_BUF=Math.round(96/px()); rowR.setSize(ROW_BUF,ROW_BUF,false);

/* the site's pixelate + posterize pass: scene into a low-res target, then floor to params.levels. Alpha is carried through so the DOM sky shows behind */
const levelsU={value:SET.levels};
function makePost(r){
  const rt=new THREE.WebGLRenderTarget(4,4,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
  const sc=new THREE.Scene(), cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:{tDiffuse:{value:rt.texture},levels:levelsU},depthTest:false,depthWrite:false,blending:THREE.NoBlending,
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader:'varying vec2 vUv; uniform sampler2D tDiffuse; uniform float levels; void main(){ vec4 c=texture2D(tDiffuse,vUv); gl_FragColor=floor(c*levels+0.5)/levels; }'})));
  return {rt,size(w,h){ rt.setSize(w,h); },draw(scene,camera){ r.setRenderTarget(rt); r.clear(); r.render(scene,camera); r.setRenderTarget(null); r.render(sc,cam); }};
}
const stagePost=makePost(stageR), rowPost=makePost(rowR); rowPost.size(ROW_BUF,ROW_BUF);
function sizeStage(w,h){ stageR.setSize(w,h,false); stagePost.size(w,h); }

const uTime={value:0};
/* the site's shared holo uniforms (SHU) and shaders, verbatim */
const SHU={time:uTime,scanIntensity:{value:.2},fresnelPow:{value:4},glitch:{value:1},glitchAmt:{value:.35}};
const HOLO_VERT='varying vec3 vN; varying vec3 vV; varying float vWY; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; vWY=(modelMatrix*vec4(position,1.0)).y; gl_Position=projectionMatrix*mv; }';
const HOLO_FRAG='uniform float time; uniform float scanIntensity; uniform float fresnelPow; uniform float glitch; uniform float glitchAmt; uniform vec3 baseColor; uniform vec3 hotColor; uniform float opBase; varying vec3 vN; varying vec3 vV; varying float vWY; void main(){ vec3 N=normalize(vN); vec3 V=normalize(vV); float fr=pow(1.0-abs(dot(V,N)),fresnelPow); float scan=pow(sin(vWY*14.0-time*1.6)*0.5+0.5,2.4)*scanIntensity+0.06; float flk=sin(time*29.3)*0.035+sin(time*13.1)*0.025+1.0; float band=glitch*glitchAmt*smoothstep(0.3,0.0,abs(vWY-mod(time*0.25,8.0)+4.0)); float a=(fr*0.85+scan*0.55+band)*opBase*flk; vec3 col=mix(baseColor,hotColor,fr+band)*(0.75+scan*0.9+band); gl_FragColor=vec4(col,clamp(a,0.0,1.0)); }';
const RING_VERT='varying vec3 vN; varying vec3 vV; varying float vWY; varying vec2 vUv; void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; vWY=(modelMatrix*vec4(position,1.0)).y; gl_Position=projectionMatrix*mv; }';
const RING_FRAG='uniform sampler2D map; uniform float time; uniform float scanIntensity; uniform float fresnelPow; uniform float glitch; uniform float glitchAmt; uniform vec3 baseColor; uniform vec3 hotColor; uniform float opBase; varying vec3 vN; varying vec3 vV; varying float vWY; varying vec2 vUv; void main(){ float texA=texture2D(map,vUv).a; if(texA<0.02) discard; vec3 N=normalize(vN); vec3 V=normalize(vV); float fr=pow(1.0-abs(dot(V,N)),fresnelPow); float scan=pow(sin(vWY*14.0-time*1.6)*0.5+0.5,2.4)*scanIntensity+0.06; float flk=sin(time*29.3)*0.035+sin(time*13.1)*0.025+1.0; float band=glitch*glitchAmt*smoothstep(0.3,0.0,abs(vWY-mod(time*0.25,8.0)+4.0)); vec3 col=mix(baseColor,hotColor,fr+band)*(0.75+scan*0.9+band); float a=texA*(0.5+fr*0.85+scan*0.55+band)*opBase*flk; gl_FragColor=vec4(col,clamp(a,0.0,1.0)); }';
const MWHOLO_FRAG='uniform sampler2D map; uniform float time; uniform float scanIntensity; uniform float glitch; uniform vec3 baseColor; uniform vec3 hotColor; uniform float opBase; varying vec3 vN; varying vec3 vV; varying float vWY; varying vec2 vUv; void main(){ vec4 tex=texture2D(map,vUv); if(tex.a<0.04) discard; float lum=dot(tex.rgb,vec3(0.299,0.587,0.114)); float sig=clamp(pow(lum,1.8)*1.7+0.05,0.05,1.0); float scan=pow(sin(vWY*16.0-time*2.0)*0.5+0.5,2.2)*scanIntensity+0.08; float flk=sin(time*29.3)*0.035+sin(time*13.1)*0.025+1.0; float band=glitch*smoothstep(0.05,0.0,abs(vWY-mod(time*0.3,3.0)+1.5))*0.7; vec3 col=mix(baseColor,hotColor,sig*0.9+band)*(0.5+scan*0.9+band); float a=(0.3+sig*0.65)*(0.5+scan*0.6+band)*opBase*flk; gl_FragColor=vec4(col,clamp(a,0.0,1.0)); }';
const BEAM_VERT='varying vec3 vN; varying vec3 vV; varying float vWY; varying float vLocalY; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; vWY=(modelMatrix*vec4(position,1.0)).y; vLocalY=clamp((position.y+2.0)/4.0,0.0,1.0); gl_Position=projectionMatrix*mv; }';
const BEAM_FRAG='uniform float time; uniform float scanIntensity; uniform float fresnelPow; uniform float glitch; uniform float glitchAmt; uniform vec3 baseColor; uniform vec3 hotColor; uniform float beamBottom; uniform float beamTop; uniform float beamCurve; varying vec3 vN; varying vec3 vV; varying float vWY; varying float vLocalY; void main(){ vec3 N=normalize(vN); vec3 V=normalize(vV); float fr=pow(1.0-abs(dot(V,N)),fresnelPow); float scan=pow(sin(vWY*14.0-time*1.6)*0.5+0.5,2.4)*scanIntensity+0.06; float flk=sin(time*29.3)*0.035+sin(time*13.1)*0.025+1.0; float band=glitch*glitchAmt*smoothstep(0.3,0.0,abs(vWY-mod(time*0.25,8.0)+4.0)); float grad=mix(beamBottom,beamTop,pow(clamp(vLocalY,0.0,1.0),beamCurve)); float a=(fr*0.85+scan*0.55+band)*grad*flk; vec3 col=mix(baseColor,hotColor,fr+band)*(0.75+scan*0.9+band); gl_FragColor=vec4(col,clamp(a,0.0,1.0)); }';
const SITE={line:0x5ABFB8,hot:0xAAF5EE};   // the site's DARK.line / ring + beam hot: scene constants from index.html, not new colours
/* a planet's holo material (makeAmberHolo): tint + hot come from the site's planetfx */
/* lift: a brightness floor for the small GLB rows. Their big flat faces have almost no rim light, so the site's shader alone leaves them nearly black at this size */
function planetMat(id,lift){ const fx=(LIVE.planetfx&&LIVE.planetfx[id])||({arcade:{hot:'#9fff75',tint:'#4dff00'},contact:{hot:'#C8AAFF',tint:'#A06AF0'}})[id]||{hot:'#F0D080',tint:'#E9A73E'};
  return new THREE.ShaderMaterial({uniforms:Object.assign({},SHU,{baseColor:{value:new THREE.Color(fx.tint)},hotColor:{value:new THREE.Color(fx.hot)},opBase:{value:lift?1.4:.9}}),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,vertexShader:HOLO_VERT,fragmentShader:lift?HOLO_FRAG.replace('clamp(a,0.0,1.0)','clamp(a+'+lift.toFixed(2)+',0.0,1.0)'):HOLO_FRAG}); }
/* the site's FX overlay for the head and outfit figures (addFx): tint, rim, scanlines, glitch band; holo=1 is the see-through head */
const FX_LOGO={scan:{value:.7},fres:{value:1.8},scanFreq:{value:14},fxInt:{value:1},glitch:{value:.25},hot:{value:new THREE.Color('#71fdff')},tint:{value:new THREE.Color('#70fdff')},holo:{value:1}};
const FX_OUTFIT=Object.assign({},FX_LOGO,{holo:{value:0}});
const STACK_CLOSE=3.5;
const FX_BOX={scan:{value:.7},fres:{value:1.8},scanFreq:{value:14},fxInt:{value:1},glitch:{value:.25},hot:{value:new THREE.Color('#71fdff')},tint:{value:new THREE.Color('#9e9e9e')},holo:{value:0}};
const FX_MOON=Object.assign({},FX_BOX);
/* uStack: from afar, depth precision lets the head's overlapping shells all draw, and their alpha stacks: that is the look on desktop and the index. Close up the pre-pass culls them to one thin layer with near-black scan bands, so the close-up view stacks on purpose */
const ONE={value:1}; FX_LOGO.stack={value:1};
function addFx(mat,fx,composite){
  mat.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{uStack:fx.stack||ONE,uTime:uTime,uScan:fx.scan,uFres:fx.fres,uGlitch:fx.glitch,uHot:fx.hot,uTint:fx.tint,uScanFreq:fx.scanFreq,uFxInt:fx.fxInt,uHolo:fx.holo,uOc:{value:1}});
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP; varying vec3 vNN; varying vec3 vEY;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n vWP=(modelMatrix*vec4(transformed,1.0)).xyz; vNN=normalize(mat3(modelMatrix)*normal); vEY=normalize(cameraPosition-vWP);')
      .replace('#include <project_vertex>','#ifdef USE_SKINNING\n mat4 _skM=mat4(0.0); _skM+=skinWeight.x*boneMatX; _skM+=skinWeight.y*boneMatY; _skM+=skinWeight.z*boneMatZ; _skM+=skinWeight.w*boneMatW; _skM=bindMatrixInverse*_skM*bindMatrix; vec3 _skN=(_skM*vec4(normal,0.0)).xyz;\n vWP=(modelMatrix*vec4(transformed,1.0)).xyz; vNN=normalize(mat3(modelMatrix)*_skN); vEY=normalize(cameraPosition-vWP);\n#endif\n#include <project_vertex>');
    const lift=(fx===FX_LOGO)?'1.00':'2.60', mapInject=composite?'vec4 _t=texture2D(map,vUv); float _a=clamp(_t.a*'+lift+',0.0,1.0); diffuseColor.rgb=mix(diffuseColor.rgb,_t.rgb,_a);':'#include <map_fragment>';
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uTime; uniform float uScan; uniform float uFres; uniform float uGlitch; uniform vec3 uHot; uniform vec3 uTint; uniform float uScanFreq; uniform float uFxInt; uniform float uHolo; uniform float uOc; uniform float uStack; varying vec3 vWP; varying vec3 vNN; varying vec3 vEY;')
      .replace('#include <map_fragment>',mapInject+'\n {\n  diffuseColor.rgb *= uTint;\n  float fr=pow(1.0-abs(dot(normalize(vEY),normalize(vNN))),uFres);\n  float scan=pow(sin(vWP.y*uScanFreq-uTime*1.6)*0.5+0.5,2.4)*uScan;\n  float band=uGlitch*smoothstep(0.04,0.0,abs(vWP.y-(mod(uTime*0.5,3.2)-1.6)));\n  diffuseColor.rgb += (fr*0.22 + scan*0.18)*uFxInt*uHot;\n  diffuseColor.rgb = mix(diffuseColor.rgb, uHot, clamp(band*0.6*uFxInt,0.0,1.0));\n  diffuseColor.rgb = mix(diffuseColor.rgb, uHot, uHolo*fr*0.6);\n }')
      .replace('#include <dithering_fragment>','#include <dithering_fragment>\n {\n  float frA=pow(1.0-abs(dot(normalize(vEY),normalize(vNN))),uFres);\n  float scA=pow(sin(vWP.y*uScanFreq-uTime*1.6)*0.5+0.5,2.4);\n  float holoA=clamp(frA*1.25 + scA*0.5 + 0.14, 0.0, 1.0);\n  holoA=1.0-pow(1.0-holoA,uStack);\n  gl_FragColor.a = mix(gl_FragColor.a, holoA*uOc, uHolo);\n }');
  };
  mat.needsUpdate=true;
}

/* ═════════ loading ═════════ */
const draco=new THREE.DRACOLoader(); draco.setDecoderPath(BASE+'vendor/draco/');
const gltfL=new THREE.GLTFLoader(); gltfL.setDRACOLoader(draco);
const cache=new Map();
const cached=(k,fn)=>{ if(!cache.has(k)){ const p=fn(); cache.set(k,p); p.catch(()=>cache.delete(k)); } return cache.get(k); };
function loadGLB(path){
  const t=performance.now(); let total=0;
  return new Promise((res,rej)=>gltfL.load(BASE+path,g=>{ lastLoad=path.split('/').pop()+' '+(total/1e6).toFixed(2)+'MB '+Math.round(performance.now()-t)+'ms'; res(g); },x=>{ if(x&&x.total) total=x.total; else if(x&&x.loaded) total=x.loaded; },rej));
}
function centerGroup(obj,fitTo){   // fitTo(size,sphere) -> scale
  obj.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(obj), c=b.getCenter(new THREE.Vector3()), sz=b.getSize(new THREE.Vector3());
  obj.position.sub(c); const inner=new THREE.Group(); inner.add(obj); inner.scale.setScalar(fitTo(sz,b.getBoundingSphere(new THREE.Sphere()))); const g=new THREE.Group(); g.add(inner); return g;
}
const unit=o=>centerGroup(o,(s,sph)=>1/Math.max(sph.radius,1e-4));

/* The site's solid GLB look (buildHoloGLB at holo 0): unlit, decals composited over the brick colour, colours lifted to display sRGB */
function decalOver(shader){ shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','vec4 _t=texture2D(map,vUv); float _a=clamp(_t.a*2.6,0.0,1.0); diffuseColor.rgb=mix(diffuseColor.rgb,_t.rgb,_a);'); }
function solidify(scene,fx){
  scene.updateMatrixWorld(true);
  const named={}, solids=[];
  scene.traverse(o=>{ if(!o.isMesh) return; const s=Array.isArray(o.material)?o.material[0]:o.material; if(s&&!s.map&&s.color){ const n=(s.name||'').replace(/\s*img.*$/i,'').trim(); if(n&&!named[n]) named[n]=s.color.clone(); if(o.geometry){ o.geometry.computeBoundingBox(); const c=o.geometry.boundingBox.getCenter(new THREE.Vector3()); o.localToWorld(c); solids.push({c:c,col:s.color.clone()}); } } });
  const nearest=o=>{ if(!solids.length||!o.geometry) return null; o.geometry.computeBoundingBox(); const t=o.geometry.boundingBox.getCenter(new THREE.Vector3()); o.localToWorld(t); let best=null,bd=1e9; solids.forEach(s=>{ const d=s.c.distanceTo(t); if(d<bd){ bd=d; best=s; } }); return best?best.col.clone():null; };
  scene.traverse(o=>{ if(!o.isMesh) return;
    const src=Array.isArray(o.material)?o.material[0]:o.material, hasMap=!!(src&&src.map);
    let col; if(hasMap){ const n=(src.name||'').replace(/\s*img.*$/i,'').trim(); col=(named[n]||nearest(o)||new THREE.Color(0xffffff)).clone(); } else col=(src&&src.color)?src.color.clone():new THREE.Color(0xffffff);
    col.setRGB(Math.pow(col.r,1/2.2),Math.pow(col.g,1/2.2),Math.pow(col.b,1/2.2));
    const m=new THREE.MeshBasicMaterial({map:hasMap?src.map:null,color:col,side:THREE.DoubleSide,fog:false});
    if(hasMap){ m.map.wrapS=m.map.wrapT=THREE.ClampToEdgeWrapping; m.map.minFilter=THREE.LinearFilter; m.map.generateMipmaps=false; m.map.encoding=THREE.LinearEncoding; m.map.needsUpdate=true; if(!fx) m.onBeforeCompile=decalOver; }
    if(fx) addFx(m,fx,hasMap);
    if(o.isSkinnedMesh){ m.skinning=true; o.frustumCulled=false; }
    o.material=m;
  });
}

/* outfit figure: 2.9 units tall, idle clip playing, as on the site */
const OUTFIT_H=2.9;
function getFigure(o){ return cached('fig:'+o.id,async()=>{
  if(o.head) return getHead();
  const gs=await Promise.all(o.parts.map(p=>loadGLB(p.file)));
  const root=new THREE.Group(); gs.forEach(g=>root.add(g.scene)); solidify(root,FX_OUTFIT);
  const fig=centerGroup(root,s=>OUTFIT_H/(s.y||1));
  let clip=null; gs.forEach(g=>(g.animations||[]).forEach(c=>{ if(!clip||c.name===(o.idle||'idle')) clip=c; }));
  if(clip){ const mx=new THREE.AnimationMixer(root); mx.clipAction(clip).play(); fig.userData.mixer=mx; }
  fig.userData.fit=1.55;
  return fig;
}); }
/* the default head (applyTexturedGLBToLogo + the holo state): see-through, drawn front-most only through a depth pre-pass */
function getHead(){ return cached('head',async()=>{
  const g=await loadGLB('assets/models/main/sig-fig-head-logo.glb'), scene=g.scene; scene.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(scene), size=box.getSize(new THREE.Vector3()), ctr=box.getCenter(new THREE.Vector3()), sc=(.775*2)/(Math.max(size.x,size.y,size.z)||1);
  scene.position.sub(ctr); const grp=new THREE.Group(); grp.add(scene); grp.scale.setScalar(sc*1.25);
  let skin=new THREE.Color(0xe8ab71), max=-1; scene.traverse(o=>{ if(o.isMesh){ const s=Array.isArray(o.material)?o.material[0]:o.material; if(s&&s.color&&!s.map){ const l=s.color.r+s.color.g+s.color.b; if(l>max){ max=l; skin=s.color.clone(); } } } });
  const depth=new THREE.MeshBasicMaterial({colorWrite:false,side:THREE.DoubleSide}), add=[];
  scene.traverse(o=>{ if(!o.isMesh) return; const src=Array.isArray(o.material)?o.material[0]:o.material, hasMap=!!(src&&src.map);
    const m=new THREE.MeshBasicMaterial({map:hasMap?src.map:null,color:hasMap?skin.clone():(src&&src.color?src.color.clone():new THREE.Color(0xffffff)),side:THREE.DoubleSide,fog:false,transparent:true,depthWrite:false});
    if(hasMap){ m.map.wrapS=m.map.wrapT=THREE.ClampToEdgeWrapping; m.map.minFilter=THREE.LinearFilter; m.map.generateMipmaps=false; m.map.encoding=THREE.LinearEncoding; m.map.needsUpdate=true; }
    addFx(m,FX_LOGO,hasMap); o.material=m; o.renderOrder=2; if(!o.isSkinnedMesh) add.push(o); });
  add.forEach(o=>{ const d=new THREE.Mesh(o.geometry,depth); d.renderOrder=1; d.userData.depthOnly=true; o.add(d); });
  grp.userData.fit=1.45; grp.userData.holoY=1.9; return grp;
}); }
/* a locked outfit: the site's ocGhostSet. A fresnel shell + hard edge lines over a depth pre-pass, front faces only, so no texture, colour or back geometry shows through. It holds its first pose */
const OC_GHOST_COL=0x78E0D6;
function ocEdges(geo){ if(geo.userData.ocEdges) return geo.userData.ocEdges;
  const g=geo.index?geo.toNonIndexed():geo, a=new THREE.EdgesGeometry(g,48).attributes.position.array; geo.computeBoundingBox();
  const minL=geo.boundingBox.getSize(new THREE.Vector3()).length()*.06, keep=[];
  for(let j=0;j<a.length;j+=6){ const dx=a[j]-a[j+3],dy=a[j+1]-a[j+4],dz=a[j+2]-a[j+5]; if(Math.sqrt(dx*dx+dy*dy+dz*dz)>=minL) for(let q=0;q<6;q++) keep.push(a[j+q]); }
  const out=new THREE.BufferGeometry(); out.setAttribute('position',new THREE.Float32BufferAttribute(keep,3)); geo.userData.ocEdges=out; return out; }
function setGhost(grp,on){ on=!!on; if(!!grp.userData.ghost===on&&!on) return;
  if(on&&!grp.userData.ghostMat){
    grp.userData.ghostMat=new THREE.ShaderMaterial({transparent:true,depthWrite:true,side:THREE.FrontSide,fog:false,uniforms:{col:{value:new THREE.Color(OC_GHOST_COL)},k:{value:1}},
      vertexShader:'varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }',
      fragmentShader:'uniform vec3 col; uniform float k; varying vec3 vN; varying vec3 vV; void main(){ float fr=pow(1.0-abs(dot(normalize(vV),normalize(vN))),1.6); gl_FragColor=vec4(col,(fr*.55+.1)*k); }'});
    grp.userData.ghostEdge=new THREE.LineBasicMaterial({color:OC_GHOST_COL,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
    grp.userData.ghostDepth=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.FrontSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  }
  const mx=grp.userData.mixer; if(on&&!grp.userData.ghost&&mx){ mx.setTime(0); grp.updateMatrixWorld(true); }
  grp.traverse(o=>{ if(!o.isMesh||o.userData.ocSkip||o.userData.ocGhostBody||o.userData.depthOnly) return;
    if(on){ if(!o.userData.ocOrig) o.userData.ocOrig=o.material;
      if(!o.userData.ocKids){ let geo=o.geometry;
        if(o.isSkinnedMesh){ o.skeleton.update(); const pa=geo.attributes.position,bp=new Float32Array(pa.count*3),tv=new THREE.Vector3(); for(let vi=0;vi<pa.count;vi++){ tv.fromBufferAttribute(pa,vi); o.boneTransform(vi,tv); bp[vi*3]=tv.x; bp[vi*3+1]=tv.y; bp[vi*3+2]=tv.z; }
          geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(bp,3)); if(o.geometry.index) geo.setIndex(o.geometry.index); geo.computeVertexNormals(); }
        const d=new THREE.Mesh(geo,grp.userData.ghostDepth), e=new THREE.LineSegments(ocEdges(geo),grp.userData.ghostEdge); d.userData.ocSkip=e.userData.ocSkip=true; e.renderOrder=2; d.frustumCulled=e.frustumCulled=false; o.add(d); o.add(e); o.userData.ocKids=[d,e];
        if(o.isSkinnedMesh){ const gb=new THREE.Mesh(geo,grp.userData.ghostMat); gb.userData.ocGhostBody=true; gb.frustumCulled=false; o.add(gb); o.userData.ocKids.push(gb); o.userData.ocHideMat=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false}); } }
      o.material=o.isSkinnedMesh?o.userData.ocHideMat:grp.userData.ghostMat; o.userData.ocKids.forEach(c=>{ c.visible=true; }); o.renderOrder=1; }
    else if(o.userData.ocOrig){ o.material=o.userData.ocOrig; if(o.userData.ocKids) o.userData.ocKids.forEach(c=>{ c.visible=false; }); o.renderOrder=0; } });
  if(on&&!grp.userData.ghost&&mx) mx.setTime(0);
  grp.userData.ghost=on; }

function getArtifact(path){ return cached('art:'+path,async()=>{ const g=await loadGLB(path); solidify(g.scene,FX_MOON); const u=unit(g.scene); u.userData.fit=1.08; return u; }); }

const texL=new THREE.TextureLoader();
function boxTex(p){ const t=texL.load(BASE+p); t.minFilter=THREE.LinearFilter; t.magFilter=THREE.NearestFilter; t.generateMipmaps=false; return t; }
/* the kit box's side marquee (buildMarqueeCanvas + buildMarqueeRibbon): one continuous ribbon round the rim, text from the site */
function marqueeRibbon(text){
  const st=LIVE.marqStyle, cv=document.createElement('canvas'); let cx=cv.getContext('2d'); const H=128, font="700 70px 'Space Mono', monospace";
  cx.font=font; const tw=Math.max(1,Math.ceil(cx.measureText(text||' ').width)), copies=Math.max(1,Math.round(1024/tw));
  cv.width=tw*copies; cv.height=H; cx=cv.getContext('2d'); cx.fillStyle=st.bg; cx.fillRect(0,0,cv.width,H); cx.fillStyle=st.fg; cx.textBaseline='middle'; cx.textAlign='left'; cx.font=font;
  for(let i=0;i<copies;i++) cx.fillText(text,i*tw,H/2+2);
  const hw=.475,hh=.315,hz=.105,out=.006,c=[[hw,hh],[-hw,hh],[-hw,-hh],[hw,-hh]],seg=[]; let total=0;
  for(let i=0;i<4;i++){ const a=c[i],b=c[(i+1)%4],L=Math.hypot(b[0]-a[0],b[1]-a[1]); seg.push({a,b,u0:total,u1:total+L}); total+=L; }
  const pos=[],uvs=[];
  seg.forEach(s=>{ const a=s.a,b=s.b,u0=1-(s.u0/total),u1=1-(s.u1/total),ax=a[0]+Math.sign(a[0])*out,ay=a[1]+Math.sign(a[1])*out,bx=b[0]+Math.sign(b[0])*out,by=b[1]+Math.sign(b[1])*out;
    const A=[ax,ay,-hz],B=[bx,by,-hz],C=[bx,by,hz],D=[ax,ay,hz],P=(p,u,v)=>{ pos.push(p[0],p[1],p[2]); uvs.push(u,v); };
    P(A,u0,0); P(B,u1,0); P(C,u1,1); P(A,u0,0); P(C,u1,1); P(D,u0,1); });
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  const tex=new THREE.Texture(cv); tex.wrapS=THREE.RepeatWrapping; tex.wrapT=THREE.ClampToEdgeWrapping; tex.flipY=false; tex.minFilter=THREE.LinearFilter; tex.generateMipmaps=false; tex.encoding=THREE.LinearEncoding;
  tex.repeat.set(Math.max(1,Math.round(total/((cv.width/H)*(2*hz)))),1); tex.needsUpdate=true;
  const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:tex,fog:false,side:THREE.DoubleSide})); mesh.userData.marq=tex; return mesh;
}
function getKit(c){ return cached('kit:'+c.id,async()=>{
  if(document.fonts&&document.fonts.load) await document.fonts.load("700 70px 'Space Mono'",'M').catch(()=>{});
  const face=m=>{ if(m.map) m.map.encoding=THREE.LinearEncoding; addFx(m,FX_BOX,false); return m; };   // faceMat: the true texture + the kit box FX overlay
  const side=face(new THREE.MeshBasicMaterial({color:new THREE.Color(LIVE.marqStyle.bg)}));
  const geo=new THREE.BoxGeometry(.95,.63,.21);   // the site's kit ratio
  const box=new THREE.Mesh(geo,[side,side,side,side,face(new THREE.MeshBasicMaterial({map:boxTex(c.dir+'/boxtex-front.jpg')})),face(new THREE.MeshBasicMaterial({map:boxTex(c.dir+'/boxtex-back.jpg')}))]);
  const g=new THREE.Group(); g.add(box); const rib=marqueeRibbon(LIVE.marq[c.id]||c.name.toUpperCase()+' '); g.add(rib);
  const u=unit(g); u.userData.fit=.92; u.userData.marq=rib.userData.marq; return u;
}); }

/* row models: extruded SVG logos and small GLBs, in the holo look */
async function svgModel(url,mat){
  const txt=await fetch(url).then(r=>{ if(!r.ok) throw new Error(url+' '+r.status); return r.text(); });
  const data=new THREE.SVGLoader().parse(txt), g=new THREE.Group();
  data.paths.forEach(p=>p.toShapes(true).forEach(sh=>g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:1,bevelEnabled:false,curveSegments:8}),mat))));
  const b=new THREE.Box3().setFromObject(g), s=b.getSize(new THREE.Vector3());
  g.scale.set(1,-1,Math.max(s.x,s.y)*.16);
  return unit(g);
}
async function glbModel(path,mat){ const g=await loadGLB(path), depth=new THREE.MeshBasicMaterial({colorWrite:false,side:THREE.DoubleSide}), ms=[]; g.scene.traverse(o=>{ if(o.isMesh) ms.push(o); });
  /* setPlanetDepthPass: GLB planets prime depth first so only the front-most surface glows */
  ms.forEach(o=>{ o.material=mat; o.renderOrder=2; const d=new THREE.Mesh(o.geometry,depth); d.renderOrder=1; o.add(d); }); return unit(g.scene); }

/* ═════════ content ═════════ */
/* content fields carry the CMS's line breaks: everything else stays escaped */
const escBr=v=>esc(v).replace(/&lt;br\s*\/?&gt;/gi,'<br>').replace(/&amp;(amp|nbsp|#\d+);/g,'&$1;');
const CASES={
  w0:{id:'w0',slug:'meta-horizon-worlds',name:'Meta Horizon Worlds',dir:'assets/models/meta-horizon',arts:['assets/models/meta-horizon/duck-of-the-month-v2.glb','assets/models/meta-horizon/brickheadz-zuck-v2.glb'],url:'https://case.mundanework.shop/meta-horizon',line:'Shipping platform features to millions of users'},
  w1:{id:'w1',slug:'slate-auto',name:'Slate Auto',dir:'assets/models/slate-auto',arts:['assets/models/slate-auto/blank-slate-v2.glb'],url:'https://case.mundanework.shop/slate-auto',line:'Securing 160,000+ paid reservations, $4B+ in order value'},
  w2:{id:'w2',slug:'josh-ai',name:'Josh.ai',dir:'assets/models/josh-ai',arts:['assets/models/josh-ai/josh-micros.glb'],url:'https://case.mundanework.shop/josh-ai',line:'Building a startup to $10M+ ARR from scratch'}
};
/* same slugs as the galaxy (slugify), so a shared link opens the same thing on any device */
const slugify=s=>(s||'').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
const artSlug=(c,i)=>{ const m=COPY['artmeta:moon:'+c.id+':'+i]; return (m&&m.slug)||slugify((c.data.artifacts[i]||{}).title)||String(i); };
Object.values(CASES).forEach(c=>{ const s=COPY['case:'+c.id+':slug'], u=COPY['case:'+c.id+':ctaUrl']; if(s) c.slug=s; if(u&&u!=='#') c.url=u; });
const BY_SLUG={}; Object.values(CASES).forEach(c=>{ BY_SLUG[c.slug]=c; Object.assign(c,{data:DATA.cases[c.id]}); });
const LINKS={li:'https://linkedin.com/in/jason-hsin-00378837',ig:'https://www.instagram.com/jas0n_0n_a_bike/'};
const ZONES=[
  {name:'Work',rows:[
    {id:'w0',t:'Meta Horizon Worlds',s:CASES.w0.line,href:'/work/meta-horizon-worlds',make:()=>svgModel(BASE+'assets/models/meta-horizon/meta-logo.svg',planetMat('w0'))},
    {id:'w1',t:'Slate Auto',s:CASES.w1.line,href:'/work/slate-auto',make:()=>svgModel(BASE+'assets/models/slate-auto/slate-square-icon.svg',planetMat('w1'))},
    {id:'w2',t:'Josh.ai',s:CASES.w2.line,href:'/work/josh-ai',make:()=>svgModel(BASE+'assets/models/josh-ai/josh-doghead.svg',planetMat('w2'))}]},
  {name:'Personal',rows:[
    {id:'cv',t:'CV',s:'Work history',href:'/cv',make:()=>glbModel('assets/models/cv/briefcase-planet.glb',planetMat('cv',.3))},
    {id:'contact',t:'HoloNet',s:'Send a transmission',href:'/holonet',make:()=>glbModel('assets/models/holonet/endor-shield-planet-v2.glb',planetMat('contact',.3))}]},
  {name:'Socials',rows:[
    {id:'li',t:'LinkedIn',s:'Connect with Jason',href:LINKS.li,ext:'visitLinkedin',make:()=>svgModel(BASE+'assets/models/linkedin/linkedin-icon.svg',planetMat('li'))},
    {id:'ig',t:'Instagram',s:'@Jas0n_0n_a_Bike',href:LINKS.ig,ext:'visitInstagram',make:()=>svgModel(BASE+'assets/models/instagram/instagram-icon.svg',planetMat('ig'))}]},
  {name:'Fun',rows:[
    {id:'arcade',t:'Space Arcade',s:'Browser game',href:'/arcade',make:()=>glbModel('assets/models/arcade/nano-n1-planet-v2.glb',planetMat('arcade',.3))}]}
];
/* outfits: origin/main assets/outfits.json + the site's lock rules. Arcade rules can't be met here, "Unlock all" in the perf panel lifts them. */
const OUTFITS=[{id:'head',head:true,name:LIVE.head.name==='default'?'Default':(LIVE.head.name||'Default'),about:LIVE.head.about,unlock:{type:'free'}}].concat((await fetch('assets/outfits.json').then(r=>r.json())).outfits.filter(o=>o.enabled));
let EV=store('events')||{cases:{}};
function note(k,v){ if(k==='case') EV.cases[v]=1; else EV[k]=1; store('events',EV); }
function locked(o){ if(SET.unlockAll||o===OUTFITS[0]) return false; const u=o.unlock||{}; if(u.type==='caseStudy') return !EV.cases[u.target||'w0']; if(u.type==='visitLinkedin'||u.type==='visitInstagram') return !EV[u.type]; return u.type!=='free'; }
function lockLine(o){ const u=o.unlock||{}; if(u.type==='caseStudy') return 'See the '+(CASES[u.target]?CASES[u.target].name:'')+' case study to unlock'; if(u.type==='visitLinkedin') return 'Visit my LinkedIn to unlock'; if(u.type==='visitInstagram') return 'Visit my Instagram to unlock'; return 'Play the Space Arcade to unlock'; }
let curOutfit=store('outfit'); if(!OUTFITS.some(o=>o.id===curOutfit)||locked(OUTFITS.find(o=>o.id===curOutfit))) curOutfit=OUTFITS[0].id;
const outfitById=id=>OUTFITS.find(o=>o.id===id);

/* ═════════ surfaces: the stage renderer's single in-flow canvas moves to whichever one is showing ═════════ */
function makeSurface(host,statusEl,opt){
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(opt.fov||30,1,.1,80), pivot=new THREE.Group(); scene.add(pivot);
  const s={host,scene,camera,pivot,statusEl,yaw:0,yawV:0,pitch:opt.pitch||0,zoom:1,pan:0,obj:null,tok:0,inView:true,opt,hold:0,w:0,h:0,dirty:true,
    status(t){ statusEl.textContent=t||''; },
    show(loader,label,after){ const tok=++s.tok; if(s.obj&&s.obj.parent===pivot) pivot.remove(s.obj); s.obj=null; s.status('Loading');
      loader().then(o=>{ if(tok!==s.tok) return; if(after) after(o); pivot.add(o); s.obj=o; s.status(''); })
        .catch(e=>{ if(tok!==s.tok) return; console.error(label,e); s.status('Could not load '+label); }); },
    reset(){ s.yaw=opt.yaw0||0; s.yawV=0; s.pitch=opt.pitch||0; s.zoom=1; s.hold=0; }
  };
  s.reset();
  new ResizeObserver(()=>{ s.dirty=true; }).observe(host);
  return s;
}
function worldPerPx(s){ return 2*s.dist*Math.tan(s.camera.fov*Math.PI/360)/Math.max(1,s.host.clientHeight); }

/* index hologram: figure + cone over the DOM sky */
const holo=makeSurface($('#holo'),$('#holoSt'),{fov:30,yaw0:0});
const FIG_Y=2.15;
/* the index camera has one fixed view: far enough back that the whole ring fits the width, high enough that its near and far bands never overlap on screen */
const RING={R:3,lo:3.85,hi:4.35,gap:.7}, HOLO_TOP=RING.hi, HOLO_BOTTOM=-1;
function holoView(aspect,fov){
  const tanV=Math.tan(fov*Math.PI/360), side=Math.atan(tanV*aspect), D=Math.max(RING.R/tanV,RING.R*1.05/Math.sin(side));
  const H=(RING.hi*(D+RING.R)-RING.lo*(D-RING.R))/(2*RING.R)+RING.gap;
  const a=Math.atan((H-HOLO_TOP)/(D+RING.R)), b=Math.atan((H-HOLO_BOTTOM)/D), ty=H-D*Math.tan((a+b)/2);
  return {D,H,ty};
}
holo.auto=0;   // the figure's slow idle turn (the site's logo spin), on top of the drag
holo.gal=0;    // the whole hologram's drift (the site's galaxy autoRotate: 0.0011 x spin .4 x dir -1 per frame at 60fps): plate, ring, emitter and figure
const holoBase=new THREE.Group(); holo.scene.add(holoBase);   // plate + ring turn with the drag; the cone is round
let beamU, ring, emitter, spark, studMat;
(function buildHologram(){
  /* cone: the site's beam at its live size (marqDiamEn 3, marqHeightEn 4.1) */
  beamU={baseColor:{value:new THREE.Color(SITE.line)},hotColor:{value:new THREE.Color(SITE.hot)},beamBottom:{value:.8},beamTop:{value:.2},beamCurve:{value:.4}};
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(3,.18,4.1,28,1,true),new THREE.ShaderMaterial({uniforms:Object.assign({},SHU,beamU),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.FrontSide,vertexShader:BEAM_VERT,fragmentShader:BEAM_FRAG}));
  beam.position.y=2.05; holo.scene.add(beam); holo.beam=beam;
  /* stud plate */
  const PLATE=5, Rw=PLATE+.2, C=1024, cv=document.createElement('canvas'); cv.width=cv.height=C; const x=cv.getContext('2d'), toC=(a,b)=>[(a/Rw*.5+.5)*C,(b/Rw*.5+.5)*C];
  x.save(); x.beginPath(); for(let a=0;a<=160;a++){ const t=a/160*Math.PI*2, c=Math.cos(t), s=Math.sin(t), R=PLATE-.2, p=toC(R*Math.sign(c)*Math.pow(Math.abs(c),.5),R*Math.sign(s)*Math.pow(Math.abs(s),.5)); a?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]); } x.closePath(); x.clip();
  x.strokeStyle='#5ABFB8'; x.lineJoin='miter'; const half=.1/Rw*.5*C, st=Math.max(1.5,half*.28); x.lineWidth=Math.max(1.5,half*.4); x.globalAlpha=.6;
  for(let a=-PLATE;a<=PLATE;a+=.55) for(let b=-PLATE;b<=PLATE;b+=.55){ const c=toC(a,b), L=half*2, x0=c[0]-half, y0=c[1]-half, q=st, w=st*2, P=[[0,w],[q,w],[q,q],[w,q],[w,0],[L-w,0],[L-w,q],[L-q,q],[L-q,w],[L,w],[L,L-w],[L-q,L-w],[L-q,L-q],[L-w,L-q],[L-w,L],[w,L],[w,L-q],[q,L-q],[q,L-w],[0,L-w]]; x.beginPath(); P.forEach((p,i)=>i?x.lineTo(x0+p[0],y0+p[1]):x.moveTo(x0+p[0],y0+p[1])); x.closePath(); x.stroke(); }
  x.restore();
  studMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide});
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(Rw*2,Rw*2),studMat); plate.rotation.x=-Math.PI/2; plate.position.y=.006; holoBase.add(plate);
  /* text ring: the site's makeRing, with its Aurebesh to Latin decode. Only the fallback base stays hidden until the monogram has failed */
  const rc=document.createElement('canvas'); rc.width=4096; rc.height=128; const rx=rc.getContext('2d'), tex=new THREE.CanvasTexture(rc); tex.wrapS=THREE.RepeatWrapping;
  const FONT="700 120px 'Space Mono', monospace", T=LIVE.marqueeEn||' '; let dec=null;
  const drawRing=()=>{ rx.clearRect(0,0,rc.width,rc.height); rx.fillStyle='#5ABFB8'; rx.font=FONT; rx.textBaseline='middle'; rx.textAlign='left'; const unit=Math.max(1,rx.measureText(T).width), n=Math.max(1,Math.round(rc.width/unit)), step=rc.width/n;
    for(let i=0;i<n;i++){ rx.save(); rx.translate(i*step,0); rx.scale(step/unit,1);
      if(dec){ const adv=unit/T.length; rx.textAlign='center'; for(let k=0;k<T.length;k++){ const g=dec[k]; rx.font=g.done?FONT:"700 120px 'Aurebesh', 'Space Mono', monospace"; rx.fillText(g.done?T[k]:g.c,k*adv+adv/2,72); } }
      else rx.fillText(T,0,72); rx.restore(); } tex.needsUpdate=true; };
  drawRing(); if(document.fonts&&document.fonts.load) document.fonts.load("700 120px 'Space Mono'",'M').then(()=>{ if(!dec) drawRing(); }).catch(()=>{});
  const pool='ABCDEFGHIJKLMNOPQRSTUVWXYZ', ringU={map:{value:tex},baseColor:{value:new THREE.Color(SITE.line)},hotColor:{value:new THREE.Color(SITE.hot)},opBase:{value:1}};
  ring=new THREE.Mesh(new THREE.CylinderGeometry(3,3,.5,64,1,true),new THREE.ShaderMaterial({uniforms:Object.assign({},SHU,ringU),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,vertexShader:RING_VERT,fragmentShader:RING_FRAG}));
  ring.position.y=4.1; holoBase.add(ring);
  ring.userData.decode=()=>{ if(reduce) return; const t0=performance.now(), plan=[...T].map(()=>({at:Math.random()*1400,c:pool[Math.floor(Math.random()*26)],done:false})); dec=plan;
    Promise.resolve(document.fonts&&document.fonts.load?document.fonts.load("700 120px 'Aurebesh'",'A'):0).catch(()=>{}).then(()=>{ let last=0; (function tick(now){ if(now-last>70){ last=now; const e=now-t0; let open=false; plan.forEach(g=>{ if(e>=g.at) g.done=true; else{ open=true; if(Math.random()<.25) g.c=pool[Math.floor(Math.random()*26)]; } }); if(!open) dec=null; drawRing(); if(!open) return; } requestAnimationFrame(tick); })(performance.now()); }); };
  /* fallback base: the site shows this only when the monogram can't load */
  emitter=new THREE.Mesh(new THREE.CylinderGeometry(.42,.55,.34,24),new THREE.MeshBasicMaterial({color:SITE.line,transparent:true,opacity:.6})); emitter.position.y=.17; emitter.visible=false; holo.scene.add(emitter);
  spark=new THREE.Mesh(new THREE.SphereGeometry(.12,12,12),new THREE.MeshBasicMaterial({color:0xEAFEFB})); spark.position.y=.36; spark.visible=false; holo.scene.add(spark);
  holo.pivot.position.y=FIG_Y;
})();

/* ═════════ MW monogram: the site's studio-rendered mark, on a camera-facing quad. Entry gate first, then the holographic emitter at the base of the cone ═════════ */
const MW={state:'idle',mono:null,tex:null,quad:null,holoMat:null,holoU:null,dockY:-.4,dockMul:.62,diam:.775*2,scale:1.4,lastKey:''};
const _M=new THREE.Matrix4(),_I=new THREE.Matrix4(),_S=new THREE.Matrix4(),_eye=new THREE.Vector3(),_up=new THREE.Vector3(),_cam=new THREE.Vector3(),_C=new THREE.Vector3(),_Q=new THREE.Quaternion(),_V=new THREE.Vector3(1,1,1);
function monoLoad(){
  if(MW.state!=='idle') return MW.ready; MW.state='loading';
  MW.ready=new Promise((res,rej)=>{ const el=document.createElement('script'); el.src=BASE+'assets/mw-monogram/mw-monogram.js'; el.onerror=()=>rej(new Error('bundle failed to load')); el.onload=res; document.head.appendChild(el); })
    .then(()=>fetch(BASE+'assets/mw-monogram/mark.json')).then(r=>{ if(!r.ok) throw new Error('mark.json '+r.status); return r.json(); })
    .then(mark=>MWMonogram.createMonogram({mark,hdri:BASE+'assets/mw-monogram/ferndale_studio_04_1k.hdr'}))
    .then(m=>{ MW.mono=m; MW.tex=new THREE.CanvasTexture(m.canvas); MW.tex.minFilter=THREE.LinearFilter; MW.tex.generateMipmaps=false;
      MW.quad=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:MW.tex,transparent:true,alphaTest:.003,depthWrite:true,fog:false})); MW.quad.frustumCulled=false; MW.state='ready'; })
    .catch(e=>{ console.error('[mw-monogram]',e); MW.state='failed'; emitter.visible=spark.visible=true; if(GT.on) endGate(); });
  return MW.ready;
}
function monoHolo(){ if(MW.holoMat||!MW.tex) return; MW.holoU={map:{value:MW.tex},baseColor:{value:new THREE.Color(SITE.line)},hotColor:{value:new THREE.Color(SITE.hot)},opBase:{value:1},glitch:{value:0}};
  MW.holoMat=new THREE.ShaderMaterial({uniforms:Object.assign({},SHU,MW.holoU),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,vertexShader:RING_VERT,fragmentShader:MWHOLO_FRAG}); }
/* draws the mark into its own canvas for this camera, and sets the quad to match (mwUpdate) */
function monoPlace(M,camera,bufH){
  const m=MW.mono; camera.updateMatrixWorld(); _I.copy(M).invert(); _cam.setFromMatrixPosition(camera.matrixWorld); _eye.copy(_cam).applyMatrix4(_I);
  _up.set(0,1,0).transformDirection(camera.matrixWorld); const ux=_up.x,uy=_up.y,uz=_up.z; _up.transformDirection(_I);
  const sW=M.getMaxScaleOnAxis(); _C.setFromMatrixPosition(M); const dist=Math.max(1e-3,_C.distanceTo(_cam)), onScreen=(m.radius*sW/dist)/Math.tan(camera.fov*Math.PI/360)*bufH, pxs=Math.min(1024,Math.max(64,Math.round(onScreen*2)));
  const fr=m.render(_eye,_up,pxs); MW.tex.needsUpdate=true; MW.quad.position.copy(_C); MW.quad.scale.setScalar(2*fr.halfSize*sW); MW.quad.up.set(ux,uy,uz); MW.quad.lookAt(_cam);
}
function monoDockedFrame(s){   // the emitter only redraws when its view changes, so it costs nothing while idle
  if(MW.state!=='ready'||GT.on) return;
  monoHolo(); if(MW.quad.material!==MW.holoMat) MW.quad.material=MW.holoMat; if(MW.quad.parent!==holo.scene) holo.scene.add(MW.quad);
  MW.holoU.opBase.value=bootVal(0);
  const turn=holo.yaw+holo.gal, key=[turn.toFixed(2),s.camera.position.y.toFixed(3),s.camera.position.z.toFixed(3),s.h].join();
  if(key===MW.lastKey) return; MW.lastKey=key;
  _Q.setFromAxisAngle(new THREE.Vector3(0,1,0),turn); const k=MW.diam/(2*MW.mono.radius)*MW.scale*MW.dockMul;
  _M.compose(new THREE.Vector3(0,MW.dockY,0),_Q,_V.set(k,k,k)); monoPlace(_M,s.camera,s.h);
}
/* boot cascade after the dock: glow, beam, ring, head, each flickering on (updateBootCascade) */
let BOOT_T0=null;
function bootVal(delay){ if(BOOT_T0==null) return 1; const u=(performance.now()/1000-BOOT_T0-delay)/.21; if(u<=0) return 0; if(u>=1) return 1; const tick=Math.floor(u*9); let h=Math.sin(tick*12.9898+4.1414)*43758.5453; h-=Math.floor(h); const ramp=Math.min(1,u*1.15); return (h<(.22+.7*(tick/9)))?ramp:ramp*.1; }

/* page momentum, driven from script after a vertical hologram drag */
/* index hologram: sideways rotates. Vertical belongs to the browser (touch-action:pan-y in the CSS), and the zoom is fixed */
gesture(holo.host,{
  lockPx:10,
  start(){ holo.yawV=0; },
  drag(dx,dy,axis){ if(axis==='h'){ holo.yaw+=dx*.012; holo.yawV=dx*.012*60; } }
});

/* outfit + case stages own every gesture on their surface (touch-action:none in CSS) */
function bindStage(s){
  gesture(s.host,{lockPx:4,
    start(){ s.yawV=0; s.hold=1e9; },
    drag(dx,dy){ s.yaw+=dx*.012; s.yawV=dx*.012*60; s.pitch=clamp(s.pitch+dy*.008,-.7,.7); },
    pinch(r){ s.zoom=clamp(s.zoom*r,s.opt.zoomMin,s.opt.zoomMax); },
    end(){ s.hold=performance.now()+1800; }
  });
}
const sOutfit=makeSurface($('#sOutfit'),$('#outfitSt'),{fov:30,zoomMin:.6,zoomMax:3,spin:0,yaw0:.6});
const sCase=makeSurface($('#sCase'),$('#caseSt'),{fov:30,zoomMin:.6,zoomMax:3.2,spin:.28,pitch:.16,yaw0:-.5});
bindStage(sOutfit); bindStage(sCase);

let active=holo;
function attach(s){ active=s; s.host.insertBefore(stageR.domElement,s.host.firstChild); s.dirty=true; }

function frameCamera(s){
  const w=s.host.clientWidth||1, h=s.host.clientHeight||1, aspect=w/h, tanV=Math.tan(s.camera.fov*Math.PI/360);
  const resized=s.dirty; if(s.dirty){ const P=px(), bw=Math.max(1,Math.floor(w/P)), bh=Math.max(1,Math.floor(h/P)); sizeStage(bw,bh); stageR.domElement.style.height=''; s.w=bw; s.h=bh; s.dirty=false; }
  s.camera.aspect=aspect;
  if(s===holo){
    const v=holoView(aspect,s.camera.fov); s.dist=v.D; s.camera.position.set(0,v.H,v.D); s.camera.lookAt(0,v.ty,0);
    /* the base grid runs past the hologram's box and behind the button: same framing, the canvas and the view just extend downward to the plate's nearest corner */
    if(resized){ const P=px(), c=s.camera; c.clearViewOffset(); c.updateProjectionMatrix(); c.updateMatrixWorld(); const y=(1-new THREE.Vector3(0,.006,6.1).project(c).y)/2*h, bh=Math.max(s.h,Math.ceil((Math.max(h,y+8))/P)); sizeStage(s.w,bh); stageR.domElement.style.height=(bh*P)+'px'; c.setViewOffset(w,h,0,0,w,bh*P); s.over=bh*P-h; }
  }else{
    const fit=(s.obj&&s.obj.userData.fit)||1.2, ctrl=46/h, base=Math.max(fit/tanV,fit/(tanV*aspect))/(1-ctrl*1.2); s.dist=base/s.zoom;
    const ty=-(ctrl*s.dist*tanV); s.camera.position.set(0,ty,s.dist); s.camera.lookAt(0,ty,0);
  }
  s.camera.updateProjectionMatrix();
}
const obsHolo=new IntersectionObserver(es=>{ holo.inView=es[es.length-1].isIntersecting; }); obsHolo.observe(holo.host);

/* ═════════ rows: one offscreen renderer, each visible row copied into its own in-flow 2D canvas ═════════ */
const ROWS=[];
(function buildRows(){
  const host=$('#rows');
  ZONES.forEach(z=>{
    const sec=document.createElement('section'); sec.className='zone'; sec.innerHTML='<h2>'+esc(z.name)+'</h2>'; host.appendChild(sec);
    z.rows.forEach(r=>{
      const a=document.createElement('a'); a.className='row'; a.href=r.href; a.dataset.id=r.id;
      if(r.ext){ a.target='_blank'; a.rel='noopener'; a.setAttribute('aria-label',r.t+', opens in a new tab'); a.addEventListener('click',()=>note(r.ext)); }
      const cv=document.createElement('canvas'); cv.width=ROW_BUF; cv.height=ROW_BUF; cv.setAttribute('aria-hidden','true');
      const lb=document.createElement('span'); lb.innerHTML='<span class="t">'+esc(r.t)+'</span><span class="s">'+esc(r.s)+'</span>';
      a.appendChild(cv); a.appendChild(lb); sec.appendChild(a);
      const scene=new THREE.Scene(), cam=new THREE.PerspectiveCamera(30,1,.1,30), pivot=new THREE.Group(); scene.add(pivot); pivot.rotation.x=.22;
      cam.position.set(0,.2,4.3); cam.lookAt(0,0,0);
      const row={el:a,ctx:cv.getContext('2d'),scene,cam,pivot,yaw:ROWS.length*1.1,inView:false,model:null,loading:false,drawn:false,make:r.make,id:r.id};
      row.ctx.imageSmoothingEnabled=false; ROWS.push(row);
    });
  });
  const io=new IntersectionObserver(es=>{ es.forEach(e=>{ const row=ROWS.find(x=>x.el===e.target); row.inView=e.isIntersecting; if(row.inView) ensureRow(row); }); },{rootMargin:'96px 0px'});
  ROWS.forEach(r=>io.observe(r.el));
})();
function ensureRow(row){ if(row.loading||row.model) return; row.loading=true; row.make().then(m=>{ row.model=m; row.pivot.add(m); }).catch(e=>{ console.error('row',row.id,e); row.loading=false; }); }
let rowMs=0,rowCount=0;
function drawRow(row){ rowPost.draw(row.scene,row.cam); row.ctx.clearRect(0,0,ROW_BUF,ROW_BUF); row.ctx.drawImage(rowR.domElement,0,0); row.drawn=true; }

/* ═════════ starfield ═════════ */
/* the site's CV-list sky: three posterized layers that drift at different rates as the page scrolls (transform only). Density is a little over the site's so a phone screen isn't empty */
const SKY=[{f:.06,d:.07,big:0},{f:.16,d:.044,big:.2},{f:.32,d:.026,big:.5}]; let skyW=0, skyEls=[];
function drawSky(){
  const W=innerWidth; if(W===skyW) return; skyW=W;
  const H=Math.max(innerHeight,screen.height||0)+120, P=px(), L=SET.levels, sky=$('#sky'), col=css.getPropertyValue('--bric-register-teal-text').trim(); sky.textContent=''; skyEls=[];
  SKY.forEach((t,li)=>{ const lh=Math.ceil(H+9000*t.f)+8, c=document.createElement('canvas'); c.width=Math.ceil(W/P); c.height=Math.ceil(lh/P); c.style.width=(c.width*P)+'px'; c.style.height=(c.height*P)+'px';
    const g=c.getContext('2d'); let a=7+li*101; const r=()=>{ a|=0; a=a+0x6D2B79F5|0; let q=Math.imul(a^a>>>15,1|a); q=q+Math.imul(q^q>>>7,61|q)^q; return ((q^q>>>14)>>>0)/4294967296; };
    g.globalAlpha=Math.round(.7*L)/L; g.fillStyle=col; const n=Math.round(W*lh/1000*t.d); for(let k=0;k<n;k++){ const s=r()<t.big?2:1; g.fillRect(Math.floor(r()*c.width),Math.floor(r()*c.height),s,s); }
    c._f=t.f; sky.appendChild(c); skyEls.push(c); });
  skyScroll();
}
function skyScroll(){ const y=window.scrollY; skyEls.forEach(c=>{ c.style.transform='translate3d(0,'+(-Math.round(y*c._f))+'px,0)'; }); }
drawSky(); addEventListener('resize',drawSky); addEventListener('scroll',skyScroll,{passive:true});

/* ═════════ views ═════════ */
const VIEWS=['index','outfit','case','cv','holonet'].map(n=>$('#v-'+n));
let curView=$('#v-index'), indexScroll=0;
if('scrollRestoration' in history) history.scrollRestoration='manual';
function showView(el){
  if(curView===$('#v-index')&&el!==curView) indexScroll=window.scrollY;
  const changed=el!==curView;
  VIEWS.forEach(v=>{ v.hidden=v!==el; });
  document.documentElement.classList.toggle('split-on',el.classList.contains('split'));
  if(changed){ el.classList.remove('view-in'); void el.offsetWidth; el.classList.add('view-in'); }
  curView=el;
  if(changed) window.scrollTo(0,el===$('#v-index')?indexScroll:0);
  $('#wmBk').hidden=el===$('#v-index');
  skyScroll();
}

/* outfit focus */
let oIdx=0;
function renderOutfit(id){
  const o=outfitById(id)||OUTFITS[0]; oIdx=OUTFITS.indexOf(o); const lock=locked(o), a=o.about||{};
  showView($('#v-outfit')); attach(sOutfit);
  $('#oName').innerHTML=esc(o.name)+'<small>'+(oIdx+1)+' / '+OUTFITS.length+(lock?' · locked':'')+'</small>';
  if(!lock){ curOutfit=o.id; store('outfit',o.id); }
  sOutfit.reset();
  sOutfit.show(()=>getFigure(o),o.name,f=>setGhost(f,lock));
  const kick=lock?'Outfit locked':(a.kicker||'About Jason'), body=lock?(a.teaser||lockLine(o)):(a.body||'');
  let cta='';
  if(a.ctaShow&&a.ctaText){
    const u=o.unlock||{}, caseT=u.type==='caseStudy'?CASES[u.target]:null;
    let href=a.ctaUrl||'', attrs='';
    if(caseT) href='/work/'+caseT.slug;
    else if(/mundanework\.shop\/arcade/.test(href)) href='/arcade';
    else if(a.ctaTarget==='new'||u.type==='visitInstagram'){ attrs=' target="_blank" rel="noopener"'; }
    if(href) cta='<a class="bric-btn bric-btn--primary bric-btn--block" href="'+esc(href)+'"'+attrs+' data-note="'+esc(u.type==='visitLinkedin'||u.type==='visitInstagram'?u.type:'')+'">'+esc(a.ctaText)+'</a>';
  }
  const p=$('#oPane'); p.scrollTop=0;
  const extra=(!lock&&(a.extraLinks||[]).length)?'<div class="o-extra">'+a.extraLinks.map(l=>'<a class="bric-btn bric-btn--secondary bric-btn--block" href="'+esc(l.url)+'" target="_blank" rel="noopener">'+esc(l.label)+'</a>').join('')+'</div>':'';
  p.innerHTML='<div class="micro kick">'+esc(kick)+'</div><h2>'+esc(a.title||o.name)+'</h2><p class="body">'+esc(body)+'</p>'+cta+extra;
  const c=p.querySelector('[data-note]'); if(c&&c.dataset.note) c.addEventListener('click',()=>note(c.dataset.note));
}
function stepOutfit(d){ if(window.MWAudio){ MWAudio.uiReady(); MWAudio.ui('confirm'); } const n=OUTFITS.length, o=OUTFITS[(oIdx+d+n)%n]; history.replaceState(null,'','/about/'+o.id); renderOutfit(o.id); }
$('#oPrev').addEventListener('click',()=>stepOutfit(-1)); $('#oNext').addEventListener('click',()=>stepOutfit(1));

/* case study */
let cCase=null,cIdx=0;
function renderCase(c,i){
  cCase=c; const items=1+c.arts.length; cIdx=clamp(i,0,items-1);
  showView($('#v-case')); attach(sCase);
  $('#cCount').textContent=(cIdx+1)+' / '+items;
  sCase.reset();
  if(cIdx===0) sCase.show(()=>getKit(c),'kit box'); else sCase.show(()=>getArtifact(c.arts[cIdx-1]),c.data.artifacts[cIdx-1].title);
  const d=c.data; let h;
  if(cIdx===0){
    h='<div class="micro kick">Case study</div><h2>'+esc(c.name)+'</h2><p class="body">'+esc(d.body)+'</p>'+
      '<div class="tags">'+d.tags.map(t=>'<span class="bric-tag">'+esc(t)+'</span>').join('')+'</div>'+
      '<dl class="snap">'+d.snapshot.map(r=>'<div><dt>'+esc(r.k)+'</dt><dd'+(r.amber?' class="amber"':'')+'>'+escBr(r.v)+'</dd></div>').join('')+'</dl>'+
      (d.extraLinks.length?'<div class="links">'+d.extraLinks.map(l=>'<a class="bric-btn bric-btn--secondary bric-btn--block" href="'+esc(l.url)+'" target="_blank" rel="noopener">'+esc(l.label)+'</a>').join('')+'</div>':'');
  }else{
    const a=d.artifacts[cIdx-1];
    h='<div class="micro kick">Artifact from '+esc(c.name)+'</div><h2>'+esc(a.title)+'</h2><p class="body">'+esc(a.desc)+'</p>'+
      '';
  }
  /* pinned to the bottom of the screen: the case study CTA on the kit box, an artifact's own links on an artifact */
  const links=cIdx?(d.artifacts[cIdx-1].links||[]):[], st=$('#cStick'), p=$('#cPane');
  st.innerHTML=cIdx?links.map((l,i)=>'<a class="bric-btn '+(i?'bric-btn--secondary':'bric-btn--primary')+' bric-btn--block" href="'+esc(l.url)+'" target="_blank" rel="noopener">'+esc(l.label)+'</a>').join(''):'<a class="bric-btn bric-btn--primary bric-btn--block" id="cCta" href="'+esc(c.url)+'">View case study</a>';
  p.scrollTop=0; p.innerHTML=h; p.style.paddingBottom=(st.offsetHeight+16)+'px';
  const cta=$('#cCta'); if(cta) cta.addEventListener('click',e=>{ note('case',c.id); if(window.bricWipe){ e.preventDefault(); bricWipe.go(c.url); } });
}
function stepCase(d){ if(window.MWAudio){ MWAudio.uiReady(); MWAudio.ui('confirm'); } const n=1+cCase.arts.length, i=(cIdx+d+n)%n; history.replaceState(null,'','/work/'+cCase.slug+(i?'/'+artSlug(cCase,i-1):'')); renderCase(cCase,i); }
$('#cPrev').addEventListener('click',()=>stepCase(-1)); $('#cNext').addEventListener('click',()=>stepCase(1));

/* static lists */
$('#cvList').insertAdjacentHTML('beforeend',DATA.cv.slice().reverse().map(n=>{
  const sn=n.snapshot||[], when=(sn.find(r=>/service|length|date/i.test(r.k))||{}).v, rest=sn.filter(r=>r.v!==when);
  return '<article class="manual cv-i"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i><div class="micro">'+esc(n.kicker)+'</div><h3>'+esc(n.title)+'</h3><div class="sub">'+esc(n.sub)+'</div>'+(when?'<span class="mono when">'+esc(when)+'</span>':'')+'<p class="body">'+esc(n.body)+'</p>'+
    (rest.length?'<dl class="snap" style="margin:10px 0 0">'+rest.map(r=>'<div><dt>'+esc(r.k)+'</dt><dd>'+escBr(r.v)+'</dd></div>').join('')+'</dl>':'')+
    ((n.links||[]).filter(l=>l.url&&l.url!=='#').length?'<div class="links">'+n.links.filter(l=>l.url&&l.url!=='#').map(l=>'<a class="bric-btn bric-btn--secondary bric-btn--block" href="'+esc(l.url)+'" target="_blank" rel="noopener">'+esc(l.label)+'</a>').join('')+'</div>':'')+'</article>';
}).join(''));
/* CV hero: the site's one-liner + CTAs (cvHeadLines, cvCtaRow) */
const CV_HEAD=['Shipped to millions.','Built systems for the world’s most exclusive properties.','Designed funnels behind $4B+ in potential orders.'];
function cvCtas(){ const o=LIVE.cvHero||{}, lines=o.lines||[]; return '<div class="cvl-ctas">'+(o.chatHidden?'':'<a class="bric-btn bric-btn--primary" href="'+esc(o.chatUrl||'https://calendly.com/jason-mundanework/30min')+'" target="_blank" rel="noopener">'+esc(o.chatLabel||'Start a chat')+'</a>')+
  '<a class="bric-btn bric-btn--secondary" href="'+esc(LIVE.cvUrl)+'" target="_blank" rel="noopener">Download CV (PDF)</a>'+
  (o.mailHidden?'':'<div class="t"><a class="bric-btn" href="'+esc(o.mailUrl||'mailto:jason@mundanework.shop')+'">'+esc(o.mailLabel||'e-mail jason')+'</a></div>')+'</div>'; }
$('#cvHero').innerHTML='<h1 class="cv-head">'+esc(CV_HEAD.map((d,i)=>((LIVE.cvHero||{}).lines||[])[i]||d).join(' '))+'</h1>'+cvCtas();
$('#cvEnd').innerHTML=cvCtas();

/* HoloNet: rows from the public table; the console is the site's and Transmit posts to /api/holonet-submit */
const fxy=v=>{ const n=(+v||0).toFixed(2); return (n[0]==='-'?' ':'  ')+n; };
const msgHtml=m=>{ const d=m.created_at?new Date(m.created_at):null; return '<article class="msg"><div class="n"><span>'+esc(m.name||'Anonymous')+'</span>'+(d&&!isNaN(d)?'<time datetime="'+esc(d.toISOString())+'">'+esc(d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}))+'</time>':'')+'</div><p>'+esc(m.msg)+'</p><span class="c">X'+fxy(m.x)+'  Y'+fxy(m.y)+'  Z'+fxy(m.z)+'</span></article>'; };
const msgState=t=>{ $('#msgState').textContent=t||''; };
function loadMsgs(){ msgState('Receiving transmissions'); sbGet('messages?select=id,name,msg,x,y,z,created_at&approved=eq.true&order=created_at.desc&limit=30',6000).then(rows=>{ $('#msgs').innerHTML=rows.map(msgHtml).join(''); msgState(rows.length?'':'No transmissions yet'); }).catch(e=>{ console.warn('[holonet]',e); msgState('Transmissions didn’t load'); }); }
loadMsgs();
const ct=(function(){
  const NAME_MAX=40,MSG_MAX=280,NAME_MIN=1,MSG_MIN=2,TILT=12,UPLINK=1400, el=id=>document.getElementById(id), sheet=el('ctSheet'), ni=el('ctName'), mi=el('ctMsg'), sb=el('ctSend'); let lastSat=0,wasLocked=false,phase='compose',locked=false,cool=false,armed=false,said='',segs=[],opener=null;
  const say=t=>{ if(t!==said){ said=t; el('ctLive').textContent=t; } };
  const hint=(t,st)=>{ el('ctHint').textContent=t; if(st) el('ctHead').setAttribute('data-state',st); };
  const layer=id=>['ctAlign','ctRows'].forEach(k=>el(k).classList.toggle('on',k===id));
  const stamp=()=>{ const d=new Date(), p=n=>(n<10?'0':'')+n; el('ctAln').textContent=p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes()); };
  const arm=on=>{ const g=el('ctGo'); if(on===armed) return; armed=on; g.classList.remove('fire'); if(on){ void g.offsetWidth; g.classList.add('fire'); setTimeout(()=>g.classList.remove('fire'),800); } };
  function count(i,c,max){ const left=max-i.value.length, e=el(c); e.textContent=left+' / '+max; e.classList.toggle('low',left<=Math.ceil(max*.1)&&left>0); e.classList.toggle('zero',left<=0); }
  function assess(){ count(ni,'ctNameCount',NAME_MAX); count(mi,'ctMsgCount',MSG_MAX); if(phase!=='compose') return;
    const n=ni.value.trim().length,m=mi.value.trim().length,no=ni.value.length-NAME_MAX,mo=mi.value.length-MSG_MAX,over=no>0||mo>0,p=over?0:(Math.min(n,NAME_MIN)+Math.min(m,MSG_MIN))/(NAME_MIN+MSG_MIN); locked=!over&&n>=NAME_MIN&&m>=MSG_MIN;
    const sat=over?0:(n>=NAME_MIN?1:0)+(m>=MSG_MIN?1:0); if(window.MWAudio){ if(locked&&!wasLocked) MWAudio.site('holoAligned'); else if(sat>lastSat&&!locked) MWAudio.site('holoAlignStep'); } lastSat=sat; wasLocked=locked;
    el('ctDish').style.transform='rotate('+(over?-TILT*1.3:-TILT*(1-p))+'deg)'; el('ctScr').classList.toggle('locked',locked); sb.setAttribute('aria-disabled',String(!locked||cool)); arm(locked&&!cool);
    if(over){ hint(no>0?'Trim the callsign by '+no+' to realign':'Trim the message by '+mo+' to realign','off'); say('Overload. The dish fell out of alignment.'); }
    else if(locked){ hint(cool?'Dish recharging, a moment…':'Dish aligned, ready to transmit',cool?'wait':'on'); say('Dish aligned. Ready to transmit.'); }
    else { hint('Write your message to align the dish and transmit','off'); say('Dish misaligned.'); } }
  const CT_W=[24.2,18,10.8,8.8,6,3,1.6,1.8,1.8,6.9,6.9,10.4,17.3,26.5],CT_RD=[[.06,.94],[.12,1],[0,.86],[0,.78]];
  function buildRows(){ const g=el('ctRowsG'); if(segs.length) return; const NS='http://www.w3.org/2000/svg',INK='#D8CDEC',mk=(t,a)=>{ const e=document.createElementNS(NS,t); for(const k in a) e.setAttribute(k,a[k]); g.appendChild(e); return e; };
    [[11.5,2.3,9],[14.8,1.1,9],[31.2,7.4,7,1],[48.5,1.1,9],[50.8,1.1,9],[63,1.3,9],[75.5,1.1,9],[90,4,8.5],[124.7,1.3,9],[143.9,1.1,9],[157.5,1,9],[176,1.1,9],[178.6,1.1,9]].forEach(h=>mk('rect',{x:h[0],y:h[3]?26:24,width:h[1],height:h[2],fill:'#8FE6DC'}));
    [59,97,136,175].forEach(y=>{ let x=11.5; const row=[]; [8,182.5].forEach(cx=>{ mk('rect',{x:cx,y:y-4.5,width:1.6,height:1.8,fill:INK}); mk('rect',{x:cx,y:y-1.5,width:1.6,height:16.5,fill:INK}); }); [59,134.5].forEach(cx=>mk('circle',{cx,cy:y-5,r:.9,fill:'#0c0a16','fill-opacity':.6}));
      CT_W.forEach((w,j)=>{ row.push(mk('rect',{x:x.toFixed(2),y,width:w,height:14})); if(j===6){ mk('rect',{x:x.toFixed(2),y:y-5,width:w,height:5,fill:'#8FE6DC'}); mk('rect',{x:(x-.6).toFixed(2),y:y-8.5,width:w+1.2,height:2.6,rx:1,fill:'#8FE6DC'}); } x+=w+1.84; }); segs.push(row); }); }
  function rows(v){ const N=CT_W.length; segs.forEach((row,r)=>{ const f=clamp((v-CT_RD[r][0])/(CT_RD[r][1]-CT_RD[r][0]),0,1),k=f*N,w=Math.floor(k),part=k-w>.35; row.forEach((seg,j)=>seg.setAttribute('fill',j<w?'#0c0a16':(j===w&&part?'#C8AAFF':'#8FE6DC'))); }); el('ctRowC').textContent=('00'+Math.round(v*100)).slice(-3); }
  const tween=(ms,fn)=>new Promise(res=>{ if(!ms||reduce){ fn(1); res(); return; } const t0=performance.now(); (function f(now){ const v=Math.min(1,(now-t0)/ms); fn(v); v<1?requestAnimationFrame(f):res(); })(t0); });
  /* the site's sendTransmission on a shorter bar: holds at 95% until the server has answered, and a failure keeps the text for a retry */
  let openedAt=0;
  function lost(err){ phase='fail'; el('ctLost').setAttribute('opacity',1); ni.disabled=mi.disabled=false; sb.textContent='Retry transmit'; sb.setAttribute('aria-disabled','false'); hint('Signal lost'+(err?' · '+err:'')+'. Your text is kept.','off'); say('Signal lost. Your message was kept. Retry when ready.'); }
  function send(){ if(phase==='fail'){ phase='compose'; el('ctLost').setAttribute('opacity',0); layer('ctAlign'); assess(); } if(phase!=='compose'||!locked||cool) return; const name=ni.value.trim(),msg=mi.value.trim(),a=Math.random()*Math.PI*2,r=6.5+Math.random()*4; phase='upload'; ni.disabled=mi.disabled=true; sb.setAttribute('aria-disabled','true'); sb.textContent='Transmitting…'; hint('Transmitting the tape','tx'); say('Transmitting.'); buildRows(); rows(0); layer('ctRows'); arm(false); if(window.MWAudio){ MWAudio.site('holoUplink',{stopAfter:(UPLINK+250)/1000}); MWAudio.site('holoShot'); }
    let res=null; fetch('/api/holonet-submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,msg,x:Math.cos(a)*r,y:.3+Math.random()*3.2,z:Math.sin(a)*r,contact_url:el('ctUrl').value||'',elapsed:Date.now()-openedAt})}).then(x=>x.json().then(b=>({ok:x.ok,body:b}),()=>({ok:false,body:{error:'HTTP '+x.status}}))).then(x=>{ res=x; },e=>{ res={ok:false,body:{error:e.message}}; });
    tween(UPLINK-180,v=>rows(v*.95)).then(function hold(){ if(res) return; hint('Awaiting acknowledgement','tx'); return new Promise(f=>setTimeout(f,80)).then(hold); }).then(()=>{ if(!res.ok) return lost(res.body&&res.body.error); return tween(180,v=>rows(.95+v*.05)).then(()=>{ const rec=res.body.message||{name,msg,created_at:new Date().toISOString()}; note('holonet'); ni.value=''; mi.value=''; phase='compose'; ni.disabled=mi.disabled=false; sb.textContent='Transmit'; layer('ctAlign'); cool=true; setTimeout(()=>{ cool=false; assess(); },8000); assess(); say('Transmission received. Your message is on the HoloNet.'); close(); netShoot(rec); }); }); }
  /* full height on the visual viewport, so the keyboard doesn't cover the form */
  function fit(){ const v=window.visualViewport; if(!v||!sheet.classList.contains('open')){ sheet.style.height=''; sheet.style.top=''; return; } sheet.style.height=v.height+'px'; sheet.style.top=v.offsetTop+'px'; }
  if(window.visualViewport){ visualViewport.addEventListener('resize',fit); visualViewport.addEventListener('scroll',fit); }
  /* the film's portrait screen laid out for the width it has: 1 unit = 1px. The tower scales up and runs out of frame, the corner marks go to the corners, the uplink bars stretch edge to edge */
  function ctFit(){ const scr=el('ctScr'), w=scr.clientWidth, h=scr.clientHeight; if(!w||!h) return; const vb='0 0 '+w+' '+h; el('ctAlign').setAttribute('viewBox',vb); el('ctRows').setAttribute('viewBox',vb);
    const k=Math.min(w*.74/138.6,h*.64/91), yc=h*.4; el('ctTower').setAttribute('transform','translate('+(w/2-100*k)+' '+(yc-121*k)+') scale('+k+')');
    const put=(id,x,y)=>el(id).setAttribute('transform','translate('+x+' '+y+')'); put('ctCTL',-12,-38); put('ctCTR',w-200+12,-38); put('ctCBL',-14,h-44-201); put('ctCBR',w-200+14,h-44-201);
    el('ctAln').setAttribute('x',14); el('ctAln').setAttribute('y',h-14);
    const sx=w/200, sy=h/272; el('ctRowsG').setAttribute('transform','translate(0 '+(6*sy)+') scale('+sx+' '+sy+')');
    el('ctRowL').setAttribute('x',11*sx); el('ctRowL').setAttribute('y',236*sy); el('ctRowC').setAttribute('x',182*sx); el('ctRowC').setAttribute('y',236*sy); el('ctLost').setAttribute('x',w/2); el('ctLost').setAttribute('y',258*sy); }
  addEventListener('resize',ctFit);
  function open(){ if(sheet.classList.contains('open')) return; openedAt=Date.now(); if(window.MWAudio) MWAudio.sitePreload(['holoAlignStep','holoAligned','holoUplink','holoShot']); opener=document.activeElement; stamp(); sheet.classList.add('open'); document.documentElement.classList.add('locked'); $('#app').inert=true; $('#hdr').inert=true; fit(); ctFit(); assess(); el('ctClose').focus({preventScroll:true}); }
  function close(){ if(!sheet.classList.contains('open')) return; sheet.classList.remove('open'); document.documentElement.classList.remove('locked'); $('#app').inert=false; $('#hdr').inert=false; fit(); if(opener&&opener.focus) opener.focus({preventScroll:true}); }
  [ni,mi].forEach(i=>i.addEventListener('input',assess)); sb.addEventListener('click',send); el('ctClose').addEventListener('click',()=>{ if(phase==='compose') close(); });
  el('ctOpen').addEventListener('click',open); addEventListener('keydown',e=>{ if(e.key==='Escape'&&phase==='compose') close(); });
  ni.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); mi.focus(); } });
  assess(); return {open,close};
})();

/* router */
/* a view change runs under the site's screen wipe (assets/bric-wipe.js, random variant, never the same twice): the swap happens while the panel covers */
const pathParts=()=>location.pathname.replace(/^\/+|\/+$/g,'').split('/').filter(Boolean);
const viewKey=()=>{ const q=pathParts(); return q[0]==='work'?'work/'+q[1]:(q[0]||''); };
let lastViewKey=viewKey();
function routeWiped(){ const k=viewKey(), change=k!==lastViewKey; lastViewKey=k;
  if(!change||!window.bricWipe||GT.on||bricWipe.active()){ route(); return; }
  if(window.MWAudio){ MWAudio.uiReady(); MWAudio.ui('confirm'); }
  bricWipe.play(null,route); }
function route(){
  const parts=pathParts(), a=parts[0]||''; routeHead(parts);
  if(a!=='holonet') ct.close();
  if(a==='about') renderOutfit(parts[1]||curOutfit);
  else if(a==='work'&&BY_SLUG[parts[1]]){ const c=BY_SLUG[parts[1]], k=parts[2]!=null?c.arts.findIndex((_,i)=>artSlug(c,i)===parts[2]):-1; renderCase(c,k+1); }
  else if(a==='cv') showView($('#v-cv'));
  else if(a==='holonet'){ showView($('#v-holonet')); ct.open(); }
  else {
    showView($('#v-index')); attach(holo);
    const o=outfitById(curOutfit)||OUTFITS[0]; $('#appearBtn').href='/about/'+o.id;
    holo.show(()=>getFigure(o),o.name,f=>{ setGhost(f,false); holo.pivot.position.y=f.userData.holoY||FIG_Y; });
  }
  syncMenuCurrent();
}
addEventListener('popstate',routeWiped);
/* the game runs in the galaxy build, so it's a full page load under the wipe. Its Exit game comes back to /?mobile=1 */
function goArcade(){ if(window.bricWipe&&!GT.on) bricWipe.go('/arcade'); else location.href='/arcade'; }
function go(path){ if(path==='/arcade'){ goArcade(); return; } if(path!==location.pathname) history.pushState({},'',path); routeWiped(); }
/* same-origin links route in place, so the wipe and the running 3D stay; everything else is a normal link */
document.addEventListener('click',e=>{ const a=e.target.closest&&e.target.closest('a[href]'); if(!a||a.target||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button>0) return; let u; try{ u=new URL(a.href); }catch(err){ return; } if(u.origin!==location.origin) return; e.preventDefault(); go(u.pathname); });
/* per-route head (syncRouteHead): titles and canonicals match the galaxy's */
function routeHead(parts){ const H=document.head, q=s=>H.querySelector(s); if(!routeHead.d) routeHead.d={t:document.title,d:(q('meta[name="description"]')||{}).content||''}; let t=routeHead.d.t,d=routeHead.d.d; const p0=parts[0]==='about'?'cv':parts[0];
  if(p0==='cv'){ t='CV · Jason Hsin · Staff Product Designer'; d='CV and about Jason Hsin, a staff product designer in Los Angeles: Josh.ai founding designer, Meta Horizon Worlds design lead, Slate Auto. Open to full-time and contract work.'; }
  else if(p0==='holonet'){ t='HoloNet · Contact Jason Hsin'; d='Send Jason Hsin a message through the HoloNet.'; }
  else if(p0==='arcade'){ t='Arcade · Mundane Workshop'; d='A tiny space-battle arcade game on the Mundane Workshop portfolio.'; }
  else if(p0==='work'&&BY_SLUG[parts[1]]){ const n=BY_SLUG[parts[1]].name; t=n+' · Jason Hsin · Product Designer'; d=n+': a case study by Jason Hsin, staff product designer.'; }
  document.title=t; const set=(s,a,v)=>{ const e=q(s); if(e) e.setAttribute(a,v); }; set('meta[name="description"]','content',d); set('meta[property="og:title"]','content',t); set('meta[property="og:description"]','content',d); set('meta[name="twitter:title"]','content',t); set('meta[name="twitter:description"]','content',d);
  if(location.hostname==='www.mundanework.shop'){ const url='https://www.mundanework.shop'+(p0?'/'+(parts[0]==='about'?['cv']:parts).join('/'):'/'); set('link[rel="canonical"]','href',url); set('meta[property="og:url"]','content',url); } }

/* ═════════ a sent message: once the console has closed it slides in at the top of the list and its coordinates decode ═════════ */
function netShoot(rec){ setTimeout(()=>netLand(rec),reduce?0:260); }
function netLand(rec){ const list=$('#msgs'), rest=[...list.children, $('#msgState'), $('#nPane .note')]; list.insertAdjacentHTML('afterbegin',msgHtml(rec)); $('#nPane').scrollTop=0; msgState(''); const row=list.firstElementChild; [...list.children].forEach(x=>x.classList.toggle('on',x===row));
  if(reduce) return; const h=row.offsetHeight, ease='cubic-bezier(.2,.8,.2,1)';
  row.animate([{transform:'translateY(-100%)',opacity:0},{transform:'none',opacity:1}],{duration:460,easing:ease});
  rest.forEach(e=>e.animate([{transform:'translateY(-'+h+'px)'},{transform:'none'}],{duration:460,easing:ease}));
  const c=row.querySelector('.c'), fin=c.textContent, t0=performance.now(); (function dec(now){ const u=(now-t0)/700; if(u>=1){ c.textContent=fin; return; } const keep=Math.floor(u*fin.length); c.textContent=[...fin].map((ch,i)=>i<keep||!/\d/.test(ch)?ch:String(Math.floor(Math.random()*10))).join(''); setTimeout(()=>requestAnimationFrame(dec),60); })(t0); }

/* ═════════ the site's sound: assets/battle/audio.js, already on the page ═════════ */
const SW_SOUND='#swGateSound,#swSound';
function soundSync(on){ if(on==null) on=window.MWAudio?!MWAudio.isMuted():true; document.querySelectorAll(SW_SOUND).forEach(b=>{ b.setAttribute('aria-checked',on); const l=b.querySelector('.lb'); if(l) l.textContent=on?'Sound on':'Sound off'; }); }
addEventListener('mw:sound',()=>soundSync());
document.addEventListener('pointerdown',e=>{ const b=e.target.closest&&e.target.closest(SW_SOUND); if(b&&e.button<=0&&window.MWAudio){ MWAudio.uiReady(); MWAudio.ui('swDown'); } },true);
function soundFlip(){ if(!window.MWAudio) return; const m=MWAudio.toggle(); soundSync(!m); }
document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest(SW_SOUND)) soundFlip(); });
document.addEventListener('keydown',e=>{ if((e.key===' '||e.key==='Enter')&&e.target.matches&&e.target.matches(SW_SOUND)){ e.preventDefault(); soundFlip(); } });
/* the first gesture starts the ambience, and the gate's idle loop when it wasn't on the monogram. WebKit only unlocks audio on touchend or click, so those retry until the context is running */
function overCube(e){ return GT.on&&Math.hypot(e.clientX-GT.cx,e.clientY-GT.cy)<=GT.R*1.25; }
(function(){ let done=false;
  function start(e){ if(!window.MWAudio) return; if(!done){ done=true; MWAudio.siteStart(); if(!GT.on) MWAudio.idleStart(); else if(GT.phase==='entry'&&!(e&&e.type==='pointerdown'&&overCube(e))) MWAudio.gateStart(); return; }
    const st=MWAudio._state?MWAudio._state().ctx:'running'; if(st!=='running') MWAudio.siteStart(); }
  ['pointerdown','keydown','touchend','click'].forEach(t=>document.addEventListener(t,start,{capture:true,passive:true}));
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&done&&window.MWAudio) MWAudio.siteStart(); });
})();
/* tactile UI sounds (the site's press / release / back / on-off). On touch the press plays on the click, so starting a scroll over a row is silent */
(function(){ const SEL='a[href],button,[role=button],[role=switch],[role=tab],summary,select,input[type=checkbox],input[type=radio]', SKIP='#perf,#perfChip,[data-nosound],'+SW_SOUND;
  const el=e=>{ const t=e.target&&e.target.closest?e.target.closest(SEL):null; return !t||t.disabled||t.getAttribute('aria-disabled')==='true'||t.closest(SKIP)?null:t; };
  const isSw=b=>b.getAttribute('role')==='switch', kind=b=>{ const l=((b.getAttribute('aria-label')||'')+' '+(b.textContent||'')).toLowerCase().trim(); return /\b(close|back|exit|cancel|dismiss)\b/.test(l)||(b.id==='wm'&&!$('#wmBk').hidden)?'back':'press'; };
  const ui=k=>{ MWAudio.uiReady(); MWAudio.ui(k); }; let down=null,mouse=false;
  document.addEventListener('pointerdown',e=>{ mouse=e.pointerType==='mouse'; if(!mouse||!window.MWAudio||e.button>0) return; const b=el(e); if(b&&!isSw(b)){ down=b; ui(kind(b)); } },true);
  document.addEventListener('pointerup',e=>{ if(!mouse||!window.MWAudio||!down) return; const b=el(e); if(b===down&&kind(b)==='press') ui('release'); down=null; },true);
  document.addEventListener('click',e=>{ if(!window.MWAudio) return; const b=el(e); if(!b) return; if(isSw(b)){ setTimeout(()=>ui(b.getAttribute('aria-checked')==='true'?'on':'off'),0); return; } if(!mouse||e.detail===0){ const k=kind(b); ui(k); if(k==='press') setTimeout(()=>ui('release'),70); } },true);
})();
/* the hologram boot's cues, each once, the frame its stage switches on (bootSnd) */
const bootDone={};
function bootSounds(vB,vR,vH,vG){ if(BOOT_T0==null||!window.MWAudio) return; const once=(k,on,f)=>{ if(on&&!bootDone[k]){ bootDone[k]=1; f(); } };
  once('beam',vB>.3,()=>{ MWAudio.site('bootBeam'); MWAudio.idleStart(); }); once('head',vH>.3,()=>MWAudio.site('bootHead')); once('grid',vG>.05,()=>MWAudio.site('bootGrid'));
  once('planets',vH>=1,()=>ROWS.forEach((r,i)=>MWAudio.site('planetLoad',{rate:.94+Math.random()*.12,gain:.8+Math.random()*.2,delay:i*.12+Math.random()*.03}))); }

/* ═════════ the site's screen wipe ═════════ */
function applyWipe(){ if(window.bricWipe) bricWipe.config({outMs:SET.wipe,inMs:Math.round(SET.wipe*1.09)}); }
applyWipe(); soundSync();

/* ═════════ menu sheet ═════════ */
const wrapS=$('#wrapS'), sheet=$('#sheet'), menuBtn=$('#menuBtn');
$('#sheetBody').innerHTML='<div class="micro m-h">Work</div><div class="m-work">'+Object.values(CASES).map(c=>'<a href="/work/'+c.slug+'" data-cur="work/'+c.slug+'"><b>'+esc(c.name)+'</b><span>'+esc(c.line)+'</span></a>').join('')+'</div>'+
  '<a class="m-l" href="/cv" data-cur="cv">CV</a>'+
  '<a class="m-l" href="/about" id="mJason" data-cur="about">Jason</a>'+
  '<a class="m-l" href="/holonet" data-cur="holonet">HoloNet</a>'+
  '<a class="m-l" href="/arcade" data-cur="arcade">Arcade</a>'+
  '<div class="m-foot"><div class="m-soc"><a class="bric-btn bric-btn--secondary bric-btn--sm" href="'+LINKS.li+'" target="_blank" rel="noopener" data-ext="visitLinkedin">LinkedIn</a><a class="bric-btn bric-btn--secondary bric-btn--sm" href="'+LINKS.ig+'" target="_blank" rel="noopener" data-ext="visitInstagram">Instagram</a></div>'+
  '<div class="sw" id="swSound" role="switch" aria-checked="true" tabindex="0"><span class="tr"><span class="th"></span></span><span class="lb">Sound on</span></div></div>';
function syncMenuCurrent(){ const h=location.pathname.replace(/^\/+|\/+$/g,''); sheet.querySelectorAll('[data-cur]').forEach(a=>{ const c=a.dataset.cur; if(h===c||h.indexOf(c+'/')===0) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); }); }
let lastFocus=null;
function openMenu(){ wrapS.classList.add('open'); sheet.style.transform=''; document.documentElement.classList.add('locked'); $('#app').inert=true; $('#hdr').inert=true; menuBtn.setAttribute('aria-expanded','true'); lastFocus=menuBtn; setTimeout(()=>{ const f=sheet.querySelector('a,button,[tabindex]'); if(f) f.focus({preventScroll:true}); },30); }
function closeMenu(){ if(!wrapS.classList.contains('open')) return; wrapS.classList.remove('open'); sheet.classList.remove('drag'); sheet.style.transform=''; document.documentElement.classList.toggle('locked',false); $('#app').inert=false; $('#hdr').inert=false; menuBtn.setAttribute('aria-expanded','false'); if(lastFocus) lastFocus.focus({preventScroll:true}); }
menuBtn.addEventListener('click',openMenu);
$('#scrim').addEventListener('click',closeMenu);
sheet.addEventListener('click',e=>{ const a=e.target.closest('a'); if(!a) return; if(a.dataset.ext) note(a.dataset.ext); if(a.id==='mJason'){ e.preventDefault(); closeMenu(); go('/about/'+curOutfit); return; } closeMenu(); });
addEventListener('keydown',e=>{ if(!wrapS.classList.contains('open')) return;
  if(e.key==='Escape'){ closeMenu(); return; }
  if(e.key==='Tab'){ const f=[...sheet.querySelectorAll('a,button,[tabindex]')]; if(!f.length) return; const a=f[0],z=f[f.length-1]; if(e.shiftKey&&document.activeElement===a){ e.preventDefault(); z.focus(); } else if(!e.shiftKey&&document.activeElement===z){ e.preventDefault(); a.focus(); } } });
(function(){ let off=0; gesture($('#grab'),{lockPx:0,
  start(){ off=0; sheet.classList.add('drag'); },
  drag(dx,dy){ off=Math.max(0,off+dy); sheet.style.transform='translateY('+off*.9+'px)'; },
  end(g){ sheet.classList.remove('drag'); if(!g.cancelled&&(off>90||g.vy>.5)) closeMenu(); else sheet.style.transform=''; off=0; },
  tap(){ closeMenu(); }
}); })();

function bindSwitch(el,fn){ const t=()=>{ const on=el.getAttribute('aria-checked')!=='true'; el.setAttribute('aria-checked',on); fn(on); }; el.addEventListener('click',t); el.addEventListener('keydown',e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); t(); } }); }

/* ═════════ perf panel ═════════ */
const perf=$('#perf'), chip=$('#perfChip'), perfT=$('#perfT');
if(new URLSearchParams(location.search).get('perf')!=='1') chip.hidden=true;
chip.addEventListener('click',()=>{ perf.hidden=!perf.hidden; chip.setAttribute('aria-expanded',!perf.hidden); });
function chooser(host,key,opts,live){ const h=$(host); const b=()=>{ h.innerHTML=''; opts.forEach(v=>{ const e=document.createElement('button'); e.type='button'; e.className='bric-btn bric-btn--secondary bric-btn--sm'+(SET[key]===v?' is-active':''); e.textContent=v; e.setAttribute('aria-pressed',SET[key]===v); e.addEventListener('click',()=>{ SET[key]=v; store(key,v); live(v); b(); }); h.appendChild(e); }); }; b(); }
chooser('#segPixel','pixel',[1,1.5,2],()=>location.reload());
chooser('#segLevels','levels',[24,16,8],v=>{ levelsU.value=v; skyW=0; drawSky(); });
chooser('#segWipe','wipe',[500,700,1100],()=>applyWipe());
$('#replayGate').addEventListener('click',()=>{ try{ sessionStorage.removeItem('mw_gate_passed'); }catch(e){} location.href='/'; });
$('#swUnlock').setAttribute('aria-checked',SET.unlockAll);
bindSwitch($('#swUnlock'),on=>{ SET.unlockAll=on; store('unlockAll',on); if(!location.pathname.indexOf('/about')) route(); });
/* the gate's worst case: everything downloaded, decoded and uploaded to the GPU at once */
$('#buildAll').addEventListener('click',async e=>{ const b=e.currentTarget; if(b.dataset.busy) return; b.dataset.busy=1;
  const jobs=[...OUTFITS.map(o=>()=>getFigure(o)),...Object.values(CASES).flatMap(c=>[()=>getKit(c),...c.arts.map(p=>()=>getArtifact(p))])];
  const rt=new THREE.WebGLRenderTarget(4,4), sc=new THREE.Scene(), cam=new THREE.PerspectiveCamera(30,1,.1,80); cam.position.z=6; const t0=performance.now(); let n=0;
  for(const j of jobs){ b.textContent='Building '+(++n)+' / '+jobs.length; try{ const o=await j(), par=o.parent; sc.add(o); stageR.setRenderTarget(rt); stageR.render(sc,cam); stageR.setRenderTarget(null); sc.remove(o); if(par) par.add(o); }catch(err){ console.error(err); } await new Promise(r=>setTimeout(r)); }
  rt.dispose(); b.textContent='Built '+jobs.length+' in '+((performance.now()-t0)/1000).toFixed(1)+'s'; delete b.dataset.busy; });

const fmt=n=>n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(1)+'k':String(n);
let fCount=0,fT=performance.now(),fps=0,worst=0,sumMs=0,lastCalls={s:0,st:0,r:0,rt:0};
function perfTick(now,ms){
  fCount++; sumMs+=ms; if(ms>worst) worst=ms;
  if(now-fT<500) return;
  fps=fCount*1000/(now-fT); const avg=sumMs/fCount, mem=performance.memory;
  chip.textContent=Math.round(fps)+' FPS';
  if(!perf.hidden){
    const vv=window.visualViewport, si=stageR.info, ri=rowR.info;
    perfT.textContent=
      'FPS   '+fps.toFixed(0)+'  frame '+avg.toFixed(1)+'ms  worst '+worst.toFixed(1)+'ms\n'+
      'STAGE calls '+lastCalls.s+'  tris '+fmt(lastCalls.st)+'  buf '+active.w+'x'+active.h+(active===holo&&!holo.inView?'  (off screen)':'')+'\n'+
      'ROWS  calls '+lastCalls.r+'  tris '+fmt(lastCalls.rt)+'  drawn '+rowCount+'/'+ROWS.length+'  draw+copy '+rowMs.toFixed(1)+'ms\n'+
      'GPU   stage geo '+si.memory.geometries+' tex '+si.memory.textures+' prog '+(si.programs?si.programs.length:0)+'  rows geo '+ri.memory.geometries+'\n'+
      'HEAP  '+(mem?(mem.usedJSHeapSize/1048576).toFixed(0)+' / '+(mem.jsHeapSizeLimit/1048576).toFixed(0)+' MB':'n/a (no performance.memory here)')+'\n'+
      'DPR   '+devicePixelRatio+'  viewport '+innerWidth+'x'+innerHeight+(vv?'  visual '+Math.round(vv.width)+'x'+Math.round(vv.height):'')+'\n'+
      'GEST  axis '+G.axis+'  fingers '+G.pointers+'  cancels '+G.cancels+'\n'+
      'LOAD  '+lastLoad+'\n'+
      'CTX LOST '+ctxLost;
  }
  fT=now; fCount=0; sumMs=0; worst=0;
}

/* ═════════ entry gate: the site's monogram + two marquee bands, centered and resized. Tap to dock ═════════ */
const GT={on:false,phase:'',t0:0,spin:0,scene:new THREE.Scene(),cam:new THREE.PerspectiveCamera(30,1,.1,80),w:0,h:0,R:0,cx:0,cy:0,bands:null,building:false,readyAt:null,outAt:0,dockAt:0,loaderUsed:false,tilt:new THREE.Quaternion(),posed:false,from:null};
const A={pct:0,state:'loading',failed:[],loaded:0,total:0,items:[]};
function gateUI(){ const failed=A.state==='failed', can=A.state!=='loading'; $('#gateHint').textContent=can&&!failed?'Tap anywhere for sound • Tap holocron to enter':'Tap anywhere for sound'; $('#gateFail').hidden=!failed; if(failed) $('#gateFailT').textContent=A.failed.length===1?'1 asset didn’t load':A.failed.length+' assets didn’t load';
  const en=$('#gateEnter'); en.setAttribute('aria-disabled',can?'false':'true'); en.textContent=failed?'Enter anyway':'Enter'; $('#gateLive').textContent=failed?$('#gateFailT').textContent:can?'Assets loaded. Enter is available.':'Loading assets '+(Math.floor(A.pct/25)*25)+'%'; }
/* the same preload the site's gate runs: every manifest model and box texture, so nothing loads later. Files land in the HTTP cache and are built when their view opens */
async function preloadOne(it){ for(let att=0;att<3;att++){ let got=0; try{ const r=await fetch(BASE+it.path); if(!r.ok) throw new Error(it.path+' '+r.status); if(r.body&&r.body.getReader){ const rd=r.body.getReader(); for(;;){ const c=await rd.read(); if(c.done) break; got+=c.value.length; A.loaded+=Math.min(c.value.length,Math.max(0,it.bytes-it.done)); it.done=Math.min(it.bytes,it.done+c.value.length); A.pct=Math.min(99,Math.floor(A.loaded/A.total*100)); } } else { await r.arrayBuffer(); }
      A.loaded+=Math.max(0,it.bytes-it.done); it.done=it.bytes; A.pct=Math.min(99,Math.floor(A.loaded/A.total*100)); return true; }catch(e){ console.warn('[gate]',e); A.loaded-=it.done; it.done=0; } } return false; }
async function preload(list){ A.state='loading'; A.failed=[]; gateUI(); let i=0; const worker=async()=>{ while(i<list.length){ const it=list[i++]; if(!await preloadOne(it)) A.failed.push(it); } }; await Promise.all([worker(),worker(),worker(),worker()]);
  if(A.failed.length){ A.state='failed'; } else { A.pct=100; A.state='ready'; } gateUI(); }
async function startPreload(){ try{ const m=await fetch(BASE+'assets/manifest.json').then(r=>{ if(!r.ok) throw new Error('manifest '+r.status); return r.json(); }); A.items=m.models.concat(m.boxtex||[]).map(x=>({path:x.path,bytes:x.bytes||1,done:0})); A.total=A.items.reduce((n,x)=>n+x.bytes,0)||1; await preload(A.items); }catch(e){ console.error('[gate] manifest',e); A.state='failed'; A.failed=[{path:'manifest'}]; gateUI(); } }
/* bands: gbBuild, gbPoly, gbTile */
function gbTile(text,fontTpl,track,targetW){ const S=72,H=Math.round(S*1.5),cv=document.createElement('canvas'); let x=cv.getContext('2d'); const font=fontTpl.replace('{S}',S); let ls=track*S; const hasLS='letterSpacing' in x; text=text.toUpperCase(); const sq=Math.round(S*.26),gap=Math.round(S*.6);
  x.font=font; if(hasLS) x.letterSpacing=ls+'px'; let tw=Math.ceil(x.measureText(text).width); const W0=tw+gap*2+sq,W=targetW?Math.max(W0,Math.round(targetW)):W0,extra=W-W0; if(hasLS&&extra>0){ ls+=extra*.5/Math.max(1,text.length); x.letterSpacing=ls+'px'; tw=Math.ceil(x.measureText(text).width); }
  cv.width=Math.min(W,8192); cv.height=H; x=cv.getContext('2d'); x.font=font; if(hasLS) x.letterSpacing=ls+'px'; x.fillStyle='#fff'; x.textBaseline='middle'; x.fillText(text,0,H/2+S*.04); const sqX=tw+Math.round((W-tw-sq)/2); x.fillRect(sqX,(H-sq)/2,sq,sq); return {canvas:cv,w:W,h:H,font,ls,hasLS,S,sq,sqX}; }
const GB=[{axis:'y',text:'MUNDANE WORKSHOP',font:'600 {S}px "Chakra Petch"',track:.34,dir:1,delay:0,lift:18,flip:true,rev:true},{axis:'x',text:'The creative practice of product designer Jason Hsin',font:'500 {S}px "Space Grotesk"',track:.14,dir:-1,delay:600,lift:40,flip:false,rev:true},{axis:'y',loader:true,text:'LOADING ASSETS 100%',font:'600 {S}px "Chakra Petch"',track:.14,dir:1,delay:0,lift:18,flip:true,rev:true,minReps:2}];
function gbBuild(){ const h=MW.mono.radius/Math.sqrt(3), group=new THREE.Group(); group.matrixAutoUpdate=false; group.visible=false;
  const box=new THREE.Mesh(new THREE.BoxGeometry(2*h,2*h,2*h),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,transparent:true,fog:false})); box.renderOrder=40; box.frustumCulled=false; group.add(box);
  const col='#AAF5EE';   // --holo on the site
  const bands=GB.map(def=>{ const lift=h*(def.lift/100),N=12,hReq=2*h*.22; let rho=0; for(let k=0;k<N;k++){ const th=2*Math.PI*k/N; for(let cx=-1;cx<=1;cx+=2) for(let cy=-1;cy<=1;cy+=2) rho=Math.max(rho,h*(cx*Math.cos(th)+cy*Math.sin(th))); } rho+=lift;
    const R=rho/Math.cos(Math.PI/N),ds=Math.max(.05,h*.05),samples=[]; for(let k=0;k<N;k++){ const th=2*Math.PI*k/N,x0=Math.cos(th-Math.PI/N)*R,y0=Math.sin(th-Math.PI/N)*R,x1=Math.cos(th+Math.PI/N)*R,y1=Math.sin(th+Math.PI/N)*R,n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)/ds)); for(let i=0;i<n;i++){ const t=i/n; samples.push({p:[x0+(x1-x0)*t,y0+(y1-y0)*t],n:[Math.cos(th),Math.sin(th)]}); } }
    const ax=new THREE.Vector3(def.axis==='x'?1:0,def.axis==='y'?1:0,0), to3=(u,v)=>def.axis==='x'?new THREE.Vector3(0,u,v):new THREE.Vector3(v,0,u); const P=samples.map(s=>to3(s.p[0],s.p[1])),Nn=samples.map(s=>to3(s.n[0],s.n[1])),n=P.length;
    if(P[1].clone().sub(P[0]).dot(new THREE.Vector3().crossVectors(ax,Nn[0]))<0){ P.reverse(); Nn.reverse(); } const cum=[0]; for(let i=1;i<=n;i++) cum.push(cum[i-1]+P[i%n].distanceTo(P[i-1])); const Ltot=cum[n];
    const t0=gbTile(def.text,def.font,def.track), asp=t0.w/t0.h, reps=Math.max(def.minReps||1,Math.round(Ltot/(asp*hReq))), hBand=Math.min(hReq,Ltot/reps/asp), tile=gbTile(def.text,def.font,def.track,Ltot/reps/hBand*108);
    const pos=[],uv=[],uvB=[],idx=[]; for(let j=0;j<=n;j++){ const pp=P[j%n],sU=cum[j]/Ltot; pos.push(pp.x-ax.x*hBand/2,pp.y-ax.y*hBand/2,pp.z-ax.z*hBand/2,pp.x+ax.x*hBand/2,pp.y+ax.y*hBand/2,pp.z+ax.z*hBand/2); if(def.flip){ uv.push(-sU,1,-sU,0); uvB.push(sU,1,sU,0); } else { uv.push(sU,0,sU,1); uvB.push(-sU,0,-sU,1); } }
    for(let q=0;q<n;q++){ const b=q*2; idx.push(b,b+2,b+1,b+2,b+3,b+1); }
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); geo.setIndex(idx);
    const map=new THREE.CanvasTexture(tile.canvas); map.wrapS=THREE.RepeatWrapping; map.wrapT=THREE.ClampToEdgeWrapping; map.repeat.set(reps,1); map.anisotropy=Math.min(8,stageR.capabilities.getMaxAnisotropy());
    const mat=new THREE.MeshBasicMaterial({map,color:col,transparent:true,opacity:0,depthWrite:false,side:THREE.FrontSide,fog:false}); const mesh=new THREE.Mesh(geo,mat); mesh.renderOrder=41; mesh.frustumCulled=false; group.add(mesh);
    const geoB=geo.clone(); geoB.setAttribute('uv',new THREE.Float32BufferAttribute(uvB,2)); const mapB=map.clone(); mapB.needsUpdate=true; const matB=new THREE.MeshBasicMaterial({map:mapB,color:col,transparent:true,opacity:0,depthWrite:false,side:THREE.BackSide,fog:false}); const meshB=new THREE.Mesh(geoB,matB); meshB.renderOrder=41; meshB.frustumCulled=false; group.add(meshB);
    return {def,mat,matB,map,mapB,reps,scroll:0,tile,text:''}; });
  GT.scene.add(group); GT.bands={group,bands}; }
function gbLoaderDraw(bd,text){ const t=bd.tile,x=t.canvas.getContext('2d'),H=t.canvas.height; x.clearRect(0,0,t.canvas.width,H); x.font=t.font; if(t.hasLS) x.letterSpacing=t.ls+'px'; x.fillStyle='#fff'; x.textBaseline='middle'; x.fillText(text,0,H/2+t.S*.04); x.fillRect(t.sqX,(H-t.sq)/2,t.sq,t.sq); bd.map.needsUpdate=true; bd.mapB.needsUpdate=true; bd.text=text; }
function gbFrame(M,now,dt){ if(!GT.bands){ if(GT.building) return; GT.building=true; const f=document.fonts&&document.fonts.load?Promise.all([document.fonts.load('600 72px "Chakra Petch"','MUNDANE'),document.fonts.load('500 72px "Space Grotesk"','Jason')]):Promise.resolve(); f.catch(()=>{}).then(()=>{ try{ gbBuild(); }catch(e){ console.error('[gate bands]',e); } GT.t0=performance.now(); }); return; }
  GT.bands.group.matrix.copy(M); GT.bands.group.matrixWorldNeedsUpdate=true; GT.bands.group.visible=true;
  const can=A.state!=='loading'; if(can&&GT.readyAt==null) GT.readyAt=now; if(!can) GT.loaderUsed=true; const textOn=GT.loaderUsed?Math.max(GT.t0,(GT.readyAt||0)+380):GT.t0, rate=reduce?0:.06;
  GT.bands.bands.forEach(bd=>{ let a=0; if(bd.def.loader){ if(GT.loaderUsed&&!GT.outAt){ const u=clamp((now-GT.t0)/1200,0,1); a=u*u*(3-2*u); if(GT.readyAt!=null) a=Math.min(a,Math.max(0,1-(now-GT.readyAt)/380)); } if(a>0){ const lt=A.state==='failed'?'ASSETS DIDN’T LOAD':'LOADING ASSETS '+A.pct+'%'; if(lt!==bd.text) gbLoaderDraw(bd,lt); } }
    else if(GT.outAt) a=Math.max(0,1-(now-GT.outAt)/380); else if(can){ const u=clamp((now-textOn-bd.def.delay)/1200,0,1); a=u*u*(3-2*u); }
    bd.mat.opacity=a; bd.matB.opacity=a; const step=rate*dt*bd.def.dir*(bd.def.rev?-1:1)*(bd.def.flip?-1:1); bd.scroll=(bd.scroll+step*bd.reps)%1e4; bd.map.offset.x=bd.scroll; bd.mapB.offset.x=-bd.scroll; }); }
const ENTRY_DIST=6;
/* the gate monogram takes a drag: sideways turns it about the screen's vertical, up and down about its horizontal, and it coasts on release. A press that doesn't travel is still the tap that enters */
const GD={q:new THREE.Quaternion(),held:false,id:null,x:0,y:0,vx:0,vy:0,t:0}, GD_K=.009, _gdX=new THREE.Vector3(1,0,0), _gdY=new THREE.Vector3(0,1,0), _gdQ=new THREE.Quaternion();
function gdTurn(ax,ay){ GD.q.premultiply(_gdQ.setFromAxisAngle(_gdY,ax)).premultiply(_gdQ.setFromAxisAngle(_gdX,ay)); }
function gateFrame(now,dt){
  const host=$('#gateStage'), w=host.clientWidth||1, h=host.clientHeight||1, P=px(), bw=Math.max(1,Math.floor(w/P)), bh=Math.max(1,Math.floor(h/P));
  if(bw!==GT.w||bh!==GT.h){ GT.w=bw; GT.h=bh; sizeStage(bw,bh); }
  const c=GT.cam; c.aspect=w/h; c.position.set(0,0,ENTRY_DIST); c.lookAt(0,0,0); c.updateProjectionMatrix();
  if(MW.state!=='ready'){ stagePost.draw(GT.scene,c); return; }
  const m=MW.mono, visH=2*ENTRY_DIST*Math.tan(c.fov*Math.PI/360), visW=visH*c.aspect, Rw=Math.min(visW*.36,visH*.26), kE=Rw/m.radius;   // the cube fills about 72% of a phone's width, with room for the bands
  if(MW.quad.parent!==GT.scene) GT.scene.add(MW.quad);
  if(!GT.posed){ GT.posed=true; GT.tilt.setFromRotationMatrix(new THREE.Matrix4().fromArray(m.poseFor(new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,-1)))); }
  if(!reduce&&GT.phase==='entry'&&!GD.held) GT.spin+=dt*.14;
  /* released: the drag coasts out */
  if(GT.phase==='entry'&&!GD.held&&(GD.vx||GD.vy)){ gdTurn(GD.vx*dt,GD.vy*dt); const f=Math.pow(.06,dt); GD.vx*=f; GD.vy*=f; if(Math.hypot(GD.vx,GD.vy)<.01) GD.vx=GD.vy=0; }
  const qs=GD.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),GT.spin)).multiply(GT.tilt);
  const pos=new THREE.Vector3(); let q=qs, k=kE;
  if(GT.phase==='dock'){ const u=clamp((now-GT.dockAt)/300,0,1), e=u*u*(3-2*u), T=GT.from; pos.lerpVectors(new THREE.Vector3(),T.pos,e); q=qs.clone().slerp(T.quat,e); k=kE+(T.k-kE)*e; if(u>=1){ endGate(); return; } }
  else if(GT.phase==='hold'&&now>=GT.outAt+700){ beginDock(now); }
  _M.compose(pos,q,_V.set(k,k,k)); monoPlace(_M,c,bh);
  const _p=pos.clone().project(c); GT.cx=(_p.x+1)/2*w; GT.cy=(1-_p.y)/2*h; GT.R=(m.radius*k/ENTRY_DIST)/Math.tan(c.fov*Math.PI/360)*(h/2);
  if(GT.phase==='entry'||GT.phase==='hold') gbFrame(_M,now,dt); else if(GT.bands) GT.bands.group.visible=false;
  stagePost.draw(GT.scene,c);
}
function beginDock(now){ /* where the emitter sits on the index, in this camera's world */
  GT.phase='dock'; GT.dockAt=now; holo.gal=0; const r=holo.host.getBoundingClientRect(); holo.dirty=true; holo.reset(); const cam=holo.camera; cam.clearViewOffset(); cam.aspect=holo.host.clientWidth/holo.host.clientHeight; const tanV=Math.tan(cam.fov*Math.PI/360), hv=holoView(cam.aspect,cam.fov); cam.position.set(0,hv.H,hv.D); cam.lookAt(0,hv.ty,0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const p=new THREE.Vector3(0,MW.dockY,0).project(cam), x=r.left+(p.x+1)/2*r.width, y=r.top+(1-p.y)/2*r.height, kd=MW.diam/(2*MW.mono.radius)*MW.scale*MW.dockMul, dist=cam.position.distanceTo(new THREE.Vector3(0,MW.dockY,0)), Rp=(MW.mono.radius*kd/dist)/tanV*(r.height/2);
  const h=$('#gateStage').clientHeight, w=$('#gateStage').clientWidth, wpp=2*ENTRY_DIST*Math.tan(GT.cam.fov*Math.PI/360)/h;
  GT.from={pos:new THREE.Vector3((x-w/2)*wpp,(h/2-y)*wpp,0),quat:new THREE.Quaternion(),k:Rp*wpp/MW.mono.radius};
}
function startDock(){ if(!GT.on||GT.phase!=='entry'||A.state==='loading') return; if(window.MWAudio){ MWAudio.uiReady(); if(!MWAudio.site('gateClick')) MWAudio.ui('click'); MWAudio.site('dockClick'); MWAudio.gateStop(); } const now=performance.now(); GT.outAt=now; GT.phase='hold'; if(reduce||MW.state!=='ready') endGate(); }
function endGate(){ if(!GT.on) return; try{ sessionStorage.setItem('mw_gate_passed','1'); }catch(e){} GT.on=false; holo.gal=0; GT.phase=''; if(window.MWAudio) MWAudio.site('dockLand'); document.documentElement.classList.remove('gating'); window.scrollTo(0,0);
  if(GT.bands){ GT.scene.remove(GT.bands.group); }
  BOOT_T0=performance.now()/1000; setTimeout(()=>{ if(ring.userData.decode) ring.userData.decode(); },600);
  attach(holo); MW.lastKey=''; const g=$('#gate'); g.classList.add('out'); setTimeout(()=>{ g.hidden=true; g.classList.remove('out'); },reduce?0:180); }
function startGate(){ GT.on=true; GT.phase='entry'; GT.t0=performance.now(); const g=$('#gate'); g.hidden=false; $('#gateStage').appendChild(stageR.domElement); active=holo; gateUI(); monoLoad(); startPreload();
  let dn=null; const stageEl=$('#gateStage'); stageEl.addEventListener('pointerdown',e=>{ dn={x:e.clientX,y:e.clientY}; if(!overCube(e)) return; if(window.MWAudio){ MWAudio.uiReady(); if(!MWAudio.site('gateHover')) MWAudio.ui('hover'); }
    if(GT.phase==='entry'&&GD.id==null&&e.button<=0){ GD.held=true; GD.id=e.pointerId; GD.x=e.clientX; GD.y=e.clientY; GD.vx=GD.vy=0; GD.t=performance.now(); try{ stageEl.setPointerCapture(e.pointerId); }catch(err){} } },{passive:true});
  stageEl.addEventListener('pointermove',e=>{ if(e.pointerId!==GD.id||GT.phase!=='entry') return; const ax=(e.clientX-GD.x)*GD_K, ay=(e.clientY-GD.y)*GD_K, t=performance.now(), d=Math.max(1,t-GD.t)/1000; GD.x=e.clientX; GD.y=e.clientY; GD.t=t; gdTurn(ax,ay); GD.vx=GD.vx*.6+(ax/d)*.4; GD.vy=GD.vy*.6+(ay/d)*.4; },{passive:true});
  const gdEnd=e=>{ if(e.pointerId!==GD.id) return; GD.id=null; GD.held=false; if(reduce||performance.now()-GD.t>80) GD.vx=GD.vy=0; else { GD.vx=clamp(GD.vx,-6,6); GD.vy=clamp(GD.vy,-6,6); } };
  stageEl.addEventListener('pointerup',gdEnd); stageEl.addEventListener('pointercancel',gdEnd); stageEl.addEventListener('lostpointercapture',gdEnd);
  stageEl.addEventListener('pointerup',e=>{ if(!dn) return; const moved=Math.hypot(e.clientX-dn.x,e.clientY-dn.y); dn=null; if(moved>12) return; if(overCube(e)) startDock(); });
  $('#gateEnter').addEventListener('click',()=>{ if($('#gateEnter').getAttribute('aria-disabled')!=='true') startDock(); });
  $('#gateRetry').addEventListener('click',()=>{ const f=A.failed; A.failed=[]; preload(f); });
  $('#gateAnyway').addEventListener('click',()=>{ A.state='released'; gateUI(); startDock(); });
}

/* ═════════ loop ═════════ */
let prev=performance.now();
function frame(now){
  requestAnimationFrame(frame); if(document.hidden){ prev=now; return; }
  const ms=now-prev, dt=Math.min(.05,ms/1000); prev=now;
  if(!reduce) uTime.value=now/1000;


  stageR.info.reset(); rowR.info.reset();
  if(GT.on){ gateFrame(now,dt); perfTick(now,ms); return; }
  /* the kit box's side marquee scrolls */
  { const k=sCase.obj; if(active===sCase&&k&&k.userData.marq&&!reduce) k.userData.marq.offset.x-=LIVE.marqStyle.speed*dt; }
  const s=active;
  if(s.host.offsetParent!==null&&(s!==holo||holo.inView)){   // only the showing surface, and the hologram only while on screen
    if(s.yawV&&!(s.hold>now)){ s.yaw+=s.yawV*dt; s.yawV*=Math.pow(.03,dt); if(Math.abs(s.yawV)<.01) s.yawV=0; }
    if(s.opt.spin&&!reduce&&now>s.hold) s.yaw+=s.opt.spin*dt;
    if(s===holo&&!reduce){ holo.auto+=.14*dt; holo.gal-=.0264*dt; }
    s.pivot.rotation.set(s===holo?0:s.pitch,s.yaw+(s===holo?holo.auto+holo.gal:0),0);
    const f=s.obj;
    if(f&&f.userData.mixer&&!reduce&&!f.userData.ghost) f.userData.mixer.update(dt);
    FX_LOGO.stack.value=s===holo?1:STACK_CLOSE;
    frameCamera(s);
    if(s===holo){ holoBase.rotation.y=holo.yaw+holo.gal; ring.rotation.y=reduce?0:(now/1000)*.048*-1;   /* t*0.12*spin*dir, the site's ring drift */
      const vB=bootVal(.08),vR=bootVal(.16),vH=bootVal(.24); beamU.beamBottom.value=.8*vB; beamU.beamTop.value=.2*vB; ring.visible=vR>.3; s.pivot.visible=vH>.3;
      studMat.opacity=.55*bootVal(.08)*(Math.sin(now/1000*29.3)*.035+Math.sin(now/1000*13.1)*.025+1); monoDockedFrame(s); bootSounds(vB,vR,vH,bootVal(.08)); }
    stagePost.draw(s.scene,s.camera);
  }

  rowCount=0;
  const t0=performance.now();
  if(curView===$('#v-index')) for(const r of ROWS){
    if(!r.model) continue;
    if(r.inView||!r.drawn){ if(reduce&&r.drawn) continue; if(!reduce) r.yaw+=.35*dt; r.pivot.rotation.y=r.yaw; drawRow(r); rowCount++; }
  }
  rowMs=rowMs*.9+(performance.now()-t0)*.1;

  lastCalls.s=stageR.info.render.calls; lastCalls.st=stageR.info.render.triangles; lastCalls.r=rowR.info.render.calls; lastCalls.rt=rowR.info.render.triangles;
  perfTick(now,ms);
}

/* test hook, read-only state for verification in a desktop browser */
window.__mobile={G,SET,holo,sOutfit,sCase,netShoot,ct,ROWS,holoView,stageR,rowR,MW,GT,GD,A,stagePost,rowPost,get active(){ return active; }};

route();
if(document.documentElement.classList.contains('gating')) startGate();
else { monoLoad(); setTimeout(()=>{ if(ring.userData.decode) ring.userData.decode(); },400); }
soundSync();
requestAnimationFrame(frame);
})();
