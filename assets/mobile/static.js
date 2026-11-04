/* Static level of the mobile layout: no WebGL, no 3D, no sound, no wipes. Plain text rows, the About text from #mw-seo, and contact buttons.
   Loaded by bootMobile() in index.html when assets/mobile/level.js picks 'static'. Styles: static.css. See docs/project-history/mobile-site.md */
(function(){
'use strict';
var esc=function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
var lk=function(h,t,s,x){ return '<a class="row st" href="'+esc(h)+'"'+(x?' target="_blank" rel="noopener"':'')+'><span><span class="t">'+esc(t)+'</span><span class="s">'+esc(s)+'</span></span></a>'; };
/* the one-line summaries and case study links are copies of CASES in mobile.js */
var ZONES=[
  ['Work',[['Meta Horizon Worlds','Shipping platform features to millions of users','https://case.mundanework.shop/meta-horizon'],['Slate Auto','Securing 160,000+ paid reservations, $4B+ in order value','https://case.mundanework.shop/slate-auto'],['Josh.ai','Building a startup to $10M+ ARR from scratch','https://case.mundanework.shop/josh-ai']]],
  ['Socials',[['LinkedIn','Connect with Jason','https://www.linkedin.com/in/jason-hsin-00378837/',1],['Instagram','@Jas0n_0n_a_Bike','https://www.instagram.com/jas0n_0n_a_bike/',1]]]
];
function mount(){
  [].slice.call(document.querySelectorAll('style')).forEach(function(s){ if(!/^bric-/.test(s.id||'')) s.remove(); });
  [].slice.call(document.body.children).forEach(function(el){ if(el.id!=='mw-seo'&&el.tagName!=='SCRIPT') el.remove(); });
  document.body.className=''; document.body.removeAttribute('style');
  var about=document.getElementById('mw-about'), seo=document.getElementById('mw-seo'), ab=about?about.cloneNode(true):null;
  if(ab){ ab.removeAttribute('data-outfit'); ab.id='about'; }
  var h='<header id="hdr"><a id="wm" href="/">Mundane Workshop</a></header><main id="app" class="st-page"><div class="wrap">'+
    '<h1 class="st-h">Jason Hsin</h1><p class="st-lede">Staff product designer building delightful consumer experiences.</p>'+
    '<p class="st-note">This is the plain version of the site, without the 3D scene.</p><div id="rows">';
  ZONES.forEach(function(z){ h+='<section class="zone"><h2>'+z[0]+'</h2>'+z[1].map(function(r){ return lk(r[2],r[0],r[1],r[3]); }).join('')+'</section>'; });
  h+='</div><div id="aboutHost"></div><section class="zone" id="contact"><h2>Contact</h2><div class="st-ctas"><a class="bric-btn bric-btn--primary" href="https://calendly.com/jason-mundanework/30min" target="_blank" rel="noopener">Schedule call</a><a class="bric-btn bric-btn--secondary" href="mailto:jason@mundanework.shop">E-mail Jason</a></div></section></div></main>';
  seo.insertAdjacentHTML('beforebegin',h);
  if(ab) document.getElementById('aboutHost').appendChild(ab);
  var hold=document.getElementById('bric-mw-hold'); if(hold) hold.remove();
  /* /cv and /holonet have no view of their own here: land on the nearest section */
  var p=location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0], tgt={cv:'about',about:'about',holonet:'contact'}[p];
  if(tgt){ var e=document.getElementById(tgt); if(e) e.scrollIntoView(); }
}
function go(){
  var l=document.createElement('link'); l.rel='stylesheet'; l.href='assets/mobile/mobile.css';
  var l2=document.createElement('link'); l2.rel='stylesheet'; l2.href='assets/mobile/static.css'; var n=0, ok=function(){ if(++n===2) mount(); };
  l.onload=l.onerror=l2.onload=l2.onerror=ok; document.head.appendChild(l); document.head.appendChild(l2);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go,{once:true}); else go();
})();
