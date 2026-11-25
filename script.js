(function(){
'use strict';
const $=id=>document.getElementById(id),API='https://api.github.com/users/';
const cache=new Map(),charts=[];let last='',busy=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtD=d=>new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const toast=m=>{const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2200)};

/* theme */
const root=document.documentElement;
try{const t=localStorage.getItem('ds-theme');if(t)root.dataset.theme=t}catch(e){}
$('theme').onclick=()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('ds-theme',root.dataset.theme)}catch(e){}if(last&&cache.has(last))draw(cache.get(last))};

/* api */
class AppError extends Error{constructor(i,t,m){super(m);this.i=i;this.t=t}}
async function get(url){
  let r;
  try{r=await fetch(url,{headers:{Accept:'application/vnd.github+json'}})}
  catch(e){throw new AppError('📡','Network problem','Could not reach GitHub. Check your internet connection and try again.')}
  if(r.status===404)throw new AppError('🔍','User not found','No GitHub profile exists with that username. Check the spelling and try again.');
  if(r.status===403||r.status===429){
    const reset=r.headers.get('x-ratelimit-reset');const mins=reset?Math.max(1,Math.ceil((reset*1000-Date.now())/60000)):null;
    throw new AppError('⏳','API rate limit reached','GitHub allows 60 requests per hour without a key.'+(mins?` Try again in about ${mins} minute${mins>1?'s':''}.`:' Please try again later.'))}
  if(!r.ok)throw new AppError('⚠️','Something went wrong',`GitHub returned an error (${r.status}). Please try again.`);
  return r.json();
}
async function load(name){
  const k=name.toLowerCase();if(cache.has(k))return cache.get(k);
  const [u,repos]=await Promise.all([get(API+encodeURIComponent(name)),get(API+encodeURIComponent(name)+'/repos?per_page=100&sort=updated&type=owner')]);
  const d={u,repos:repos.filter(r=>!r.fork||r.stargazers_count||r.forks_count)};d.all=repos;cache.set(k,d);return d;
}

/* analytics */
function analyze({u,all}){
  const stars=all.reduce((a,r)=>a+r.stargazers_count,0),forks=all.reduce((a,r)=>a+r.forks_count,0);
  const score=u.followers+stars+u.public_repos+forks;
  const lc={};all.forEach(r=>{if(r.language)lc[r.language]=(lc[r.language]||0)+1});
  const total=Object.values(lc).reduce((a,b)=>a+b,0);
  const langs=Object.entries(lc).sort((a,b)=>b[1]-a[1]).map(([n,c])=>({n,c,p:total?c/total*100:0}));
  const top=[...all].sort((a,b)=>b.stargazers_count-a.stargazers_count||b.forks_count-a.forks_count).slice(0,6);
  const years=(Date.now()-new Date(u.created_at))/31557600000;
  const level=score>=1000?3:score>=200?2:score>=50?1:0;
  return{stars,forks,score,langs,top,years,level,avg:all.length?stars/all.length:0};
}
const BADGES=['🌱 Beginner Builder','🚀 Active Developer','🔥 Open Source Explorer','⭐ Code Architect'];

/* render */
const skeleton=()=>`<div class="sk" style="height:190px"></div><div class="grid g5">${'<div class="sk" style="height:96px"></div>'.repeat(5)}</div><div class="grid g2"><div class="sk" style="height:320px"></div><div class="sk" style="height:320px"></div></div>`;
function showErr(e){
  const known=e instanceof AppError;
  $('state').innerHTML=`<div class="glass err fade"><div class="ic">${known?e.i:'⚠️'}</div><h3>${esc(known?e.t:'Unexpected error')}</h3><p>${esc(known?e.message:'Something unexpected happened. Please try again.')}</p></div>`;
  $('result').hidden=true;
}
function draw(d){
  const {u}=d,a=analyze(d);
  if(!d.all.length){
    $('report').innerHTML=profileHTML(u)+`<div class="glass panel fade"><h3>No public repositories yet</h3><p style="color:var(--mut);margin:0">${esc(u.login)} has no public repositories, so there is nothing to analyze beyond the profile.</p></div>`;
    $('result').hidden=false;return;
  }
  const stat=(n,l,dec)=>`<div class="glass stat"><b data-n="${n}" data-d="${dec||0}">0</b><span>${l}</span></div>`;
  $('report').innerHTML=profileHTML(u)+
  `<div class="grid g5 fade">${stat(d.all.length,'Total repositories')}${stat(a.stars,'Total stars')}${stat(a.forks,'Total forks')}${stat(a.avg,'Avg stars / repo',1)}${stat(a.years,'Account age (years)',1)}</div>
  <div class="glass panel fade"><h3>Developer Score</h3><div class="score"><div class="num grad" data-n="${a.score}" data-d="0">0</div><div class="badges">${BADGES.map((b,i)=>`<span class="badge ${i<=a.level?'on':'off'}">${b}</span>`).join('')}</div></div>
  <p style="color:var(--mut);margin:12px 0 0;font-size:.88rem">Score = followers (${u.followers}) + stars (${a.stars}) + repositories (${u.public_repos}) + forks (${a.forks}).</p></div>
  <div class="grid g2 fade"><div class="glass panel"><h3>Language distribution</h3>${a.langs.length?`<div class="chart"><canvas id="c1" aria-label="Language distribution chart" role="img"></canvas></div><ul class="langs">${a.langs.slice(0,8).map(l=>`<li><span>${esc(l.n)}${l===a.langs[0]?' ⭐ most used':''}</span><b>${l.p.toFixed(1)}%</b></li>`).join('')}</ul>`:'<p style="color:var(--mut)">No language data found.</p>'}</div>
  <div class="glass panel"><h3>Stars by top repository</h3><div class="chart"><canvas id="c2" aria-label="Stars per repository chart" role="img"></canvas></div></div></div>
  <div class="glass panel fade"><h3>Top repositories</h3><div class="grid g2" style="margin-top:0">${a.top.map(r=>`<article class="glass repo"><a href="${esc(r.html_url)}" target="_blank" rel="noopener">${esc(r.name)}</a><p>${esc(r.description||'No description provided.')}</p><div class="rm">${r.language?`<span class="tag">${esc(r.language)}</span>`:''}<span>⭐ ${r.stargazers_count}</span><span>🍴 ${r.forks_count}</span></div><div class="rm"><span>Created ${fmtD(r.created_at)}</span><span>Updated ${fmtD(r.pushed_at||r.updated_at)}</span></div></article>`).join('')}</div></div>`;
  $('result').hidden=false;
  counters();charts.splice(0).forEach(c=>c.destroy());
  if(window.Chart)makeCharts(a);
}
function profileHTML(u){
  return`<div class="glass profile fade"><img src="${esc(u.avatar_url)}&s=260" alt="${esc(u.login)} profile picture" width="130" height="130"><div><h2>${esc(u.name||u.login)}</h2><div class="handle">@${esc(u.login)}</div>${u.bio?`<p class="bio">${esc(u.bio)}</p>`:''}<div class="meta">${u.location?`<span>📍 ${esc(u.location)}</span>`:''}<span>📅 Joined ${fmtD(u.created_at)}</span><span>👥 ${u.followers} followers · ${u.following} following</span><span>📦 ${u.public_repos} repos</span><span>📝 ${u.public_gists} gists</span><a href="${esc(u.html_url)}" target="_blank" rel="noopener">View on GitHub ↗</a></div></div></div>`;
}
function counters(){
  document.querySelectorAll('[data-n]').forEach(el=>{
    const end=+el.dataset.n,dec=+el.dataset.d,t0=performance.now(),dur=matchMedia('(prefers-reduced-motion:reduce)').matches?0:900;
    (function tick(t){const p=dur?Math.min((t-t0)/dur,1):1,e=1-Math.pow(1-p,3);el.textContent=(end*e).toFixed(dec);if(p<1)requestAnimationFrame(tick)})(t0);
  });
}
function makeCharts(a){
  const cs=getComputedStyle(root),ink=cs.getPropertyValue('--mut').trim(),line=cs.getPropertyValue('--line').trim();
  const pal=['#3b82f6','#8b5cf6','#06b6d4','#ec4899','#f59e0b','#10b981','#6366f1','#f43f5e','#14b8a6'];
  Chart.defaults.color=ink;Chart.defaults.font.family='Inter,sans-serif';
  const c1=$('c1');if(c1){const L=a.langs.slice(0,8);charts.push(new Chart(c1,{type:'doughnut',data:{labels:L.map(l=>l.n),datasets:[{data:L.map(l=>l.c),backgroundColor:pal,borderColor:'transparent'}]},options:{maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom'}}}}))}
  const c2=$('c2');if(c2)charts.push(new Chart(c2,{type:'bar',data:{labels:a.top.map(r=>r.name.length>14?r.name.slice(0,13)+'…':r.name),datasets:[{label:'Stars',data:a.top.map(r=>r.stargazers_count),backgroundColor:'#8b5cf6',borderRadius:8}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{precision:0},grid:{color:line}}}}}));
}

/* run */
async function run(name){
  name=name.trim().replace(/^@/,'');
  if(busy)return;
  if(!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(name))return showErr(new AppError('🔍','Invalid username','GitHub usernames use letters, numbers and single hyphens, up to 39 characters.'));
  busy=true;$('go').disabled=true;$('go').textContent='Analyzing…';
  $('result').hidden=true;$('state').innerHTML=`<div class="fade" style="display:grid;gap:16px">${skeleton()}</div>`;
  try{const d=await load(name);last=d.u.login.toLowerCase();cache.set(last,d);$('state').innerHTML='';draw(d);
    history.replaceState(null,'','?user='+encodeURIComponent(d.u.login));$('result').scrollIntoView({behavior:'smooth',block:'start'})}
  catch(e){showErr(e)}
  finally{busy=false;$('go').disabled=false;$('go').textContent='Analyze'}
}
$('form').addEventListener('submit',e=>{e.preventDefault();run($('user').value)});

/* share / copy / export */
const link=()=>cache.get(last)?.u.html_url||'';
const shareUrl=()=>location.origin+location.pathname+'?user='+encodeURIComponent(cache.get(last)?.u.login||'');
async function copyText(t,m){try{await navigator.clipboard.writeText(t);toast(m)}catch(e){const i=document.createElement('input');i.value=t;document.body.appendChild(i);i.select();document.execCommand('copy');i.remove();toast(m)}}
$('copy').onclick=()=>link()&&copyText(link(),'Profile link copied');
$('share').onclick=async()=>{const d=cache.get(last);if(!d)return;const a=analyze(d);
  const data={title:'DevScope AI',text:`${d.u.login} on DevScope AI: score ${a.score}, ${a.stars} stars, top language ${a.langs[0]?.n||'n/a'}.`,url:shareUrl()};
  if(navigator.share){try{await navigator.share(data)}catch(e){}}else copyText(`${data.text} ${data.url}`,'Analysis link copied')};
$('png').onclick=async()=>{
  if(!window.html2canvas)return toast('Export library failed to load');
  toast('Preparing image…');
  try{const c=await html2canvas($('report'),{backgroundColor:getComputedStyle(root).getPropertyValue('--bg').trim(),scale:2,useCORS:true});
    const a=document.createElement('a');a.download=`devscope-${last}.png`;a.href=c.toDataURL('image/png');a.click();toast('Image saved')}
  catch(e){toast('Could not export image')}};

const q=new URLSearchParams(location.search).get('user');
if(q){$('user').value=q;run(q)}
})();
