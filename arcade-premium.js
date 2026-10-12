/* PLAYROOM // THE FOUR — original canvas games inspired by classic browser genres.
   No remote scripts or third-party game embeds; Groq backend remains separate. */
(()=>{'use strict';
const W=960,H=540, TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
const $id=id=>document.getElementById(id);
function rect(ctx,x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h)}
function text(ctx,s,x,y,size=20,color='#fff',align='left',weight=800){ctx.save();ctx.fillStyle=color;ctx.font=`${weight} ${size}px system-ui, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(s),x,y);ctx.restore()}
function rr(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function line(ctx,x,y,a,b,color,width=2){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function circle(ctx,x,y,r,fill){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=fill;ctx.fill()}
function polygon(ctx,pts,fill,stroke='#0000',width=1){ctx.beginPath();ctx.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)ctx.lineTo(...pts[i]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke!=='#0000'){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function saveBest(key,v){try{const id='playroom-elite-'+key;const n=Math.max(v,Number(localStorage.getItem(id)||0));localStorage.setItem(id,String(n));return n}catch{return v}}
function getBest(key){try{return Number(localStorage.getItem('playroom-elite-'+key)||0)}catch{return 0}}
function init(title,subtitle,controlHtml){
  ui(`<div class="elite-toolbar"><div class="elite-brand"><b>${title}</b><span>${subtitle}</span></div><div class="elite-stat" id="elite-stat">READY</div><button id="elite-restart" class="elite-button">↻ Restart</button></div><div class="elite-stage" id="elite-stage"><canvas id="elite-canvas" width="${W}" height="${H}" tabindex="0" aria-label="${title} game area"></canvas><div class="elite-cover" id="elite-cover"><div class="elite-cover-inner"><span class="elite-eyebrow">PLAYROOM / ORIGINAL ARCADE</span><h2>${title}</h2><p id="elite-cover-description">${subtitle}</p><button id="elite-play" class="elite-play">▶ START GAME</button></div></div></div><div class="elite-controls">${controlHtml}</div><div class="elite-tip" id="elite-tip">Tip: click inside the game to focus keyboard controls.</div>`);
  const canvas=$id('elite-canvas'),ctx=canvas.getContext('2d');
  const stage=$id('elite-stage'),cover=$id('elite-cover'),play=$id('elite-play'),stat=$id('elite-stat'),restart=$id('elite-restart'),tip=$id('elite-tip');
  const down=new Set(),listeners=[];let raf=0,last=0,running=false,paused=false,disposed=false,tick=()=>{};
  const on=(el,event,fn,opts)=>{el.addEventListener(event,fn,opts);listeners.push(()=>el.removeEventListener(event,fn,opts))};
  const keys=['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyG','KeyL','KeyQ','KeyE','KeyZ','KeyC','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8'];
  on(document,'keydown',e=>{if(disposed||$id('modal').hidden)return;if(keys.includes(e.code))e.preventDefault();if(!e.repeat&&e.code==='KeyP'&&running){paused=!paused;tip.textContent=paused?'PAUSED · Press P to resume':'Playing';} down.add(e.code)});
  on(document,'keyup',e=>down.delete(e.code));on(window,'blur',()=>down.clear());
  function frame(now){if(!running||disposed)return;const dt=Math.min(.038,Math.max(0,(now-last)/1000));last=now;if(!paused)tick(dt,now/1000);raf=requestAnimationFrame(frame)}
  function begin(fn){stop();down.clear();running=true;paused=false;tick=fn;cover.hidden=true;last=performance.now();canvas.focus();raf=requestAnimationFrame(frame)}
  function stop(){running=false;cancelAnimationFrame(raf)}
  function show(title,message,button='TRY AGAIN',restartFn){stop();cover.hidden=false;cover.querySelector('h2').textContent=title;$id('elite-cover-description').textContent=message;play.textContent=button;if(restartFn)play.onclick=restartFn}
  function splash(label,description,button='▶ START GAME'){cover.hidden=false;cover.querySelector('h2').textContent=label;$id('elite-cover-description').textContent=description;play.textContent=button}
  const loc=e=>{const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)*W/b.width,y:(e.clientY-b.top)*H/b.height}};
  cleanup=()=>{disposed=true;stop();for(const rm of listeners)rm();down.clear()};
  return{ctx,canvas,stage,cover,play,stat,restart,tip,down,on,loc,begin,stop,show,splash, setTick:f=>tick=f};
}

// ---- DRIFT CIRCUIT ------------------------------------------------------------
// Space/press turns clockwise; release drives straight at constant speed.
// Generated right-angle turns gradually spiral outward, keeping the course traversable.
function drift(){
 const g=init('DRIFT CIRCUIT','An endless floating road. Hold to turn RIGHT; release to go straight.',`<span><kbd>SPACE</kbd> / click / tap <b>hold</b> = turn right</span><span><b>release</b> = straight</span><span>Constant forward speed · fall off = restart</span>`);
 let car,points,score,coins,coinstates,cam,particles,seed,playing=false,flash=0,trackIndex=0;
 const SPEED=9.0,TURN=1.48,ROAD=6.9;
 function makeRoad(){points=[{x:0,z:-14},{x:0,z:20}];let p={...points[1]},dir=0;for(let i=0;i<30;i++){dir=(dir+1)%4;const length=31+Math.floor(i/4)*8+(i%3)*3;p={x:p.x+[0,1,0,-1][dir]*length,z:p.z+[1,0,-1,0][dir]*length};points.push(p)}}
 function append(){let p=points.at(-1),q=points.at(-2),dx=p.x-q.x,dz=p.z-q.z;const nx=dz!==0?(dz>0?1:-1):0,nz=dx!==0?(dx>0?-1:1):0;const i=points.length;points.push({x:p.x+nx*(35+Math.floor(i/4)*5),z:p.z+nz*(35+Math.floor(i/4)*5)})}
 function distSeg(x,z,a,b){let dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a.x-t*dx,z-a.z-t*dz)}
 function within(){let min=999;for(let i=Math.max(0,trackIndex-1);i<Math.min(points.length-1,trackIndex+3);i++)min=Math.min(min,distSeg(car.x,car.z,points[i],points[i+1]));return min<=ROAD/2-0.40}
 function restart(){makeRoad();car={x:0,z:-4,a:0,trail:[]};cam={x:0,z:0};score=0;coins=0;trackIndex=0;playing=true;flash=0;coinstates=new Set();particles=[];g.play.textContent='▶ START GAME';g.tip.textContent='Look toward the corner. Hold SPACE before the bend, release when you face the new road.';g.begin(update)}
 function toggleHold(isDown){if(isDown)g.down.add('Space');else g.down.delete('Space')}
 g.on(g.canvas,'pointerdown',e=>{e.preventDefault();g.canvas.setPointerCapture?.(e.pointerId);toggleHold(true)});
 for(const evt of ['pointerup','pointercancel','pointerleave'])g.on(g.canvas,evt,()=>toggleHold(false));
 const touch=document.createElement('button');touch.type='button';touch.className='elite-press';touch.textContent='HOLD TO TURN RIGHT ↱';g.stage.after(touch);g.on(touch,'pointerdown',e=>{e.preventDefault();touch.setPointerCapture?.(e.pointerId);toggleHold(true)});for(const evt of ['pointerup','pointercancel','pointerleave'])g.on(touch,evt,()=>toggleHold(false));
 function proj(x,z){const dx=x-cam.x,dz=z-cam.z;return{x:W/2+(dx-dz)*10.5,y:H*.54+(dx+dz)*4.9}}
 function pathQuad(a,b,width=ROAD){let dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=-dz/len*width/2,nz=dx/len*width/2;return [[a.x+nx,a.z+nz],[b.x+nx,b.z+nz],[b.x-nx,b.z-nz],[a.x-nx,a.z-nz]]}
 function mapped(poly,offset=0){return poly.map(([x,z])=>{const p=proj(x,z);return[p.x,p.y+offset]})}
 function drawCar(){const p=proj(car.x,car.z),an=car.a,head={x:Math.sin(an),z:Math.cos(an)},side={x:Math.cos(an),z:-Math.sin(an)};const get=(f,s,y=0)=>{let v=proj(car.x+head.x*f+side.x*s,car.z+head.z*f+side.z*s);return[v.x,v.y+y]};
   polygon(g.ctx,[get(-1.4,-.95,10),get(-1.4,.95,10),get(1.6,.95,10),get(1.6,-.95,10)],'#06122566');
   for(let s of [-1,1])for(let f of [-.9,1])polygon(g.ctx,[get(f-.45,s*1.05,-6),get(f-.45,s*.75,-6),get(f+.45,s*.75,-6),get(f+.45,s*1.05,-6)],'#10141c');
   polygon(g.ctx,[get(-1.35,-.8,-10),get(-1.35,.8,-10),get(1.4,.8,-10),get(1.4,-.8,-10)],'#f46352','#ffb3a1',1.6);
   polygon(g.ctx,[get(-.16,-.59,-11),get(-.16,.59,-11),get(.80,.59,-11),get(.80,-.59,-11)],'#71d4ed');
   polygon(g.ctx,[get(-1.23,-.65,-11),get(-1.23,.65,-11),get(-.79,.65,-11),get(-.79,-.65,-11)],'#a93951');
   for(const s of [-.53,.53]){const l=get(1.34,s,-12);circle(g.ctx,l[0],l[1],3.3,'#fff6c3')}
 }
 function draw(){const c=g.ctx;let sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#a9d1df');sky.addColorStop(.58,'#e2e0d5');sky.addColorStop(1,'#9ab5ae');rect(c,0,0,W,H,sky);
   // moving landscape grid and rolling clouds
   c.strokeStyle='#617b8580';c.lineWidth=1;for(let i=-14;i<22;i++){const p=proj(i*20-Math.round(cam.x/20)*20,-180),q=proj(i*20-Math.round(cam.x/20)*20,180);line(c,p.x,p.y,q.x,q.y,'#b0c3bf3f',1)}
   const pieces=[];for(let i=Math.max(0,trackIndex-1);i<Math.min(points.length-1,trackIndex+5);i++){const a=points[i],b=points[i+1];if(Math.abs(a.x-cam.x)>100&&Math.abs(b.x-cam.x)>100)continue;if(Math.abs(a.z-cam.z)>100&&Math.abs(b.z-cam.z)>100)continue;pieces.push([a,b])}
   for(const [a,b] of pieces){polygon(c,mapped(pathQuad(a,b),14),'#263c4d');polygon(c,mapped(pathQuad(a,b),7),'#506879');polygon(c,mapped(pathQuad(a,b)),'#7f939d','#d7e0c6',2.4);const d=Math.hypot(b.x-a.x,b.z-a.z);for(let j=3;j<d-2;j+=5){let t=j/d,x=lerp(a.x,b.x,t),z=lerp(a.z,b.z,t),p=proj(x,z);rr(c,p.x-2,p.y-1,4,3,1,'#dce7e8b9')}
    const side=pathQuad(a,b,ROAD-1.0);for(let j=6;j<d-5;j+=8){let t=j/d,x=lerp(a.x,b.x,t),z=lerp(a.z,b.z,t),p=proj(x,z);circle(c,p.x,p.y-4,2.5,'#f9dc8e')}
   }
   for(let i=Math.max(1,trackIndex);i<Math.min(points.length-1,trackIndex+5);i++){const p=points[i];if(Math.abs(p.x-cam.x)>95||Math.abs(p.z-cam.z)>95)continue;const pt=proj(p.x,p.z);polygon(c,mapped([[p.x-ROAD/2,p.z-ROAD/2],[p.x+ROAD/2,p.z-ROAD/2],[p.x+ROAD/2,p.z+ROAD/2],[p.x-ROAD/2,p.z+ROAD/2]],9),'#263c4d');polygon(c,mapped([[p.x-ROAD/2,p.z-ROAD/2],[p.x+ROAD/2,p.z-ROAD/2],[p.x+ROAD/2,p.z+ROAD/2],[p.x-ROAD/2,p.z+ROAD/2]]),'#8296a0','#d7e0c6',1);circle(c,pt.x,pt.y,3,'#fff1a5')}
   for(let i=Math.max(0,trackIndex-1);i<Math.min(points.length-1,trackIndex+5);i++){let a=points[i],b=points[i+1],len=Math.hypot(b.x-a.x,b.z-a.z);for(let j=11;j<len-4;j+=17){let key=i+':'+j;if(coinstates.has(key))continue;let x=lerp(a.x,b.x,j/len),z=lerp(a.z,b.z,j/len);if(Math.abs(x-cam.x)>55||Math.abs(z-cam.z)>55)continue;const p=proj(x,z);c.save();c.shadowColor='#ffe785';c.shadowBlur=16;circle(c,p.x,p.y-12,8,'#ffce69');circle(c,p.x,p.y-12,4,'#ffedac');c.restore()}}
   for(const p of particles){const v=proj(p.x,p.z);circle(c,v.x,v.y-9,p.r,`rgba(255,237,185,${p.life})`)}
   for(const v of car.trail){const pt=proj(v.x,v.z);circle(c,pt.x,pt.y+3,clamp(v.life*4,1,4),`rgba(247,250,241,${v.life*.4})`)}drawCar();
   rr(c,20,18,244,80,15,'#102034ba','#ffffff18');text(c,'DISTANCE',37,41,13,'#cce1e5');text(c,Math.floor(score)+' m',37,76,29,'#ffffff');rr(c,275,18,170,80,15,'#102034ba','#ffffff18');text(c,'BEST',292,41,13,'#cce1e5');text(c,getBest('drift')+' m',292,76,25,'#ffe39a');
   rr(c,752,18,188,66,14,'#102034ba','#ffffff18');text(c,`✦  ${coins} COINS`,775,52,21,'#ffe49d');
   text(c,g.down.has('Space')?'↱ TURNING RIGHT':'↑ DRIVING STRAIGHT',W/2,H-28,17,'#173947','center');
   if(flash>0){rect(c,0,0,W,H,`rgba(250,99,84,${flash*.30})`)}
 }
 function update(dt){const held=g.down.has('Space');car.a+= (held?TURN:0)*dt;car.x+=Math.sin(car.a)*SPEED*dt;car.z+=Math.cos(car.a)*SPEED*dt;score+=SPEED*dt;
   cam.x=lerp(cam.x,car.x+Math.sin(car.a)*5,clamp(dt*4.4,0,1));cam.z=lerp(cam.z,car.z+Math.cos(car.a)*5,clamp(dt*4.4,0,1));
   car.trail.push({x:car.x,z:car.z,life:1});if(car.trail.length>28)car.trail.shift();for(const p of car.trail)p.life-=dt*1.9;car.trail=car.trail.filter(p=>p.life>0);
   for(let i=Math.max(0,trackIndex-1);i<Math.min(points.length-1,trackIndex+4);i++){const a=points[i],b=points[i+1],len=Math.hypot(a.x-b.x,a.z-b.z);if(distSeg(car.x,car.z,a,b)>8)continue;for(let j=11;j<len-4;j+=17){let key=i+':'+j,x=lerp(a.x,b.x,j/len),z=lerp(a.z,b.z,j/len);if(!coinstates.has(key)&&Math.hypot(x-car.x,z-car.z)<1.8){coinstates.add(key);coins++;for(let n=0;n<10;n++)particles.push({x:x+rand(-1,1),z:z+rand(-1,1),life:1,r:rand(2,4)})}}}
   particles.forEach(p=>p.life-=dt*1.7);particles=particles.filter(p=>p.life>0);
   // Move the active segment forward once the car rounds the next corner.
   const a=points[trackIndex],b=points[trackIndex+1];
   if(a&&b){const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),progress=((car.x-a.x)*dx+(car.z-a.z)*dz)/len;
      if(progress>len-1.25&&trackIndex<points.length-2)trackIndex++;
   }
   if(Math.hypot(car.x-points.at(-1).x,car.z-points.at(-1).z)<170)append();
   if(!within()){flash=1;draw();g.show('OFF THE ROAD',`You drove ${Math.floor(score)} m and collected ${coins} coins. Best: ${saveBest('drift',Math.floor(score))} m.`,'↻ TRY AGAIN',restart);return}flash=Math.max(0,flash-dt);saveBest('drift',Math.floor(score));g.stat.textContent=`${Math.floor(score)} M · ${coins} COINS`;draw()}
 makeRoad();car={x:0,z:-4,a:0,trail:[]};cam={x:0,z:0};score=coins=0;coinstates=new Set();particles=[];draw();g.play.onclick=restart;g.restart.onclick=restart;
}

// ---- ORBIT RUN ---------------------------------------------------------------
// Perspective square tunnel, deterministic safe-path generation, floor-to-wall turns.
function runner(){
 const g=init('ORBIT RUN','Run across four sides of a broken space tunnel. Gravity changes when you cross a wall.',`<span><kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> <kbd>→</kbd> move</span><span>Move beyond edge to <b>rotate gravity</b></span><span><kbd>SPACE</kbd> / <kbd>↑</kbd> jump</span><span><kbd>R</kbd> restart</span>`);
 const c=g.ctx;let t,player,lane,face,rotation,jump,jumpV,coyote,tiles,mode='levels',level=1,distance=0,death=false,keysLast=new Set(),transition=0;
 // Rows contain 4 tunnel faces with 3 lanes each; missing squares are explicit.
 function tile(row,f,col){if(row<0)return true;let record=tiles.get(row);return !record||!record[f]||!record[f].includes(col)}
 function generate(to){for(let row=tiles.size;row<=to;row++){
   let missing=[[],[],[],[]];if(row>9&&row%5!==0){let diff=clamp(level+row/12,0,13);for(let f=0;f<4;f++){const chance=.045+diff*.007;for(let l=0;l<3;l++)if(Math.random()<chance)missing[f].push(l)}
    if(row%6===0){let f=(Math.floor(row/6)+level)%4;missing[f]=[0,1,2];missing[(f+1)%4]=[];}
    if(row%9===2){let f=Math.floor(row/9)%4;missing[f]=[1];}
    if(missing.every(m=>m.length===3))missing[0].pop();
   }tiles.set(row,missing)} }
 function restart(){t=0;lane=0;face=0;rotation=0;jump=0;jumpV=0;coyote=.08;tiles=new Map();level=1;distance=0;transition=0;generate(95);death=false;keysLast=new Set();g.tip.textContent='Steer across the tunnel. At either edge, the wall swings under your feet. Jump over holes.';g.begin(update)}
 function project(x,y,z){const s=890/(z+8);return [W/2+x*s,H*.47+y*s]}
 function faceVertex(f,x,y,z){ // each face arranged around tunnel, local x is -1.5..1.5
   let a=(f+rotation)*Math.PI/2;
   const px=x*Math.cos(a)+y*Math.sin(a),py=-x*Math.sin(a)+y*Math.cos(a);return project(px,py,z)
 }
 function tilePath(f,l,row){const z1=row-distance,z2=z1+1,x1=l-1.5,x2=l-.5;return [faceVertex(f,x1,1.52,z1),faceVertex(f,x2,1.52,z1),faceVertex(f,x2,1.52,z2),faceVertex(f,x1,1.52,z2)]}
 function draw(){const bg=c.createRadialGradient(W/2,H*.38,24,W/2,H*.48,640);bg.addColorStop(0,'#192b5f');bg.addColorStop(.62,'#0b102a');bg.addColorStop(1,'#060914');rect(c,0,0,W,H,bg);
   for(let i=0;i<65;i++){let x=(i*163.3+41)%W,y=(i*97.3+21)%H;circle(c,x,y,(i%4===0?2.0:.8),`rgba(204,229,255,${.12+(i%5)*.08})`)}
   let far=21;for(let row=Math.floor(distance)+far;row>=Math.floor(distance)-1;row--){for(let f=0;f<4;f++){for(let l=0;l<3;l++){
      if(!tile(row,f,l))continue;let p=tilePath(f,l,row);const index=(row+l+f)%3;polygon(c,p,index===0?'#4e61af':index===1?'#394b91':'#3f57a0','#97acfb',1.35);
      let center=faceVertex(f,l-1,1.5,row-distance+.5);if(row%13===0&&l===1){circle(c,center[0],center[1],2,'#d7e3ff')}
   }}}
   let grounded=jump<=.13;let py=H*.73-jump*62;
   // Shadow
   c.save();c.globalAlpha=.42;circle(c,W/2+lane*72,H*.79,17,'#081022');c.restore();
   let x=W/2+lane*72;
   c.save();c.translate(x,py);c.rotate(Math.sin(t*12)*.025);circle(c,0,-17,18,'#ffddba');rr(c,-16,-1,32,37,12,'#f8a97c');polygon(c,[[-12,7],[12,7],[19,34],[-19,34]],'#f5c26d');rr(c,-20,32,13,10,4,'#213665');rr(c,7,32,13,10,4,'#213665');circle(c,-6,-20,2.7,'#17223b');circle(c,6,-20,2.7,'#17223b');polygon(c,[[-18,-35],[2,-43],[18,-34],[14,-29],[-17,-28]],'#ad8fff');c.restore();
   rr(c,20,20,260,87,15,'#111b3ed9','#5363aa');text(c,'DISTANCE',40,46,13,'#a8beff');text(c,Math.floor(distance*4)+' m',39,84,31);rr(c,288,20,182,87,15,'#111b3ed9','#5363aa');text(c,'BEST',309,46,13,'#a8beff');text(c,getBest('run')+' m',309,84,28,'#f7df94');rr(c,753,20,184,87,15,'#111b3ed9','#5363aa');text(c,'LEVEL '+level,774,53,21,'#fff');text(c,'◈  INFINITE',774,84,15,'#b8c8ed');text(c,'RUN THE WALLS · JUMP THE GAPS',W/2,H-27,15,'#bfc6ff','center');
 }
 function update(dt){t+=dt;distance+=dt*(3.0+Math.min(1.5,Math.floor(distance/80)*.3));level=1+Math.floor(distance/35);generate(Math.floor(distance)+30);
   const left=g.down.has('ArrowLeft')||g.down.has('KeyA'),right=g.down.has('ArrowRight')||g.down.has('KeyD');const up=g.down.has('Space')||g.down.has('ArrowUp')||g.down.has('KeyW');
   let d=(right?1:0)-(left?1:0);lane+=d*dt*3.3;
   if(lane>1.5){lane=-1.48;face=(face+3)%4;rotation+=1;transition=.22}
   if(lane< -1.5){lane=1.48;face=(face+1)%4;rotation-=1;transition=.22}
   rotation=lerp(rotation,Math.round(rotation),clamp(dt*13,0,1)); // keep approximate continuous wall animation
   const row=Math.floor(distance+.55),col=clamp(Math.floor(lane+1.5),0,2);let valid=tile(row,face,col);
   if(valid)coyote=.14;else coyote-=dt;
   if(up&&!keysLast.has('jump')&&(valid||coyote>0)&&jump<=.1){jumpV=8.5;jump=.15;coyote=0}
   keysLast=up?new Set(['jump']):new Set();if(jump>0||jumpV>0){jump+=jumpV*dt;jumpV-=20*dt;if(jump<=0){jump=0;jumpV=0}}
   if(!valid&&jump<.30&&coyote<=-.075){draw();g.show('LOST IN SPACE',`Distance: ${Math.floor(distance*4)} m. Best: ${saveBest('run',Math.floor(distance*4))} m.`,'↻ TRY AGAIN',restart);return}
   saveBest('run',Math.floor(distance*4));g.stat.textContent=`${Math.floor(distance*4)} M · LEVEL ${level}`;draw();
 }
 g.play.onclick=restart;g.restart.onclick=restart;
 g.on(document,'keydown',e=>{if(e.code==='KeyR'&&!$id('modal').hidden)restart()});
 t=0;lane=0;face=0;rotation=0;jump=0;jumpV=0;distance=0;tiles=new Map();generate(55);draw();
}

// ---- SKYCOURT 1V1 -------------------------------------------------------------
// Local two-player and solo CPU; ballistic shots, rebounds, blocks, steals, dunks.
function hoops(){
 const g=init('SKYCOURT 1V1','One court. Two hoops. Shoot, dunk, contest and steal in a complete timed match.',`<span><b>PLAYER 1</b> <kbd>A</kbd>/<kbd>D</kbd> move · <kbd>W</kbd> jump · <kbd>G</kbd> shoot/steal</span><span><b>PLAYER 2</b> <kbd>←</kbd>/<kbd>→</kbd> move · <kbd>↑</kbd> jump · <kbd>L</kbd> shoot/steal</span>`);
 const c=g.ctx,GROUND=458,GRAV=1550,MIN=35,MAX=925;let players,ball,mode='cpu',clock,pts,particles,round,freeze,prev=new Set(),last=0,scoreFlash=0;
 const pos=(x,color,side)=>({x,y:GROUND,vx:0,vy:0,face:side,has:false,cool:0,charge:0,charging:false,glow:0,color,side,score:0,streak:0});
 const hoop=(side)=>({x:side===0?79:881,y:249,lower:271});
 function resetPositions(){players=[pos(275,'#60e5ce',1),pos(685,'#ffbc6c',-1)];ball={x:480,y:215,vx:0,vy:0,owner:-1,flight:0,lastShooter:-1,scored:false,groundTime:0};freeze=.65}
 function reset(){pts=[0,0];round=0;clock=90;resetPositions();particles=[];prev=new Set();scoreFlash=0;g.tip.textContent='Hold G or L to charge your shot, release near the peak of a jump. G/L without the ball = steal.';g.begin(update)}
 function grounded(p){return p.y>=GROUND-.1}
 function shoot(p,n){if(ball.owner!==n||freeze>0)return;p.has=false;ball.owner=-1;ball.x=p.x+27*p.face;ball.y=p.y-61;ball.lastShooter=n;ball.scored=false;ball.flight=0;const target=hoop(n===0?1:0);
   let dx=target.x-ball.x,flightTime=clamp(Math.abs(dx)/530,.58,1.44);const strength=clamp(p.charge/.65,0,1);const sweet=.58;
   const accuracy=(strength-sweet)*.26 + rand(-.022,.022);
   ball.vx=dx/flightTime*(1+accuracy);ball.vy=(target.y-ball.y-.5*GRAV*.62*flightTime*flightTime)/flightTime;
   if(Math.abs(dx)<105&&p.y<GROUND-42){ball.x=target.x;ball.y=target.lower-8;p.glow=.6;score(n,2);return}
   p.charge=0;p.charging=false;p.cool=.18;
 }
 function swipe(p,other){if(p.cool>0||freeze>0)return;p.cool=.6;p.glow=.19;
   if(ball.owner===other&&Math.abs(p.x-players[other].x)<80&&Math.abs(p.y-players[other].y)<68){players[other].has=false;ball.owner=-1;ball.x=players[other].x;ball.y=players[other].y-56;ball.vx=(p.x<ball.x?140:-140);ball.vy=-260}
 }
 function handlePlayer(n,dt){const p=players[n],other=players[1-n];let control=n===0?['KeyA','KeyD','KeyW','KeyG']:['ArrowLeft','ArrowRight','ArrowUp','KeyL'];const ai=n===1&&mode==='cpu';
   let move=0,wantJump=false,action=false;
   if(!ai){move=(g.down.has(control[1])?1:0)-(g.down.has(control[0])?1:0);wantJump=g.down.has(control[2]);action=g.down.has(control[3])}else{
     const target=ball.owner===1?hoop(0).x+115:ball.owner===0?players[0].x:ball.x;
     move=Math.abs(target-p.x)>33?Math.sign(target-p.x):0;
     const canShoot=ball.owner===1&&p.cool<=0;
     if(ball.owner===1){wantJump=(Math.abs(hoop(0).x-p.x)<290&&Math.abs(hoop(0).x-p.x)>90)||Math.random()<dt*.12;action=canShoot&&(p.charge>.34||Math.abs(hoop(0).x-p.x)<100)}
     else{wantJump=Math.random()<dt*.18;action=ball.owner===0&&Math.abs(p.x-players[0].x)<58&&p.cool<=0}
   }
   p.vx=lerp(p.vx,move*300,clamp(dt*12,0,1));p.x=clamp(p.x+p.vx*dt,MIN+15,MAX-15);if(move!==0)p.face=move;
   if(wantJump&&grounded(p)){p.vy=-660;p.y=GROUND-1}
   p.vy+=GRAV*dt;p.y=Math.min(GROUND,p.y+p.vy*dt);if(p.y>=GROUND)p.vy=0;
   p.cool=Math.max(0,p.cool-dt);p.glow=Math.max(0,p.glow-dt);
   let key=control[3],pressed=action&&!p.charging;
   if(ball.owner===n){p.has=true;if(action){p.charging=true;p.charge=Math.min(.75,p.charge+dt)}else if(p.charging){shoot(p,n)}else if(ai&&Math.abs(hoop(0).x-p.x)<115){p.charge=.39;shoot(p,n)}}
   else{p.has=false;p.charge=0;p.charging=false;if((ai&&action)||(action&&!prev.has(key)))swipe(p,1-n)}
   if(action)prev.add(key);else prev.delete(key);
 }
 function catchBall(){if(ball.owner!==-1||freeze>0)return;for(let i=0;i<2;i++){const p=players[i];if(Math.abs(ball.x-p.x)<30&&Math.abs(ball.y-(p.y-55))<65){ball.owner=i;ball.vx=ball.vy=0;p.has=true;return}}}
 function score(n,value){pts[n]+=value;players[n].streak++;players[1-n].streak=0;scoreFlash=1;for(let i=0;i<32;i++)particles.push({x:ball.x,y:ball.y,vx:rand(-260,260),vy:rand(-340,-55),life:rand(.35,.75),color:i%2?'#fdcf83':'#79eaca'});round++;resetPositions();freeze=1.05;g.tip.textContent=`${n===0?'MINT':'GOLD'} SCORES +${value}! Tip off in one second.`}
 function checkHoops(ox,oy){for(let side=0;side<2;side++){const goal=hoop(side),scorer=side===0?1:0;
   if(ball.owner===-1&&ball.lastShooter===scorer&&!ball.scored&&ball.vy>0&&oy<goal.lower-4&&ball.y>=goal.lower-4&&ball.x>goal.x-24&&ball.x<goal.x+24){ball.scored=true;let value=Math.abs(players[scorer].x-goal.x)>340?3:2;score(scorer,value);return true}
   // backboard and rim (keeps shots bouncing and allows rebounds)
   const bx=side===0?40:920;if(ball.x>bx-7&&ball.x<bx+7&&ball.y>200&&ball.y<268){ball.vx*=-.83;ball.x+=Math.sign(ball.vx)*7}
   for(let rx of [goal.x-22,goal.x+22])if(Math.abs(ball.x-rx)<11&&Math.abs(ball.y-goal.lower)<11&&ball.vy>0){ball.vy=-Math.abs(ball.vy)*.60;ball.vx+=(ball.x-rx)*6}
 }return false}
 function update(dt){if(freeze>0)freeze=Math.max(0,freeze-dt);else clock=Math.max(0,clock-dt);
   handlePlayer(0,dt);handlePlayer(1,dt);
   if(ball.owner>=0){let p=players[ball.owner];ball.x=p.x+25*p.face;ball.y=p.y-58+Math.sin(performance.now()/90)*3}
   else{
     const ox=ball.x,oy=ball.y;ball.vy+=GRAV*.62*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=Math.pow(.996,dt*60);
     if(ball.y>GROUND-12){ball.y=GROUND-12;ball.vy=-Math.abs(ball.vy)*.63;ball.vx*=.76;if(Math.abs(ball.vy)<85)ball.vy=0}
     if(ball.x<20||ball.x>940){ball.x=clamp(ball.x,20,940);ball.vx*=-.76}
     if(checkHoops(ox,oy))return draw();catchBall();ball.groundTime+=dt;
     if(ball.groundTime>8){ball.x=480;ball.y=240;ball.vx=0;ball.vy=100;ball.groundTime=0}
   }
   for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=700*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);scoreFlash=Math.max(0,scoreFlash-dt*2);
   g.stat.textContent=`MINT ${pts[0]} : ${pts[1]} GOLD · ${Math.ceil(clock)}s`;
   if(clock<=0){draw();g.show(pts[0]===pts[1]?'DRAW!':pts[0]>pts[1]?'MINT WINS!':mode==='cpu'?'CPU WINS!':'GOLD WINS!',`Final score ${pts[0]} – ${pts[1]}. ${mode==='cpu'?'Try beating the computer!':'Run it back!'}`,'↻ REMATCH',reset);return}
   draw()}
 function drawPlayer(p,n){const cx=p.x,cy=p.y;const facing=p.face;
   circle(c,cx+7,GROUND+1,21,'#0a17335d');
   const jumpLean=p.y<GROUND-1?-9:Math.sin(performance.now()/95+n)*3;
   c.save();c.translate(cx,cy);c.rotate(-p.vx/5500);
   // sneakers + shorts
   rr(c,-25,-16+jumpLean/2,24,14,6,'#263454');rr(c,3,-16-jumpLean/2,24,14,6,'#263454');rr(c,-17,-44,34,24,6,'#fff8e7');
   rr(c,-22,-94,44,54,16,p.color);line(c,-20,-52,20,-52,'#ffffffaa',2);
   c.save();c.scale(facing,1);rr(c,14,-83,17,17,8,'#f5b895');c.restore();
   circle(c,0,-112,25,n===0?'#bf795f':'#845c51');circle(c,0,-116,22,'#ffc59e');
   rr(c,-24,-139,48,16,8,n===0?'#54d5ac':'#f6b35a');rr(c,-22,-138,44,9,5,n===0?'#39a884':'#b46730');
   circle(c,facing*7,-116,2.5,'#152039');circle(c,facing*15,-116,2.5,'#152039');line(c,facing*5,-105,facing*16,-106,'#9c4e48',2);
   text(c,String(n+1),0,-71,23,n===0?'#17344a':'#633e2b','center');
   if(p.glow>0)circle(c,facing*35,-86,7,'#fff2a5');
   if(ball.owner===n&&p.charge>0){rr(c,-30,-160,60,7,4,'#233850');rr(c,-30,-160,60*p.charge/.75,7,4,p.charge>.35?'#91ffe3':'#ffe1a2')}
   c.restore();
 }
 function draw(){const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#202c63');sky.addColorStop(.62,'#51569a');sky.addColorStop(1,'#ffc4b1');rect(c,0,0,W,H,sky);
   // crowd and stadium
   circle(c,770,77,47,'#ffddab9c');rr(c,0,95,W,265,0,'#172656');for(let i=0;i<40;i++){let x=(i*43+5)%W,y=145+(i*41)%200;circle(c,x,y,10,['#6175b7','#de7e91','#96d0c8','#ffd89a'][i%4]);circle(c,x-2,y-3,4,'#d7b0a2')}
   rr(c,0,354,W,106,0,'#23385a');for(let i=0;i<25;i++)line(c,i*43,351,i*43+22,460,'#ffffff10',1);
   const floor=c.createLinearGradient(0,GROUND,0,H);floor.addColorStop(0,'#e2a16d');floor.addColorStop(1,'#a96956');rect(c,0,GROUND,W,H-GROUND,floor);line(c,0,GROUND,W,GROUND,'#f5e5b2',5);
   c.strokeStyle='#f5e1bcaa';c.lineWidth=3;c.beginPath();c.arc(480,GROUND+66,95,Math.PI,TAU);c.stroke();line(c,480,GROUND,480,H,'#fff4da80',3);
   for(const s of [0,1]){const h=hoop(s),bx=s===0?40:920;rr(c,bx-7,200,14,75,3,'#f7f8fc');rr(c,bx-15,230,30,14,4,'#c6d7ec');line(c,h.x-23,h.lower,h.x+23,h.lower,'#ff7550',8);for(let i=-2;i<=2;i++)line(c,h.x+i*8,h.lower+3,h.x+i*5,h.lower+39,'#eef1f5a8',1.6);line(c,h.x-20,h.lower+39,h.x+20,h.lower+39,'#e4e5ef91',1.6)}
   drawPlayer(players[0],0);drawPlayer(players[1],1);
   c.save();c.shadowColor='#301b16';c.shadowBlur=8;circle(c,ball.x,ball.y,13,'#f1a043');c.restore();line(c,ball.x-11,ball.y,ball.x+11,ball.y,'#6e4029',2);line(c,ball.x,ball.y-12,ball.x,ball.y+12,'#6e4029',2);c.strokeStyle='#6e4029';c.lineWidth=1.8;c.beginPath();c.arc(ball.x,ball.y,8,Math.PI/2,Math.PI*1.5);c.stroke();
   for(const p of particles)circle(c,p.x,p.y,5*p.life,p.color);
   rr(c,352,17,256,89,16,'#131d42e8','#6e8ac1');text(c,String(pts[0]),411,67,49,'#81ffe7','center');text(c,'-',480,67,36,'#b2c5d7','center');text(c,String(pts[1]),549,67,49,'#ffd18a','center');
   rr(c,20,18,230,79,15,'#121c41c8','#6477ae');text(c,mode==='cpu'?'PLAYER vs CPU':'LOCAL 2 PLAYERS',40,41,15,'#a2eade');text(c,`${Math.floor(clock/60)}:${String(Math.ceil(clock)%60).padStart(2,'0')}`,40,77,30);
   if(scoreFlash>0){rr(c,690,35,250,57,10,`rgba(237,196,123,${scoreFlash*.38})`);text(c,'BUCKET!  + POINTS',815,64,19,'#fff','center')}
   text(c,'A / D / W / G',204,H-28,16,'#fff3dc','center');text(c,mode==='cpu'?'CPU OPPONENT':'← / → / ↑ / L',756,H-28,16,'#fff3dc','center');
 }
 function choose(){g.stop();g.splash('SKYCOURT 1V1','Play a quick match against CPU or challenge someone on the same keyboard. Hold G/L to charge a shot, then release.','▶ VS CPU');g.play.onclick=()=>{mode='cpu';reset()};
   let alt=$id('elite-versus');if(!alt){alt=document.createElement('button');alt.id='elite-versus';alt.className='elite-secondary';alt.textContent='👥 LOCAL 2 PLAYER';g.play.after(alt)}alt.onclick=()=>{mode='local';reset()};g.restart.onclick=()=>{if(g.cover.hidden)reset();else choose()};resetPositions();pts=[0,0];clock=90;particles=[];draw()}
 choose();
}

// ---- NIGHT WATCH --------------------------------------------------------------
// Original non-graphic security-room survival: cameras, two doors, lights, battery, enemy paths.
function night(){
 const g=init('NIGHT WATCH','Make it to 6 AM. Manage cameras, hall lights and doors without draining the power.',`<span><kbd>SPACE</kbd> cameras</span><span><kbd>Q</kbd>/<kbd>E</kbd> left/right door</span><span><kbd>Z</kbd>/<kbd>C</kbd> left/right light</span><span><kbd>1</kbd>–<kbd>6</kbd> switch camera</span>`);
 const c=g.ctx;let elapsed,battery,doors,lights,cam,view,agents,nightNo=1,moves,staticAmt,noise,blackout,scare,won,lastKey=new Set(),lastTick=0;
 const ROOMS=['Showroom','West Gallery','East Gallery','Storage','West Hall','East Hall'];
 const ENEMIES=[{name:'Moth',col:'#eac88c',route:[0,1,4,6],dir:0},{name:'Marble',col:'#90d5ec',route:[0,2,5,7],dir:1}];
 let nightLength=205;
 function start(){elapsed=0;battery=100;doors=[false,false];lights=[false,false];cam=0;view=false;agents=ENEMIES.map((e,i)=>({...e,stage:0,step:rand(7,12)+i*4,alert:0}));moves=0;staticAmt=0;noise=0;blackout=0;scare=false;won=false;lastKey=new Set();g.tip.textContent='Camera up = more power. Lights help you spot threats. Doors stop visitors but drain the battery.';g.begin(update)}
 function press(code){if(code==='Space')view=!view;if(code==='KeyQ'&&battery>0)doors[0]=!doors[0];if(code==='KeyE'&&battery>0)doors[1]=!doors[1];if(code==='KeyZ'&&battery>0)lights[0]=!lights[0];if(code==='KeyC'&&battery>0)lights[1]=!lights[1];if(/^Digit[1-6]$/.test(code)) {view=true;cam=Number(code.slice(-1))-1}}
 g.on(g.canvas,'pointerdown',e=>{let p=g.loc(e);if(p.y<440)return;if(p.x<240)press('KeyQ');else if(p.x<420)press('KeyZ');else if(p.x<540)press('Space');else if(p.x<720)press('KeyC');else press('KeyE')});
 const group=document.createElement('div');group.className='elite-actions';group.innerHTML=`<button data-night="KeyQ">Q · LEFT DOOR</button><button data-night="KeyZ">Z · LEFT LIGHT</button><button data-night="Space">SPACE · CAMERAS</button><button data-night="KeyC">C · RIGHT LIGHT</button><button data-night="KeyE">E · RIGHT DOOR</button>`;g.stage.after(group);group.querySelectorAll('[data-night]').forEach(btn=>g.on(btn,'click',()=>press(btn.dataset.night)));
 function jumpScare(){scare=true;draw();g.show('SHIFT OVER','Something got into the office. You made it to '+(12+Math.floor(elapsed/nightLength*6)===12?'12':Math.floor(elapsed/nightLength*6))+' AM.','↻ RETRY NIGHT',start)}
 function win(){won=true;saveBest('night',nightNo);draw();g.show('6:00 AM — SURVIVED!',`Night ${nightNo} complete with ${Math.floor(battery)}% power remaining.`,'▶ NEXT NIGHT',()=>{nightNo=clamp(nightNo+1,1,5);start()})}
 function update(dt){elapsed+=dt;if(elapsed>=nightLength){win();return}
   const used=(.13+(view?.13:0)+(doors[0]?.18:0)+(doors[1]?.18:0)+(lights[0]?.21:0)+(lights[1]?.21:0))*dt;
   battery=Math.max(0,battery-used*1.55);if(battery<=0){doors=[false,false];lights=[false,false];view=false;blackout+=dt;if(blackout>13){jumpScare();return}}
   for(const a of agents){a.step-=dt*(1+nightNo*.09);if(a.step<0){a.step=rand(7.5,12)-(elapsed/nightLength*2);
     if(a.stage<3){a.stage+=1;staticAmt=.95}
     else {const side=a.dir;if(doors[side]){a.stage=0;noise=.7;staticAmt=.95}else{a.alert+=1;if(a.alert>1){jumpScare();return}}}}
     if(a.stage===3&&lights[a.dir])noise=.5;
   }
   for(const code of ['Space','KeyQ','KeyE','KeyZ','KeyC','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6'])if(g.down.has(code)&&!lastKey.has(code))press(code);lastKey=new Set(g.down);
   staticAmt=Math.max(0,staticAmt-dt);noise=Math.max(0,noise-dt);
   const hour=Math.min(5,Math.floor(elapsed/nightLength*6));g.stat.textContent=`${hour===0?'12':hour} AM · POWER ${Math.floor(battery)}%`;draw()}
 function face(x,y,col,stage=0){c.save();c.translate(x,y);let scale=stage>1?1.6:1.0;c.scale(scale,scale);
   circle(c,0,0,45,col);polygon(c,[[-38,-18],[-49,-63],[-13,-40]],col);polygon(c,[[38,-18],[48,-63],[13,-40]],col);circle(c,-16,-7,9,'#0d1928');circle(c,16,-7,9,'#0d1928');circle(c,-14,-7,3,'#fef0bb');circle(c,18,-7,3,'#fef0bb');polygon(c,[[-8,15],[0,8],[8,15],[0,19]],'#251a2b');line(c,-12,29,12,29,'#201a2c',3);c.restore()}
 function drawOffice(){const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0d141d');bg.addColorStop(1,'#212537');rect(c,0,0,W,H,bg);
   for(let i=0;i<16;i++)line(c,i*70,0,i*70+40,H,'#ffffff06',2);
   rr(c,204,93,550,320,0,'#111826','#334656');rr(c,256,125,446,220,0,'#1c2534','#394756');
   rr(c,323,135,310,148,4,'#070d16');text(c,'PLAYROOM SECURITY',478,161,14,'#7ea6b1','center');text(c,'KEEP THE POWER ON',478,188,22,'#cfceab','center');text(c,'◈  ◈  ◈',478,229,40,'#475f6d','center');
   for(let side=0;side<2;side++){let x=side===0?25:796,w=138;rr(c,x,80,w,345,8,'#101922','#3e4c5c');rr(c,x+16,96,w-32,313,1,doors[side]?'#394653':'#05080f');if(doors[side]){for(let y=105;y<395;y+=26)line(c,x+19,y,x+w-20,y,'#87909a44',2)}
     else{let threat=agents.some(a=>a.dir===side&&a.stage>=3);if(lights[side]){rr(c,x+20,103,w-40,284,1,'#4d4850');if(threat)face(x+w/2,270,agents.find(a=>a.dir===side&&a.stage>=3).col,2);else text(c,'CLEAR',x+w/2,300,16,'#e1d3b7','center')}}
     rr(c,x+45,434,48,26,4,doors[side]?'#ff8469':'#519e91');text(c,side===0?'LEFT':'RIGHT',x+w/2,48,15,'#c4cbd8','center')}
   polygon(c,[[223,400],[737,400],[867,H],[95,H]],'#293544');rr(c,280,370,400,102,9,'#303849','#5d6b78');rr(c,426,318,115,79,8,'#080f1a','#445766');rect(c,436,326,95,56,'#203d43');text(c,'CAM',484,354,19,'#71d5aa','center');rr(c,407,455,145,21,8,'#111b2b');text(c,blackout>0?'POWER OUT':'STAY ALERT',480,464,13,blackout>0?'#fa8368':'#7acdad','center')}
 function drawCameras(){rect(c,0,0,W,H,'#0d141a');const grd=c.createRadialGradient(465,256,15,480,265,500);grd.addColorStop(0,'#35424d');grd.addColorStop(1,'#12161d');rect(c,20,19,920,427,grd);
   // Original illustrated security-camera scenes, not copied photos
   for(let i=0;i<9;i++){line(c,40+i*120,34,40+i*120,438,'#a1c1c20d',3);line(c,40,50+i*49,927,50+i*49,'#a1c1c213',1)}
   const names=ROOMS[cam];text(c,'CAM '+String(cam+1).padStart(2,'0')+' / '+names.toUpperCase(),56,68,25,'#cee0d9');circle(c,885,60,7,'#fd5e57');text(c,'REC',855,60,16,'#f1c3b8','right');
   if(cam===0){for(let i=0;i<3;i++){rr(c,155+i*230,140,145,195,22,'#354b55');circle(c,230+i*230,176,37,['#8fa9b0','#9d8a78','#8e8699'][i]);rr(c,192+i*230,234,76,82,12,['#526772','#796e64','#655a77'][i])}}
   else if(cam===1||cam===2){polygon(c,[[100,440],[300,118],[661,118],[860,440]],'#242e33');rr(c,400,126,162,237,3,'#0b1017');rr(c,425,160,110,174,2,'#181f25');text(c,'EXIT',480,149,17,'#d7b39e','center')}
   else if(cam===3){for(let i=0;i<4;i++){rr(c,110+i*175,198,113,195,7,'#5e554d');line(c,110+i*175,266,223+i*175,266,'#ffffff16',5)}}
   else{polygon(c,[[80,445],[277,140],[687,140],[884,445]],'#1c2731');rr(c,370,172,222,225,3,'#060d14')}
   for(const a of agents){if(a.stage<3&&a.route[a.stage]===cam)face(cam===0?(a.dir===0?330:620):cam===1||cam===2?482:550,298,a.col,a.stage)}
   for(let y=0;y<H;y+=4){rect(c,0,y,W,1,'#faffff0b')}
   for(let i=0;i<180;i++){let x=(i*127+Math.floor(elapsed*120)*7)%W,y=(i*53+Math.floor(elapsed*60)*11)%H;rect(c,x,y,rand(1,11),1,`rgba(240,255,255,${Math.random()*(.05+staticAmt*.19)})`)}
   rr(c,713,180,207,236,8,'#141e29db','#596f73');text(c,'CAMERA SELECT',734,204,14,'#cededf');ROOMS.forEach((room,i)=>{let x=728+i%2*93,y=221+Math.floor(i/2)*56;rr(c,x,y,82,42,7,cam===i?'#7dc9ba':'#3d5261');text(c,String(i+1),x+41,y+22,18,cam===i?'#15333a':'#f8fbff','center')});text(c,'SPACE · LOWER MONITOR',480,H-82,18,'#b4dfd9','center')}
 function draw(){if(view&&battery>0)drawCameras();else drawOffice();
   rr(c,15,7,197,55,10,'#07131ce8','#546371');text(c,'NIGHT '+nightNo,30,23,12,'#9eb7c3');text(c,(elapsed/nightLength<1/6?'12':Math.floor(elapsed/nightLength*6))+':00 AM',30,46,25,'#fff');
   rr(c,748,7,197,55,10,'#07131ce8','#546371');text(c,'POWER REMAINING',765,23,12,'#9eb7c3');rect(c,764,39,150,12,'#304554');rect(c,764,39,150*battery/100,12,battery<24?'#fa6f62':'#a2e5a7');
   rr(c,15,482,930,49,12,'#07131ce8','#384e58');const status=[`Q ${doors[0]?'CLOSED':'OPEN'}`,`Z ${lights[0]?'ON':'OFF'}`,view?'SPACE CAM UP':'SPACE CAM DOWN',`C ${lights[1]?'ON':'OFF'}`,`E ${doors[1]?'CLOSED':'OPEN'}`];status.forEach((s,i)=>text(c,s,105+188*i,507,14,i===0&&doors[0]||i===4&&doors[1]?'#ffa891':'#b7cad8','center'));
   if(noise>0){rect(c,0,0,W,H,`rgba(255,189,119,${noise*.11})`)}if(blackout>0){rect(c,0,0,W,H,'#030408b6');text(c,'POWER FAILURE',480,266,44,'#c2b5ae','center')}
 }
 function choose(){g.splash('NIGHT WATCH',`A complete ${Math.round(nightLength/60)}-minute security shift. Watch the rooms, close doors only when necessary, survive from midnight to 6 AM.`,'▶ START NIGHT 1');g.play.onclick=start;g.restart.onclick=start;g.tip.textContent='A short original horror game; spooky atmosphere, no graphic content.';
   elapsed=0;battery=100;doors=[false,false];lights=[false,false];cam=0;view=false;agents=ENEMIES.map(e=>({...e,stage:0,step:10,alert:0}));blackout=0;noise=0;draw()}
 choose();
}

// Interactive game cards were rebound in legacy.js; override dispatcher after all scripts.
const names={drift:'Drift Circuit',tunnel:'Orbit Run',duel:'Skycourt 1v1',night:'Night Watch'};
const games={drift, tunnel:runner,duel:hoops,night};
window.openGame=(name)=>{
 if(!games[name])return;
 cleanup();cleanup=()=>{};currentGame=name;$id('modal').hidden=false;document.body.style.overflow='hidden';$id('modal-title').textContent=names[name];$id('game-ui').innerHTML='';games[name]();
};
})();
