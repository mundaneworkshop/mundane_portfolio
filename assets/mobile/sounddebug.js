/* Opt-in sound debugger. Load with ?sounddebug=1 (sticks for the tab; ?sounddebug=0 turns it off). It logs every AudioContext, oscillator, buffer source,
   HTMLAudioElement.play and ctx.resume/suspend with a timestamp and the call stack's top frames, in an on-screen panel. The log lives in sessionStorage,
   so it carries across the /arcade navigation. Tap "copy" to put it on the clipboard. Does nothing unless the flag is set. */
(function(){
  var KEY='mw_sounddebug_log', S; try{ S=sessionStorage; }catch(e){ return; }
  var log=[]; try{ log=JSON.parse(S.getItem(KEY)||'[]'); }catch(e){}
  var t0=Date.now(), page=location.pathname+location.search;
  function stack(){ try{ return (new Error().stack||'').split('\n').slice(3,7).map(function(l){ return l.replace(/^\s*at\s+/,'').replace(/https?:\/\/[^/]+/,'').trim().slice(0,90); }).join(' < '); }catch(e){ return ''; } }
  var panel, pre;
  function save(){ try{ S.setItem(KEY,JSON.stringify(log.slice(-300))); }catch(e){} }
  function add(msg){ var line=((Date.now()-t0)/1000).toFixed(3)+' '+page+' '+msg; log.push(line); save(); if(pre){ pre.textContent=log.slice(-60).join('\n'); pre.scrollTop=pre.scrollHeight; } }
  function ui(){
    if(panel||!document.body) return; panel=document.createElement('div'); panel.setAttribute('data-nosound','');
    panel.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:rgba(0,0,0,.88);color:#9fff75;font:10px/1.35 ui-monospace,monospace;padding:6px;max-height:38vh;display:flex;flex-direction:column';
    var bar=document.createElement('div'); bar.style.cssText='display:flex;gap:8px;margin-bottom:4px';
    function btn(l,f){ var b=document.createElement('button'); b.textContent=l; b.setAttribute('data-nosound',''); b.style.cssText='font:inherit;padding:6px 10px;color:#000;background:#9fff75;border:0'; b.onclick=f; bar.appendChild(b); }
    btn('copy',function(){ var s=log.join('\n'); if(navigator.clipboard) navigator.clipboard.writeText(s).catch(function(){}); });
    btn('clear',function(){ log=[]; save(); pre.textContent=''; });
    btn('hide',function(){ panel.style.display='none'; });
    pre=document.createElement('pre'); pre.style.cssText='margin:0;overflow:auto;white-space:pre-wrap;word-break:break-all;flex:1';
    panel.appendChild(bar); panel.appendChild(pre); document.body.appendChild(panel); pre.textContent=log.slice(-60).join('\n');
  }
  if(document.body) ui(); else document.addEventListener('DOMContentLoaded',ui);
  add('--- page load, visible='+document.visibilityState);
  ['pointerdown','touchend','click'].forEach(function(t){ document.addEventListener(t,function(e){ var a=e.target.closest&&e.target.closest('a,button,[role]'); add('EVENT '+t+' '+(a?(a.tagName+(a.id?'#'+a.id:'')+' '+(a.getAttribute('href')||'')):e.target.tagName)); },true); });
  addEventListener('pagehide',function(){ add('pagehide'); });
  /* AudioContext */
  ['AudioContext','webkitAudioContext'].forEach(function(n){ var AC=window[n]; if(!AC||AC.__sd) return;
    var W=function(){ var c=new (Function.prototype.bind.apply(AC,[null].concat([].slice.call(arguments))))(); add('new '+n+' state='+c.state+' sr='+c.sampleRate+' @ '+stack()); c.addEventListener('statechange',function(){ add('ctx state -> '+c.state); }); return c; };
    W.prototype=AC.prototype; W.__sd=1; window[n]=W; });
  var BC=window.BaseAudioContext&&BaseAudioContext.prototype;
  if(BC){
    ['createOscillator','createBufferSource','createMediaElementSource','createConstantSource'].forEach(function(m){ var o=BC[m]; if(!o) return; BC[m]=function(){ var n=o.apply(this,arguments); add(m+' ctx='+this.state+' t='+this.currentTime.toFixed(3)+' @ '+stack()); return n; }; });
  }
  [['AudioScheduledSourceNode','start'],['AudioScheduledSourceNode','stop']].forEach(function(p){ var P=window[p[0]]&&window[p[0]].prototype; if(!P||!P[p[1]]) return; var o=P[p[1]]; P[p[1]]=function(){ var n=this.constructor&&this.constructor.name; if(p[1]==='start'||n==='OscillatorNode') add(n+'.'+p[1]+'('+[].slice.call(arguments).join(',')+')'+(this.frequency?' f='+this.frequency.value.toFixed(0)+' type='+this.type:'')+(this.buffer?' dur='+this.buffer.duration.toFixed(3):'')); return o.apply(this,arguments); }; });
  var AP=window.AudioContext&&AudioContext.prototype;
  ['resume','suspend'].forEach(function(m){ var o=(window.AudioContext&&AudioContext.prototype[m])||(BC&&BC[m]); if(!o) return; var T=AudioContext.prototype.hasOwnProperty(m)?AudioContext.prototype:BC; T[m]=function(){ add('ctx.'+m+'() from '+this.state+' @ '+stack()); return o.apply(this,arguments); }; });
  /* HTMLAudioElement / media */
  var MP=HTMLMediaElement.prototype, op=MP.play; MP.play=function(){ add('MEDIA.play '+this.tagName+' src='+(this.currentSrc||this.src||'?').replace(/https?:\/\/[^/]+/,'')+' vol='+this.volume+' @ '+stack()); return op.apply(this,arguments); };
  var NA=window.Audio; if(NA){ window.Audio=function(s){ add('new Audio('+(s||'')+') @ '+stack()); return new NA(s); }; window.Audio.prototype=NA.prototype; }
  /* MWAudio.ui kinds, once the module exists */
  var iv=setInterval(function(){ if(!window.MWAudio||!MWAudio.ui||MWAudio.ui.__sd) return; clearInterval(iv); var o=MWAudio.ui; MWAudio.ui=function(k){ add('MWAudio.ui('+k+')'+(MWAudio._state?' ctx='+MWAudio._state().ctx:'')+' @ '+stack()); return o.apply(this,arguments); }; MWAudio.ui.__sd=1;
    ['site','siteStart','gateStart','idleStart','gameOver'].forEach(function(m){ var f=MWAudio[m]; if(typeof f!=='function') return; MWAudio[m]=function(){ add('MWAudio.'+m+'('+[].slice.call(arguments).filter(function(a){ return typeof a!=='object'; }).join(',')+')'); return f.apply(this,arguments); }; }); },50);
  setTimeout(function(){ clearInterval(iv); },20000);
  window.__mwSoundDebug={log:function(){ return log.slice(); }};
})();
