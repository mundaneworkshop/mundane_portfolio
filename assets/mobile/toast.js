/* Toasts for the mobile layout (full and static levels). Styles: #mToast in mobile.css. Loaded by bootMobile() in index.html before level.js. */
(function(){
var T=0;
window.mwToast=function(msg){
  var t=document.getElementById('mToast');
  if(!t){ t=document.createElement('div'); t.id='mToast'; t.setAttribute('role','status'); document.body.appendChild(t); t.getBoundingClientRect(); }
  t.textContent=msg; t.classList.add('show'); clearTimeout(T); T=setTimeout(function(){ t.classList.remove('show'); },2200);
};
/* mailto: with no mail app set up does nothing at all. A mail app taking over blurs the page or hides the tab within a moment; if that never happens, copy the address and say so. Same rule as the galaxy's mwMail() */
document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest&&e.target.closest('a[href^="mailto:" i]'); if(!a) return;
  var addr=decodeURIComponent(a.getAttribute('href').replace(/^mailto:/i,'').split('?')[0]), left=false;
  function gone(){ left=true; }
  window.addEventListener('blur',gone); document.addEventListener('visibilitychange',gone);
  setTimeout(function(){
    window.removeEventListener('blur',gone); document.removeEventListener('visibilitychange',gone);
    if(left||!addr) return;
    try{ navigator.clipboard.writeText(addr).then(function(){ window.mwToast('Email address copied: '+addr); },function(){ window.mwToast(addr); }); }catch(x){ window.mwToast(addr); }
  },900);
},true);
})();
