/* Toasts for the mobile layout (full and static levels). Styles: #mToast in mobile.css. Loaded by bootMobile() in index.html before level.js. */
(function(){
var T=0;
window.mwToast=function(msg){
  var t=document.getElementById('mToast');
  if(!t){ t=document.createElement('div'); t.id='mToast'; t.setAttribute('role','status'); document.body.appendChild(t); t.getBoundingClientRect(); }
  t.textContent=msg; t.classList.add('show'); clearTimeout(T); T=setTimeout(function(){ t.classList.remove('show'); },2200);
};
/* Every e-mail button copies the address and shows a toast, then the link hands off to the mail app as usual. The copy happens synchronously inside the
   click, before the mailto: navigation: an OS app picker or a browser "Open app?" prompt blurs the page, and a blurred page rejects a later
   navigator.clipboard.writeText. Same rule as the galaxy's mwMailCopy() in index.html */
document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest&&e.target.closest('a[href^="mailto:" i]'); if(!a) return;
  var addr=decodeURIComponent(a.getAttribute('href').replace(/^mailto:/i,'').split('?')[0]), ok=false; if(!addr) return;
  try{ var ae=document.activeElement, ta=document.createElement('textarea'); ta.value=addr; ta.setAttribute('readonly','');
    ta.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0,addr.length); ok=document.execCommand('copy'); ta.remove(); if(ae&&ae.focus) ae.focus({preventScroll:true}); }catch(x){}
  if(ok){ window.mwToast('Email address copied: '+addr); return; }
  try{ navigator.clipboard.writeText(addr).then(function(){ window.mwToast('Email address copied: '+addr); },function(){ window.mwToast(addr); }); }catch(x){ window.mwToast(addr); }
},true);
})();
