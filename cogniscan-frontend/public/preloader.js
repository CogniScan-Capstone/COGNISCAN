(function(){
  if(document.getElementById('__pre-loader'))return;
  var css=document.createElement('style');
  css.textContent='@keyframes pre-orbit{to{transform:rotate(360deg)}}@keyframes pre-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes pre-dot{0%,80%,100%{transform:scale(1);opacity:.5}40%{transform:scale(1.3);opacity:1}}';
  document.head.appendChild(css);
  var d=document.createElement('div');
  d.id='__pre-loader';
  d.setAttribute('style','position:fixed;inset:0;background:rgba(253,252,249,0.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;transition:opacity 0.4s ease');
  d.innerHTML='<div style="position:relative;width:110px;height:110px;display:flex;align-items:center;justify-content:center"><div style="position:absolute;inset:2px;border-radius:50%;border:2px solid rgba(65,87,62,0.12)"></div><div style="position:absolute;inset:2px;border-radius:50%;border:2px solid transparent;border-top-color:rgba(65,87,62,0.88);border-right-color:rgba(169,138,214,0.56);animation:pre-orbit 1.8s cubic-bezier(0.45,0,0.2,1) infinite"></div><div style="width:86px;height:86px;border-radius:50%;background:rgba(255,255,255,0.72);box-shadow:0 16px 40px -24px rgba(27,28,26,0.42);display:flex;align-items:center;justify-content:center;animation:pre-float 3s ease-in-out infinite"><img src="/ilustrasi.png" alt="" width="86" height="86" style="border-radius:50%;object-fit:cover"></div></div><p style="margin-top:20px;color:#41573e;font-size:14px;font-weight:500;letter-spacing:0.5px;font-family:sans-serif">Memuat...</p><div style="display:flex;gap:6px;margin-top:8px"><div style="width:7px;height:7px;border-radius:50%;background:rgba(65,87,62,0.85);animation:pre-dot 1.4s ease-in-out infinite"></div><div style="width:7px;height:7px;border-radius:50%;background:rgba(65,87,62,0.35);animation:pre-dot 1.4s ease-in-out infinite 0.2s"></div><div style="width:7px;height:7px;border-radius:50%;background:rgba(65,87,62,0.35);animation:pre-dot 1.4s ease-in-out infinite 0.4s"></div></div>';
  document.body.prepend(d);
  function hide(){var el=document.getElementById('__pre-loader');if(el){el.style.opacity='0';setTimeout(function(){el.remove()},400)}}
  var obs=new MutationObserver(function(){if(document.querySelector('main')||document.querySelector('nav')){hide();obs.disconnect()}});
  obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(hide,5000);
})();
