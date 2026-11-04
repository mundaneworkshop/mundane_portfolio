/* Capability level for the mobile layout: 'full' (live 3D), 'stills' (rows drawn once, lighter stage) or 'static' (no WebGL, no 3D at all).
   Loaded by bootMobile() in index.html before mobile.js. MWLevel.pick(cb) calls cb(level) once and sets window.__mwLevel plus html.mw-level-<level>.
   Force one for testing: ?mobile=force&level=full|stills|static (kept for the tab, ?level=auto clears it). Docs: docs/project-history/mobile-site.md */
(function(){
var LEVELS=['full','stills','static'], KEY='mw_m.level', TTL=3*864e5;
var FRAMES=10, WARM=2, GPU_MS=24, RAF_MS=45;   /* limits are a first guess, not calibrated on real phones */

function forced(){ try{ var q=new URLSearchParams(location.search).get('level'), S=sessionStorage;
  if(q==='auto') S.removeItem('mw_level'); else if(LEVELS.indexOf(q)>-1) S.setItem('mw_level',q);
  return S.getItem('mw_level'); }catch(e){ return null; } }

function saveData(){ var c=navigator.connection||navigator.mozConnection||navigator.webkitConnection; return !!(c&&c.saveData); }

/* a few synced draws of a heavy fragment shader on a small canvas, and the rAF interval beside them. A software renderer (the major-performance-caveat flag) fails at once */
function probe(done){
  var gl=null, c=document.createElement('canvas'); c.width=c.height=512;
  try{ gl=c.getContext('webgl',{antialias:false,failIfMajorPerformanceCaveat:true}); }catch(e){}
  if(!gl){ done('stills'); return; }
  try{
    var sh=function(t,s){ var o=gl.createShader(t); gl.shaderSource(o,s); gl.compileShader(o); return o; }, p=gl.createProgram();
    gl.attachShader(p,sh(gl.VERTEX_SHADER,'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
    gl.attachShader(p,sh(gl.FRAGMENT_SHADER,'precision mediump float;uniform float t;void main(){vec2 u=gl_FragCoord.xy/512.;float v=0.;for(int i=0;i<120;i++){v+=sin(dot(u,vec2(float(i)*.37,float(i)*.11))+t);u=fract(u*1.01+v*.001);}gl_FragColor=vec4(v*.01,u,1.);}'));
    gl.linkProgram(p); gl.useProgram(p);
    var b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    var a=gl.getAttribLocation(p,'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    var tu=gl.getUniformLocation(p,'t'), px=new Uint8Array(4), cost=[], gaps=[], last=0, n=0;
    (function tick(now){
      if(last&&n>=WARM) gaps.push(now-last); last=now;
      var t0=performance.now(); for(var k=0;k<3;k++){ gl.uniform1f(tu,n+k); gl.drawArrays(gl.TRIANGLES,0,3); } gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
      if(n>=WARM) cost.push(performance.now()-t0);
      if(++n<FRAMES+WARM){ requestAnimationFrame(tick); return; }
      var med=function(x){ x.sort(function(m,q){ return m-q; }); return x[x.length>>1]||0; };
      var lose=gl.getExtension('WEBGL_lose_context'); if(lose) lose.loseContext();
      window.__mwProbe={gpuMs:Math.round(med(cost)*10)/10,rafMs:Math.round(med(gaps)*10)/10};
      done(window.__mwProbe.gpuMs>GPU_MS||window.__mwProbe.rafMs>RAF_MS?'stills':'full');
    })(0);
  }catch(e){ done('stills'); }
}

function cached(){ try{ var o=JSON.parse(localStorage.getItem(KEY)); return o&&Date.now()-o.t<TTL&&LEVELS.indexOf(o.l)>-1?o.l:null; }catch(e){ return null; } }
function remember(l){ try{ localStorage.setItem(KEY,JSON.stringify({l:l,t:Date.now()})); }catch(e){} }

window.MWLevel={ pick:function(cb){
  var noGL=!!window.__mwNoGL, f=forced(), l;
  var set=function(v){ window.__mwLevel=v; document.documentElement.classList.add('mw-level-'+v); cb(v); };
  if(noGL) return set('static');                          /* nothing else can work */
  if(f) return set(f);                                    /* testing override, never cached */
  if(saveData()) return set('stills');
  if((l=cached())) return set(l);
  /* rAF can stall (hidden tab, very slow phone), so the probe never blocks the boot: a hidden page gets 'full' (not remembered), a visible one that stalled gets 'stills' */
  var fin=false, T=setTimeout(function(){ if(fin) return; fin=true; if(document.hidden) set('full'); else set('stills'); },3000);
  probe(function(v){ if(fin) return; fin=true; clearTimeout(T); remember(v); set(v); });
} };
})();
