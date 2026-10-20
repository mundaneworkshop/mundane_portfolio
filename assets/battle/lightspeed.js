/* MWLightspeed — hyperspace-jump loading screen (background only, no ship) for the space battle.
   Modelled on the Last Jedi lightspeed jump, 0:06 onward of the reference clip:
     1. STREAK   ~3.2s  dark star field, points stretch into radial streaks that ramp from dim to white-hot (ease-in), then hold at full speed until the assets are ready
     2. EXIT     ~1s    white-out, overlay fades off to reveal the hero-select view
     (the old flash + turbulent-tunnel middle section was cut Oct 19 — it was on screen for a split second; the shader still has it, used only by prefers-reduced-motion)
   Usage:  MWLightspeed.start({ ready:function(){ return true when assets loaded }, onDone:fn, palette:{deep,mid,hi} })
   Only transform/opacity are animated on the DOM; all motion is one fullscreen fragment shader.
   prefers-reduced-motion: no streak ramp, no flashes, a frozen tunnel frame that cross-fades in and out. */
(function(){
'use strict';
var VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
var FS=[
'precision highp float;',
'uniform vec2 uRes; uniform float uTime,uStreak,uTunnel,uWhite,uBloom;',
'uniform vec3 uDeep,uMid,uHi;',
'float h11(float n){return fract(sin(n*127.1)*43758.5453);}',
'float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
'  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}',
'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec2(17.3,9.1);a*=.5;}return s;}',
'float field(float a,float lr){',
'  vec2 q=vec2(a*1.55,lr*1.15-uTime*.55);',
'  vec2 w=vec2(fbm(q+vec2(0.,uTime*.12)),fbm(q+vec2(5.2,1.3)-uTime*.1));',
'  float n=fbm(q*vec2(1.,.7)+w*1.9);',
'  float streak=fbm(vec2(a*5.5,lr*.55-uTime*1.1));  /* fine radial streaking */',
'  return smoothstep(.28,.92,n*.75+streak*.45);',
'}',
'void main(){',
'  vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;',
'  p-=vec2(0.,.06);                              /* vanishing point sits a little above centre, like the reference */',
'  float roll=.035*sin(uTime*.9)*uTunnel;         /* slow cockpit roll in the tunnel */',
'  float cs=cos(roll),sn=sin(roll); p=mat2(cs,-sn,sn,cs)*p;',
'  float r=length(p), a=atan(p.y,p.x);',
'  vec3 col=vec3(0.);',
'  /* ---- streak field: 3 depth layers of angular bins; each bin owns one star travelling outward ---- */',
'  float L=pow(uStreak,1.6);                       /* streak length: ease-in */',
'  for(int i=0;i<3;i++){',
'    float fi=float(i), N=110.+fi*90.;',
'    float ang=(a/6.28318+.5)*N, id=floor(ang), f=fract(ang)-.5;',
'    float sd=h21(vec2(id,fi*13.7)), sp=.10+.55*uStreak+.5*sd;',
'    float d=fract(sd*9.1+uTime*sp*(.25+uStreak*1.6));',
'    float head=d*d*1.35+.02;                      /* quadratic = perspective acceleration */',
'    float tail=head*(1.-clamp(L*(.55+.4*sd),0.,.97));',
'    float lat=abs(f)*r*6.28318/N;                 /* lateral distance in screen units */',
'    float w=.0007+.0011*uStreak+.0008*fi;',
'    float line=smoothstep(w,0.,lat)*step(tail,r)*step(r,head);',
'    float along=smoothstep(tail,head,r);          /* bright at the head, fading toward the tail */',
'    float fade=smoothstep(.02,.16,r);',
'    float br=line*(.25+.75*along)*fade*(.5+.5*h11(id+fi*3.1));',
'    col+=mix(uMid,uHi,clamp(uStreak*1.4+along*.3,0.,1.))*br*(.8+1.8*uStreak);',
'  }',
'  col+=uDeep*.12*(1.-smoothstep(.0,.9,r));          /* faint ambient so the black is not dead flat */',
'  /* ---- tunnel: domain-warped noise, stretched along the radius so it reads as motion blur toward the viewer ---- */',
'  vec3 tun=vec3(0.);',
'  if(uTunnel>0.001){',
'    float lr=log(r+.06);',
'    float dens=field(a,lr);',
'    if(a>2.4) dens=mix(dens,field(a-6.28318,lr),smoothstep(2.4,3.14159,a)); /* cross-fade the atan seam */',
'    tun=mix(uDeep,uMid,dens);',
'    tun=mix(tun,uHi,pow(dens,3.2)*smoothstep(.15,.7,r+.25*dens)); /* lit wisps toward the edges */',
'    /* vortex core: spiral rings that tighten into a bright eye */',
'    float sw=a+r*9.-uTime*1.3;',
'    float ring=.5+.5*sin(sw*2.+log(r+.02)*7.);',
'    float core=exp(-r*17.)*(.55+.45*ring)+exp(-r*55.)*1.2;',
'    tun+=uHi*core*(.8+.2*sin(uTime*2.1));',
'    tun*=smoothstep(1.35,.15,r)*.9+.1;             /* edge falloff */',
'  }',
'  col=mix(col,tun,uTunnel);',
'  col+=uHi*uBloom*(exp(-r*2.4)*.9+exp(-r*9.)*.8); /* bloom: the blown-out eye the tunnel decays from */',
'  col=1.-exp(-col*1.25);                          /* soft tone map, keeps the build from clipping hard */',
'  col=mix(col,vec3(.72,.96,.93),uWhite);           /* flash goes to true white after the tone map */',
'  gl_FragColor=vec4(col,1.);',
'}'].join('\n');

// Palette defaults come from the site's holo teal family (--holo-fill / --holo-edge: 120,224,214 / 170,245,238).
// Swap in the reference clip's blues by passing palette:{deep:[.02,.15,.23],mid:[.06,.45,.58],hi:[.55,.9,.98]}.
var PAL={ deep:[.02,.13,.15], mid:[.07,.50,.49], hi:[.67,.96,.93] };
var T_STREAK=3.2, T_BLOOM=1.3, T_EXIT_FLASH=.35, T_EXIT_FADE=.7;   // T_STREAK = ramp length; the streaks then hold at full speed until the assets are ready

function ease(x){ x=x<0?0:x>1?1:x; return x*x*(3-2*x); }
function start(o){
  o=o||{};
  if(window.__mwLightspeed) window.__mwLightspeed.destroy(true);
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pal={deep:(o.palette&&o.palette.deep)||PAL.deep, mid:(o.palette&&o.palette.mid)||PAL.mid, hi:(o.palette&&o.palette.hi)||PAL.hi};
  var el=document.createElement('div'); el.id='mwLightspeed'; el.setAttribute('role','status'); el.setAttribute('aria-label','Loading the space battle');
  el.style.cssText='position:fixed;inset:0;z-index:'+(o.zIndex||44)+';background:#02090a;pointer-events:auto;opacity:'+(reduced?0:1)+';transition:opacity .45s ease;will-change:opacity;';
  var cv=document.createElement('canvas'); cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;'; el.appendChild(cv);
  (o.container||document.body).appendChild(el);
  var gl=cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'});
  var prog=null, U={};
  if(gl){
    var mk=function(t,s){ var x=gl.createShader(t); gl.shaderSource(x,s); gl.compileShader(x); return gl.getShaderParameter(x,gl.COMPILE_STATUS)?x:null; };
    var vs=mk(gl.VERTEX_SHADER,VS), fs=mk(gl.FRAGMENT_SHADER,FS);
    if(vs&&fs){ prog=gl.createProgram(); gl.attachShader(prog,vs); gl.attachShader(prog,fs); gl.linkProgram(prog); if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) prog=null; }
    if(prog){
      gl.useProgram(prog); var b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      var loc=gl.getAttribLocation(prog,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      ['uRes','uTime','uStreak','uTunnel','uWhite','uBloom','uDeep','uMid','uHi'].forEach(function(n){ U[n]=gl.getUniformLocation(prog,n); });
      gl.uniform3fv(U.uDeep,pal.deep); gl.uniform3fv(U.uMid,pal.mid); gl.uniform3fv(U.uHi,pal.hi);
    }
  }
  if(!prog){   // no WebGL: a still teal radial gradient is the whole loader
    var c=function(v){ return 'rgb('+v.map(function(x){ return Math.round(x*255); }).join(',')+')'; };
    el.style.background='radial-gradient(ellipse at 50% 44%,'+c(pal.hi)+' 0%,'+c(pal.mid)+' 14%,'+c(pal.deep)+' 55%,#02090a 100%)'; cv.style.display='none';
  }
  function size(){
    var dpr=Math.min(window.devicePixelRatio||1,1.5), s=.75;   // the shader is soft by design: render at 75% and let the browser upscale
    cv.width=Math.max(2,Math.round(innerWidth*dpr*s)); cv.height=Math.max(2,Math.round(innerHeight*dpr*s));
    if(prog){ gl.viewport(0,0,cv.width,cv.height); gl.uniform2f(U.uRes,cv.width,cv.height); }
  }
  size(); window.addEventListener('resize',size);

  var t0=performance.now(), raf=0, phase='streak', phaseT=0, tunnelAt=0, exitAt=0, dead=false, wantExit=false, done=false, revealed=false;
  var ctl={ el:el, finish:function(){ wantExit=true; }, destroy:destroy };
  function destroy(silent){
    if(dead) return; dead=true; cancelAnimationFrame(raf); window.removeEventListener('resize',size);
    if(window.__mwLightspeed===ctl) window.__mwLightspeed=null;
    if(gl){ var ext=gl.getExtension('WEBGL_lose_context'); if(ext) ext.loseContext(); }
    if(el.parentNode) el.parentNode.removeChild(el);
    if(!silent&&!done&&o.onDone){ done=true; o.onDone(); }
  }
  window.__mwLightspeed=ctl;

  if(reduced){ requestAnimationFrame(function(){ el.style.opacity='1'; }); phase='tunnel'; tunnelAt=t0; }
  var failsafe=o.timeout||25000;
  function frame(now){
    if(dead) return;
    var t=(now-t0)/1000, uS=0, uT=0, uW=0, uB=0;
    if(phase==='streak'){
      uS=ease(t/T_STREAK);
      if(t>=T_STREAK&&(wantExit||(o.ready&&o.ready())||(now-t0>failsafe))){ phase='exit'; exitAt=now; }   // no tunnel: the streaks go straight to the white-out and the reveal
    }
    if(phase==='tunnel'){
      var k=(now-tunnelAt)/1000; uT=1; uS=0;
      uB=reduced?0:Math.max(0,1-k/T_BLOOM); uB=uB*uB*.8;
      uW=reduced?0:Math.max(0,1-k/.4)*.35;   // snap in from the white-out, then settle
      var dwell=(o.minTunnel==null?900:o.minTunnel);
      var ok=wantExit||(o.ready&&o.ready())||(now-t0>failsafe);
      if(ok&&(now-tunnelAt)>=dwell){ phase='exit'; exitAt=now; }
    }
    if(phase==='exit'){
      var e=(now-exitAt)/1000; uT=reduced?1:0; uS=reduced?0:1; uB=0;
      if(reduced){ if(!revealed){ revealed=true; if(o.onReveal) o.onReveal(); } el.style.opacity='0'; if(e>.5){ destroy(); return; } }
      else if(e<T_EXIT_FLASH){ uW=ease(e/T_EXIT_FLASH); }
      else{ uW=1; if(!revealed){ revealed=true; if(o.onReveal) o.onReveal(); } el.style.opacity='0'; el.style.transitionDuration=T_EXIT_FADE+'s'; if(e>T_EXIT_FLASH+T_EXIT_FADE){ destroy(); return; } }
    }
    if(prog){
      var st=reduced?7.3:t;
      gl.uniform1f(U.uTime,st); gl.uniform1f(U.uStreak,uS); gl.uniform1f(U.uTunnel,uT); gl.uniform1f(U.uWhite,uW); gl.uniform1f(U.uBloom,uB);
      gl.drawArrays(gl.TRIANGLES,0,3);
    }
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  return ctl;
}
window.MWLightspeed={ start:start };
})();
