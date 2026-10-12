/* PLAYROOM 2.0: game feel overhaul and additional automated-testable game engines. */
(() => {
  const cards=[...document.querySelectorAll('.game-card')];
  const search=document.querySelector('#game-search');
  const count=document.querySelector('#count');
  const empty=document.querySelector('#no-results');
  function applyFilters(){
    const active=document.querySelector('.filter.active');const filter=active?.dataset.filter||'all',q=(search.value||'').trim().toLowerCase();
    let visible=0;cards.forEach(card=>{const match=(filter==='all'||card.dataset.category===filter)&&card.textContent.toLowerCase().includes(q);card.hidden=!match;if(match)visible++});
    count.textContent=String(visible);empty.hidden=visible!==0;
  }
  search.addEventListener('input',applyFilters);
  document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(f=>f.classList.toggle('active',f===btn));applyFilters()}));
  document.getElementById('fullscreen-btn').addEventListener('click',()=>{let modal=document.querySelector('.modal-panel');if(document.fullscreenElement)document.exitFullscreen?.();else modal.requestFullscreen?.().catch(()=>{})});
  document.addEventListener('fullscreenchange',()=>{document.querySelector('#fullscreen-btn').textContent=document.fullscreenElement?'⤡':'⛶'});
})();
// Original game IDs deliberately retained for the existing 30-card collection.
// No commercial source code or media is copied into this project.
function driftGame(){
  const STORE='playroom-drift-economy-v2';
  const CARS=[{id:'starter',name:'Starter',price:0,color:'#ff6e7e',grip:1,safety:0,emoji:'🚗'},
    {id:'taxi',name:'City Taxi',price:120,color:'#ffd071',grip:1.14,safety:5,emoji:'🚕'},
    {id:'sport',name:'Sport Coupe',price:280,color:'#7dd5ff',grip:1.25,safety:10,emoji:'🏎️'},
    {id:'fire',name:'Fire Truck',price:500,color:'#ff544c',grip:1.34,safety:18,emoji:'🚒'}];
  const BOOSTS=[{id:'revive',label:'🛟 Revive',cost:70},{id:'double',label:'✖2 Score',cost:55},{id:'rush',label:'🪙 Coin Rush',cost:45}];
  let economy={coins:0,owned:['starter'],car:'starter',boosts:{revive:0,double:0,rush:0}};
  try{let x=JSON.parse(localStorage.getItem(STORE));if(x&&typeof x==='object')economy={...economy,...x,boosts:{...economy.boosts,...x.boosts}}}catch{}
  function save(){try{localStorage.setItem(STORE,JSON.stringify(economy))}catch{}}
  const content=`<div class="game-toolbar"><span class="stat">DISTANCE <b id="d-score">0</b></span><span class="stat">BEST <b id="d-best">${best('drift-switch',0)}</b></span><span class="stat">🪙 <b id="d-coins">${economy.coins}</b></span><button class="small-btn" id="d-reset">↻ Restart</button></div>
  <div class="canvas-wrap"><canvas id="d-canvas" width="720" height="420" aria-label="Top down drifting car and winding road"></canvas><div class="game-overlay" id="d-overlay"><strong>DRIFT SWITCH</strong><p>Now with forgiving steering! Move with ← → or A / D, or hold Space to lean right. Stay on the road, collect coins and unlock cars.</p><button class="small-btn" id="d-start">▶ Start driving</button></div></div>
  <div class="rebuilt-help"><span><span class="keycap">A</span> <span class="keycap">D</span> or <span class="keycap">←</span> <span class="keycap">→</span> steer</span><span>·</span><span><span class="keycap">Space</span> steer right</span><span>·</span><span>Let go to straighten out</span></div>
  <div class="mobile-steer"><button type="button" id="d-left">◀ LEFT</button><button type="button" id="d-right">RIGHT ▶</button></div>
  <div class="game-feedback" id="d-feedback">New beginner-friendly steering. The road gets harder gradually.</div>
  <section class="garage-shell"><div class="garage-header">🚗 GARAGE · UNLOCK CARS WITH COINS</div><div class="garage-row" id="d-garage"></div><div class="garage-header" style="margin-top:13px">⚡ BOOSTERS · USE ON YOUR NEXT RUN</div><div class="garage-row" id="d-boosts"></div></section>`;
  ui(content);
  const canvas=document.getElementById('d-canvas'),g=canvas.getContext('2d'),overlay=document.getElementById('d-overlay');
  let live=false,raf=0,last=0,dist=0,x=360,delta=0,offset=0,score=0,earned=0,flags={},revive=false,double=false,rush=false,particles=[],keyL=false,keyR=false,hold=false,coinHits=new Set(),resetTime=0,crash='OFF THE ROAD!';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),roadwidth=168;
  let car=CARS.find(c=>c.id===economy.car)||CARS[0];
  function center(z){const t=clamp((z-320)/800,0,1),s=t*t*(3-2*t);return 360+s*(67*Math.sin(z*.0065)+26*Math.sin(z*.0127+1));}
  function persistGarage(){
    document.getElementById('d-coins').textContent=economy.coins+earned;
    document.getElementById('d-garage').innerHTML=CARS.map(c=>`<button class="garage-car ${c.id===economy.car?'selected':''}" data-car="${c.id}" ${live?'disabled':''}><b>${c.emoji} ${c.name} ${c.id===economy.car?'✓':''}</b><small>${economy.owned.includes(c.id)?'OWNED · '+Math.round(c.grip*100)+'% handling':c.price+' coins'}${c.id==='fire'?' · EXTRA GRIP':''}</small></button>`).join('');
    document.getElementById('d-boosts').innerHTML=BOOSTS.map(b=>`<button class="garage-boost" data-boost="${b.id}" ${live?'disabled':''}><b>${b.label}</b><small>${b.cost} coins · owned ${economy.boosts[b.id]}</small></button>`).join('');
    document.querySelectorAll('[data-car]').forEach(btn=>btn.onclick=()=>{if(live)return;const c=CARS.find(v=>v.id===btn.dataset.car);if(!economy.owned.includes(c.id)){if(economy.coins<c.price){feedback('Need '+(c.price-economy.coins)+' more coins. Keep driving!');return;}economy.coins-=c.price;economy.owned.push(c.id)}economy.car=c.id;car=c;save();persistGarage();feedback(c.name+' equipped!')});
    document.querySelectorAll('[data-boost]').forEach(btn=>btn.onclick=()=>{if(live)return;const b=BOOSTS.find(v=>v.id===btn.dataset.boost);if(economy.coins<b.cost){feedback('Need '+(b.cost-economy.coins)+' more coins.');return}economy.coins-=b.cost;economy.boosts[b.id]++;save();persistGarage();feedback(b.label+' purchased for your next run.')});
  }
  function feedback(t){document.getElementById('d-feedback').textContent=t}
  function roundRect(x,y,w,h,r,fill){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill()}
  function render(){
    const W=720,H=420,at=(y)=>center(dist+(334-y)*1.38);
    const ground=g.createLinearGradient(0,0,0,H);ground.addColorStop(0,'#183747');ground.addColorStop(1,'#0e292f');g.fillStyle=ground;g.fillRect(0,0,W,H);
    const spacing=64,off=((dist*.25)%spacing);g.strokeStyle='#ffffff0a';g.lineWidth=1;
    for(let ix=-20;ix<W;ix+=spacing){g.beginPath();g.moveTo(ix,0);g.lineTo(ix,H);g.stroke()}
    for(let yy=off;yy<H;yy+=spacing){g.beginPath();g.moveTo(0,yy);g.lineTo(W,yy);g.stroke()}
    // Road shadow, shoulders, asphalt, edge markers, and dashed centerline.
    function stripe(w,col,dx=0){g.beginPath();for(let yy=-8;yy<=H+8;yy+=4){const cx=at(yy)+dx;if(yy===-8)g.moveTo(cx-w/2,yy);else g.lineTo(cx-w/2,yy)}for(let yy=H+8;yy>=-8;yy-=4)g.lineTo(at(yy)+dx+w/2,yy);g.closePath();g.fillStyle=col;g.fill()}
    stripe(roadwidth+35,'#091925');stripe(roadwidth+12,'#e3be77');stripe(roadwidth,'#34475d');stripe(roadwidth-14,'#3c4d5f');
    for(let yy=-20;yy<H+10;yy+=45){const z=dist+(334-yy)*1.38;if(((z/72)|0)%2===0){roundRect(at(yy)-3,yy,6,23,3,'#e3cf8b86')}}
    for(let yy=-15;yy<H;yy+=48){let z=dist+(334-yy)*1.38;const tick=(z/28)|0;if(tick%2===0){let cx=at(yy);g.fillStyle='#f4e8ba';g.fillRect(cx-roadwidth/2-6,yy,4,17);g.fillRect(cx+roadwidth/2+2,yy,4,17)}}
    // Distant coin preview and actual pickups.
    for(let n=Math.floor((dist-60)/125);n<Math.floor((dist+520)/125)+1;n++){
      if(n<1||coinHits.has(n))continue;let worldZ=n*125,yy=334-(worldZ-dist)/1.38;if(yy< -20||yy>440)continue;
      const xx=center(worldZ)+Math.sin(n*1.8)*24;
      g.shadowColor='#f9ce59';g.shadowBlur=15;g.fillStyle='#f8c84d';g.beginPath();g.arc(xx,yy,11,0,Math.PI*2);g.fill();g.shadowBlur=0;g.lineWidth=2;g.strokeStyle='#fff1ab';g.stroke();g.fillStyle='#8c581c';g.font='bold 13px sans-serif';g.textAlign='center';g.fillText('$',xx,yy+4);
      if(live&&Math.abs(worldZ-dist)<15&&Math.abs(xx-x)<28){coinHits.add(n);earned+=rush?15:5;feedback('+ '+(rush?15:5)+' coins!');}
    }
    // Road cones are real avoidable obstacles. They start after a generous warm-up.
    for(let n=Math.floor((dist-30)/210);n<=Math.floor((dist+510)/210)+1;n++){
      if(n<3)continue;
      const zz=n*210,yy=334-(zz-dist)/1.38;
      if(yy< -30||yy>440)continue;
      const xx=center(zz)+(n%3===0?0:n%3===1?-43:43);
      g.shadowColor='#ff946b';g.shadowBlur=10;g.fillStyle='#fb8550';
      g.beginPath();g.moveTo(xx,yy-18);g.lineTo(xx-14,yy+11);g.lineTo(xx+14,yy+11);g.closePath();g.fill();g.shadowBlur=0;
      roundRect(xx-10,yy-2,20,5,2,'#fff0dc');roundRect(xx-17,yy+10,34,7,2,'#e7a56e');
    }
    for(let p of particles){g.globalAlpha=clamp(p.life,0,1);g.fillStyle=p.color;g.fillRect(p.x,p.y,4,4)}g.globalAlpha=1;
    // Tiny detailed top-down car (lights, tires, windows).
    g.save();g.translate(x,335);g.rotate(clamp(offset*.003,-.20,.20));g.shadowColor='#030915';g.shadowBlur=18;g.fillStyle='#02091594';g.beginPath();g.ellipse(0,10,27,40,0,0,Math.PI*2);g.fill();g.shadowBlur=0;
    const truck=car.id==='fire',cw=truck?42:32,ch=truck?67:57;
    roundRect(-cw/2-4,-22,7,20,3,'#0e1822');roundRect(cw/2-3,-22,7,20,3,'#0e1822');roundRect(-cw/2-4,16,7,18,3,'#0e1822');roundRect(cw/2-3,16,7,18,3,'#0e1822');
    roundRect(-cw/2,-ch/2,cw,ch,8,car.color);roundRect(-cw/2+4,-ch/2+9,cw-8,18,5,'#8cc2d8');roundRect(-cw/2+4,4,cw-8,13,5,'#254257');
    roundRect(-cw/2+3,-ch/2+2,8,4,2,'#fff4b8');roundRect(cw/2-11,-ch/2+2,8,4,2,'#fff4b8');roundRect(-cw/2+3,ch/2-6,8,4,2,'#ffb5a4');roundRect(cw/2-11,ch/2-6,8,4,2,'#ffb5a4');
    if(truck){roundRect(-13,-6,26,7,2,'#fff');roundRect(-10,-11,9,7,2,'#5196f8');roundRect(1,-11,9,7,2,'#ff4b52')};g.restore();
    const danger=Math.abs(offset)/(roadwidth/2+car.safety-12),barW=135;
    roundRect(16,15,172,47,11,'#0c1424c9');g.fillStyle='#d6e3f0';g.font='bold 11px system-ui';g.textAlign='left';g.fillText(danger>.78?'⚠ EDGE! STEER BACK':'✦ STAY ON THE ROAD',29,34);roundRect(29,42,barW,7,4,'#3b4760');roundRect(29,42,Math.max(3,barW*(1-clamp(danger,0,1))),7,4,danger>.8?'#ff7e7b':'#7fe6b9');
  }
  function finish(){if(!live)return;live=false;cancelAnimationFrame(raf);economy.coins+=earned;save();persistGarage();overlay.hidden=false;overlay.innerHTML=`<strong>${crash}</strong><p>You drove <b>${score} m</b> and earned <b>🪙 ${earned}</b>. The next run starts slow again.</p><button class="small-btn" id="d-start">↻ Drive again</button>`;document.getElementById('d-start').onclick=start;feedback('Good run! Try a different car or booster.')}
  function update(t){if(!live)return;const dt=clamp((t-last)/1000||0,.001,.036);last=t;
    const speed=60+Math.min(48,dist*.017);const prevDist=dist,prev=center(dist);dist+=speed*dt;const now=center(dist);
    // Critical fix: car follows road on its own; no uncontrollable left drift.
    x+= (now-prev)*.98;
    const direction=(keyR||hold?1:0)-(keyL?1:0);
    if(direction!==0){offset+=direction*200*car.grip*dt}else offset*=Math.exp(-1.55*dt);
    offset=clamp(offset,-260,260);x=now+offset;
    score=Math.floor(dist*(double?2:1));document.getElementById('d-score').textContent=score;document.getElementById('d-best').textContent=best('drift-switch',score);document.getElementById('d-coins').textContent=economy.coins+earned;
    particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.life-=dt*1.4;p.x+=p.vx*dt;p.y+=p.vy*dt});
    const safe=roadwidth/2+car.safety-12;
    if(Math.abs(offset)>safe*.81&&Math.random()<dt*16)particles.push({x:x+(offset>0?-14:14),y:360,vx:(Math.random()-.5)*120,vy:90+Math.random()*60,life:.5,color:'#ffc27a'});
    // Cone collision: the default path is now safe until you reach the first cone.
    const hazardN=Math.round(dist/210),hazardZ=hazardN*210;
    let coneHit=false;
    if(hazardN>=3&&prevDist<hazardZ&&dist>=hazardZ){const coneX=center(hazardZ)+(hazardN%3===0?0:hazardN%3===1?-43:43);coneHit=Math.abs(x-coneX)<19;}
    if(Math.abs(offset)>safe||coneHit){crash=coneHit?'WATCH THE CONES!':'OFF THE ROAD!';if(!revive&&economy.boosts.revive>0){revive=true;economy.boosts.revive--;save();offset=0;x=now;feedback('🛟 Insurance used! You were saved.')}else{render();finish();return}}
    render();raf=requestAnimationFrame(update)
  }
  function start(){cancelAnimationFrame(raf);live=true;dist=0;x=center(0);offset=0;score=0;earned=0;coinHits.clear();particles=[];revive=false;crash='OFF THE ROAD!';keyL=keyR=hold=false;double=!!economy.boosts.double;rush=!!economy.boosts.rush;if(double)economy.boosts.double--;if(rush)economy.boosts.rush--;save();persistGarage();overlay.hidden=true;last=performance.now();feedback((double?'×2 SCORE! ':'')+(rush?'COIN RUSH! ':'')+'Use A/D or arrows. No input = steady driving.');raf=requestAnimationFrame(update)}
  function keydown(e){if(['ArrowLeft','ArrowRight','KeyA','KeyD','Space'].includes(e.code)){e.preventDefault();if(e.code==='ArrowLeft'||e.code==='KeyA')keyL=true;if(e.code==='ArrowRight'||e.code==='KeyD')keyR=true;if(e.code==='Space')hold=true}}
  function keyup(e){if(['ArrowLeft','ArrowRight','KeyA','KeyD','Space'].includes(e.code)){e.preventDefault();if(e.code==='ArrowLeft'||e.code==='KeyA')keyL=false;if(e.code==='ArrowRight'||e.code==='KeyD')keyR=false;if(e.code==='Space')hold=false}}
  function pointerUp(){hold=false}function pointerDown(e){e.preventDefault();hold=true}
  canvas.addEventListener('pointerdown',pointerDown);window.addEventListener('pointerup',pointerUp);
  const l=document.getElementById('d-left'),r=document.getElementById('d-right');
  function bindButton(el,down,up){el.addEventListener('pointerdown',e=>{e.preventDefault();down()});el.addEventListener('pointerup',up);el.addEventListener('pointerleave',up);el.addEventListener('pointercancel',up)}
  bindButton(l,()=>keyL=true,()=>keyL=false);bindButton(r,()=>keyR=true,()=>keyR=false);
  document.addEventListener('keydown',keydown);document.addEventListener('keyup',keyup);
  document.getElementById('d-reset').onclick=start;document.getElementById('d-start').onclick=start;
  persistGarage();render();
  cleanup=()=>{live=false;cancelAnimationFrame(raf);window.removeEventListener('pointerup',pointerUp);document.removeEventListener('keydown',keydown);document.removeEventListener('keyup',keyup)};
}
function tunnelGame(){
  ui(`<div class="game-toolbar"><span class="stat">DISTANCE <b id="t-distance">0</b></span><span class="stat">LEVEL <b id="t-level">1</b></span><span class="stat">BEST <b id="t-best">${best('galaxy-run',0)}</b></span><button class="small-btn" id="t-restart">↻ Restart</button></div>
  <div class="canvas-wrap"><canvas id="t-canvas" width="720" height="420" aria-label="Three lane cosmic tunnel platform runner"></canvas><div class="game-overlay" id="t-overlay"><strong>GALAXY RUN</strong><p>Run across floating platforms! Choose a safe lane with ← → or A / D, then jump gaps with Space. The first few platforms are easy.</p><button class="small-btn" id="t-start">▶ Start running</button></div></div>
  <div class="rebuilt-help"><span><span class="keycap">←</span> <span class="keycap">→</span> switch lanes</span><span>·</span><span><span class="keycap">Space</span> jump gaps</span><span>·</span><span>Orange tiles are missing!</span></div>
  <div class="mobile-steer"><button id="t-left">◀ LANE</button><button id="t-jump">⬆ JUMP</button><button id="t-right">LANE ▶</button></div><div class="game-feedback" id="t-feedback">Watch the lanes ahead. You can jump over missing tiles.</div>`);
  const c=document.getElementById('t-canvas'),g=c.getContext('2d'),overlay=document.getElementById('t-overlay'),TILE=55;
  const colors=['#7ae8dc','#a5a2ff','#f0b4ee'];let alive=false,last=0,raf=0,dist=0,lane=1,avatarX=0,jumpY=0,jumpV=0,level=1,holes=new Map(),stars=Array.from({length:90},(_,i)=>({x:(i*97+41)%720,y:(i*83+17)%420,r:i%5===0?1.9:1})),landedSegment=-1;
  const safe=(k,l)=>{if(k<8)return true;const data=holes.get(k);return data?!data.has(l):true};
  function ensure(){const base=Math.floor(dist/TILE);for(let k=Math.max(0,base);k<base+14;k++){
     if(holes.has(k))continue;
     // Fair generation: no consecutive fully blocked rows; generally 2/3 lanes remain safe.
     const s=new Set();if(k>7&&Math.random()<Math.min(.47,.18+k*.004)){s.add(Math.floor(Math.random()*3))}
     holes.set(k,s);
   }for(let k of [...holes.keys()])if(k<base-2)holes.delete(k)
  }
  function project(z,l){const t=Math.max(0,Math.min(1,1-z/570)),s=t*t*(3-2*t);return{x:360+(l-1)*((28+116*s)),y:98+314*s,w:23+98*s}}
  function draw(){g.fillStyle='#070c20';g.fillRect(0,0,720,420);
    for(let p of stars){g.fillStyle=`rgba(199,217,255,${.24+p.r*.2})`;g.beginPath();g.arc((p.x+(dist*.09)%720)%720,p.y,p.r,0,Math.PI*2);g.fill()}
    const neb=g.createRadialGradient(360,82,10,360,95,340);neb.addColorStop(0,'#5262ac55');neb.addColorStop(1,'#11142900');g.fillStyle=neb;g.fillRect(0,0,720,420);
    // Back-to-front tiles; all 3 lanes are made of actual platforms, not floating dots.
    const base=Math.floor(dist/TILE),within=dist%TILE;
    for(let k=base+10;k>=base-1;k--){let z1=(k*TILE-dist),z2=((k+1)*TILE-dist);
      if(z1>560||z2< -45)continue;
      for(let l=0;l<3;l++){
        const a=project(z1,l),b=project(z2,l),w1=a.w*.92,w2=b.w*.92,valid=safe(k,l);
        g.beginPath();g.moveTo(b.x-w2*.52,b.y);g.lineTo(b.x+w2*.52,b.y);g.lineTo(a.x+w1*.52,a.y);g.lineTo(a.x-w1*.52,a.y);g.closePath();
        if(valid){g.fillStyle=l===1?'#343f69':'#30485d';g.fill();g.strokeStyle='#7799c9';g.lineWidth=1.3;g.stroke();
         g.beginPath();g.moveTo(b.x-w2*.52,b.y);g.lineTo(a.x-w1*.52,a.y);g.lineTo(a.x+w1*.52,a.y);g.lineTo(b.x+w2*.52,b.y);g.lineTo(b.x+w2*.52,b.y+5);g.lineTo(a.x+w1*.52,a.y+7);g.lineTo(a.x-w1*.52,a.y+7);g.closePath();g.fillStyle='#172139';g.fill();
         g.strokeStyle=colors[l]+'77';g.beginPath();g.moveTo(b.x-w2*.52,b.y);g.lineTo(a.x-w1*.52,a.y);g.stroke();
        }else{g.fillStyle='#fa735329';g.fill();g.lineWidth=1.5;g.strokeStyle='#ff8b75c9';g.stroke();if(z1<260){g.fillStyle='#ffa98c';g.textAlign='center';g.font='bold 11px system-ui';g.fillText('GAP',a.x,(a.y+b.y)/2)}}
      }
    }
    // Jump shadow, player suit, helmet.
    const px=360+(lane-1)*144;avatarX+=(px-avatarX)*.16;let py=336-jumpY*95;
    g.fillStyle='#0206178a';g.beginPath();g.ellipse(avatarX,354,21,5,0,0,Math.PI*2);g.fill();
    g.shadowBlur=17;g.shadowColor='#74ffe0';g.fillStyle='#8ef6df';g.beginPath();g.roundRect(avatarX-14,py-16,28,35,8);g.fill();g.shadowBlur=0;
    g.fillStyle='#243b66';g.beginPath();g.arc(avatarX,py-23,17,0,Math.PI*2);g.fill();g.strokeStyle='#a2e7ff';g.lineWidth=3;g.stroke();g.fillStyle='#c5e8ff';g.beginPath();g.ellipse(avatarX+4,py-24,10,8,-.2,0,Math.PI*2);g.fill();
    g.fillStyle='#8eb3ce';g.fillRect(avatarX-13,py+18,10,10);g.fillRect(avatarX+3,py+18,10,10);
    g.fillStyle='#c3d9ff';g.textAlign='left';g.font='bold 12px system-ui';g.fillText('GALAXY RUN',22,26);
    g.fillStyle='#a9bcd4';g.font='11px system-ui';g.fillText('WATCH FOR GAPS · SPACE TO JUMP',22,43);
  }
  function feedback(t){document.getElementById('t-feedback').textContent=t}
  function end(){if(!alive)return;alive=false;cancelAnimationFrame(raf);overlay.hidden=false;overlay.innerHTML=`<strong>YOU FELL!</strong><p>Distance: ${Math.floor(dist)}m · Level ${level}. Try jumping over the missing platforms or switching lanes earlier.</p><button class="small-btn" id="t-start">↻ Try again</button>`;document.getElementById('t-start').onclick=start}
  function frame(t){if(!alive)return;const dt=Math.min(.04,(t-last)/1000||0);last=t;
    dist+=(69+Math.min(42,dist*.008))*dt;ensure();
    if(jumpV!==0||jumpY>0){jumpY+=jumpV*dt;jumpV-=7.2*dt;if(jumpY<=0){jumpY=0;jumpV=0}}
    let seg=Math.floor(dist/TILE);
    // Check when entering a new platform (not every animation frame).
    if(seg!==landedSegment){landedSegment=seg;if(!safe(seg,lane)&&jumpY<.2){end();return}}
    level=1+Math.floor(dist/600);document.getElementById('t-distance').textContent=Math.floor(dist);document.getElementById('t-level').textContent=level;document.getElementById('t-best').textContent=best('galaxy-run',Math.floor(dist));
    draw();raf=requestAnimationFrame(frame)
  }
  function move(d){if(!alive)return;lane=Math.max(0,Math.min(2,lane+d));feedback(lane===0?'LEFT LANE':lane===1?'CENTER LANE':'RIGHT LANE')}
  function jump(){if(!alive)return;if(jumpY<=0){jumpY=.01;jumpV=3.8;feedback('JUMP!')}}
  function key(e){if(['ArrowLeft','ArrowRight','KeyA','KeyD','Space','ArrowUp','KeyW'].includes(e.code)){e.preventDefault();if(e.repeat)return;if(e.code==='ArrowLeft'||e.code==='KeyA')move(-1);else if(e.code==='ArrowRight'||e.code==='KeyD')move(1);else jump()}}
  function start(){cancelAnimationFrame(raf);holes.clear();dist=0;lane=1;avatarX=360;jumpY=jumpV=0;level=1;landedSegment=-1;alive=true;ensure();last=performance.now();overlay.hidden=true;feedback('The opening platforms are safe. Practice changing lanes!');raf=requestAnimationFrame(frame)}
  document.addEventListener('keydown',key);document.getElementById('t-left').onclick=()=>move(-1);document.getElementById('t-right').onclick=()=>move(1);document.getElementById('t-jump').onclick=jump;
  document.getElementById('t-restart').onclick=start;document.getElementById('t-start').onclick=start;ensure();draw();
  cleanup=()=>{alive=false;cancelAnimationFrame(raf);document.removeEventListener('keydown',key)};
}

function duelGame(){
  ui(`<div class="game-toolbar"><span class="stat" style="color:#83e1ff">BLUE <b id="b-blue">0</b></span><span class="stat">TIME <b id="b-time">75</b></span><span class="stat">BALL <b id="b-owner">FREE</b></span><span class="stat" style="color:#ffc38d">ORANGE <b id="b-orange">0</b></span><button class="small-btn" id="b-reset">↻ Rematch</button></div>
  <div class="canvas-wrap"><canvas id="b-canvas" width="720" height="410" aria-label="Side view of two basketball players on a court"></canvas><div class="game-overlay" id="b-overlay"><strong>COURT CLASH 1V1</strong><p>Run, jump, charge shots, steal the ball and dunk. Play against your friend on the same keyboard—or against the CPU.</p><label class="rebuilt-switch"><input type="checkbox" id="b-cpu"> Play versus computer instead</label><button class="small-btn" id="b-start">🏀 TIP OFF</button></div></div>
  <div class="rebuilt-help"><span>🔵 <span class="keycap">A</span><span class="keycap">D</span> run · <span class="keycap">W</span> jump · <span class="keycap">F</span> shoot · <span class="keycap">G</span> steal</span></div>
  <div class="rebuilt-help"><span>🟠 <span class="keycap">←</span><span class="keycap">→</span> run · <span class="keycap">↑</span> jump · <span class="keycap">K</span> shoot · <span class="keycap">L</span> steal</span></div>
  <div class="game-feedback" id="b-msg">Hold shoot and release to fire. Jump near the opponent's rim to dunk!</div>`);
  const canvas=document.getElementById('b-canvas'),g=canvas.getContext('2d'),overlay=document.getElementById('b-overlay'),floor=324;
  let cpu=false,playing=false,raf=0,last=0,time=75,players=[],ball,keys=new Set(),flash='',flashTime=0,confetti=[];
  function init(){players=[{x:172,y:floor,vx:0,vy:0,face:1,score:0,color:'#74d9fa',charge:0,stun:0,cool:0,shooting:false,number:'01'},
    {x:547,y:floor,vx:0,vy:0,face:-1,score:0,color:'#ffa56c',charge:0,stun:0,cool:0,shooting:false,number:'02'}];ball={x:360,y:230,vx:0,vy:0,owner:-1,lock:.2};time=75;flash='';flashTime=0;confetti=[];setHUD();draw()}
  function setHUD(){document.getElementById('b-blue').textContent=players[0].score;document.getElementById('b-orange').textContent=players[1].score;document.getElementById('b-time').textContent=Math.ceil(time);document.getElementById('b-owner').textContent=ball?.owner===0?'BLUE':ball?.owner===1?'ORANGE':'FREE'}
  const HOOPS=[{x:70,y:158},{x:650,y:158}];
  function resetBall(){players[0].x=172;players[1].x=548;players.forEach(p=>{p.y=floor;p.vx=p.vy=0;p.shooting=false;p.charge=0});ball={x:360,y:198,vx:0,vy:0,owner:-1,lock:.45}}
  function score(i,pts){players[i].score+=pts;flash=pts===3?'THREE POINTER!':pts===2?'BUCKET!':'SCORE!';flashTime=1.2;
    for(let n=0;n<30;n++)confetti.push({x:360,y:80,vx:(Math.random()-.5)*240,vy:-Math.random()*160,t:1.3,color:n%2?'#8be5f4':'#ffb875'});
    resetBall();setHUD()}
  function shoot(i){const p=players[i];if(ball.owner!==i)return;
    const hoop=HOOPS[1-i],distX=hoop.x-p.x;
    const isDunk=Math.abs(distX)<86&&p.y<floor-22;
    if(isDunk){score(i,2);return}
    // Fully solved parabolic throw gives reliable arcs toward the rim. Charge affects precision.
    const flight=Math.max(1.02,Math.min(1.38,.88+Math.abs(distX)/620));
    const targetY=hoop.y,originY=p.y-47;
    const perfect=1-Math.min(1,Math.abs(p.charge-.62)/.62),jitter=(1-perfect)*13;
    const xJitter=(Math.random()-.5)*jitter;
    ball={x:p.x+p.face*13,y:originY,vx:(distX+xJitter)/flight,vy:(targetY-originY+250*flight*flight)/flight-500*flight,owner:-1,lock:.3,shooter:i,shotDistance:Math.abs(distX)};
    // Equivalent vertical acceleration = 500 px/s² in frame().
    p.charge=0;p.shooting=false;flash=perfect>.7?'NICE RELEASE!':'SHOT UP!';flashTime=.65
  }
  function steal(i){const p=players[i],o=players[1-i];if(p.cool>0)return;p.cool=.58;
    if(Math.abs(p.x-o.x)<62&&Math.abs(p.y-o.y)<48){o.stun=.33;o.vx=(o.x>p.x?1:-1)*140;if(ball.owner===1-i){ball.owner=i;ball.lock=.2;flash='STEAL!';flashTime=.8}}}
  function rect(x,y,w,h,c,r=0){g.fillStyle=c;if(r){g.beginPath();g.roundRect(x,y,w,h,r);g.fill()}else g.fillRect(x,y,w,h)}
  function draw(){
    const wall=g.createLinearGradient(0,0,0,365);wall.addColorStop(0,'#131e39');wall.addColorStop(1,'#334060');g.fillStyle=wall;g.fillRect(0,0,720,410);
    // Scoreboard and spectator silhouettes.
    rect(292,14,136,45,'#0a1224',8);g.fillStyle='#f3f4ff';g.font='800 13px system-ui';g.textAlign='center';g.fillText('PLAYROOM ARENA',360,34);g.font='bold 10px system-ui';g.fillStyle='#9faee8';g.fillText('LOCAL 1V1',360,49);
    for(let row=0;row<3;row++)for(let i=0;i<45;i++){let px=5+i*16,py=155+row*23;g.fillStyle=i%4===0?'#49667c':i%3===0?'#6b607c':'#3a4c6a';g.beginPath();g.arc(px,py,6,0,Math.PI*2);g.fill()}
    rect(0,201,720,123,'#1f2d49');rect(0,floor,720,86,'#ac7750');
    g.strokeStyle='#ead3ad99';g.lineWidth=2;g.beginPath();g.moveTo(360,floor);g.lineTo(360,410);g.arc(360,floor,56,0,Math.PI*2);g.stroke();
    for(let i=0;i<2;i++){let hoop=HOOPS[i],left=i===0;
      rect(left?32:674,108,12,114,'#d4e8ef',3);rect(left?43:652,126,25,45,'#9eceed79',2);
      g.strokeStyle='#ff7e57';g.lineWidth=6;g.beginPath();g.moveTo(hoop.x-19,hoop.y);g.lineTo(hoop.x+19,hoop.y);g.stroke();g.strokeStyle='#ffffffc7';g.lineWidth=1;for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(hoop.x+k*7,hoop.y+3);g.lineTo(hoop.x+k*5,hoop.y+32);g.stroke()}
    }
    players.forEach((p,i)=>{
      g.fillStyle='#0c182b66';g.beginPath();g.ellipse(p.x,floor+3,23,5,0,0,Math.PI*2);g.fill();
      rect(p.x-14,p.y-49,28,40,p.color,7);rect(p.x-10,p.y-45,20,11,i===0?'#3287b3':'#cd7148',2);
      g.fillStyle=p.color;g.beginPath();g.arc(p.x,p.y-60,14,0,Math.PI*2);g.fill();
      rect(p.x-10,p.y-12,9,13,'#e6e9f4',3);rect(p.x+2,p.y-12,9,13,'#e6e9f4',3);
      rect(p.x+(p.face>0?4:-8),p.y-63,4,4,'#23304b',1);
      g.font='bold 11px system-ui';g.textAlign='center';g.fillStyle='#ffffff';g.fillText('P'+(i+1),p.x,p.y-86);
      if(p.stun>0){g.font='15px sans-serif';g.fillText('✴',p.x,p.y-100)}
      if(p.charge>0){rect(p.x-22,p.y-112,44,7,'#0b182c',3);rect(p.x-22,p.y-112,44*Math.min(1,p.charge),7,Math.min(3,p.charge*44),'#8affd2')}
    });
    let bx=ball.owner===-1?ball.x:players[ball.owner].x+players[ball.owner].face*20,by=ball.owner===-1?ball.y:players[ball.owner].y-34;
    g.shadowColor='#ffb56d';g.shadowBlur=9;g.fillStyle='#ed8c3f';g.beginPath();g.arc(bx,by,11,0,Math.PI*2);g.fill();g.shadowBlur=0;
    g.strokeStyle='#5d3115';g.lineWidth=2;g.beginPath();g.moveTo(bx-11,by);g.lineTo(bx+11,by);g.moveTo(bx,by-11);g.lineTo(bx,by+11);g.stroke();
    for(let p of confetti){rect(p.x,p.y,5,7,p.color,1)}
    if(flashTime>0){g.fillStyle='#fff1b5';g.font='900 29px system-ui';g.textAlign='center';g.fillText(flash,360,95)}
  }
  function end(){if(!playing)return;playing=false;cancelAnimationFrame(raf);const a=players[0].score,b=players[1].score;overlay.hidden=false;
    overlay.innerHTML=`<strong>${a===b?'IT’S A TIE!':a>b?'BLUE WINS!':'ORANGE WINS!'}</strong><p>Final score ${a} : ${b}. Ready for another match?</p><button class="small-btn" id="b-start">🏀 REMATCH</button>`;document.getElementById('b-start').onclick=()=>start(cpu)}
  function frame(t){if(!playing)return;let dt=Math.min(.035,(t-last)/1000||0);last=t;time=Math.max(0,time-dt);flashTime=Math.max(0,flashTime-dt);setHUD();if(time<=0){draw();end();return}
    for(let i=0;i<players.length;i++){
      const p=players[i];p.cool=Math.max(0,p.cool-dt);p.stun=Math.max(0,p.stun-dt);
      let left,right,jump,fire,check;
      if(i===1&&cpu){const target=ball.owner===1?HOOPS[0].x:ball.owner===0?players[0].x:ball.x;
        left=target<p.x-24;right=target>p.x+24;jump=ball.owner===1&&Math.abs(p.x-HOOPS[0].x)<105;fire=ball.owner===1&&(Math.abs(p.x-HOOPS[0].x)<260);check=Math.abs(p.x-players[0].x)<45&&ball.owner===0;
      }else{const controls=i===0?['a','d','w','f','g']:['ArrowLeft','ArrowRight','ArrowUp','k','l'];left=keys.has(controls[0]);right=keys.has(controls[1]);jump=keys.has(controls[2]);fire=keys.has(controls[3]);check=keys.has(controls[4])}
      if(p.stun===0){p.vx=((right?1:0)-(left?1:0))*250;if(p.vx)p.face=Math.sign(p.vx);
        if(jump&&p.y>=floor){p.vy=-440}
        if(check)steal(i);
        if(fire&&ball.owner===i){p.charge=Math.min(1,p.charge+dt*1.32);p.shooting=true;
          if(cpu&&p.charge>=.62){shoot(i)}
        }else if(p.shooting){shoot(i)}
      }else p.vx*=.88;
      p.vy+=1010*dt;p.y=Math.min(floor,p.y+p.vy*dt);if(p.y===floor)p.vy=0;
      p.x=Math.max(54,Math.min(666,p.x+p.vx*dt));
    }
    if(ball.owner===-1){const prevX=ball.x,prevY=ball.y;ball.vy+=500*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=.999;
      if(ball.x<14||ball.x>706){ball.x=Math.max(14,Math.min(706,ball.x));ball.vx*=-.65}
      if(ball.y>floor-12){ball.y=floor-12;ball.vy*=-.58;ball.vx*=.82}
      if(ball.y<12){ball.y=12;ball.vy=Math.abs(ball.vy)}
      // Line-crossing through the rim plus forgiving proximity scoring for good shots.
      if(ball.shooter!==undefined){const hoop=HOOPS[1-ball.shooter];const crosses=ball.vy>0&&prevY<hoop.y&&ball.y>=hoop.y&&Math.abs(ball.x-hoop.x)<28;
        if(crosses){score(ball.shooter,ball.shotDistance>325?3:2)}
      }
      if(ball.owner===-1){ball.lock=Math.max(0,ball.lock-dt);if(ball.lock===0){players.forEach((p,i)=>{if(ball.owner<0&&Math.abs(ball.x-p.x)<30&&Math.abs(ball.y-(p.y-34))<49){ball.owner=i;ball.lock=.2;p.charge=0;p.shooting=false}})}}
    }
    confetti.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=250*dt;p.t-=dt});confetti=confetti.filter(p=>p.t>0);
    draw();raf=requestAnimationFrame(frame)
  }
  function start(vsCpu){cpu=!!vsCpu;init();playing=true;overlay.hidden=true;last=performance.now();raf=requestAnimationFrame(frame);document.getElementById('b-msg').textContent=cpu?'Playing against CPU. Blue = you!':'Two players, one keyboard. Blue vs Orange!'}
  function kd(e){if(['KeyA','KeyD','KeyW','KeyF','KeyG','ArrowLeft','ArrowRight','ArrowUp','KeyK','KeyL'].includes(e.code)){e.preventDefault();keys.add(e.key.toLowerCase().startsWith('arrow')?e.key:e.key.toLowerCase())}}
  function ku(e){keys.delete(e.key.toLowerCase().startsWith('arrow')?e.key:e.key.toLowerCase())}
  function blur(){keys.clear()}
  document.addEventListener('keydown',kd);document.addEventListener('keyup',ku);window.addEventListener('blur',blur);
  document.getElementById('b-reset').onclick=()=>start(cpu);document.getElementById('b-start').onclick=()=>start(document.getElementById('b-cpu').checked);
  init();cleanup=()=>{playing=false;cancelAnimationFrame(raf);document.removeEventListener('keydown',kd);document.removeEventListener('keyup',ku);window.removeEventListener('blur',blur)};
}

// Use the real catalog names in the launcher; the older engine kept stale labels.
const oldOpenGame=openGame;
openGame=function(name){oldOpenGame(name);const card=document.querySelector(`.game-card[data-game="${name}"]`);if(card){document.getElementById('modal-title').textContent=card.querySelector('h3')?.textContent||name}};
function dinoGame(){
 ui(`<div class="game-toolbar"><span class="stat">SCORE <b id="di-score">0</b></span><span class="stat">BEST <b id="di-best">${best('dino-deluxe',0)}</b></span><button class="small-btn" id="di-reset">↻ Restart</button></div>
 <div class="canvas-wrap"><canvas id="di-canvas" width="720" height="350" aria-label="Pixel dinosaur jumping over cacti"></canvas><div class="game-overlay" id="di-overlay"><strong>DINO DASH</strong><p>Jump over cacti, duck under birds and beat your high score. The first few obstacles are easy.</p><button class="small-btn" id="di-start">▶ RUN</button></div></div>
 <div class="rebuilt-help"><span><span class="keycap">Space</span> / <span class="keycap">↑</span> jump</span><span>·</span><span><span class="keycap">↓</span> duck</span><span>·</span><span>Tap to jump</span></div><div class="game-feedback" id="di-msg">Time your jumps to clear the cacti.</div>`);
 const c=document.getElementById('di-canvas'),g=c.getContext('2d'),o=document.getElementById('di-overlay');
 let alive=false,last=0,raf=0,dist=0,vy=0,height=0,spawn=2,obstacles=[],duck=false,leg=0,clouds=[{x:70,y:49,s:1},{x:285,y:86,s:.7},{x:530,y:54,s:1.2}];
 function rect(x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h)}
 function draw(){
   const sky=g.createLinearGradient(0,0,0,350);sky.addColorStop(0,'#253d66');sky.addColorStop(1,'#7685a5');g.fillStyle=sky;g.fillRect(0,0,720,350);
   g.fillStyle='#c8e5ec';g.beginPath();g.arc(610,73,29,0,Math.PI*2);g.fill();
   clouds.forEach(v=>{let x=v.x,y=v.y;g.fillStyle='#d8eaff88';g.beginPath();g.ellipse(x,y,36*v.s,12*v.s,0,0,Math.PI*2);g.fill();g.beginPath();g.ellipse(x-9*v.s,y-6*v.s,21*v.s,12*v.s,0,0,Math.PI*2);g.fill()});
   g.fillStyle='#293e60';g.beginPath();g.moveTo(0,260);for(let x=0;x<=720;x+=35)g.lineTo(x,211+34*Math.sin(x*.015+dist*.0006)+13*Math.sin(x*.037+2));g.lineTo(720,350);g.lineTo(0,350);g.fill();
   g.fillStyle='#345368';g.beginPath();g.moveTo(0,283);for(let x=0;x<=720;x+=22)g.lineTo(x,250+18*Math.sin(x*.014+dist*.002));g.lineTo(720,350);g.lineTo(0,350);g.fill();
   rect(0,285,720,65,'#243a43');rect(0,285,720,5,'#93d5aa');
   g.fillStyle='#8cbba5';for(let i=0;i<48;i++){let px=((i*93-dist*.95)%780+780)%780;g.fillRect(px,300+i%3*13,2+i%3*3,2)}
   for(const ob of obstacles){
     if(ob.kind==='cactus'){
       const x=ob.x,w=ob.w;
       rect(x,285-ob.h,w,ob.h,'#68d3a2');rect(x-9,285-ob.h+15,11,7,'#5fbf93');rect(x-9,285-ob.h+11,6,19,'#68d3a2');
       rect(x+w-1,285-ob.h+23,10,6,'#5fbf93');rect(x+w+5,285-ob.h+11,6,21,'#68d3a2');rect(x+5,285-ob.h+5,4,4,'#a5ffcb');
     }else{
       g.fillStyle='#f7be7d';g.beginPath();g.ellipse(ob.x+19,ob.y,20,12,0,0,Math.PI*2);g.fill();
       g.fillStyle='#ffe3af';g.beginPath();g.ellipse(ob.x+12,ob.y+Math.sin(dist*.04)*7,14,7,0,0,Math.PI*2);g.fill();
       rect(ob.x+32,ob.y-3,5,5,'#2d3446');
     }
   }
   const py=285-height,bodyH=duck&&height<1?23:42;
   g.fillStyle='#050f21a0';g.beginPath();g.ellipse(110,290,25,5,0,0,Math.PI*2);g.fill();
   // Leg animation plus blinking eye.
   rect(95,py-bodyH,32,bodyH,'#a1e4a6');rect(119,py-bodyH-13,26,20,'#a1e4a6');rect(124,py-bodyH-19,19,10,'#a1e4a6');rect(85,py-18,16,10,'#a1e4a6');
   rect(135,py-bodyH-12,4,4,'#1d3643');rect(124,py-bodyH+10,7,8,'#7ab982');
   if(height===0&&!(duck)){rect(99,py,10,13+(Math.sin(leg)>0?5:0),'#a1e4a6');rect(115,py,10,13+(Math.sin(leg)<0?5:0),'#a1e4a6')}
   else if(duck){rect(103,py,10,8,'#a1e4a6');rect(119,py,10,8,'#a1e4a6')}
   else{rect(100,py,10,11,'#a1e4a6');rect(116,py+3,10,8,'#a1e4a6')}
   g.font='800 12px system-ui';g.fillStyle='#dcecf4';g.fillText('DINO DASH',18,26);
 }
 function end(){if(!alive)return;alive=false;cancelAnimationFrame(raf);o.hidden=false;o.innerHTML=`<strong>GAME OVER</strong><p>Score: ${Math.floor(dist/10)}. Jump earlier or duck when you see the birds.</p><button class="small-btn" id="di-start">↻ Try again</button>`;document.getElementById('di-start').onclick=start}
 function jump(){if(alive&&height===0){vy=520;duck=false}}
 function frame(t){if(!alive)return;let dt=Math.min(.035,(t-last)/1000||0);last=t;
  let speed=220+Math.min(145,dist*.018);dist+=speed*dt;leg+=dt*24;
  height=Math.max(0,height+vy*dt);vy-=1400*dt;if(height===0)vy=0;
  clouds.forEach(a=>{a.x-=speed*.035*dt;if(a.x< -80)a.x=780});
  spawn-=dt;if(spawn<0){const type=dist>900&&Math.random()<.26?'bird':'cactus';obstacles.push(type==='cactus'?{kind:'cactus',x:740,w:23,h:40+(Math.random()*20|0)}:{kind:'bird',x:740,y:243,w:40,h:23});spawn=1.35+Math.random()*.75-Math.min(.35,dist*.00008)}
  for(let ob of obstacles){ob.x-=speed*dt;let yy=285-height,playerH=duck?23:42;let hit=ob.x+ob.w>99&&ob.x<135;
   if(hit){if(ob.kind==='cactus'&&yy>285-ob.h+8)end();else if(ob.kind==='bird'&&yy-playerH<ob.y+12&&yy>ob.y-12)end()}
  }obstacles=obstacles.filter(x=>x.x> -60);
  const score=Math.floor(dist/10);document.getElementById('di-score').textContent=score;document.getElementById('di-best').textContent=best('dino-deluxe',score);
  draw();if(alive)raf=requestAnimationFrame(frame)
 }
 function start(){cancelAnimationFrame(raf);alive=true;dist=0;height=0;vy=0;spawn=1.8;obstacles=[];duck=false;last=performance.now();o.hidden=true;raf=requestAnimationFrame(frame)}
 function kd(e){if(['Space','ArrowUp','ArrowDown','KeyW','KeyS'].includes(e.code)){e.preventDefault();if(e.code==='ArrowDown'||e.code==='KeyS')duck=true;else if(!e.repeat)jump()}}
 function ku(e){if(e.code==='ArrowDown'||e.code==='KeyS')duck=false}
 function tap(e){e.preventDefault();jump()}
 document.addEventListener('keydown',kd);document.addEventListener('keyup',ku);c.addEventListener('pointerdown',tap);
 document.getElementById('di-reset').onclick=start;document.getElementById('di-start').onclick=start;draw();
 cleanup=()=>{alive=false;cancelAnimationFrame(raf);document.removeEventListener('keydown',kd);document.removeEventListener('keyup',ku)};
}
function flapGame(){
 ui(`<div class="game-toolbar"><span class="stat">PIPES <b id="f-score">0</b></span><span class="stat">BEST <b id="f-best">${best('flappy-deluxe',0)}</b></span><button class="small-btn" id="f-reset">↻ Restart</button></div>
 <div class="canvas-wrap"><canvas id="f-canvas" width="720" height="410" aria-label="Bird flying through gaps between tall pipes"></canvas><div class="game-overlay" id="f-overlay"><strong>FLAPPY FLIGHT</strong><p>Tap, click or press Space to flap. Fly through the spaces between the pipes and collect points!</p><button class="small-btn" id="f-start">▶ LET'S FLY</button></div></div>
 <div class="rebuilt-help"><span><span class="keycap">Space</span> / <span class="keycap">↑</span> flap</span><span>·</span><span>Click or tap anywhere in the game</span></div>`);
 const c=document.getElementById('f-canvas'),g=c.getContext('2d'),o=document.getElementById('f-overlay');
 let live=false,last=0,raf=0,y=185,vy=0,t=0,score=0,pipes=[],spawn=0,wing=0;
 function draw(){
  const bg=g.createLinearGradient(0,0,0,410);bg.addColorStop(0,'#25497a');bg.addColorStop(.6,'#e78d9b');bg.addColorStop(1,'#f8c3a0');g.fillStyle=bg;g.fillRect(0,0,720,410);
  g.fillStyle='#ffe5a2';g.beginPath();g.arc(550,92,42,0,Math.PI*2);g.fill();
  for(let layer=0;layer<2;layer++){g.fillStyle=layer?'#385470':'#536e85';g.beginPath();g.moveTo(0,395);for(let x=0;x<=720;x+=24){const h=layer?62:95;g.lineTo(x,360-h*.5+(Math.sin(x*.016+t*(layer?-.6:-.25))*.5+.5)*h*.3)}g.lineTo(720,410);g.lineTo(0,410);g.fill()}
  for(let p of pipes){const gapH=165,top=p.gap-gapH/2,bottom=p.gap+gapH/2;
   g.fillStyle='#142a41aa';g.fillRect(p.x+7,0,74,top);g.fillRect(p.x+7,bottom,74,410-bottom);
   g.fillStyle='#4cc596';g.fillRect(p.x,0,66,top);g.fillRect(p.x,bottom,66,410-bottom);
   g.fillStyle='#a1e8c1';g.fillRect(p.x+8,0,10,top);g.fillRect(p.x+8,bottom,10,410-bottom);
   g.fillStyle='#319a77';g.fillRect(p.x+57,0,8,top);g.fillRect(p.x+57,bottom,8,410-bottom);
   g.fillStyle='#67e4b2';g.fillRect(p.x-7,top-21,80,21);g.fillRect(p.x-7,bottom,80,21);
  }
  g.save();g.translate(148,y);g.rotate(Math.min(.75,Math.max(-.4,vy*.0015)));
  g.fillStyle='#fbe38b';g.beginPath();g.ellipse(0,0,20,16,0,0,Math.PI*2);g.fill();
  g.fillStyle='#f7b86c';g.beginPath();g.ellipse(-6,Math.sin(wing)*7+3,13,7,0,0,Math.PI*2);g.fill();
  g.fillStyle='#fff';g.beginPath();g.arc(9,-6,6,0,Math.PI*2);g.fill();g.fillStyle='#252c47';g.beginPath();g.arc(11,-6,2.7,0,Math.PI*2);g.fill();
  g.fillStyle='#fd945b';g.beginPath();g.moveTo(17,-1);g.lineTo(30,4);g.lineTo(17,8);g.closePath();g.fill();g.restore();
  g.fillStyle='#f3f4ff';g.textAlign='center';g.font='900 46px system-ui';g.fillText(String(score),360,67);
 }
 function end(){if(!live)return;live=false;cancelAnimationFrame(raf);o.hidden=false;o.innerHTML=`<strong>FLIGHT ENDED!</strong><p>You cleared ${score} pipes. Try timing each flap a little earlier.</p><button class="small-btn" id="f-start">↻ Fly again</button>`;document.getElementById('f-start').onclick=start}
 function flap(e){if(e)e.preventDefault();if(live){vy=-282;wing+=.6}}
 function update(ms){if(!live)return;const dt=Math.min(.038,(ms-last)/1000||0);last=ms;t+=dt;wing+=dt*19;vy+=620*dt;y+=vy*dt;
  spawn-=dt;if(spawn<=0){pipes.push({x:760,gap:122+Math.random()*165,passed:false});spawn=1.95}
  pipes.forEach(p=>{p.x-=158*dt;if(!p.passed&&p.x+66<148){p.passed=true;score++;document.getElementById('f-score').textContent=score;document.getElementById('f-best').textContent=best('flappy-deluxe',score)}
   if(p.x<166&&p.x+66>132&&(y-12<p.gap-82||y+12>p.gap+82))end()});
  pipes=pipes.filter(p=>p.x> -90);if(y<16||y>398)end();draw();if(live)raf=requestAnimationFrame(update)
 }
 function start(){cancelAnimationFrame(raf);live=true;y=185;vy=-100;t=0;score=0;pipes=[];spawn=1.8;last=performance.now();o.hidden=true;document.getElementById('f-score').textContent=0;raf=requestAnimationFrame(update)}
 function kd(e){if(['Space','ArrowUp','KeyW'].includes(e.code)){e.preventDefault();if(!e.repeat)flap()}}
 document.addEventListener('keydown',kd);c.addEventListener('pointerdown',flap);document.getElementById('f-reset').onclick=start;document.getElementById('f-start').onclick=start;draw();
 cleanup=()=>{live=false;cancelAnimationFrame(raf);document.removeEventListener('keydown',kd)};
}
function breakoutGame(){
 ui(`<div class="game-toolbar"><span class="stat">SCORE <b id="bb-score">0</b></span><span class="stat">LIVES <b id="bb-lives">3</b></span><span class="stat">LEVEL <b id="bb-level">1</b></span><span class="stat">BEST <b id="bb-best">${best('brick-deluxe',0)}</b></span><button class="small-btn" id="bb-restart">↻ Restart</button></div>
 <div class="canvas-wrap"><canvas id="bb-canvas" width="720" height="430" aria-label="Neon brick breaking arcade game"></canvas><div class="game-overlay" id="bb-overlay"><strong>BRICK BREAKER</strong><p>Move your paddle to keep the ball alive. Clear all the bricks to reach the next level!</p><button class="small-btn" id="bb-start">▶ START</button></div></div><div class="rebuilt-help"><span>Move paddle with <span class="keycap">←</span> <span class="keycap">→</span>, <span class="keycap">A</span> <span class="keycap">D</span> or mouse</span><span>·</span><span><span class="keycap">Space</span> launch ball</span></div><div class="game-feedback" id="bb-msg">The angle you hit the ball determines its direction.</div>`);
 const c=document.getElementById('bb-canvas'),g=c.getContext('2d'),o=document.getElementById('bb-overlay'),width=720,height=430;
 let alive=false,last=0,raf=0,score=0,lives=3,level=1,paddle=360,ball,bricks=[],keys=new Set(),trail=[];
 function setupBricks(){bricks=[];for(let row=0;row<5;row++)for(let col=0;col<10;col++)bricks.push({x:17+col*70,y:43+row*34,w:65,h:25,alive:true,c:['#f68ca0','#f8bc83','#edd98f','#9ed8c1','#8ebce8'][row]})}
 function resetBall(){ball={x:paddle,y:383,vx:160+Math.random()*30,vy:-210-LevelSpeed(),stuck:true};trail=[]}
 function LevelSpeed(){return Math.min(140,(level-1)*30)}
 function launch(){if(ball.stuck&&alive){ball.stuck=false;document.getElementById('bb-msg').textContent='Keep the ball in play!'}}
 function updateHUD(){document.getElementById('bb-score').textContent=score;document.getElementById('bb-lives').textContent=lives;document.getElementById('bb-level').textContent=level;document.getElementById('bb-best').textContent=best('brick-deluxe',score)}
 function box(x,y,w,h,r,color){g.fillStyle=color;g.beginPath();g.roundRect(x,y,w,h,r);g.fill()}
 function draw(){const bg=g.createRadialGradient(360,200,60,360,200,500);bg.addColorStop(0,'#17284d');bg.addColorStop(1,'#080e22');g.fillStyle=bg;g.fillRect(0,0,width,height);
  g.strokeStyle='#ffffff0c';for(let x=0;x<720;x+=35){g.beginPath();g.moveTo(x,0);g.lineTo(x,430);g.stroke()}
  for(let b of bricks){if(!b.alive)continue;g.shadowColor=b.c;g.shadowBlur=8;box(b.x,b.y,b.w,b.h,5,b.c);g.shadowBlur=0;box(b.x+3,b.y+2,b.w-6,5,3,'#ffffff55')}
  for(let i=0;i<trail.length;i++){const p=trail[i];g.fillStyle=`rgba(203,238,255,${i/trail.length*.28})`;g.beginPath();g.arc(p.x,p.y,3+i/trail.length*5,0,Math.PI*2);g.fill()}
  g.shadowColor='#7fecde';g.shadowBlur=19;box(paddle-52,393,104,15,7,'#81e8d7');g.shadowBlur=0;box(paddle-39,393,78,4,2,'#effff6');
  g.shadowColor='#e1f2ff';g.shadowBlur=17;g.fillStyle='#f4f8ff';g.beginPath();g.arc(ball.x,ball.y,8,0,Math.PI*2);g.fill();g.shadowBlur=0;
  if(ball.stuck&&alive){g.fillStyle='#dee8fe';g.font='bold 13px system-ui';g.textAlign='center';g.fillText('PRESS SPACE TO LAUNCH',360,355)}
 }
 function gameOver(){alive=false;cancelAnimationFrame(raf);o.hidden=false;o.innerHTML=`<strong>GAME OVER</strong><p>Score: ${score} · Level ${level}. Ready for another go?</p><button class="small-btn" id="bb-start">↻ Play again</button>`;document.getElementById('bb-start').onclick=start}
 function update(t){if(!alive)return;let dt=Math.min(.036,(t-last)/1000||0);last=t;
  const dir=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);
  paddle=Math.max(57,Math.min(663,paddle+dir*440*dt));
  if(ball.stuck){ball.x=paddle;ball.y=383}
  else{
   let px=ball.x,py=ball.y;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
   if(ball.x<8){ball.x=8;ball.vx=Math.abs(ball.vx)}if(ball.x>712){ball.x=712;ball.vx=-Math.abs(ball.vx)}
   if(ball.y<8){ball.y=8;ball.vy=Math.abs(ball.vy)}
   if(ball.vy>0&&py<391&&ball.y>=390&&ball.x>paddle-58&&ball.x<paddle+58){ball.y=389;const impact=(ball.x-paddle)/58;let speed=Math.min(485,Math.hypot(ball.vx,ball.vy)*1.025);ball.vx=speed*Math.sin(impact*1.1);ball.vy=-Math.sqrt(Math.max(150**2,speed*speed-ball.vx*ball.vx))}
   if(ball.y>440){lives--;if(lives<=0){updateHUD();gameOver();return}resetBall();document.getElementById('bb-msg').textContent='One life lost. Space to serve again!'}
   for(let b of bricks){if(!b.alive)continue;let cx=Math.max(b.x,Math.min(ball.x,b.x+b.w)),cy=Math.max(b.y,Math.min(ball.y,b.y+b.h));let dx=ball.x-cx,dy=ball.y-cy;
    if(dx*dx+dy*dy<=64){b.alive=false;score+=10;let fromLeft=Math.abs(px-b.x),fromRight=Math.abs(px-(b.x+b.w));let fromTop=Math.abs(py-b.y),fromBottom=Math.abs(py-(b.y+b.h));
      if(Math.min(fromLeft,fromRight)<Math.min(fromTop,fromBottom))ball.vx*=-1;else ball.vy*=-1;break}
   }
   trail.push({x:ball.x,y:ball.y});if(trail.length>12)trail.shift();
   if(bricks.every(b=>!b.alive)){level++;setupBricks();resetBall();document.getElementById('bb-msg').textContent='Level '+level+'! More speed. Press Space to launch.'}
  }
  updateHUD();draw();if(alive)raf=requestAnimationFrame(update)
 }
 function start(){cancelAnimationFrame(raf);alive=true;score=0;lives=3;level=1;paddle=360;setupBricks();resetBall();updateHUD();o.hidden=true;last=performance.now();raf=requestAnimationFrame(update)}
 function keydown(e){if(['ArrowLeft','ArrowRight','KeyA','KeyD','Space'].includes(e.code)){e.preventDefault();keys.add(e.key);if(e.code==='Space')launch()}}
 function keyup(e){keys.delete(e.key)}
 function mouse(e){const r=c.getBoundingClientRect();paddle=Math.max(57,Math.min(663,(e.clientX-r.left)*720/r.width))}
 c.addEventListener('pointermove',mouse);c.addEventListener('pointerdown',e=>{mouse(e);launch()});document.addEventListener('keydown',keydown);document.addEventListener('keyup',keyup);
 document.getElementById('bb-restart').onclick=start;document.getElementById('bb-start').onclick=start;
 setupBricks();resetBall();draw();cleanup=()=>{alive=false;cancelAnimationFrame(raf);document.removeEventListener('keydown',keydown);document.removeEventListener('keyup',keyup)};
}
// The legacy dispatcher prioritizes its registry for several arcade titles.
newGames.breakout=breakoutGame;
