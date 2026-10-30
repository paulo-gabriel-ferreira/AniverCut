/* =============================================================================
   DEX · o assistente do AkiCut
   Personagem 2D (cinza, branco e preto), reações de desenho animado, chat com IA
   e painel de personalização. Carregado depois de todos os scripts do index.html.

   Como funciona o chat:
   1. Os comandos rápidos do assistente (resumo, pendências, hoje, gerar mês, colar lista…)
      continuam sendo resolvidos no próprio navegador, sem gastar IA.
   2. O resto vai para /api/dex (função do Vercel), que conversa com a IA usando a chave
      guardada nas variáveis de ambiente. A chave nunca aparece aqui.
   3. Se a IA não responder (sem internet, limite do dia, arquivo aberto fora do Vercel),
      o Dex volta sozinho para as respostas locais que o app já tinha.
   ============================================================================= */
(function(){
  'use strict';
  if(window.__dex) return;
  var D=document, H=D.documentElement, W=window;
  var chat=D.getElementById('aiChat'), msgs=D.getElementById('aiMessages'), form=D.getElementById('aiForm'), input=D.getElementById('aiInput');
  var LS={ get:function(k,p){ try{ var v=localStorage.getItem(k); return v==null?p:v; }catch(e){ return p; } },
           set:function(k,v){ try{ localStorage.setItem(k,v); }catch(e){} },
           del:function(k){ try{ localStorage.removeItem(k); }catch(e){} } };
  var SS={ get:function(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }, set:function(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} } };
  function reduzido(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches||H.getAttribute('data-ak-mov')==='desligadas'; }catch(e){ return false; } }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function el(tag,cls,html){ var e=D.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }

  /* ------------------------------------------------------------------ config */
  var PADRAO={nome:'Dex',tam:'m',olhos:'branco',acab:'claro',acess:'nenhum',anim:'normal',seguir:'sim',balao:'sim',lado:'direita'};
  var CFG=(function(){ var c={}; try{ c=JSON.parse(LS.get('dex-cfg','{}'))||{}; }catch(e){} var o={}; for(var k in PADRAO) o[k]=c[k]!=null?c[k]:PADRAO[k]; return o; })();
  var OLHOS={branco:'#F3F8FF',ciano:'#5CE1F0',prata:'#C3C9D3'};
  function salvar(){ LS.set('dex-cfg',JSON.stringify(CFG)); }

  /* ------------------------------------------------------------------ estilos */
  var css=`
:root{--dex-olho:#F3F8FF;--dex-w:96px;--e-apple:cubic-bezier(.32,.72,0,1);--e-mola:cubic-bezier(.34,1.45,.64,1)}
html[data-dex-tam="p"]{--dex-w:74px} html[data-dex-tam="g"]{--dex-w:124px}
.dex{position:fixed;right:22px;bottom:14px;z-index:120;width:var(--dex-w);pointer-events:none;
  transition:opacity .45s var(--e-apple),transform .6s var(--e-apple),right .6s var(--e-apple),left .6s var(--e-apple)}
html[data-dex-lado="esquerda"] .dex{right:auto;left:22px}
html[data-dex-lado="esquerda"] body:not(.hud-right):not(.hud-top):not(.hud-bottom):not(.hud-icons) .dex{left:290px}
html[data-ak-orb="nao"] .dex{display:none}
body.booting .dex{opacity:0;transform:translateY(30px) scale(.8)}
.dex-btn{all:unset;display:block;width:100%;cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:transparent;border-radius:40%}
.dex-btn:focus-visible{outline:2px solid #9aa3b2;outline-offset:4px}
.dex-svg{display:block;width:100%;height:auto;overflow:visible}
.dex-mini{overflow:visible}

/* cores do personagem */
.dex-svg{--c-corpo:#F6F7F9;--c-meio:#E2E5EA;--c-sombra:#C4C9D1;--c-linha:#24272D;--c-visor:#0F1114;--c-visor2:#26313B;--c-chao:rgba(15,17,20,.18)}
html[data-dex-acab="grafite"] .dex-svg{--c-corpo:#5A5F69;--c-meio:#474B54;--c-sombra:#33363D;--c-linha:#121418;--c-visor:#08090B;--c-visor2:#1C2229}
html[data-theme="dark"] .dex-svg{--c-chao:rgba(0,0,0,.4)}
.dex-svg .dex-chao{fill:var(--c-chao)}
.dex-svg .dex-tronco,.dex-svg .dex-casco,.dex-svg .dex-braco rect,.dex-svg .dex-orelha,.dex-svg .dex-topo{fill:var(--c-corpo);stroke:var(--c-linha);stroke-width:3;stroke-linejoin:round}
.dex-svg .dex-orelha,.dex-svg .dex-topo,.dex-svg .dex-braco rect{fill:var(--c-meio)}
.dex-svg .dex-pescoco{fill:var(--c-sombra);stroke:var(--c-linha);stroke-width:3}
.dex-svg .dex-tronco-sombra{fill:var(--c-sombra);opacity:.55}
.dex-svg .dex-brilho{fill:#fff;opacity:.75}
html[data-dex-acab="grafite"] .dex-svg .dex-brilho{opacity:.18}
.dex-svg .dex-casco-brilho{fill:none;stroke:#fff;stroke-width:4;stroke-linecap:round;opacity:.85}
html[data-dex-acab="grafite"] .dex-svg .dex-casco-brilho{opacity:.2}
.dex-svg .dex-costura{fill:none;stroke:var(--c-sombra);stroke-width:2.5;stroke-linecap:round}
.dex-svg .dex-visor{stroke:var(--c-linha);stroke-width:2.5}
.dex-svg .dex-visor-brilho{fill:none;stroke:rgba(255,255,255,.12);stroke-width:3;stroke-linecap:round}
.dex-svg .dex-luz{fill:var(--dex-olho);opacity:.55}
.dex-svg .dex-o-aberto,.dex-svg .dex-o-coracao{fill:var(--dex-olho)}
.dex-svg .dex-o-feliz,.dex-svg .dex-o-fechado,.dex-svg .dex-o-tonto,.dex-svg .dex-boca path{fill:none;stroke:var(--dex-olho);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
.dex-svg .dex-boca-o{fill:var(--dex-olho)}
.dex-svg .dex-bochecha{fill:var(--dex-olho);opacity:0;transition:opacity .4s ease}
.dex-svg .dex-acess{display:none}
html[data-dex-acess="antena"] .dex-svg .dex-acess-antena,html[data-dex-acess="chapeu"] .dex-svg .dex-acess-chapeu{display:inline}
.dex-svg .dex-acess-antena path{stroke:var(--c-linha);stroke-width:3;stroke-linecap:round}
.dex-svg .dex-acess-antena circle{fill:var(--dex-olho);stroke:var(--c-linha);stroke-width:2.5}
.dex-svg .dex-chapeu-cone{fill:#1E2126;stroke:var(--c-linha);stroke-width:2.5;stroke-linejoin:round}
.dex-svg .dex-chapeu-faixa{fill:none;stroke:#F6F7F9;stroke-width:3.2}
.dex-svg .dex-chapeu-pom{fill:#F6F7F9;stroke:var(--c-linha);stroke-width:2.2}

/* pontos de giro (as peças giram nas juntas, como um boneco articulado) */
.dex-svg g{transform-box:view-box}
.dex-svg .dex-flutua,.dex-svg .dex-mola{transform-origin:80px 166px}
.dex-svg .dex-cabeca{transform-origin:80px 88px;transform:rotate(var(--tilt,0deg));transition:transform .6s var(--e-mola)}
.dex-svg .dex-braco-e{transform-origin:35.5px 103px;transition:transform .55s var(--e-mola)}
.dex-svg .dex-braco-d{transform-origin:124.5px 103px;transition:transform .55s var(--e-mola)}
.dex-svg .dex-olhos{transform:translate(var(--ox,0px),var(--oy,0px));transition:transform .28s var(--e-apple)}
.dex-svg .dex-o > *{transform-box:fill-box;transform-origin:center;transition:opacity .22s ease,transform .38s var(--e-mola)}
.dex-svg .dex-o-feliz,.dex-svg .dex-o-fechado,.dex-svg .dex-o-coracao,.dex-svg .dex-o-tonto{opacity:0;transform:scale(.3)}
.dex-svg .dex-boca > *{transform-box:fill-box;transform-origin:center;transition:opacity .2s ease,transform .35s var(--e-mola)}
.dex-svg .dex-boca-o,.dex-svg .dex-boca-triste{opacity:0;transform:scale(.3)}
.dex-svg .dex-fx > g > *{opacity:0}

/* parado: respira e flutua */
.dex-svg .dex-flutua{animation:dexFlutua calc(3.8s / var(--dex-vel,1)) ease-in-out infinite}
.dex-svg .dex-chao{transform-box:fill-box;transform-origin:center;animation:dexChao calc(3.8s / var(--dex-vel,1)) ease-in-out infinite}
.dex-svg .dex-braco-e{animation:dexBalancoE 3.8s ease-in-out infinite}
.dex-svg .dex-braco-d{animation:dexBalancoD 3.8s ease-in-out infinite}
@keyframes dexFlutua{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(-5px * var(--dex-k,1)))}}
@keyframes dexChao{0%,100%{transform:scaleX(1);opacity:1}50%{transform:scaleX(.86);opacity:.7}}
@keyframes dexBalancoE{0%,100%{transform:rotate(3deg)}50%{transform:rotate(-2deg)}}
@keyframes dexBalancoD{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(2deg)}}
html[data-dex-anim="sutil"]{--dex-k:.5}
html[data-dex-anim="expressiva"]{--dex-k:1.6}
html[data-ak-mov="suaves"] .dex-svg .dex-flutua,html[data-ak-mov="suaves"] .dex-svg .dex-chao,html[data-ak-mov="suaves"] .dex-svg .dex-braco-e,html[data-ak-mov="suaves"] .dex-svg .dex-braco-d{animation:none}

/* piscar */
.dex-svg.pisca .dex-o-aberto{transform:scaleY(.08);transition-duration:.07s}
.dex-svg.pisca-d .dex-olho-d .dex-o-aberto{transform:scaleY(.08)}

/* ---------- humores ---------- */
/* feliz: olhos em arco, bochechas, aceno */
.dex-svg[data-humor="feliz"] .dex-o-aberto,.dex-svg[data-humor="amor"] .dex-o-aberto,.dex-svg[data-humor="dormindo"] .dex-o-aberto,.dex-svg[data-humor="tonto"] .dex-o-aberto{opacity:0;transform:scale(.3)}
.dex-svg[data-humor="feliz"] .dex-o-feliz{opacity:1;transform:none}
.dex-svg[data-humor="feliz"] .dex-bochecha,.dex-svg[data-humor="amor"] .dex-bochecha{opacity:.35}
.dex-svg[data-humor="feliz"] .dex-boca-sorriso{transform:scale(1.35,1.5)}
.dex-svg[data-humor="feliz"] .dex-braco-d{animation:dexAceno .9s ease-in-out infinite}
.dex-svg[data-humor="feliz"] .dex-braco-e{transform:rotate(18deg);animation:none}
.dex-svg[data-humor="feliz"] .dex-fx-brilho{animation:dexBrilho 1.6s ease-out infinite}
.dex-svg[data-humor="feliz"] .dex-fx-brilho:nth-child(2){animation-delay:.5s}
@keyframes dexAceno{0%,100%{transform:rotate(-142deg)}50%{transform:rotate(-168deg)}}
@keyframes dexBrilho{0%{opacity:0;transform:scale(.2) rotate(0)}30%{opacity:1;transform:scale(1) rotate(45deg)}100%{opacity:0;transform:scale(.4) rotate(90deg)}}
.dex-fx-brilho{transform-box:fill-box;transform-origin:center}

/* surpresa */
.dex-svg[data-humor="surpresa"] .dex-o-aberto{transform:scale(1.22,1.28)}
.dex-svg[data-humor="surpresa"] .dex-boca-sorriso{opacity:0;transform:scale(.3)}
.dex-svg[data-humor="surpresa"] .dex-boca-o{opacity:1;transform:none}
.dex-svg[data-humor="surpresa"] .dex-braco-e{transform:rotate(40deg);animation:none}
.dex-svg[data-humor="surpresa"] .dex-braco-d{transform:rotate(-40deg);animation:none}

/* pensando: olha para cima, mão no queixo, pontinhos */
.dex-svg[data-humor="pensando"] .dex-olhos{transform:translate(5px,-6px)}
.dex-svg[data-humor="pensando"] .dex-cabeca{transform:rotate(7deg)}
.dex-svg[data-humor="pensando"] .dex-braco-e{transform:rotate(-112deg);animation:none}
.dex-svg[data-humor="pensando"] .dex-o-aberto{transform:scaleY(.8)}
.dex-svg[data-humor="pensando"] .dex-boca-sorriso{transform:scale(.6,.4) translateX(3px)}
.dex-svg[data-humor="pensando"] .dex-fx-ponto{animation:dexPonto 1.2s ease-in-out infinite}
.dex-svg[data-humor="pensando"] .dex-fx-ponto:nth-child(2){animation-delay:.18s}
.dex-svg[data-humor="pensando"] .dex-fx-ponto:nth-child(3){animation-delay:.36s}
@keyframes dexPonto{0%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}

/* ouvindo: inclina a cabeça para o chat */
.dex-svg[data-humor="ouvindo"] .dex-cabeca{transform:rotate(-6deg)}
.dex-svg[data-humor="ouvindo"] .dex-o-aberto{transform:scale(1.06)}

/* falando */
.dex-svg[data-humor="falando"] .dex-boca-sorriso{opacity:0}
.dex-svg[data-humor="falando"] .dex-boca-o{opacity:1;animation:dexFala .22s ease-in-out infinite alternate}
.dex-svg[data-humor="falando"] .dex-luz{animation:dexLuz .5s ease-in-out infinite alternate}
.dex-svg[data-humor="falando"] .dex-braco-d{transform:rotate(-34deg);animation:dexGesto 1.4s ease-in-out infinite}
@keyframes dexFala{from{transform:scale(1.1,.25)}to{transform:scale(1,1)}}
@keyframes dexLuz{from{opacity:.3}to{opacity:1}}
@keyframes dexGesto{0%,100%{transform:rotate(-30deg)}50%{transform:rotate(-46deg)}}

/* triste */
.dex-svg[data-humor="triste"] .dex-olho-e .dex-o-aberto{transform:scaleY(.62) rotate(-16deg)}
.dex-svg[data-humor="triste"] .dex-olho-d .dex-o-aberto{transform:scaleY(.62) rotate(16deg)}
.dex-svg[data-humor="triste"] .dex-olhos{transform:translate(0,3px)}
.dex-svg[data-humor="triste"] .dex-boca-sorriso{opacity:0}
.dex-svg[data-humor="triste"] .dex-boca-triste{opacity:1;transform:none}
.dex-svg[data-humor="triste"] .dex-cabeca{transform:rotate(-4deg) translateY(3px)}
.dex-svg[data-humor="triste"] .dex-braco-e{transform:rotate(-6deg);animation:none}
.dex-svg[data-humor="triste"] .dex-braco-d{transform:rotate(6deg);animation:none}

/* dormindo */
.dex-svg[data-humor="dormindo"] .dex-o-fechado{opacity:1;transform:none}
.dex-svg[data-humor="dormindo"] .dex-boca-sorriso{transform:scale(.5,.3)}
.dex-svg[data-humor="dormindo"] .dex-cabeca{transform:rotate(-7deg) translateY(2px)}
.dex-svg[data-humor="dormindo"] .dex-flutua{animation-duration:6s}
.dex-svg[data-humor="dormindo"] .dex-fx-z{animation:dexZ 3s ease-in infinite}
.dex-svg[data-humor="dormindo"] .dex-fx-z:nth-child(2){animation-delay:1s}
.dex-svg[data-humor="dormindo"] .dex-fx-z:nth-child(3){animation-delay:2s}
@keyframes dexZ{0%{opacity:0;transform:translate(0,0) scale(.5)}20%{opacity:1}100%{opacity:0;transform:translate(16px,-26px) scale(1.15)}}
.dex-fx-z{font:700 13px/1 system-ui,sans-serif;fill:#8A919C;transform-box:fill-box;transform-origin:center}

/* amor: olhos de coração */
.dex-svg[data-humor="amor"] .dex-o-coracao{opacity:1;transform:none;animation:dexBate .6s ease-in-out infinite}
.dex-svg[data-humor="amor"] .dex-boca-sorriso{transform:scale(1.4,1.6)}
.dex-svg[data-humor="amor"] .dex-braco-e{transform:rotate(132deg);animation:none}
.dex-svg[data-humor="amor"] .dex-braco-d{transform:rotate(-132deg);animation:none}
.dex-svg[data-humor="amor"] .dex-fx-cor{animation:dexSobe 1.4s ease-out infinite}
.dex-svg[data-humor="amor"] .dex-fx-cor:nth-child(2){animation-delay:.45s}
.dex-svg[data-humor="amor"] .dex-fx-cor:nth-child(3){animation-delay:.9s}
@keyframes dexBate{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
@keyframes dexSobe{0%{opacity:0;transform:translateY(6px) scale(.4)}25%{opacity:1}100%{opacity:0;transform:translateY(-30px) scale(1)}}
.dex-fx-cor{fill:#C9CED6;stroke:#24272D;stroke-width:1.5;transform-box:fill-box;transform-origin:center}

/* tonto */
.dex-svg[data-humor="tonto"] .dex-o-tonto{opacity:1;transform:none;animation:dexGira 1s linear infinite}
.dex-svg[data-humor="tonto"] .dex-cabeca{animation:dexBamboleia 1s ease-in-out infinite}
.dex-svg[data-humor="tonto"] .dex-boca-sorriso{opacity:0}
.dex-svg[data-humor="tonto"] .dex-boca-triste{opacity:1;transform:scale(1.1,.6)}
@keyframes dexGira{to{transform:rotate(360deg)}}
@keyframes dexBamboleia{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}

/* pulo com esmaga-e-estica */
.dex-svg.pula .dex-mola{animation:dexPulo .78s var(--e-apple)}
@keyframes dexPulo{0%{transform:none}14%{transform:scale(1.14,.82)}38%{transform:translateY(calc(-26px * var(--dex-k,1))) scale(.9,1.12)}62%{transform:translateY(0) scale(1.1,.9)}80%{transform:scale(.97,1.03)}100%{transform:none}}

/* ---------- balão de fala ---------- */
.dex-balao{position:absolute;right:calc(100% - 26px);bottom:calc(100% - 10px);width:max-content;max-width:230px;padding:11px 14px;border-radius:18px 18px 4px 18px;
  background:#fff;color:#16181d;font:500 13px/1.4 var(--f-ui,system-ui);box-shadow:0 16px 40px rgba(10,12,16,.18),0 2px 6px rgba(10,12,16,.08);border:1px solid rgba(10,12,16,.08);
  opacity:0;transform:translateY(8px) scale(.85);transform-origin:100% 100%;pointer-events:none;transition:opacity .3s ease,transform .5s var(--e-mola)}
html[data-dex-lado="esquerda"] .dex-balao{right:auto;left:calc(100% - 26px);border-radius:18px 18px 18px 4px;transform-origin:0 100%}
.dex-balao.on{opacity:1;transform:none;pointer-events:auto;cursor:pointer}
html[data-theme="dark"] .dex-balao{background:#1d2026;color:#f2f4f7;border-color:rgba(255,255,255,.1)}
@media (prefers-color-scheme:dark){html:not([data-theme="light"]) .dex-balao{background:#1d2026;color:#f2f4f7;border-color:rgba(255,255,255,.1)}}

/* ---------- lápis de edição ---------- */
.dex-lapis{position:absolute;left:-6px;top:4px;width:30px;height:30px;border-radius:50%;border:1px solid rgba(10,12,16,.12);background:#fff;color:#24272d;display:grid;place-items:center;
  cursor:pointer;pointer-events:auto;box-shadow:0 6px 16px rgba(10,12,16,.16);opacity:0;transform:scale(.6);transition:opacity .25s ease,transform .45s var(--e-mola),background .2s ease}
html[data-dex-lado="esquerda"] .dex-lapis{left:auto;right:-6px}
.dex:hover .dex-lapis,.dex-lapis:focus-visible,.dex.editando .dex-lapis{opacity:1;transform:none}
.dex-lapis:hover{background:#f0f1f4}
.dex-lapis svg{width:14px;height:14px}
@media (hover:none){.dex-lapis{opacity:1;transform:scale(.85)}}

/* ---------- painel de personalização ---------- */
.dex-editor{position:fixed;z-index:130;right:22px;bottom:calc(var(--dex-w) * 1.15 + 26px);width:min(316px,calc(100vw - 24px));max-height:min(560px,calc(100vh - 160px));overflow:auto;
  background:var(--panel,#fff);color:var(--ink,#16181d);border:1px solid var(--line,#e3e2ec);border-radius:24px;padding:18px 18px 16px;
  box-shadow:0 30px 80px rgba(10,12,16,.28),0 2px 8px rgba(10,12,16,.08);
  opacity:0;transform:translateY(14px) scale(.94);transform-origin:100% 100%;visibility:hidden;transition:opacity .3s ease,transform .55s var(--e-apple),visibility 0s .55s}
html[data-dex-lado="esquerda"] .dex-editor{right:auto;left:22px;transform-origin:0 100%}
html[data-dex-lado="esquerda"] body:not(.hud-right):not(.hud-top):not(.hud-bottom):not(.hud-icons) .dex-editor{left:290px}
.dex-editor.on{opacity:1;transform:none;visibility:visible;transition:opacity .3s ease,transform .55s var(--e-apple),visibility 0s}
.dex-editor h3{margin:0 0 2px;font:600 16px/1.2 var(--f-ui,system-ui);display:flex;align-items:center;justify-content:space-between}
.dex-editor h3 button{all:unset;cursor:pointer;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:18px;color:var(--ink2,#46436a);background:var(--panel2,#f3f3f8)}
.dex-editor > p{margin:0 0 14px;font-size:12px;color:var(--ink3,#77759a)}
.dex-campo{margin:0 0 13px}
.dex-campo > span{display:block;font:600 10px/1 var(--f-ui,system-ui);letter-spacing:.16em;text-transform:uppercase;color:var(--ink3,#77759a);margin:0 0 8px}
.dex-seg{display:flex;flex-wrap:wrap;gap:6px}
.dex-seg button{all:unset;cursor:pointer;padding:7px 12px;border-radius:999px;font:500 12.5px/1 var(--f-ui,system-ui);border:1px solid var(--line,#e3e2ec);color:var(--ink2,#46436a);
  transition:background .25s ease,color .2s ease,border-color .2s ease,transform .35s var(--e-mola)}
.dex-seg button:hover{border-color:#8b919c}
.dex-seg button:active{transform:scale(.95)}
.dex-seg button[aria-pressed="true"]{background:#1d2026;border-color:#1d2026;color:#fff}
html[data-theme="dark"] .dex-seg button[aria-pressed="true"]{background:#eef0f3;border-color:#eef0f3;color:#14161a}
.dex-seg .dex-cor{width:14px;height:14px;border-radius:50%;display:inline-block;vertical-align:-3px;margin-right:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
.dex-editor input[type="text"]{width:100%;box-sizing:border-box;padding:9px 12px}
.dex-rodape{display:flex;gap:8px;justify-content:space-between;margin-top:6px;padding-top:12px;border-top:1px solid var(--line2,#eeedf4)}
.dex-rodape button{all:unset;cursor:pointer;font:500 12px/1 var(--f-ui,system-ui);color:var(--ink3,#77759a);padding:6px 2px}
.dex-rodape button:hover{color:var(--ink,#16181d)}

/* ---------- chat no visual do Dex (cinza, branco e preto) ---------- */
.ai-chat{transform-origin:100% 100%;transition:opacity .32s ease,transform .6s var(--e-apple),visibility 0s linear .6s !important}
.ai-chat:not(.open){transform:translateY(18px) scale(.92) !important}
.ai-chat.open{transition:opacity .32s ease,transform .6s var(--e-apple),visibility 0s !important}
html.dex-on:not([data-ak-orb="nao"]) .ai-chat{right:calc(var(--dex-w) + 38px) !important;bottom:22px !important}
html.dex-on[data-dex-lado="esquerda"]:not([data-ak-orb="nao"]) .ai-chat{right:28px !important}
.ai-chat-head{background:linear-gradient(135deg,#15171b 0%,#2b2e35 100%) !important}
.ai-chat-head::before{opacity:.0 !important}
.ai-chat-head::after{content:"";position:absolute;right:-60px;top:-80px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.1),transparent 65%);pointer-events:none}
.ai-chat .ai-avatar svg.dex-svg{width:100%;height:100%}
.ai-chat-head .ai-avatar{width:48px !important;height:42px !important}
.ai-msg.user{background:#24272e !important;color:#fff !important}
html[data-theme="dark"] .ai-msg.user{background:#e9ebef !important;color:#14161a !important}
@media (prefers-color-scheme:dark){html:not([data-theme="light"]) .ai-msg.user{background:#e9ebef !important;color:#14161a !important}}
.ai-chat-input button[type="submit"]{background:#1d2026 !important;color:#fff !important}
.ai-chat[data-dex="ia"] .ai-title small::after{content:"online · com inteligência artificial" !important}
.ai-chat[data-dex="local"] .ai-title small::after{content:"modo local · respostas básicas" !important}
.ai-chat[data-dex].ak-pensando .ai-title small::after{content:"pensando…" !important;color:#d5dae2 !important}
.ai-chat[data-dex="local"] .ai-online{background:#c9ced6 !important;box-shadow:0 0 0 3px rgba(201,206,214,.2) !important}
.dex-hd-lapis{width:32px !important;height:32px !important;margin-left:auto;margin-right:8px}
.dex-hd-lapis svg{width:14px;height:14px}
.ai-msg.dex-ia{white-space:pre-wrap}
.ai-msg.dex-ia .dex-palavra{opacity:0;animation:dexPalavra .45s var(--e-apple) forwards;animation-delay:calc(var(--i) * 28ms)}
@keyframes dexPalavra{from{opacity:0;filter:blur(3px)}to{opacity:1;filter:none}}
.ai-msg.dex-ia .ak-btns{margin-top:10px;white-space:normal}
.ai-msg.dex-aviso{font-size:11.5px !important;opacity:.8}
/* avatar das respostas no chat: o rostinho do Dex */
.ai-chat{--ia-marca:url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%2210 4 140 92%22%3E%3Crect x=%2214%22 y=%2241%22 width=%2216%22 height=%2232%22 rx=%228%22 fill=%22%23E2E5EA%22 stroke=%22%2324272D%22 stroke-width=%223%22/%3E%3Crect x=%22130%22 y=%2241%22 width=%2216%22 height=%2232%22 rx=%228%22 fill=%22%23E2E5EA%22 stroke=%22%2324272D%22 stroke-width=%223%22/%3E%3Crect x=%2263%22 y=%2210%22 width=%2234%22 height=%2213%22 rx=%226.5%22 fill=%22%23E2E5EA%22 stroke=%22%2324272D%22 stroke-width=%223%22/%3E%3Crect x=%2222%22 y=%2217%22 width=%22116%22 height=%2272%22 rx=%2234%22 fill=%22%23F6F7F9%22 stroke=%22%2324272D%22 stroke-width=%223%22/%3E%3Crect x=%2233%22 y=%2228%22 width=%2294%22 height=%2251%22 rx=%2223%22 fill=%22%23121519%22 stroke=%22%2324272D%22 stroke-width=%222.5%22/%3E%3Cpath d=%22M54 54Q62 42 70 54M90 54Q98 42 106 54%22 fill=%22none%22 stroke=%22%23F3F8FF%22 stroke-width=%224.5%22 stroke-linecap=%22round%22/%3E%3Cpath d=%22M73 66Q80 73 87 66%22 fill=%22none%22 stroke=%22%23F3F8FF%22 stroke-width=%224%22 stroke-linecap=%22round%22/%3E%3C/svg%3E")}
.ai-chat .ak-slash{background:#1d2026 !important;color:#fff !important;border-color:#1d2026 !important}
.ai-chat .ak-btn.pri{background:#1d2026 !important;color:#fff !important;box-shadow:0 8px 20px rgba(10,12,16,.22) !important}
html[data-theme="dark"] .ai-chat .ak-btn.pri,html[data-theme="dark"] .ai-chat .ak-slash{background:#eef0f3 !important;color:#14161a !important;border-color:#eef0f3 !important}
.dex-campo{display:block}
.dex-svg .dex-o-tonto{stroke-width:2.6 !important}


/* mini Dex no botão do cabeçalho (aba Aniversariantes) */
.head-orb .dex-svg{width:100%;height:100%;filter:drop-shadow(0 10px 16px rgba(10,12,16,.25))}
.head-orb{filter:none !important}

@media (max-width:720px){
  .dex{right:12px;bottom:10px;--dex-w:68px;width:68px}
  html.dex-on .ai-chat,html.dex-on:not([data-ak-orb="nao"]) .ai-chat,html.dex-on[data-dex-lado="esquerda"]:not([data-ak-orb="nao"]) .ai-chat{right:12px !important;bottom:12px !important}
  html.dex-chat-aberto .dex{opacity:0;transform:translateY(20px) scale(.8);pointer-events:none}
  html.dex-chat-aberto .dex *{pointer-events:none !important}
  .dex-balao{max-width:190px;font-size:12.5px}
}
@media (prefers-reduced-motion:reduce){.dex-svg *{animation:none !important}}
html.dex-pausa .dex-svg *{animation-play-state:paused !important}
`;
  var st=el('style'); st.id='dex-css'; st.textContent=css; D.head.appendChild(st);

  /* ------------------------------------------------------------------ desenho */
  var uid=0;
  function partesCabeca(u){
    return ''+
    '<g class="dex-cabeca">'+
      '<g class="dex-acess dex-acess-antena"><path d="M80 13V2"/><circle cx="80" cy="1" r="4.5"/></g>'+
      '<rect class="dex-orelha" x="14" y="41" width="16" height="32" rx="8"/>'+
      '<rect class="dex-orelha" x="130" y="41" width="16" height="32" rx="8"/>'+
      '<rect class="dex-topo" x="63" y="10" width="34" height="13" rx="6.5"/>'+
      '<rect class="dex-casco" x="22" y="17" width="116" height="72" rx="34"/>'+
      '<path class="dex-casco-brilho" d="M38 35C43 27 53 23 63 22.5"/>'+
      '<rect class="dex-visor" x="33" y="28" width="94" height="51" rx="23" fill="url(#dexV'+u+')"/>'+
      '<path class="dex-visor-brilho" d="M44 37C49 33 56 32 62 32"/>'+
      '<g class="dex-rosto" filter="url(#dexG'+u+')">'+
        '<ellipse class="dex-bochecha" cx="47" cy="64" rx="6" ry="3.2"/><ellipse class="dex-bochecha" cx="113" cy="64" rx="6" ry="3.2"/>'+
        '<g class="dex-olhos">'+
          olho('e',62)+olho('d',98)+
        '</g>'+
        '<g class="dex-boca" transform="translate(80 68)">'+
          '<path class="dex-boca-sorriso" d="M-6 -1.5Q0 4.5 6 -1.5"/>'+
          '<ellipse class="dex-boca-o" cx="0" cy="0" rx="4" ry="4.4"/>'+
          '<path class="dex-boca-triste" d="M-5.5 2.5Q0 -3 5.5 2.5"/>'+
        '</g>'+
      '</g>'+
      '<g class="dex-acess dex-acess-chapeu" transform="rotate(14 80 16)">'+
        '<path class="dex-chapeu-cone" d="M80 -22L99 15Q80 21 61 15Z"/>'+
        '<path class="dex-chapeu-faixa" d="M74.5 -9.5L85.5 -9.5M69 2L91 2"/>'+
        '<circle class="dex-chapeu-pom" cx="80" cy="-23" r="5.5"/>'+
      '</g>'+
    '</g>';
  }
  function olho(lado,x){
    return '<g class="dex-olho dex-olho-'+lado+'" transform="translate('+x+' 51)"><g class="dex-o">'+
      '<rect class="dex-o-aberto" x="-7" y="-9.5" width="14" height="19" rx="7"/>'+
      '<path class="dex-o-feliz" d="M-8 3Q0 -9 8 3"/>'+
      '<path class="dex-o-fechado" d="M-7.5 1.5Q0 6 7.5 1.5"/>'+
      '<path class="dex-o-coracao" d="M0 8C-10 1 -10 -8 -4.6 -8C-2 -8 0 -6 0 -3.6C0 -6 2 -8 4.6 -8C10 -8 10 1 0 8Z"/>'+
      '<path class="dex-o-tonto" d="M0 0a1.5 1.5 0 0 1 1.5 1.5a3 3 0 0 1 -3 3a4.5 4.5 0 0 1 -4.5 -4.5a6 6 0 0 1 6 -6a7.5 7.5 0 0 1 7.5 7.5"/>'+
    '</g></g>';
  }
  function defs(u){
    return '<defs>'+
      '<filter id="dexG'+u+'" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
      '<radialGradient id="dexV'+u+'" cx="50%" cy="38%" r="70%"><stop offset="0" style="stop-color:var(--c-visor2)"/><stop offset="1" style="stop-color:var(--c-visor)"/></radialGradient>'+
    '</defs>';
  }
  function svgCompleto(){
    var u=++uid;
    return '<svg class="dex-svg" viewBox="0 -30 160 214" aria-hidden="true" data-humor="neutro">'+defs(u)+
      '<ellipse class="dex-chao" cx="80" cy="177" rx="34" ry="5.5"/>'+
      '<g class="dex-flutua"><g class="dex-mola">'+
        '<g class="dex-braco dex-braco-e"><rect x="27" y="97" width="17" height="44" rx="8.5"/></g>'+
        '<g class="dex-braco dex-braco-d"><rect x="116" y="97" width="17" height="44" rx="8.5"/></g>'+
        '<rect class="dex-pescoco" x="69" y="82" width="22" height="14" rx="5"/>'+
        '<path class="dex-tronco" d="M80 90C108 90 121 105 119.5 128C118 152 101 166 80 166C59 166 42 152 40.5 128C39 105 52 90 80 90Z"/>'+
        '<path class="dex-tronco-sombra" d="M103 95C115 104 121 119 118.5 136C115 155 99 165 80 166C96 157 108 142 108 123C108 111 106 102 103 95Z"/>'+
        '<path class="dex-brilho" d="M54 108C58 100 66 96 72 97C68 102 62 110 59 122C57 128 52 120 54 108Z"/>'+
        '<path class="dex-costura" d="M47 137Q80 148 113 137"/>'+
        '<rect class="dex-luz" x="71" y="117" width="18" height="5" rx="2.5"/>'+
        partesCabeca(u)+
      '</g></g>'+
      '<g class="dex-fx">'+
        '<g><path class="dex-fx-brilho" d="M24 20l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#C9CED6" stroke="#24272D" stroke-width="1.4"/>'+
           '<path class="dex-fx-brilho" d="M142 8l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2z" fill="#F6F7F9" stroke="#24272D" stroke-width="1.4"/></g>'+
        '<g><circle class="dex-fx-ponto" cx="128" cy="2" r="3.6" fill="#9AA1AC"/><circle class="dex-fx-ponto" cx="139" cy="-6" r="3.6" fill="#9AA1AC"/><circle class="dex-fx-ponto" cx="150" cy="-14" r="3.6" fill="#9AA1AC"/></g>'+
        '<g><text class="dex-fx-z" x="122" y="6">z</text><text class="dex-fx-z" x="130" y="-2" style="font-size:16px">z</text><text class="dex-fx-z" x="140" y="-10" style="font-size:19px">Z</text></g>'+
        '<g><path class="dex-fx-cor" d="M30 10c-5-3.5-5-8-2.3-8 1.3 0 2.3 1 2.3 2.2 0-1.2 1-2.2 2.3-2.2 2.7 0 2.7 4.5-2.3 8z"/>'+
           '<path class="dex-fx-cor" d="M132 0c-6-4-6-9.5-2.7-9.5 1.6 0 2.7 1.2 2.7 2.6 0-1.4 1.1-2.6 2.7-2.6 3.3 0 3.3 5.5-2.7 9.5z"/>'+
           '<path class="dex-fx-cor" d="M118 -14c-4-3-4-6.5-1.8-6.5 1 0 1.8.8 1.8 1.8 0-1 .8-1.8 1.8-1.8 2.2 0 2.2 3.5-1.8 6.5z"/></g>'+
      '</g>'+
    '</svg>';
  }
  function svgCabeca(){
    var u=++uid;
    return '<svg class="dex-svg dex-mini" viewBox="10 -2 140 96" aria-hidden="true" data-humor="neutro">'+defs(u)+partesCabeca(u)+'</svg>';
  }

  /* ------------------------------------------------------------------ montar */
  var raiz=el('div','dex'); raiz.id='dex';
  raiz.innerHTML='<div class="dex-balao" role="status" aria-live="polite"></div>'+
    '<button class="dex-lapis" type="button" aria-label="Personalizar o Dex" title="Personalizar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></button>'+
    '<button class="dex-btn" type="button">'+svgCompleto()+'</button>';
  D.body.appendChild(raiz);
  var btn=raiz.querySelector('.dex-btn'), corpo=raiz.querySelector('.dex-svg'), balao=raiz.querySelector('.dex-balao'), lapis=raiz.querySelector('.dex-lapis');
  H.classList.add('dex-on');

  /* o mesmo Dex aparece no cabeçalho do chat e no botão da aba Aniversariantes */
  function trocarAvatares(){
    if(chat) chat.querySelectorAll('.ai-avatar').forEach(function(av){ if(!av.querySelector('.dex-mini')) av.innerHTML=svgCabeca(); });
    var orb=D.getElementById('btnAssistant'); if(orb&&!orb.querySelector('.dex-mini')) orb.innerHTML=svgCabeca();
  }
  trocarAvatares(); setTimeout(trocarAvatares,400);
  function todos(){ return D.querySelectorAll('.dex-svg'); }

  /* textos do assistente passam a ser do Dex */
  function aplicarNome(){
    var n=CFG.nome||'Dex';
    btn.setAttribute('aria-label','Abrir o chat com '+n+', o assistente do AkiCut');
    var tt=chat&&chat.querySelector('.ai-title b'); if(tt) tt.textContent=n;
    var orb=D.getElementById('btnAssistant'); if(orb){ orb.setAttribute('aria-label','Abrir '+n); orb.title=n; }
    var w=chat&&chat.querySelector('.ai-welcome-copy'); if(w) w.textContent='Oi! Eu sou o '+n+', o assistente do AkiCut. Pode falar comigo do seu jeito: explico qualquer parte do site e faço boa parte das tarefas por você. Digite / para ver os comandos rápidos.';
    var card=D.querySelector('#inicioAssistente .inicio-txt'); if(card) card.innerHTML='<b>Conversar com o '+esc(n)+'</b><small>Tire dúvidas e peça ações por chat</small>';
  }
  aplicarNome();

  /* ------------------------------------------------------------------ aparência */
  function aplicarCfg(){
    H.setAttribute('data-dex-tam',CFG.tam); H.setAttribute('data-dex-acab',CFG.acab); H.setAttribute('data-dex-acess',CFG.acess);
    H.setAttribute('data-dex-anim',CFG.anim); H.setAttribute('data-dex-lado',CFG.lado);
    H.style.setProperty('--dex-olho',OLHOS[CFG.olhos]||OLHOS.branco);
    if(CFG.seguir!=='sim') olharPara(0,0,0);
    aplicarNome();
  }

  /* ------------------------------------------------------------------ humor */
  var E={hover:false,pensando:false,ouvindo:false,falaAte:0,dormindo:false,reacao:null,ultimoMov:Date.now()};
  var humorAtual='neutro';
  function base(){
    if(E.pensando) return 'pensando';
    if(E.falaAte>Date.now()) return 'falando';
    if(E.dormindo) return 'dormindo';
    if(E.hover) return 'feliz';
    if(E.ouvindo) return 'ouvindo';
    return 'neutro';
  }
  var tReacao=0, tBase=0;
  function render(){
    var h=(E.reacao&&E.reacao.ate>Date.now())?E.reacao.h:base();
    if(h!==humorAtual){ humorAtual=h; todos().forEach(function(s){ s.setAttribute('data-humor',h); }); }
    clearTimeout(tBase);
    var prox=Math.min(E.reacao&&E.reacao.ate>Date.now()?E.reacao.ate:Infinity, E.falaAte>Date.now()?E.falaAte:Infinity);
    if(prox<Infinity) tBase=setTimeout(render,prox-Date.now()+10);
  }
  function reagir(h,ms){ E.reacao={h:h,ate:Date.now()+(ms||1200)}; render(); }
  function pular(){ if(reduzido()) return; corpo.classList.remove('pula'); void corpo.getBoundingClientRect(); corpo.classList.add('pula'); }
  corpo.addEventListener('animationend',function(e){ if(e.animationName==='dexPulo') corpo.classList.remove('pula'); });

  /* piscar de vez em quando (às vezes duas vezes) */
  (function piscar(){
    setTimeout(function(){
      if(!D.hidden&&(humorAtual==='neutro'||humorAtual==='ouvindo'||humorAtual==='falando'||humorAtual==='surpresa')){
        var ss=todos(); ss.forEach(function(s){ s.classList.add('pisca'); });
        setTimeout(function(){ ss.forEach(function(s){ s.classList.remove('pisca'); });
          if(Math.random()<.22) setTimeout(function(){ ss.forEach(function(s){ s.classList.add('pisca'); }); setTimeout(function(){ ss.forEach(function(s){ s.classList.remove('pisca'); }); },110); },170);
        },120);
      }
      piscar();
    },2600+Math.random()*3800);
  })();
  function piscadinha(){ corpo.classList.add('pisca-d'); setTimeout(function(){ corpo.classList.remove('pisca-d'); },380); }

  /* ------------------------------------------------------------------ olhar e seguir o mouse */
  function olharPara(ox,oy,tilt){ corpo.style.setProperty('--ox',ox.toFixed(2)+'px'); corpo.style.setProperty('--oy',oy.toFixed(2)+'px'); corpo.style.setProperty('--tilt',tilt.toFixed(2)+'deg'); }
  var raf=0, px=0, py=0, olhandoAte=0;
  function seguir(){
    raf=0;
    if(CFG.seguir!=='sim'||Date.now()<olhandoAte||humorAtual==='dormindo'||humorAtual==='pensando'||humorAtual==='tonto') return;
    var r=btn.getBoundingClientRect(); if(!r.width) return;
    var cx=r.left+r.width/2, cy=r.top+r.height*.36, dx=px-cx, dy=py-cy, d=Math.hypot(dx,dy)||1, k=Math.min(1,d/220);
    olharPara(6*dx/d*k, 4.5*dy/d*k, Math.max(-6,Math.min(6,dx/d*6*Math.min(1,d/420))));
  }
  function olharElemento(alvo,ms){
    if(!alvo) return; var a=alvo.getBoundingClientRect(), r=btn.getBoundingClientRect();
    var dx=(a.left+a.width/2)-(r.left+r.width/2), dy=(a.top+a.height/2)-(r.top+r.height*.36), d=Math.hypot(dx,dy)||1;
    olharPara(6*dx/d,4.5*dy/d,Math.max(-6,Math.min(6,dx/d*6))); olhandoAte=Date.now()+(ms||900);
  }
  D.addEventListener('pointermove',function(e){
    px=e.clientX; py=e.clientY; atividade();
    if(!raf) raf=requestAnimationFrame(seguir);
  },{passive:true});

  /* ------------------------------------------------------------------ sono */
  var tSono=0;
  function atividade(){
    E.ultimoMov=Date.now();
    if(E.dormindo){ E.dormindo=false; reagir('surpresa',650); pular(); }
    clearTimeout(tSono);
    tSono=setTimeout(function(){ if(!aberto()&&!E.hover){ E.dormindo=true; olharPara(0,2,0); render(); } },75000);
  }
  D.addEventListener('keydown',atividade,true);
  atividade();
  D.addEventListener('visibilitychange',function(){ H.classList.toggle('dex-pausa',D.hidden); });

  /* olhadinha para os lados quando nada acontece */
  setInterval(function(){
    if(D.hidden||humorAtual!=='neutro'||Date.now()-E.ultimoMov<6000||CFG.seguir!=='sim') return;
    if(Math.random()<.5){ var s=Math.random()<.5?-1:1; olharPara(5*s,Math.random()*3-1,3*s); olhandoAte=Date.now()+1300; setTimeout(function(){ if(Date.now()>=olhandoAte) olharPara(0,0,0); },1350); }
  },5200);

  /* ------------------------------------------------------------------ balão */
  var tBalao=0;
  function falarBalao(txt,ms){
    if(CFG.balao!=='sim'||aberto()||H.getAttribute('data-ak-orb')==='nao') return;
    balao.textContent=txt; balao.classList.add('on'); reagir('falando',Math.min(2400,txt.length*45));
    clearTimeout(tBalao); tBalao=setTimeout(function(){ balao.classList.remove('on'); },ms||5200);
  }
  balao.addEventListener('click',function(){ balao.classList.remove('on'); abrirChat(); });

  /* ------------------------------------------------------------------ interação */
  function aberto(){ return !!(chat&&chat.classList.contains('open')); }
  function abrirChat(){ var o=D.getElementById('btnAssistant'); if(o) o.click(); else if(chat){ chat.classList.add('open'); chat.setAttribute('aria-hidden','false'); } }
  var cliques=[];
  btn.addEventListener('pointerenter',function(e){ if(e.pointerType==='touch') return; E.hover=true; render(); });
  btn.addEventListener('pointerleave',function(){ E.hover=false; render(); if(Math.random()<.35&&humorAtual==='neutro') piscadinha(); });
  btn.addEventListener('click',function(){
    pular(); balao.classList.remove('on');
    if(!aberto()){ setTimeout(abrirChat,110); return; }
    var agora=Date.now(); cliques=cliques.filter(function(t){ return agora-t<1600; }); cliques.push(agora);
    if(cliques.length>=5){ cliques=[]; reagir('tonto',2300); }
    else reagir('amor',1500);
  });

  /* chat: reage ao abrir, ao digitar, ao pensar e ao responder */
  if(chat){
    new MutationObserver(function(){
      var ab=aberto(); H.classList.toggle('dex-chat-aberto',ab);
      if(ab&&!chat.__dexAb){ balao.classList.remove('on'); E.dormindo=false; reagir('surpresa',520); setTimeout(function(){ reagir('feliz',1300); },540); }
      chat.__dexAb=ab;
      E.pensando=chat.classList.contains('ak-pensando'); render();
    }).observe(chat,{attributes:true,attributeFilter:['class']});
  }
  if(input){
    input.addEventListener('focus',function(){ E.ouvindo=true; render(); olharElemento(input,1200); });
    input.addEventListener('blur',function(){ E.ouvindo=false; render(); });
    input.addEventListener('input',function(){ if(Math.random()<.3) olharElemento(input,700); });
  }
  if(msgs){
    new MutationObserver(function(ms){
      ms.forEach(function(m){ m.addedNodes.forEach(function(n){
        if(n.nodeType!==1||!n.classList||!n.classList.contains('ai-msg')||n.classList.contains('user')) return;
        var len=(n.textContent||'').length; E.falaAte=Date.now()+Math.max(900,Math.min(4200,len*38)); render();
      }); });
    }).observe(msgs,{childList:true});
  }

  /* abas: olha para o menu e dá uma dica (uma vez por aba, por sessão) */
  var DICAS={inicio:'Quer ajuda para fechar as artes do mês? É só me chamar.',aniv:'Dica: você pode colar a lista de datas e nomes direto no meu chat.',
    arte:'Arraste a foto na prévia e use a roda do mouse para ajustar o zoom.',colab:'Fotos sem dono ficam em Fotos a confirmar, no topo desta aba.',
    novos:'Busque o colaborador para usar a foto que já está no cadastro.'};
  (function(){
    var o=W.setTab; if(typeof o!=='function') return;
    W.setTab=function(t){
      var r=o.apply(this,arguments);
      try{
        var b=D.querySelector('.tabs button[data-tab="'+t+'"]'); if(b) olharElemento(b,900);
        if(W.__akPronto&&!SS.get('dex-dica-'+t)&&DICAS[t]){ SS.set('dex-dica-'+t,'1'); setTimeout(function(){ falarBalao(DICAS[t]); },1300); }
      }catch(e){}
      return r;
    };
  })();

  /* saudação quando a abertura termina */
  (function(){
    function ola(){ setTimeout(function(){
      reagir('surpresa',450); pular();
      setTimeout(function(){ reagir('feliz',1700); },470);
      if(!SS.get('dex-ola')){ SS.set('dex-ola','1'); setTimeout(function(){ falarBalao('Oi! Eu sou o '+(CFG.nome||'Dex')+'. Clique em mim quando precisar de ajuda.',6000); },700); }
    },700); }
    if(D.body.classList.contains('revealed')) ola();
    else new MutationObserver(function(m,ob){ if(D.body.classList.contains('revealed')){ ob.disconnect(); ola(); } }).observe(D.body,{attributes:true,attributeFilter:['class']});
  })();

  /* ------------------------------------------------------------------ editor */
  var ed=el('div','dex-editor'); ed.setAttribute('role','dialog'); ed.setAttribute('aria-label','Personalizar o Dex'); D.body.appendChild(ed);
  var CAMPOS=[
    ['tam','Tamanho',[['p','Pequeno'],['m','Médio'],['g','Grande']]],
    ['olhos','Cor dos olhos',[['branco','Branco'],['ciano','Ciano'],['prata','Prata']]],
    ['acab','Acabamento',[['claro','Claro'],['grafite','Grafite']]],
    ['acess','Acessório',[['nenhum','Nenhum'],['antena','Antena'],['chapeu','Chapéu de festa']]],
    ['anim','Animações',[['sutil','Sutis'],['normal','Normais'],['expressiva','Expressivas']]],
    ['seguir','Seguir o mouse com o olhar',[['sim','Sim'],['nao','Não']]],
    ['balao','Dicas em balão',[['sim','Sim'],['nao','Não']]],
    ['lado','Lado da tela',[['direita','Direita'],['esquerda','Esquerda']]]
  ];
  function montarEditor(){
    var h='<h3>Personalizar <button type="button" class="dex-x" aria-label="Fechar">×</button></h3><p>As mudanças valem na hora e ficam salvas neste navegador.</p>'+
      '<label class="dex-campo"><span>Nome</span><input type="text" maxlength="16" class="dex-nome" value="'+esc(CFG.nome)+'"></label>';
    CAMPOS.forEach(function(c){
      h+='<div class="dex-campo"><span>'+c[1]+'</span><div class="dex-seg" data-k="'+c[0]+'">';
      c[2].forEach(function(o){ var cor=c[0]==='olhos'?'<i class="dex-cor" style="background:'+OLHOS[o[0]]+'"></i>':'';
        h+='<button type="button" data-v="'+o[0]+'" aria-pressed="'+(CFG[c[0]]===o[0])+'">'+cor+esc(o[1])+'</button>'; });
      h+='</div></div>';
    });
    h+='<div class="dex-rodape"><button type="button" class="dex-padrao">Restaurar padrão</button><button type="button" class="dex-ocultar">Ocultar o Dex</button></div>';
    ed.innerHTML=h;
    ed.querySelector('.dex-x').onclick=fecharEditor;
    var nm=ed.querySelector('.dex-nome');
    nm.oninput=function(){ CFG.nome=nm.value.trim().slice(0,16)||'Dex'; salvar(); aplicarNome(); };
    ed.querySelectorAll('.dex-seg').forEach(function(g){ g.querySelectorAll('button').forEach(function(b){ b.onclick=function(){
      CFG[g.dataset.k]=b.dataset.v; salvar(); aplicarCfg();
      g.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed',String(x===b)); });
      reagir(g.dataset.k==='acess'&&b.dataset.v==='chapeu'?'amor':'feliz',1100); pular();
    }; }); });
    ed.querySelector('.dex-padrao').onclick=function(){ for(var k in PADRAO) CFG[k]=PADRAO[k]; salvar(); aplicarCfg(); montarEditor(); reagir('feliz',1000); };
    ed.querySelector('.dex-ocultar').onclick=function(){
      LS.set('ak-orb','nao'); H.setAttribute('data-ak-orb','nao'); fecharEditor();
      try{ toast('Dex oculto. Para mostrar de novo: Configurações → Assistente.',5200); }catch(e){}
    };
  }
  function abrirEditor(){ montarEditor(); ed.classList.add('on'); raiz.classList.add('editando'); reagir('feliz',1200); setTimeout(function(){ var b=ed.querySelector('.dex-nome'); b&&b.focus(); },60); }
  function fecharEditor(){ ed.classList.remove('on'); raiz.classList.remove('editando'); }
  W.__dexEditor=abrirEditor;
  lapis.addEventListener('click',function(e){ e.stopPropagation(); ed.classList.contains('on')?fecharEditor():abrirEditor(); });
  D.addEventListener('pointerdown',function(e){ if(ed.classList.contains('on')&&!ed.contains(e.target)&&!raiz.contains(e.target)&&!(e.target.closest&&e.target.closest('.dex-hd-lapis,.dex-cfg-btn'))) fecharEditor(); });
  D.addEventListener('keydown',function(e){ if(e.key==='Escape'&&ed.classList.contains('on')){ e.stopPropagation(); fecharEditor(); } },true);

  /* lápis também no topo do chat, e um atalho nas Configurações */
  (function(){
    var x=D.getElementById('aiClose'); if(!x) return;
    var b=el('button','dex-hd-lapis','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>');
    b.type='button'; b.setAttribute('aria-label','Personalizar o Dex'); b.title='Personalizar o Dex';
    b.onclick=function(){ ed.classList.contains('on')?fecharEditor():abrirEditor(); };
    x.parentNode.insertBefore(b,x);
  })();
  (function(){
    var secs=D.querySelectorAll('#settingsDlg .ak-sec'); var alvo=null;
    secs.forEach(function(s){ var h=s.querySelector('h4'); if(h&&/Assistente/.test(h.textContent)){ alvo=s; h.textContent='Assistente (Dex)'; } });
    if(!alvo) return;
    alvo.querySelectorAll('.fl').forEach(function(l){ if(/Botão do assistente/.test(l.textContent)) l.textContent='Mostrar o Dex na tela'; });
    var b=el('button','btn dex-cfg-btn','Personalizar o Dex'); b.type='button';
    b.onclick=function(){ var d=D.getElementById('settingsDlg'); try{ d.close(); }catch(e){}
      if(LS.get('ak-orb','sim')==='nao'){ LS.del('ak-orb'); H.removeAttribute('data-ak-orb'); }   // se estava oculto, volta a aparecer
      setTimeout(abrirEditor,80); };
    alvo.appendChild(b);
  })();

  /* ------------------------------------------------------------------ IA */
  var API='/api/dex', hist=[], modoIA=null, localAte=0, avisouLocal=false;
  function marcarModo(m){ modoIA=m; if(chat) chat.setAttribute('data-dex',m); }
  marcarModo('local');
  if(/^https?:$/.test(location.protocol)){
    fetch(API,{method:'GET',cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).then(function(j){ marcarModo(j&&j.ia?'ia':'local'); if(!(j&&j.ia)) localAte=Infinity; })
      .catch(function(){ marcarModo('local'); localAte=Infinity; });
  } else localAte=Infinity;

  function num(f){ try{ return f(); }catch(e){ return null; } }
  function contexto(){
    var c={};
    try{
      c.aba=({inicio:'Início',aniv:'Aniversariantes',arte:'Arte',colab:'Colaboradores',novos:'Novos colaboradores'})[state.tab]||state.tab;
      c.mes_aberto=MESNOME[state.month-1]+' de '+state.year;
      c.hoje=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
      c.colaboradores=(state.people||[]).length;
      c.fotos=num(function(){ return MEM.photos.size; });
      var rec=state.months[mk(state.year,state.month)], es=rec?rec.entries:[], ok=0,rev=0,sem=0,ger=0;
      es.forEach(function(e){ var s=num(function(){ return catalogStatus(e); }); if(s==='ready') ok++; else if(s==='review') rev++; else sem++; if(e.status==='ready') ger++; });
      c.lista_do_mes={aniversariantes:es.length,foto_ok:ok,para_conferir:rev,sem_foto:sem,artes_geradas:ger};
      c.fotos_a_confirmar=num(function(){ return Array.from(MEM.photos.values()).filter(function(f){ return f.personId===PENDING; }).length; });
      c.arte_aberta=num(function(){ return typeof curEntry!=='undefined'&&!!curEntry; });
      c.tema=H.getAttribute('data-theme')||'automático';
    }catch(e){}
    return c;
  }

  function bolha(cls){ var d=el('div','ai-msg '+cls); msgs.appendChild(d); rolar(); return d; }
  function rolar(){ try{ msgs.scrollTo({top:msgs.scrollHeight,behavior:reduzido()?'auto':'smooth'}); }catch(e){ msgs.scrollTop=msgs.scrollHeight; } }
  function digitando(on){ var t=D.getElementById('aiTyping'); if(t) t.setAttribute('aria-hidden',on?'false':'true'); }
  function formatar(t){
    var linhas=esc(t).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g,'$1<i>$2</i>').replace(/`([^`]+)`/g,'<b>$1</b>').replace(/^#+\s*/gm,'').replace(/^\s*[-•]\s+/gm,'• ');
    if(reduzido()) return linhas;
    var i=0; return linhas.replace(/(<[^>]+>)|([^\s<]+)/g,function(m,tag,pal){ return tag?tag:'<span class="dex-palavra" style="--i:'+(i++)+'">'+pal+'</span>'; });
  }

  /* comandos do próprio assistente, rodados como se tivessem sido digitados */
  var passar=false, comando=false;
  function rodarComando(texto){
    if(!form||!input) return;
    comando=true; var antes=input.value; input.value=texto;
    try{ form.requestSubmit?form.requestSubmit():form.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})); }finally{ comando=false; }
    var us=msgs.querySelectorAll('.ai-msg.user'), u=us[us.length-1]; if(u&&u.textContent===texto) u.remove();
    if(input.value===texto) input.value=antes;
  }
  function rodarAcao(id){
    if(typeof W.__akRunAction==='function') return W.__akRunAction(id);
    var mapa={importLista:'#btnImport',importFotos:'#btnFolder',merge:'#btnMerge',auto:'#btnAuto',hat:'#btnChapeleiro',zip:'#btnZip',prepare:'#btnPrepNext',settings:'#btnSettings',tema:'#btnTheme'};
    var b=D.querySelector(mapa[id]); if(b){ b.click(); return true; } return false;
  }
  var BOTOES={importar_lista:['Importar lista','importLista'],importar_fotos:['Importar pasta de fotos','importFotos'],unificar:['Unificar duplicados','merge'],
    ajustar:['Aplicar enquadramento automático','auto'],chapeleiro:['Aplicar o Chapeleiro','hat'],zip:['Baixar todas (ZIP)','zip'],preparar:['Preparar próximo mês','prepare'],
    configuracoes:['Abrir configurações','settings'],tema:['Alternar o tema','tema']};
  function executarAcoes(acoes,caixa){
    var botoes=[];
    (acoes||[]).forEach(function(a){
      var arg=(a.arg||'').replace(/[<>]/g,'').trim();
      switch(a.id){
        case 'aba': if(/^(inicio|aniv|arte|colab|novos)$/.test(arg)&&typeof W.setTab==='function') setTimeout(function(){ W.setTab(arg); },350); break;
        case 'resumo': rodarComando('resumo do mês'); break;
        case 'pendencias': rodarComando('pendências'); break;
        case 'hoje': rodarComando('hoje'); break;
        case 'semana': rodarComando('próximos 7 dias'); break;
        case 'mes30': rodarComando('próximos 30 dias'); break;
        case 'espaco': rodarComando('espaço'); break;
        case 'confirmar': rodarComando('fotos a confirmar'); break;
        case 'sem_foto': rodarAcao('semFoto'); break;
        case 'buscar': if(arg) rodarComando('buscar '+arg); break;
        case 'arte': if(arg) rodarComando('abrir arte da '+arg); break;
        case 'ir_mes': if(arg) rodarComando('ir para '+arg); break;
        case 'gerar_mes': rodarComando('gerar o mês de '+(arg||num(function(){ return MESNOME[state.month-1]; })||'')); break;
        case 'gerar_arte': if(arg) botoes.push({t:'Gerar a arte de '+arg,fn:function(){ rodarComando('gerar arte da '+arg); }}); break;
        case 'editar_dex': botoes.push({t:'Personalizar o '+(CFG.nome||'Dex'),fn:abrirEditor}); break;
        default: if(BOTOES[a.id]) botoes.push({t:BOTOES[a.id][0],fn:(function(id){ return function(){ var r=rodarAcao(id); if(r&&r.then) r.catch(function(){}); }; })(BOTOES[a.id][1])});
      }
    });
    if(botoes.length&&caixa){
      var g=el('div','ak-btns');
      botoes.forEach(function(b,i){ var x=el('button','ak-btn'+(i===0?' pri':''),esc(b.t)); x.type='button'; x.onclick=function(){ x.disabled=true; b.fn(); setTimeout(function(){ x.disabled=false; },1500); }; g.appendChild(x); });
      caixa.appendChild(g); rolar();
    }
  }

  function paraLocal(texto,motivo){
    if(motivo==='limite'||motivo==='rede') localAte=Date.now()+120000;
    if(!avisouLocal){ avisouLocal=true; var a=bolha('bot dex-aviso');
      a.textContent=motivo==='limite'?'A IA atingiu o limite de uso por agora. Enquanto isso, respondo com o que já sei do site.':'Estou sem conexão com a IA agora. Enquanto isso, respondo com o que já sei do site.'; }
    marcarModo('local');
    passar=true; input.value=texto;
    try{ form.requestSubmit?form.requestSubmit():form.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})); }finally{ passar=false; }
  }

  var ocupado=false;
  async function perguntarIA(texto){
    ocupado=true;
    var u=bolha('user'); u.textContent=texto;
    hist.push({role:'user',content:texto}); if(hist.length>12) hist=hist.slice(-12);
    digitando(true);
    var ctl=new AbortController(), t=setTimeout(function(){ ctl.abort(); },26000), r=null, j=null;
    try{ r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mensagens:hist,contexto:contexto(),nome:CFG.nome}),signal:ctl.signal}); j=await r.json().catch(function(){ return null; }); }
    catch(e){ r=null; }
    clearTimeout(t); digitando(false); ocupado=false;
    if(!r||!r.ok||!j||!j.texto){
      hist.pop(); u.remove(); reagir('triste',1400);
      var motivo=!r?'rede':(j&&j.erro)==='limite'||r.status===429?'limite':(j&&j.erro)==='sem_chave'?'sem_chave':'rede';
      if(motivo==='sem_chave') localAte=Infinity;
      paraLocal(texto,motivo); return;
    }
    marcarModo('ia');
    var b=bolha('bot dex-ia'); b.innerHTML=formatar(j.texto);
    hist.push({role:'assistant',content:j.texto});
    executarAcoes(j.acoes,b);
  }

  /* entra depois da extensão do assistente: o que ela resolve, continua com ela */
  D.addEventListener('submit',function(ev){
    if(ev.target!==form||passar||comando) return;
    var t=(input.value||'').trim(); if(!t||t.charAt(0)==='/') return;
    if(Date.now()<localAte) return;          // modo local: deixa o assistente original responder
    ev.preventDefault(); ev.stopImmediatePropagation();
    input.value='';
    if(ocupado) return;
    perguntarIA(t);
  },true);

  /* chips de sugestão e atalhos antigos que mencionavam o nome antigo */
  if(chat) chat.querySelectorAll('[data-prompt]').forEach(function(b){ if(/AniverCut/i.test(b.dataset.prompt)) b.dataset.prompt=b.dataset.prompt.replace(/AniverCut/gi,'AkiCut'); });

  /* ------------------------------------------------------------------ início */
  aplicarCfg(); render();
  W.__dex={reagir:reagir,pular:pular,abrirEditor:abrirEditor,falar:falarBalao,cfg:CFG,contexto:contexto,
    estado:function(){ return {humor:humorAtual,modo:modoIA}; }};
})();
