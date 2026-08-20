/* Generates a REAL, runnable Windows desktop app file (.hta).
   HTA = HTML Application — executed natively by Windows (mshta.exe) as a
   windowed program with no browser chrome and no installation. The generated
   code is ES5/IE11-engine compatible so it renders correctly when double-clicked. */

import type { SourceProfile } from "./engine";
import { slugify } from "./engine";

export interface HtaOpts {
  appName: string;
  profile: SourceProfile;
  accent: string;
}

const B = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/";

const CATALOG = [
  { t: "Big Buck Bunny", g: "Animation", y: 2008, m: "10 min", src: B + "BigBuckBunny.mp4", img: B + "images/BigBuckBunny.jpg", d: "A gentle giant of a rabbit wakes to a beautiful morning — until three bullying rodents pick the wrong target. A loving homage to classic cartoons, rendered in open-source Blender." },
  { t: "Sintel", g: "Fantasy", y: 2010, m: "15 min", src: B + "Sintel.mp4", img: B + "images/Sintel.jpg", d: "A lone warrior girl crosses mountains and deserts hunting for the baby dragon she rescued and lost. The Blender Foundation's third open movie — bittersweet, gorgeous, unforgettable." },
  { t: "Tears of Steel", g: "Sci-Fi", y: 2012, m: "12 min", src: B + "TearsOfSteel.mp4", img: B + "images/TearsOfSteel.jpg", d: "Forty years after a heartbreak in Amsterdam, a group of scientists stages a desperate simulation to save the world from vengeful machines. Live action meets open-source VFX." },
  { t: "Elephants Dream", g: "Sci-Fi", y: 2006, m: "11 min", src: B + "ElephantsDream.mp4", img: B + "images/ElephantsDream.jpg", d: "Inside an infinite, self-operating machine, the elder Proog tries to show the young Emo its wonders — but Emo sees something else entirely. The world's first open movie." },
  { t: "For Bigger Blazes", g: "Action", y: 2013, m: "1 min", src: B + "ForBiggerBlazes.mp4", img: B + "images/ForBiggerBlazes.jpg", d: "Fire, ice and a screen that makes everything bigger. A high-energy sample reel cut for the big screen." },
  { t: "For Bigger Escapes", g: "Adventure", y: 2013, m: "1 min", src: B + "ForBiggerEscapes.mp4", img: B + "images/ForBiggerEscapes.jpg", d: "Pack the car, ditch the map. A road-trip montage about the places screens can almost take you." },
  { t: "For Bigger Fun", g: "Comedy", y: 2013, m: "1 min", src: B + "ForBiggerFun.mp4", img: B + "images/ForBiggerFun.jpg", d: "Couch, friends, snacks, repeat. A tiny film about the enormous business of doing absolutely nothing." },
  { t: "For Bigger Joyrides", g: "Adventure", y: 2013, m: "1 min", src: B + "ForBiggerJoyrides.mp4", img: B + "images/ForBiggerJoyrides.jpg", d: "Two wheels, one coastline, zero plans. A joyride that asks nothing of you except that you hold on." },
];

export function buildHta(o: HtaOpts): string {
  const app = o.appName || "NetStream";
  const accent = o.accent || "#e50914";
  const catalog = JSON.stringify(CATALOG);
  const source = o.profile ? o.profile.url : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<hta:application applicationname="${app}" border="thin" caption="yes" maximizebutton="yes" minimizebutton="yes" scroll="no" selection="no" singleinstance="yes" sysmenu="yes" windowstate="normal" navigable="yes"/>
<title>${app}</title>
<style>
html,body{margin:0;padding:0;height:100%;}
body{background:#0b0d12;color:#eef1f7;font-family:"Segoe UI",Tahoma,Arial,sans-serif;scrollbar-base-color:#12151d;}
.top{position:relative;padding:18px 28px;border-bottom:1px solid #1d2230;background:#0e1118;}
.top.slim{padding:12px 28px;}
.logo{display:inline-block;font-size:24px;font-weight:700;letter-spacing:.5px;}
.logo.small{font-size:15px;margin-left:18px;color:#8b93a7;font-weight:400;}
.mark{color:${accent};margin-right:6px;}
.search{position:absolute;right:28px;top:16px;width:260px;background:#12151d;border:1px solid #232838;color:#eef1f7;padding:9px 12px;font-size:14px;outline:none;}
.search:focus{border-color:${accent};}
.tag{position:absolute;right:304px;top:25px;color:#8b93a7;font-size:12px;}
.wrap{padding:26px 28px 60px;}
.sec{font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8b93a7;margin:0 0 16px;}
.card{display:inline-block;width:215px;margin:0 18px 24px 0;vertical-align:top;cursor:pointer;}
.thumb{height:121px;background-color:#12151d;background-size:cover;background-position:center;position:relative;border:1px solid #232838;}
.card:hover .thumb{border-color:${accent};}
.dur{position:absolute;right:6px;bottom:6px;background:rgba(0,0,0,.78);color:#fff;font-size:11px;padding:2px 6px;}
.big{position:absolute;left:50%;top:50%;margin:-17px 0 0 -17px;width:34px;height:34px;line-height:34px;text-align:center;background:${accent};color:#fff;font-size:14px;display:none;border-radius:50%;}
.card:hover .big{display:block;}
.ct{font-size:14px;font-weight:600;margin-top:8px;white-space:nowrap;overflow:hidden;}
.cs{font-size:12px;color:#8b93a7;margin-top:2px;}
.empty{color:#8b93a7;padding:40px 0;}
.foot{margin-top:40px;color:#5d6680;font-size:12px;border-top:1px solid #1d2230;padding-top:16px;line-height:1.6;}
.back{background:none;border:1px solid #232838;color:#eef1f7;padding:7px 14px;cursor:pointer;font-size:13px;}
.back:hover{border-color:${accent};color:${accent};}
.stage{position:relative;background:#000;height:520px;}
.stage video{width:100%;height:100%;display:block;}
.ctrl{position:absolute;left:0;right:0;bottom:0;background:rgba(10,12,17,.9);padding:12px 18px;text-align:center;}
.ctrl button{background:#12151d;border:1px solid #232838;color:#eef1f7;min-width:36px;padding:6px 9px;margin:0 3px;cursor:pointer;font-size:13px;}
.ctrl button:hover{border-color:${accent};color:${accent};}
#seek{width:330px;vertical-align:middle;margin:0 10px;}
#vol{width:90px;vertical-align:middle;margin:0 6px;}
#cur,#dur{color:#8b93a7;font-size:12px;vertical-align:middle;}
.desc{color:#c6ccdb;line-height:1.65;max-width:780px;font-size:14px;}
.hint{color:#5d6680;font-size:12px;margin-top:14px;}
</style>
</head>
<body>
<div id="app"></div>
<script>
var APP = ${JSON.stringify(app)};
var CATALOG = ${catalog};
var idx = 0;
var vid = null;

function $(id){ return document.getElementById(id); }

function homeHtml(){
  return '<div class="top">' +
    '<div class="logo"><span class="mark">&#9654;</span>' + APP + '</div>' +
    '<span class="tag">offline library &middot; ' + CATALOG.length + ' films</span>' +
    '<input id="q" class="search" placeholder="Search titles..." onkeyup="cards(false)" />' +
  '</div>' +
  '<div class="wrap"><div class="sec">Trending now</div><div id="grid"></div>' +
  '<div class="foot">' + APP + ' &middot; desktop app cloned from ${source} by CloneForge<br>' +
  'Sample films &copy; Blender Foundation / Google &middot; space = play/pause, arrows = seek</div></div>';
}

function playerHtml(i){
  var it = CATALOG[i];
  return '<div class="top slim"><button class="back" onclick="goHome()">&larr; Library</button>' +
  '<div class="logo small"><span class="mark">&#9654;</span>' + APP + '</div></div>' +
  '<div class="stage"><video id="vid" src="' + it.src + '" poster="' + it.img + '" autoplay></video>' +
  '<div class="ctrl">' +
    '<button id="pp" onclick="togglePlay()" title="Play / pause">||</button>' +
    '<span id="cur">0:00</span>' +
    '<input id="seek" type="range" min="0" max="1000" value="0" oninput="seekTo(this.value)" />' +
    '<span id="dur">0:00</span>' +
    '<button onclick="step(-1)" title="Previous">&laquo;</button>' +
    '<button onclick="step(1)" title="Next">&raquo;</button>' +
    '<button id="mute" onclick="toggleMute()" title="Mute">&#9835;</button>' +
    '<input id="vol" type="range" min="0" max="100" value="100" oninput="setVol(this.value)" />' +
    '<button onclick="goFull()" title="Fullscreen">FULL</button>' +
  '</div></div>' +
  '<div class="wrap"><div class="sec">About this title</div><p class="desc">' + it.d + '</p>' +
  '<div class="sec" style="margin-top:26px;">More like this</div><div id="grid"></div></div>';
}

function cards(more){
  var q = $('q') ? $('q').value.toLowerCase() : '';
  var html = '';
  for (var i = 0; i < CATALOG.length; i++){
    if (more && i === idx) continue;
    var it = CATALOG[i];
    if (!more && q && (it.t + ' ' + it.g).toLowerCase().indexOf(q) === -1) continue;
    html += '<div class="card" onclick="openItem(' + i + ')">' +
      '<div class="thumb" style="background-image:url(' + it.img + ')"><span class="dur">' + it.m + '</span><span class="big">&#9654;</span></div>' +
      '<div class="ct">' + it.t + '</div><div class="cs">' + it.g + ' &middot; ' + it.y + '</div></div>';
  }
  if (!html) html = '<div class="empty">No matches.</div>';
  $('grid').innerHTML = html;
}

function goHome(){
  $('app').innerHTML = homeHtml();
  vid = null;
  cards(false);
  window.scrollTo(0, 0);
}

function openItem(i){
  idx = i;
  $('app').innerHTML = playerHtml(i);
  vid = $('vid');
  vid.onplay = function(){ $('pp').innerHTML = '||'; };
  vid.onpause = function(){ $('pp').innerHTML = '&#9654;'; };
  vid.ontimeupdate = function(){
    if (!vid.duration) return;
    $('cur').innerHTML = fmt(vid.currentTime);
    $('dur').innerHTML = fmt(vid.duration);
    $('seek').value = Math.round(1000 * vid.currentTime / vid.duration);
  };
  vid.onended = function(){ step(1); };
  cards(true);
  window.scrollTo(0, 0);
}

function togglePlay(){ if (!vid) return; if (vid.paused) vid.play(); else vid.pause(); }
function seekTo(v){ if (vid && vid.duration) vid.currentTime = vid.duration * v / 1000; }
function setVol(v){ if (vid){ vid.volume = v / 100; vid.muted = (v == 0); } }
function toggleMute(){ if (!vid) return; vid.muted = !vid.muted; $('mute').innerHTML = vid.muted ? '&times;' : '&#9835;'; }
function goFull(){
  var v = $('vid');
  if (!v) return;
  if (v.msRequestFullscreen) v.msRequestFullscreen();
  else if (v.requestFullscreen) v.requestFullscreen();
}
function step(d){ openItem((idx + d + CATALOG.length) % CATALOG.length); }
function fmt(s){
  s = Math.floor(s || 0);
  var m = Math.floor(s / 60);
  var r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
}

document.onkeydown = function(e){
  e = e || window.event;
  if (!vid) return;
  var tag = (e.srcElement && e.srcElement.tagName) || '';
  if (tag === 'INPUT') return;
  if (e.keyCode === 32){ if (e.preventDefault) e.preventDefault(); else e.returnValue = false; togglePlay(); }
  if (e.keyCode === 37) vid.currentTime = Math.max(0, vid.currentTime - 10);
  if (e.keyCode === 39 && vid.duration) vid.currentTime = Math.min(vid.duration, vid.currentTime + 10);
};

window.onload = function(){
  try {
    window.resizeTo(1180, 780);
    window.moveTo(Math.max(0, (screen.availWidth - 1180) / 2), Math.max(0, (screen.availHeight - 780) / 2));
  } catch(e){}
  document.title = APP;
  goHome();
};
</script>
</body>
</html>`;
}

export function downloadHta(o: HtaOpts) {
  const blob = new Blob([buildHta(o)], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${slugify(o.appName)}.hta`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
