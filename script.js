
// ════════════════════════════════════════════════
//  PIXEL ORACLE — 4~8초 Reveal
// ════════════════════════════════════════════════
const REVEAL_STEPS = [
  {t:0,    status:"INITIALIZING",      msg:"SIGNAL DETECTED",             eye:"◉", pct:0,  glitch:false},
  {t:900,  status:"SCANNING",          msg:"READING EMOTIONAL STATIC...", eye:"◈", pct:22, glitch:false},
  {t:2200, status:"PATTERN FOUND",     msg:"UNRESOLVED ENERGY FOUND...",  eye:"◉", pct:48, glitch:true },
  {t:3800, status:"FANDOM RESONANCE",  msg:"MATCHING RESONANCE...",       eye:"💜", pct:72, glitch:false},
  {t:5200, status:"ACCESS GRANTED",    msg:"◉ SIGNAL READY",             eye:"✦", pct:96, glitch:false},
];
const PX_SYMBOLS = ['◉','◈','✦','░','▒','▓','◌','▪','⚡','∷','⬡'];
let _revTimers = [], _revCb = null, _revCanSkip = false;

function startReveal(onComplete) {
  _revCb = onComplete;
  _revTimers.forEach(clearTimeout); _revTimers = [];
  _revCanSkip = false;

  const ov  = document.getElementById('revealOverlay');
  const eye = document.getElementById('revealEye');
  const sts = document.getElementById('revealStatus');
  const msg = document.getElementById('revealMsg');
  const bar = document.getElementById('revealBar');
  const pxc = document.getElementById('revealPxContainer');

  if (pxc) {
    pxc.innerHTML = '';
    for (let i = 0; i < 22; i++) {
      const d = document.createElement('div');
      d.className = 'reveal-px';
      d.textContent = PX_SYMBOLS[Math.floor(Math.random() * PX_SYMBOLS.length)];
      d.style.cssText = `left:${Math.random()*94}%;top:${Math.random()*94}%;animation-delay:${(Math.random()*2).toFixed(1)}s`;
      pxc.appendChild(d);
    }
  }
  bar.style.transition='none'; bar.style.width='0%';
  eye.textContent='◉'; eye.classList.remove('glitch');
  ov.classList.add('active');
  document.body.style.overflow='hidden';

  REVEAL_STEPS.forEach(step => {
    _revTimers.push(setTimeout(() => {
      eye.textContent = step.eye;
      sts.textContent = step.status;
      msg.textContent = step.msg;
      bar.style.transition='width .35s ease';
      bar.style.width = step.pct+'%';
      if(step.glitch) eye.classList.add('glitch');
      else eye.classList.remove('glitch');
    }, step.t));
  });

  _revTimers.push(setTimeout(() => { _revCanSkip = true; }, 1500));
  _revTimers.push(setTimeout(finishReveal, 6500));
}

function finishReveal() {
  _revTimers.forEach(clearTimeout); _revTimers = [];
  const ov = document.getElementById('revealOverlay');
  ov.classList.remove('active');
  document.body.style.overflow='';
  if (_revCb) { _revCb(); _revCb = null; }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('revealOverlay')?.addEventListener('click', () => {
    if (_revCanSkip) finishReveal();
  });
});

// ════════════════════════════════════════════════
//  OPENING SOON
// ════════════════════════════════════════════════
function showOpeningSoon() {
  document.getElementById('openingSoonModal').classList.add('open');
}
function hideOpeningSoon() {
  document.getElementById('openingSoonModal').classList.remove('open');
}

// ════════════════════════════════════════════════
//  renderDetail 패치 — ◉ 섹션 인식 + JSON 지원
// ════════════════════════════════════════════════
(function patchRenderDetail() {
  function renderBodyText(body) {
    const lines=(body||'').trim().split('\n');
    let h='',buf=[];
    lines.forEach(line=>{
      const tr=line.trim();
      if(!tr){
        if(buf.length){
          const j=buf.join(' ');
          h+=buf.length===1&&j.length<55
            ?`<span class="detail-hook">${j}</span>`
            :`<p class="detail-para">${j}</p>`;
          buf=[];
        }
      } else buf.push(tr);
    });
    if(buf.length){const j=buf.join(' ');h+=buf.length===1&&j.length<55?`<span class="detail-hook">${j}</span>`:`<p class="detail-para">${j}</p>`;}
    return h;
  }

  window.renderDetail = function(data, containerId) {
    const el=document.getElementById(containerId);
    if(!el) return;
    if(!data){el.innerHTML='';return;}

    // JSON 구조
    if(typeof data==='object'&&data!==null&&!data._plainText){
      let h='';
      if(data.headline) h+=`<div class="detail-hook" style="font-size:16px;margin-bottom:13px;line-height:1.6">${data.headline}</div>`;
      if(data.shortLines?.length){h+='<div class="short-lines">';data.shortLines.forEach(l=>h+=`<div class="short-line">${l}</div>`);h+='</div>';}
      if(data.sections?.length){data.sections.forEach(sec=>{if(!sec.body)return;h+=`<div class="detail-section"><span class="detail-sec-title">${sec.title||''}</span><div class="detail-sec-body">${renderBodyText(sec.body)}</div></div>`;});}
      if(data.shareLine) h+=`<div class="share-line-box" onclick="copyShareLine(this)" title="탭해서 복사">${data.shareLine}</div>`;
      if(data.cliffhanger) h+=`<div class="cliffhanger">${data.cliffhanger}</div>`;
      el.innerHTML=h; return;
    }

    // Plain text — ✦ 및 ◉ 모두 인식
    const text=data._plainText||(typeof data==='string'?data:'');
    if(!text){el.innerHTML='';return;}
    const lines=text.split('\n');
    let h='',curSec=null,curBody='';
    const flush=()=>{
      if(!curSec)return;
      h+=`<div class="detail-section"><span class="detail-sec-title">${curSec}</span><div class="detail-sec-body">${renderBodyText(curBody)}</div></div>`;
      curBody='';
    };
    lines.forEach(line=>{
      const tr=line.trim();
      if(tr.startsWith('✦')||tr.startsWith('◉')||/^\d+\.\s*[✦◉]/.test(tr)){flush();curSec=tr.replace(/^\d+\.\s*/,'');}
      else curBody+=line+'\n';
    });
    flush();
    el.innerHTML=h;
  };
})();

function copyShareLine(el){
  const text=el.textContent||el.innerText;
  if(navigator.clipboard) navigator.clipboard.writeText(text).then(()=>{
    const o=el.style.background; el.style.background='rgba(168,85,247,.25)';
    setTimeout(()=>el.style.background=o,600);
  });
}


// ════════════════════════════════════════════════
//  SIGNAL ROOM FANDOM UX — Sync / Scene / Archive / Streak
// ════════════════════════════════════════════════
function srEscape(v){return String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
function srToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function srShortDate(date){const p=(date||srToday()).split('-');return p.length===3?`${p[1]}.${p[2]}`:date;}
function srHash(str){let h=2166136261;for(let i=0;i<String(str).length;i++){h^=String(str).charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function srPick(arr, seed, salt=0){if(!arr||!arr.length)return'';return arr[((seed + salt*2654435761)>>>0)%arr.length];}
function buildFallbackFandomData(data){
  const top=data?.idolMatches?.[0]?.name||'최애';
  const seed=srHash([top,data?.selectedGroup,data?.title,srToday()].join('|'));
  const scenes=[
    `${top}에게 끌리는 이유는 처음부터 크게 터지는 장면보다 다시 보게 되는 작은 결에 있어.`,
    `${top}와 매치된 포인트는 화려함보다 오래 남는 분위기 쪽에 가까워.`,
    `${top}의 에너지가 내 취향의 빈칸을 건드려서, 한 번 보고 넘기기 어려운 매치야.`,
    `${top}에게서 잡히는 거리감과 온도가 내 반응 포인트와 맞물려 있어.`,
    `${top}를 다시 보게 되는 이유는 장면보다 사람이 먼저 기억나는 쪽이라서야.`
  ];
  const fanEnergy=[
    '가까워진다기보다, 이상하게 계속 확인하게 되는 흐름.',
    '팬심이 크게 터지기보다 조용히 오래 남는 타입.',
    '한 번 보고 넘기기보다 저장한 뒤 다시 보는 쪽에 가까움.',
    '말로 설명하기 전 이미 손이 캡처로 가는 흐름.'
  ];
  const levels=['OPEN','ACTIVE','LOCKED','INTENSE'];
  const tones=['Midnight Glow','Soft Static','Quiet Intensity','Afterstage Blue','Velvet Pulse'];
  const moods=['Ending Scene','Quiet Focus','Soft Tension','Camera-off Mood','Replay Moment'];
  const focus=['Eyes','Pause','Smile Fade','Side Glance','Ending Glance'];
  return {
    syncLevel:data?.syncLevel||srPick(levels,seed,1),
    todayScene:data?.todayScene||{title:srPick(scenes,seed,2), sub:srPick(fanEnergy,seed,3)},
    fanEnergy:data?.fanEnergy||srPick(fanEnergy,seed,4),
    biasProfile:data?.biasProfile||{auraTone:srPick(tones,seed,5), stageMood:srPick(moods,seed,6), fanEnergy:srPick(['Slow Burn','Save Energy','Soft Pull','Replay Mood'],seed,7), focusSignal:srPick(focus,seed,8)}
  };
}
function renderFandomExperience(data){
  const built=buildFallbackFandomData(data||{});
  const level=built.syncLevel||'ACTIVE';
  const order=['LOW','OPEN','ACTIVE','LOCKED','INTENSE'];
  const active=Math.max(1,order.indexOf(level)+1);
  const sync=document.getElementById('syncLevelBox');
  if(sync){sync.innerHTML=`<div class="fandom-kicker">SYNC LEVEL</div><div class="sync-level-row"><div class="sync-level-name">${srEscape(level)}</div><div class="sync-orbs">${order.map((_,i)=>`<span class="sync-orb ${i<active?'on':''}"></span>`).join('')}</div></div><div class="scene-sub">퍼센트가 아니라 오늘 팬심이 반응하는 강도.</div>`;}
  const scene=document.getElementById('todaySceneBox');
  if(scene){scene.innerHTML=`<div class="fandom-kicker">SIGNAL MATCH</div><div class="scene-line">${srEscape(built.todayScene.title||'')}</div><div class="scene-sub">${srEscape(built.todayScene.sub||built.fanEnergy||'')}</div>`;}
  const profile=document.getElementById('biasProfileBox');
  if(profile){const bp=built.biasProfile||{};profile.innerHTML=`<div class="fandom-kicker">BIAS PROFILE</div><div class="profile-grid"><div class="profile-item"><div class="profile-label">Aura Tone</div><div class="profile-value">${srEscape(bp.auraTone)}</div></div><div class="profile-item"><div class="profile-label">Stage Mood</div><div class="profile-value">${srEscape(bp.stageMood)}</div></div><div class="profile-item"><div class="profile-label">Fan Energy</div><div class="profile-value">${srEscape(bp.fanEnergy)}</div></div><div class="profile-item"><div class="profile-label">Focus Signal</div><div class="profile-value">${srEscape(bp.focusSignal)}</div></div></div>`;}
  updateSignalStreak();
  saveSignalArchive(data,built);
  renderSignalArchive();
}
function updateSignalStreak(){
  const today=srToday();
  const box=document.getElementById('streakBox');
  let obj={last:null,count:0};
  try{obj=JSON.parse(localStorage.getItem('signal_room_streak')||'{}')||obj;}catch(e){}
  if(obj.last!==today){
    const y=new Date(Date.now()-86400000);const yesterday=`${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;
    obj.count=(obj.last===yesterday)?(Number(obj.count||0)+1):1;
    obj.last=today;
    localStorage.setItem('signal_room_streak',JSON.stringify(obj));
  }
  if(box){box.innerHTML=`<div class="fandom-kicker">SIGNAL STREAK</div><div class="streak-days">${Number(obj.count||1)} DAYS</div><div class="streak-sub">매일 다른 최애 장면을 확인하는 중. 출석 보상보다, 팬심 기록에 가까움.</div>`;}
}
function saveSignalArchive(data,built){
  const top=data?.idolMatches?.[0]?.name||data?.selectedGroup||'FANDOM';
  const item={date:srToday(),idol:top,level:built.syncLevel||'ACTIVE',scene:(data?.shareLine||built.todayScene?.title||data?.title||'SIGNAL MATCH').replace(/\n/g,' ')};
  let arr=[];try{arr=JSON.parse(localStorage.getItem('signal_room_archive')||'[]')||[];}catch(e){}
  arr=arr.filter(x=>!(x.date===item.date&&x.idol===item.idol));
  arr.unshift(item);
  localStorage.setItem('signal_room_archive',JSON.stringify(arr.slice(0,14)));
}
function renderSignalArchive(){
  const box=document.getElementById('signalArchiveBox'); if(!box)return;
  let arr=[];try{arr=JSON.parse(localStorage.getItem('signal_room_archive')||'[]')||[];}catch(e){}
  if(!arr.length){box.innerHTML='';return;}
  box.innerHTML=`<div class="fandom-kicker">SIGNAL ARCHIVE</div><div class="archive-list">${arr.slice(0,5).map(x=>`<div class="archive-item"><span class="archive-scene">${srShortDate(x.date)} · ${srEscape(x.idol)} · ${srEscape(x.scene)}</span><span class="archive-level">${srEscape(x.level)}</span></div>`).join('')}</div>`;
}

// ════════════════════════════════════════════════
//  SHARE CARDS — 팬 시그널 / 아이돌
// ════════════════════════════════════════════════
function _pxStars(ctx, W, H, seed, color) {
  const r=parseInt((color||'#a855f7').slice(1,3),16)||168;
  const g=parseInt((color||'#a855f7').slice(3,5),16)||85;
  const b=parseInt((color||'#a855f7').slice(5,7),16)||247;
  for(let i=0;i<40;i++){
    const sx=((seed*i*127+i*431)%W+W)%W;
    const sy=((seed*i*89+i*223)%H+H)%H;
    ctx.fillStyle=`rgba(${r},${g},${b},${.06+((seed*i*7)%5)*.06})`;
    ctx.fillRect(sx,sy,1,1);
  }
}
function _pxGrid(ctx, W, H, color) {
  ctx.strokeStyle=(color||'rgba(168,85,247,.04)'); ctx.lineWidth=1;
  for(let x=0;x<W;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
}
function _pxDiv(ctx, W, y, color) {
  ctx.fillStyle=color||'rgba(168,85,247,.25)';
  for(let x=W/2-65;x<W/2+65;x+=4) ctx.fillRect(x,y,2,1);
}
function _wrapText(ctx, text, maxW) {
  const words=(text||'').split(' ');let lines=[],cur='';
  words.forEach(w=>{const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}else cur=t;});
  if(cur)lines.push(cur); return lines;
}

function drawSajuCard(shareLine, title) {
  const wrap=document.getElementById('sajuShareWrap');
  const canvas=document.getElementById('sajuShareCanvas');
  if(!wrap||!canvas) return;
  const dpr=window.devicePixelRatio||1,W=360,H=400;
  canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#04000e');g.addColorStop(.5,'#0a0018');g.addColorStop(1,'#04000e');
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(0,0,W,H,20);ctx.fill();
  _pxGrid(ctx,W,H,'rgba(168,85,247,.03)');
  const gw=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,160);
  gw.addColorStop(0,'rgba(168,85,247,.18)');gw.addColorStop(1,'rgba(168,85,247,0)');
  ctx.fillStyle=gw;ctx.fillRect(0,0,W,H);
  _pxStars(ctx,W,H,(shareLine||'').length*31,'#a855f7');
  ctx.textAlign='center';
  ctx.font='bold 9px "Courier New"';ctx.fillStyle='rgba(168,85,247,.55)';ctx.letterSpacing='3px';
  ctx.fillText('SIGNAL ROOM',W/2,28);ctx.letterSpacing='0px';
  ctx.font='bold 8px "Courier New"';ctx.fillStyle='rgba(236,72,153,.45)';ctx.letterSpacing='2px';
  ctx.fillText('◉ SIGNAL DETECTED',W/2,46);ctx.letterSpacing='0px';
  _pxDiv(ctx,W,57,'rgba(168,85,247,.2)');
  ctx.font='bold 17px Inter,sans-serif';ctx.fillStyle='#fff';
  const lines=_wrapText(ctx,shareLine||title||'',W-60);
  const startY=H/2-(lines.length*26)/2+8;
  lines.forEach((l,i)=>ctx.fillText(l,W/2,startY+i*26));
  _pxDiv(ctx,W,H-52,'rgba(168,85,247,.2)');
  ctx.font='bold 8px "Courier New"';ctx.fillStyle='rgba(168,85,247,.4)';ctx.letterSpacing='2px';
  ctx.fillText('SIGNAL DETECTED',W/2,H-36);ctx.letterSpacing='0px';
  ctx.font='9px "Courier New"';ctx.fillStyle='rgba(255,255,255,.18)';
  ctx.fillText('sajustro.com',W/2,H-18);
  wrap.style.display='block';
}

function drawIdolCard(title, highlight, fd) {
  const wrap=document.getElementById('idolShareWrap');
  const canvas=document.getElementById('idolShareCanvas');
  if(!wrap||!canvas) return;
  fd = fd||{fandom:'',color:'#a855f7',grad:['#060010','#0e0020']};
  const dpr=window.devicePixelRatio||1,W=360,H=440;
  canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,fd.grad[0]);g.addColorStop(.5,fd.grad[1]);g.addColorStop(1,fd.grad[0]);
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(0,0,W,H,20);ctx.fill();
  _pxGrid(ctx,W,H,fd.color+'18');
  const r=parseInt((fd.color).slice(1,3),16)||168;
  const gg=parseInt((fd.color).slice(3,5),16)||85;
  const b=parseInt((fd.color).slice(5,7),16)||247;
  const gw=ctx.createRadialGradient(W/2,H*.4,0,W/2,H*.4,170);
  gw.addColorStop(0,`rgba(${r},${gg},${b},.22)`);gw.addColorStop(1,`rgba(${r},${gg},${b},0)`);
  ctx.fillStyle=gw;ctx.fillRect(0,0,W,H);
  _pxStars(ctx,W,H,(title||'').length*37,fd.color);
  ctx.textAlign='center';
  ctx.font='bold 9px "Courier New"';ctx.fillStyle=`rgba(${r},${gg},${b},.6)`;ctx.letterSpacing='3px';
  ctx.fillText('SIGNAL ROOM',W/2,28);ctx.letterSpacing='0px';
  if(fd.fandom){ctx.font='bold 8px "Courier New"';ctx.fillStyle=`rgba(${r},${gg},${b},.45)`;ctx.letterSpacing='2px';ctx.fillText(fd.fandom+' SIGNAL',W/2,46);ctx.letterSpacing='0px';}
  _pxDiv(ctx,W,58,`rgba(${r},${gg},${b},.25)`);
  ctx.font='bold 17px Inter,sans-serif';ctx.fillStyle='#fff';
  const tlines=_wrapText(ctx,title||'',W-60);
  let y=76;tlines.forEach(l=>{ctx.fillText(l,W/2,y);y+=25;});y+=8;
  if(highlight){
    ctx.font='bold 8px "Courier New"';ctx.fillStyle=`rgba(${r},${gg},${b},.5)`;ctx.letterSpacing='2px';
    ctx.fillText('TOP MATCH',W/2,y);ctx.letterSpacing='0px';y+=16;
    ctx.font='bold 13px Inter,sans-serif';ctx.fillStyle='rgba(255,255,255,.8)';
    const hlines=_wrapText(ctx,highlight,W-80);
    hlines.slice(0,2).forEach(l=>{ctx.fillText(l,W/2,y);y+=20;});
  }
  _pxDiv(ctx,W,H-52,`rgba(${r},${gg},${b},.25)`);
  ctx.font='bold 8px "Courier New"';ctx.fillStyle=`rgba(${r},${gg},${b},.4)`;ctx.letterSpacing='2px';
  ctx.fillText(fd.fandom?fd.fandom+' RESONANCE':'SIGNAL DETECTED',W/2,H-36);ctx.letterSpacing='0px';
  ctx.font='9px "Courier New"';ctx.fillStyle='rgba(255,255,255,.18)';
  ctx.fillText('sajustro.com',W/2,H-18);
  wrap.style.display='block';
}

async function _shareCanvas(canvas, filename) {
  if(navigator.share&&navigator.canShare){
    canvas.toBlob(async blob=>{
      const file=new File([blob],filename,{type:'image/png'});
      if(navigator.canShare({files:[file]})){
        try{await navigator.share({files:[file],title:'SIGNAL ROOM'});return;}catch(e){if(e.name==='AbortError')return;}
      }
      _dlCanvas(canvas,filename);
    },'image/png');
  } else _dlCanvas(canvas,filename);
}
function _dlCanvas(canvas,name){const a=document.createElement('a');a.download=name;a.href=canvas.toDataURL('image/png');a.click();}
async function shareSajuCard(){await _shareCanvas(document.getElementById('sajuShareCanvas'),'sajustro-signal.png');}
async function shareIdolCard(){await _shareCanvas(document.getElementById('idolShareCanvas'),'sajustro-idol.png');}
