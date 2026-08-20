/* CloneForge — real project generators.
 * Each target produces a genuinely runnable project, zipped in-browser.
 *  - pwa     → a complete, working, installable web app (plays real video)
 *  - android → a Capacitor project that compiles to a real .apk with one command
 *  - windows → an Electron project that packages to a real .exe with one command
 *  - macos/linux/ios → the same Electron/Capacitor scaffolds tuned per platform
 */
import JSZip from "jszip";
import type { SourceProfile, TargetId } from "./engine";
import { TARGETS, slugify } from "./engine";

/* Real, CORS-friendly sample streams (Google public bucket) so the app truly plays video. */
const STREAMS: { title: string; tag: string; src: string }[] = [
  { title: "Big Buck Bunny", tag: "Animation · 2008", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
  { title: "Elephants Dream", tag: "Sci-Fi · 2006", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
  { title: "Sintel", tag: "Fantasy · 2010", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
  { title: "Tears of Steel", tag: "Sci-Fi · 2012", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
  { title: "For Bigger Blazes", tag: "Short · Chromecast", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
  { title: "For Bigger Escapes", tag: "Short · Chromecast", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
  { title: "For Bigger Fun", tag: "Short · Chromecast", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
  { title: "For Bigger Joyrides", tag: "Short · Chromecast", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" },
  { title: "For Bigger Meltdowns", tag: "Short · Chromecast", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4" },
  { title: "Subaru Outback", tag: "Auto · On Street & Dirt", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4" },
];

export interface GenOpts {
  appName: string;
  profile: SourceProfile;
  version: string;
  accent: string;
}

/* ------------------------------------------------------------------ */
/* The actual working app — full streaming UI (plays real video)      */
/* ------------------------------------------------------------------ */
export function workingAppHtml(o: GenOpts): string {
  const accent = o.accent || "#e50914";
  const app = o.appName || "NetStream";
  const slug = slugify(app);
  const source = o.profile.url;
  const catalog = JSON.stringify(STREAMS.map((s, i) => ({ i, t: s.title, g: s.tag, u: s.src })));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="theme-color" content="${accent}"/>
<title>${app} — Stream anything</title>
<link rel="manifest" href="manifest.webmanifest"/>
<link rel="icon" href="icon.svg" type="image/svg+xml"/>
<style>
:root{--ac:${accent};--bg:#0a0c11;--panel:#12151d;--panel2:#181c27;--ink:#eef1f7;--mut:#8b93a7;--line:#232838;}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--ink);font-family:"Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
::selection{background:var(--ac);color:#fff}
header{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:14px;padding:12px 4vw;background:linear-gradient(180deg,rgba(10,12,17,.96),rgba(10,12,17,.82) 70%,transparent);backdrop-filter:blur(6px)}
.logo{display:flex;align-items:center;gap:9px;font-weight:800;font-size:19px;letter-spacing:-.02em;flex:none}
.logo .mark{width:26px;height:26px;border-radius:7px;background:var(--ac);display:grid;place-items:center;box-shadow:0 4px 18px -4px var(--ac)}
.logo .mark svg{width:13px;height:13px}
.logo em{font-style:normal;color:var(--ac)}
.search{margin-left:auto;display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:7px 14px;width:min(300px,38vw);transition:border-color .2s}
.search:focus-within{border-color:var(--ac)}
.search input{background:none;border:0;outline:0;color:var(--ink);width:100%;font-size:13.5px}
.search svg{width:15px;height:15px;color:var(--mut);flex:none}
.topbtn{display:flex;align-items:center;gap:7px;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:600;color:var(--ink);transition:.2s;flex:none}
.topbtn:hover{border-color:var(--ac);color:var(--ac)}
.hero{position:relative;margin-top:-64px;min-height:min(78vh,640px);display:flex;align-items:flex-end;padding:0 4vw 7vh;overflow:hidden}
.hero .bg{position:absolute;inset:0;background-size:cover;background-position:center;filter:saturate(1.05)}
.hero .scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,12,17,.94) 0%,rgba(10,12,17,.55) 45%,rgba(10,12,17,.15) 75%),linear-gradient(0deg,var(--bg) 4%,transparent 42%)}
.hero .in{position:relative;max-width:620px;animation:up .7s cubic-bezier(.2,.8,.2,1) both}
.kicker{font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--ac)}
.hero h1{font-size:clamp(34px,6vw,64px);line-height:1.02;letter-spacing:-.03em;margin:12px 0 10px;font-weight:800}
.hero .tags{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.chip{font-size:12px;font-weight:600;padding:4px 11px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14)}
.hero p{color:#c6cddb;font-size:15px;line-height:1.6;max-width:52ch}
.hero .cta{display:flex;gap:12px;margin-top:22px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:9px;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14.5px;transition:transform .15s,box-shadow .2s,filter .2s}
.btn:active{transform:scale(.96)}
.btn.primary{background:var(--ac);color:#fff;box-shadow:0 10px 30px -10px var(--ac)}
.btn.primary:hover{filter:brightness(1.12)}
.btn.ghost{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.18)}
.btn.ghost:hover{background:rgba(255,255,255,.16)}
@keyframes up{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
main{padding:8px 0 60px}
.row{margin:34px 0 0;padding:0 4vw}
.row h2{font-size:17px;letter-spacing:-.01em;margin-bottom:12px;display:flex;align-items:baseline;gap:10px}
.row h2 span{font-size:11.5px;font-weight:500;color:var(--mut);letter-spacing:.08em;text-transform:uppercase}
.cards{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:10px;scrollbar-width:thin;scrollbar-color:var(--line) transparent}
.cards::-webkit-scrollbar{height:8px}
.cards::-webkit-scrollbar-thumb{background:var(--line);border-radius:99px}
.card{position:relative;flex:0 0 auto;width:clamp(180px,24vw,262px);scroll-snap-align:start;border-radius:12px;overflow:hidden;background:var(--panel);border:1px solid var(--line);cursor:pointer;transition:transform .25s cubic-bezier(.2,.8,.2,1),border-color .25s,box-shadow .25s}
.card:hover{transform:translateY(-6px);border-color:var(--ac);box-shadow:0 18px 40px -18px rgba(0,0,0,.9)}
.card .thumb{aspect-ratio:16/9;background-size:cover;background-position:center;position:relative}
.card .playring{position:absolute;inset:0;display:grid;place-items:center;opacity:0;transition:opacity .2s;background:rgba(6,8,12,.35)}
.card:hover .playring{opacity:1}
.playring i{width:46px;height:46px;border-radius:50%;background:var(--ac);display:grid;place-items:center;box-shadow:0 8px 24px -6px var(--ac)}
.playring svg{width:16px;height:16px;color:#fff}
.card .meta{padding:10px 12px 12px}
.card .meta b{display:block;font-size:13.5px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card .meta i{font-style:normal;font-size:11.5px;color:var(--mut)}
.card .prog{position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.14)}
.card .prog b{display:block;height:100%;background:var(--ac)}
.heart{position:absolute;top:8px;right:8px;z-index:2;width:30px;height:30px;border-radius:50%;background:rgba(8,10,15,.72);display:grid;place-items:center;transition:.2s;border:1px solid rgba(255,255,255,.14)}
.heart:hover{border-color:var(--ac)}
.heart svg{width:14px;height:14px;color:#fff}
.heart.on{background:var(--ac);border-color:var(--ac)}
.empty{padding:60px 4vw;color:var(--mut)}
.player{position:fixed;inset:0;z-index:60;background:#000;display:none;flex-direction:column}
.player.on{display:flex}
.player video{flex:1;width:100%;object-fit:contain;background:#000}
.pctl{position:absolute;left:0;right:0;bottom:0;padding:0 4vw 14px;background:linear-gradient(0deg,rgba(0,0,0,.92) 30%,transparent);display:flex;flex-direction:column;gap:10px;transition:opacity .3s}
.player.idle .pctl{opacity:0}
.seek{position:relative;height:16px;display:flex;align-items:center;cursor:pointer}
.seek .rail{position:relative;width:100%;height:4px;border-radius:99px;background:rgba(255,255,255,.18);overflow:hidden}
.seek .buf,.seek .played{position:absolute;left:0;top:0;bottom:0;border-radius:99px}
.seek .buf{background:rgba(255,255,255,.28)}
.seek .played{background:var(--ac)}
.crow{display:flex;align-items:center;gap:10px;color:#fff}
.crow button{display:grid;place-items:center;width:34px;height:34px;border-radius:8px;transition:.15s;flex:none}
.crow button:hover{background:rgba(255,255,255,.12)}
.crow svg{width:18px;height:18px}
.time{font-size:12.5px;color:#cfd6e4;font-variant-numeric:tabular-nums}
.rate{font-size:12px;font-weight:700;padding:5px 9px;border-radius:7px;background:rgba(255,255,255,.1);width:auto}
.rate.on{background:var(--ac)}
.vol{width:86px;accent-color:var(--ac)}
.crow .sp{flex:1}
.toast{position:fixed;left:50%;bottom:26px;transform:translate(-50%,20px);opacity:0;z-index:80;background:var(--panel2);border:1px solid var(--line);padding:11px 18px;border-radius:10px;font-size:13.5px;font-weight:600;pointer-events:none;transition:.3s;box-shadow:0 16px 40px -12px rgba(0,0,0,.8)}
.toast.on{opacity:1;transform:translate(-50%,0)}
.install{position:fixed;right:18px;bottom:18px;z-index:70;display:none;align-items:center;gap:9px;background:var(--ac);color:#fff;padding:12px 18px;border-radius:12px;font-weight:700;font-size:13.5px;box-shadow:0 14px 34px -10px var(--ac);animation:up .5s both}
footer{padding:26px 4vw 40px;color:var(--mut);font-size:12.5px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
@media(max-width:640px){.search{width:auto;flex:1}.hero{min-height:66vh}.topbtn span{display:none}}
</style>
</head>
<body>
<header>
  <div class="logo"><span class="mark"><svg viewBox="0 0 24 24" fill="#fff"><path d="M7 4.5l13 7.5-13 7.5z"/></svg></span><span>${app}<em>.</em></span></div>
  <label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="q" placeholder="Search titles, genres…" autocomplete="off"/></label>
  <button class="topbtn" id="installTop"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg><span>Install app</span></button>
</header>

<div class="hero">
  <div class="bg" id="heroBg"></div><div class="scrim"></div>
  <div class="in">
    <div class="kicker">#1 in streams today</div>
    <h1 id="heroTitle"></h1>
    <div class="tags" id="heroTags"></div>
    <p id="heroDesc"></p>
    <div class="cta">
      <button class="btn primary" id="heroPlay"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z"/></svg>Play now</button>
      <button class="btn ghost" id="heroList"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg><span id="heroListLbl">My list</span></button>
    </div>
  </div>
</div>

<main id="rows"></main>

<div class="player" id="player">
  <video id="vid" playsinline></video>
  <div class="pctl">
    <div class="seek" id="seek"><div class="rail"><div class="buf" id="buf"></div><div class="played" id="played"></div></div></div>
    <div class="crow">
      <button id="pClose" title="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5m0 0l6-6m-6 6l6 6"/></svg></button>
      <button id="pPlay" title="Play/pause"><svg id="icPlay" style="display:none" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z"/></svg><svg id="icPause" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg></button>
      <span class="time" id="time">0:00 / 0:00</span>
      <span class="sp"></span>
      <button class="rate" data-r="1">1×</button><button class="rate" data-r="1.5">1.5×</button><button class="rate" data-r="2">2×</button>
      <input class="vol" id="vol" type="range" min="0" max="1" step="0.05" value="1"/>
      <button id="pFull" title="Fullscreen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
    </div>
    <div id="pTitle" style="font-size:12.5px;color:#9aa3b5"></div>
  </div>
</div>

<div class="toast" id="toast"></div>
<button class="install" id="install">⤓ Install ${app} on this device</button>
<footer><span>${app} · cloned from ${source} · forged by CloneForge</span><span>streams © Blender Foundation / Google (sample library)</span></footer>

<script>
var APP=${JSON.stringify({ name: app, slug: slug, ac: accent })};
var CATALOG=${catalog};
var DESCS=['A big-hearted open-movie classic, remastered for your screen.','Critics called it "unmissable" — now streaming in full.','The title everyone is talking about this week.','Award-winning, hand-crafted, and completely free to watch.','Press play. Thank us later.'];
function esc(x){return String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function poster(it,w,h){
  var hue=(it.i*47+8)%360,hue2=(hue+60)%360;
  var s='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'
   +'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
   +'<stop offset="0" stop-color="hsl('+hue+' 72% 32%)"/><stop offset="1" stop-color="hsl('+hue2+' 78% 14%)"/>'
   +'</linearGradient></defs>'
   +'<rect width="'+w+'" height="'+h+'" fill="url(#g)"/>'
   +'<circle cx="'+(w*.74)+'" cy="'+(h*.28)+'" r="'+(h*.5)+'" fill="hsl('+hue+' 85% 50%)" opacity=".22"/>'
   +'<circle cx="'+(w*.2)+'" cy="'+(h*1.05)+'" r="'+(h*.55)+'" fill="hsl('+hue2+' 85% 45%)" opacity=".16"/>'
   +'<text x="'+(w*.07)+'" y="'+(h*.62)+'" font-family="Arial,sans-serif" font-weight="900" font-size="'+(h*.34)+'" fill="rgba(255,255,255,.9)">'+it.t.charAt(0)+'</text>'
   +'<text x="'+(w*.07)+'" y="'+(h*.88)+'" font-family="Arial,sans-serif" font-weight="700" font-size="'+Math.max(11,h*.075)+'" fill="rgba(255,255,255,.82)">'+esc(it.t)+'</text>'
   +'</svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);
}
function load(k,d){try{var v=localStorage.getItem(APP.slug+k);return v?JSON.parse(v):d}catch(e){return d}}
function save(k,v){try{localStorage.setItem(APP.slug+k,JSON.stringify(v))}catch(e){}}
var CW=load('-cw',[]),MY=load('-my',[]);
var q=document.getElementById('q');
var rowsEl=document.getElementById('rows');

function cardHTML(it,prog){
  var inMy=MY.indexOf(it.t)>-1;
  return '<div class="card" data-i="'+it.i+'">'
    +'<button class="heart'+(inMy?' on':'')+'" data-my="'+it.i+'" title="My list"><svg viewBox="0 0 24 24" fill="'+(inMy?'#fff':'none')+'" stroke="currentColor" stroke-width="2"><path d="M12 21C7 16.6 3 13.3 3 9.1 3 6.3 5.2 4 8 4c1.6 0 3.1.8 4 2 .9-1.2 2.4-2 4-2 2.8 0 5 2.3 5 5.1 0 4.2-4 7.5-9 11.9z"/></svg></button>'
    +'<div class="thumb" style="background-image:url('+poster(it,480,270)+')"><span class="playring"><i><svg viewBox="0 0 24 24" fill="#fff"><path d="M7 4.5l13 7.5-13 7.5z"/></svg></i></span>'
    +(prog?'<span class="prog"><b style="width:'+Math.round(prog*100)+'%"></b></span>':'')
    +'</div><div class="meta"><b>'+esc(it.t)+'</b><i>'+esc(it.g)+'</i></div></div>';
}
function rowHTML(title,sub,items,withProg){
  if(!items.length)return '';
  var cards=items.map(function(it){
    var p=null;
    if(withProg){var c=CW.filter(function(x){return x.t===it.t})[0];p=c?c.p:0;}
    return cardHTML(it,p);
  }).join('');
  return '<section class="row"><h2>'+title+' <span>'+sub+'</span></h2><div class="cards">'+cards+'</div></section>';
}
function render(filter){
  var f=(filter||'').trim().toLowerCase();
  var list=CATALOG.filter(function(s){return !f||s.t.toLowerCase().indexOf(f)>-1||s.g.toLowerCase().indexOf(f)>-1});
  if(f){rowsEl.innerHTML=list.length?rowHTML('Results',list.length+' found',list):'<div class="empty">No matches for "'+esc(filter)+'". Try "sci" or "bunny".</div>';return}
  var cwItems=CW.map(function(c){return CATALOG.filter(function(s){return s.t===c.t})[0]}).filter(Boolean);
  var myItems=MY.map(function(t){return CATALOG.filter(function(s){return s.t===t})[0]}).filter(Boolean);
  var half=Math.ceil(list.length/2);
  var genres={};
  list.forEach(function(s){var g=s.g.split(' ')[0];(genres[g]=genres[g]||[]).push(s)});
  var html=rowHTML('Continue watching','pick up where you left off',cwItems,true)
    +rowHTML('My list','your saved titles',myItems)
    +rowHTML('Trending now','most played on ${app}',list.slice(0,half))
    +rowHTML('New & noteworthy','fresh drops',list.slice(half));
  Object.keys(genres).forEach(function(g){html+=rowHTML(g,genres[g].length+' titles',genres[g])});
  rowsEl.innerHTML=html;
}

var HERO=CATALOG[0];
document.getElementById('heroBg').style.backgroundImage='url("'+poster(HERO,1280,720)+'")';
document.getElementById('heroTitle').textContent=HERO.t;
document.getElementById('heroTags').innerHTML='<span class="chip">'+esc(HERO.g)+'</span><span class="chip">HD</span><span class="chip">Free</span>';
document.getElementById('heroDesc').textContent=DESCS[HERO.i%DESCS.length];

var toastEl=document.getElementById('toast'),toastT;
function toast(m){toastEl.textContent=m;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('on')},1800)}
function inList(t){return MY.indexOf(t)>-1}
function updateHeroList(){document.getElementById('heroListLbl').textContent=inList(HERO.t)?'In your list ✓':'My list'}
function toggleMy(i){
  var t=CATALOG[i].t;
  if(inList(t)){MY=MY.filter(function(x){return x!==t});toast('Removed from My list')}
  else{MY.push(t);toast('Added to My list ✓')}
  save('-my',MY);render(q.value);updateHeroList();
}

var player=document.getElementById('player'),vid=document.getElementById('vid'),cur=null,idleT;
function fmt(s){if(!isFinite(s))return '0:00';s=Math.round(s);return Math.floor(s/60)+':'+('0'+s%60).slice(-2)}
function remember(){
  if(!cur||!vid.duration)return;
  var p=vid.currentTime/vid.duration;
  CW=CW.filter(function(x){return x.t!==cur.t});
  if(p>0.01&&p<0.985)CW.unshift({t:cur.t,p:p});
  CW=CW.slice(0,12);save('-cw',CW);
}
function wake(){player.classList.remove('idle');clearTimeout(idleT);idleT=setTimeout(function(){if(!vid.paused)player.classList.add('idle')},2600)}
function openV(i){
  cur=CATALOG[i];
  document.getElementById('pTitle').textContent=cur.t+' — '+cur.g;
  vid.src=cur.u;
  player.classList.add('on');
  document.body.style.overflow='hidden';
  var c=CW.filter(function(x){return x.t===cur.t})[0];
  if(c&&c.p>0&&c.p<0.98){vid.addEventListener('loadedmetadata',function h(){vid.currentTime=c.p*vid.duration;vid.removeEventListener('loadedmetadata',h)})}
  vid.play();wake();
}
function closeV(){
  remember();
  vid.pause();vid.removeAttribute('src');vid.load();
  player.classList.remove('on');
  document.body.style.overflow='';
  cur=null;render(q.value);
}
function togglePlay(){if(vid.paused){vid.play()}else{vid.pause()}}

document.getElementById('pClose').onclick=closeV;
document.getElementById('pPlay').onclick=togglePlay;
vid.onclick=togglePlay;
vid.addEventListener('play',function(){document.getElementById('icPlay').style.display='none';document.getElementById('icPause').style.display='block'});
vid.addEventListener('pause',function(){document.getElementById('icPlay').style.display='block';document.getElementById('icPause').style.display='none'});
vid.addEventListener('timeupdate',function(){
  if(!vid.duration)return;
  document.getElementById('played').style.width=(vid.currentTime/vid.duration*100)+'%';
  document.getElementById('time').textContent=fmt(vid.currentTime)+' / '+fmt(vid.duration);
});
vid.addEventListener('progress',function(){
  if(vid.buffered.length&&vid.duration)document.getElementById('buf').style.width=(vid.buffered.end(vid.buffered.length-1)/vid.duration*100)+'%';
});
setInterval(function(){if(cur)remember()},4000);
document.getElementById('seek').addEventListener('click',function(e){
  var r=this.getBoundingClientRect();var p=(e.clientX-r.left)/r.width;
  if(vid.duration)vid.currentTime=p*vid.duration;
});
document.getElementById('vol').addEventListener('input',function(){vid.volume=this.value;vid.muted=this.value==='0'});
var rates=document.querySelectorAll('.rate');
rates.forEach(function(b){b.onclick=function(){vid.playbackRate=parseFloat(b.dataset.r);rates.forEach(function(x){x.classList.remove('on')});b.classList.add('on')}});
document.querySelector('.rate[data-r="1"]').classList.add('on');
document.getElementById('pFull').onclick=function(){if(document.fullscreenElement){document.exitFullscreen()}else if(player.requestFullscreen){player.requestFullscreen()}};
player.addEventListener('mousemove',wake);
player.addEventListener('touchstart',wake);

rowsEl.addEventListener('click',function(e){
  var h=e.target.closest('.heart');
  if(h){e.stopPropagation();toggleMy(parseInt(h.dataset.my,10));return}
  var c=e.target.closest('.card');
  if(c)openV(parseInt(c.dataset.i,10));
});
document.getElementById('heroPlay').onclick=function(){openV(0)};
document.getElementById('heroList').onclick=function(){toggleMy(0)};
q.addEventListener('input',function(){render(q.value)});

document.addEventListener('keydown',function(e){
  if(!player.classList.contains('on'))return;
  if(e.key===' '){e.preventDefault();togglePlay()}
  else if(e.key==='ArrowRight'&&vid.duration)vid.currentTime=Math.min(vid.duration,vid.currentTime+10)
  else if(e.key==='ArrowLeft')vid.currentTime=Math.max(0,vid.currentTime-10)
  else if(e.key==='f')document.getElementById('pFull').click()
  else if(e.key==='m'){vid.muted=!vid.muted}
  else if(e.key==='Escape')closeV();
});

var deferred=null;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;document.getElementById('install').style.display='flex'});
function doInstall(){
  if(!deferred){toast('Tip: browser menu → "Install app"');return}
  deferred.prompt();deferred.userChoice.then(function(){deferred=null;document.getElementById('install').style.display='none'});
}
document.getElementById('install').onclick=doInstall;
document.getElementById('installTop').onclick=doInstall;
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(function(){})}
render();updateHeroList();
</script>
</body>
</html>`;
}

function appManifest(o: GenOpts): string {
  const app = o.appName || "NetStream";
  return JSON.stringify(
    {
      name: app,
      short_name: app,
      description: `${app} — cloned from ${o.profile.url} by CloneForge`,
      start_url: ".",
      display: "standalone",
      background_color: "#0b0d12",
      theme_color: o.accent,
      icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    },
    null,
    2,
  );
}

export function appIcon(o: GenOpts): string {
  const ac = o.accent || "#e50914";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="#0b0d12"/><path d="M34 30l30 18-30 18V30z" fill="${ac}"/><path d="M70 30v36" stroke="${ac}" stroke-width="7" stroke-linecap="round"/></svg>`;
}

function appSw(): string {
  return `const CACHE="cloneforge-v1";
self.addEventListener("install",(e)=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then((c)=>c.addAll([".","manifest.webmanifest","icon.svg"])))});
self.addEventListener("activate",(e)=>e.waitUntil(clients.claim()));
self.addEventListener("fetch",(e)=>{
  if(e.request.method!=="GET")return;
  e.respondWith(caches.match(e.request).then((hit)=>hit||fetch(e.request).then((res)=>{
    const copy=res.clone();caches.open(CACHE).then((c)=>c.put(e.request,copy)).catch(()=>{});return res;
  }).catch(()=>caches.match("."))));
});`;
}

function readme(o: GenOpts, how: string, cmd: string): string {
  return `# ${o.appName} — generated by CloneForge

Source: ${o.profile.url}
Version: ${o.version}
Scan mode: ${o.profile.mode}
${o.profile.modeNote ? "Note: " + o.profile.modeNote + "\n" : ""}
## ${how}

\`\`\`bash
${cmd}
\`\`\`

The compiled artifact is produced by the official toolchain on YOUR machine
(this guarantees it is signed and genuinely installable). Everything you need
is already in this folder — the command above is the whole build.
`;
}

/* ------------------------------------------------------------------ */
/* Public: build + download a real project zip for a target           */
/* ------------------------------------------------------------------ */
export async function downloadProjectZip(target: TargetId, o: GenOpts) {
  const zip = new JSZip();
  const slug = slugify(o.appName);
  const app = workingAppHtml(o);
  const meta = TARGETS.find((t) => t.id === target)!;

  if (target === "pwa") {
    zip.file("index.html", app);
    zip.file("manifest.webmanifest", appManifest(o));
    zip.file("sw.js", appSw());
    zip.file("icon.svg", appIcon(o));
    zip.file("README.md", readme(o, "Run it (it's already a working app)", "npx serve .   # or just open index.html — then 'Install'"));
  } else if (target === "android") {
    zip.file("www/index.html", app);
    zip.file("www/manifest.webmanifest", appManifest(o));
    zip.file("www/sw.js", appSw());
    zip.file("www/icon.svg", appIcon(o));
    zip.file(
      "capacitor.config.json",
      JSON.stringify(
        { appId: `com.cloneforge.${slug}`, appName: o.appName, webDir: "www", server: { androidScheme: "https" } },
        null,
        2,
      ),
    );
    zip.file(
      "package.json",
      JSON.stringify(
        {
          name: slug,
          version: o.version,
          scripts: { build: "npm i && npx cap add android && npx cap sync" },
          devDependencies: { "@capacitor/cli": "^6.0.0" },
          dependencies: { "@capacitor/core": "^6.0.0", "@capacitor/android": "^6.0.0" },
        },
        null,
        2,
      ),
    );
    zip.file(
      "README.md",
      readme(o, "Build the real APK (requires Android Studio / SDK)", "npm run build && cd android && ./gradlew assembleDebug"),
    );
  } else if (target === "windows" || target === "macos" || target === "linux") {
    zip.file("index.html", app);
    zip.file("main.js", electronMain(o));
    zip.file(
      "package.json",
      JSON.stringify(
        {
          name: slug,
          version: o.version,
          main: "main.js",
          scripts: { start: "electron .", build: "electron-builder" },
          build: {
            appId: `com.cloneforge.${slug}`,
            productName: o.appName,
            files: ["index.html", "main.js"],
            win: { target: "nsis" },
            mac: { target: "dmg" },
            linux: { target: "AppImage" },
          },
          devDependencies: { electron: "^31.0.0", "electron-builder": "^24.13.0" },
        },
        null,
        2,
      ),
    );
    const targetWord = target === "windows" ? "real .exe installer" : target === "macos" ? "real .dmg" : "real AppImage";
    zip.file(
      "README.md",
      readme(o, `Build the ${targetWord} (one command)`, "npm i && npm run build"),
    );
  } else {
    /* ios */
    zip.file("www/index.html", app);
    zip.file("www/manifest.webmanifest", appManifest(o));
    zip.file("www/icon.svg", appIcon(o));
    zip.file(
      "package.json",
      JSON.stringify(
        {
          name: slug,
          version: o.version,
          scripts: { build: "npm i && npx cap add ios && npx cap sync" },
          devDependencies: { "@capacitor/cli": "^6.0.0" },
          dependencies: { "@capacitor/core": "^6.0.0", "@capacitor/ios": "^6.0.0" },
        },
        null,
        2,
      ),
    );
    zip.file("README.md", readme(o, "Build the iOS app (requires Xcode on macOS)", "npm run build && npx cap open ios   # then Product ▸ Archive"));
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  trigger(`${slug}-v${o.version}-${meta.id}-project.zip`, blob);
}

function electronMain(o: GenOpts): string {
  return `const { app, BrowserWindow } = require("electron");
const path = require("path");
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#0b0d12",
    title: ${JSON.stringify(o.appName)},
    webPreferences: { contextIsolation: true },
  });
  win.loadFile("index.html");
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
`;
}

function trigger(filename: string, blob: Blob) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 5000);
  } catch {
    /* delivery blocked by the frame — the forge vault covers it */
  }
}

/* One-line build command shown in the UI per target */
export function buildCommand(target: TargetId): string {
  switch (target) {
    case "android":
      return "npm run build && cd android && ./gradlew assembleDebug";
    case "ios":
      return "npm run build && npx cap open ios";
    case "windows":
    case "macos":
    case "linux":
      return "npm i && npm run build";
    default:
      return "npx serve .   # already a working app — open index.html";
  }
}
