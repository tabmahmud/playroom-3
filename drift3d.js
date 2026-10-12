/* Drift Switch: independently written, procedural 3D browser driving game.
   No Drift Boss assets or third-party game code are used. */
window.driftGame = function drift3dGame() {
  const KEY='playroom-drift-economy-v2';
  const CARS=[
    {id:'starter',name:'Starter',price:0,color:'#ff7869',control:1.0,safety:0,icon:'🚗'},
    {id:'taxi',name:'City Taxi',price:120,color:'#ffca56',control:1.13,safety:.19,icon:'🚕'},
    {id:'sport',name:'Sport Coupe',price:280,color:'#66d7f9',control:1.28,safety:.30,icon:'🏎️'},
    {id:'fire',name:'Fire Truck',price:500,color:'#f25354',control:1.42,safety:.50,icon:'🚒'}
  ];
  const BOOSTS=[{id:'revive',name:'🛟 Insurance / revive',cost:70},
                {id:'double',name:'✕2 Distance Score',cost:55},
                {id:'rush',name:'🪙 Double Coins',cost:45}];
  const defaultSave={coins:0,owned:['starter'],car:'starter',boosts:{revive:0,double:0,rush:0}};
  let saveData={...defaultSave,boosts:{...defaultSave.boosts}};
  try{let data=JSON.parse(localStorage.getItem(KEY));if(data&&typeof data==='object')saveData={...saveData,...data,boosts:{...saveData.boosts,...data.boosts}}}catch{}
  function store(){try{localStorage.setItem(KEY,JSON.stringify(saveData))}catch{}}
  const markup=`<div class="game-toolbar drift3d-toolbar">
    <span class="stat">DISTANCE <b id="d-score">0</b></span>
    <span class="stat">BEST <b id="d-best">${best('drift-switch',0)}</b></span>
    <span class="stat">🪙 <b id="d-coins">${saveData.coins}</b></span>
    <button class="small-btn" id="d-reset">↻ Restart</button>
  </div>
  <div class="canvas-wrap drift3d-stage" id="drift3d-stage">
    <div class="drift-sun"></div><div class="drift-haze"></div>
    <canvas id="d-canvas" width="900" height="540" aria-label="3D drifting game, elevated procedurally generated road with car and coins"></canvas>
    <div class="drift-hud" id="d-hud"><span class="drift-turn" id="d-turn">ONE BUTTON · PERFECT TIMING</span><span class="drift-warning" id="d-warning">HOLD = TURN RIGHT</span></div>
    <div class="game-overlay" id="d-overlay"><span class="drift-pill">PLAYROOM ORIGINAL · PROCEDURAL 3D</span><strong>DRIFT SWITCH — REBUILT</strong>
      <p>One-button arcade driving. <b>Hold SPACE / mouse / touch to carve RIGHT. Release to go STRAIGHT.</b> Cut corners cleanly, stay on the tiles, grab coins and beat your best run.</p>
      <button class="small-btn" id="d-start">▶ PLAY</button></div>
  </div>
  <div class="rebuilt-help drift-help"><span><span class="keycap">Space</span> / hold click = turn RIGHT</span><span>·</span><span>Release = go STRAIGHT</span><span>·</span><span>Constant forward speed</span></div>
  <div class="mobile-steer"><button type="button" id="d-right" style="width:100%">↱ HOLD TO TURN RIGHT · RELEASE TO GO STRAIGHT</button></div>
  <div class="game-feedback" id="d-feedback">Approach each turn, hold to round the corner, then release to straighten. One bad turn and you fall!</div>
  <section class="garage-shell"><div class="garage-header">🚘 GARAGE · PERMANENT CAR UNLOCKS</div><div class="garage-row" id="d-garage"></div>
  <div class="garage-header" style="margin-top:13px">⚡ POWER UPS</div><div class="garage-row" id="d-boosts"></div></section>`;
  ui(markup);
  const $id=id=>document.getElementById(id),c=$id('d-canvas'),overlay=$id('d-overlay');
  let gl=c.getContext('webgl',{alpha:true,antialias:true,powerPreference:'default'})||c.getContext('experimental-webgl',{alpha:true,antialias:true});
  let fallbackCtx=null;
  let active=false,raf=0,last=0,dist=0,score=0,earned=0,off=0,vel=0,steerL=false,steerR=false,space=false,revived=false,boostDouble=false,boostRush=false,reason='',coinHits=new Set();
  let camAt=[0,0,0],camEye=[0,0,0],camReady=false;
  let driveX=0,driveZ=-8,driveYaw=0,covered=0,crashFlash=0,turningLast=false;
  let roadNodes=[],route=[],segLengths=[],routeLength=0,generator=0x3254ef11,sideSign=1;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),mix=(a,b,t)=>a+(b-a)*t;
  const PI=Math.PI;
  const random=()=>{generator=(Math.imul(1664525,generator)+1013904223)|0;return (generator>>>0)/4294967296};
  const col=(hex)=>{let n=parseInt(hex.replace('#',''),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};
  const vec=(x,y,z)=>[x,y,z];
  const addV=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  const subV=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=a=>{let n=Math.hypot(...a)||1;return a.map(x=>x/n)};
  function pathReset(){
    generator=((Math.random()*0xFFFFFFFF)>>>0)||0x3254ef11;sideSign=1;roadNodes=[{x:0,z:-8},{x:0,z:17}];
    for(let i=0;i<10;i++)appendRoadNode();rebuildRoute();
  }
  function appendRoadNode(){
    const a=roadNodes.at(-2),b=roadNodes.at(-1);
    const forward=Math.abs(b.z-a.z)>Math.abs(b.x-a.x);
    const length=19+Math.floor(random()*13)+(roadNodes.length%4===0?7:0);
    // Drift Boss-style: only clockwise RIGHT turns, with long straights to react.
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
    roadNodes.push({x:b.x+(dz/len)*length,z:b.z-(dx/len)*length});
  }
  function rebuildRoute(){
    // Rounded corner route inside actual L-shaped 3D road platforms.
    route=[];segLengths=[];routeLength=0;
    const push=p=>{if(route.length){let q=route.at(-1);let d=Math.hypot(p.x-q.x,p.z-q.z);if(d<.0001)return;routeLength+=d}route.push({...p,s:routeLength})};
    const normalize2=(dx,dz)=>{const n=Math.hypot(dx,dz)||1;return {x:dx/n,z:dz/n}};
    function line(a,b){const L=Math.hypot(b.x-a.x,b.z-a.z);const n=Math.max(1,Math.ceil(L/.75));for(let j=0;j<=n;j++)push({x:mix(a.x,b.x,j/n),z:mix(a.z,b.z,j/n)})}
    let at=roadNodes[0];
    for(let i=1;i<roadNodes.length-1;i++){
      const corner=roadNodes[i],next=roadNodes[i+1],prev=roadNodes[i-1];
      const din=normalize2(corner.x-prev.x,corner.z-prev.z),dout=normalize2(next.x-corner.x,next.z-corner.z);
      const r=3.25,from={x:corner.x-din.x*r,z:corner.z-din.z*r},to={x:corner.x+dout.x*r,z:corner.z+dout.z*r};
      line(at,from);
      for(let j=1;j<=10;j++){let t=j/10,k=1-t;push({x:k*k*from.x+2*k*t*corner.x+t*t*to.x,z:k*k*from.z+2*k*t*corner.z+t*t*to.z})}
      at=to;
    }
    line(at,roadNodes.at(-1));
  }
  function onRoute(s){
    if(!route.length)return{x:0,z:0,dx:0,dz:1};
    s=clamp(s,0,routeLength-.001);let lo=0,hi=route.length-1;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(route[mid].s<s)lo=mid;else hi=mid}
    const a=route[lo],b=route[hi],f=(s-a.s)/Math.max(.00001,b.s-a.s),dx=(b.x-a.x),dz=(b.z-a.z),len=Math.hypot(dx,dz)||1;
    return{x:mix(a.x,b.x,f),z:mix(a.z,b.z,f),dx:dx/len,dz:dz/len};
  }
  function nextTurn(){let p=onRoute(dist);for(let i=1;i<roadNodes.length-1;i++){
    const a=roadNodes[i],b=roadNodes[i+1];const near=route.find(q=>Math.hypot(q.x-a.x,q.z-a.z)<.8);
    if(!near||near.s<dist+1)continue;
    let before=onRoute(Math.max(0,near.s-3)),after=onRoute(near.s+3);
    let cross2=before.dx*after.dz-before.dz*after.dx;
    return{distance:Math.max(0,Math.round(near.s-dist)),left:cross2>0};
  }return null;}
  function ensureRoad(){
    if(dist+280>routeLength){for(let i=0;i<7;i++)appendRoadNode();rebuildRoute()}
  }
  // Minimal self-contained WebGL renderer; no runtime dependencies or network requests.
  let program,ap,ac,uvp,ueye,positionBuffer,colorBuffer;
  const geom={verts:[],colors:[]};
  function shader(type,source){let o=gl.createShader(type);gl.shaderSource(o,source);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(o));return o}
  function initializeRenderer(){
    if(!gl){fallbackCtx=c.getContext('2d');return Boolean(fallbackCtx)}
    try{
      const vs=`attribute vec3 a_position;attribute vec3 a_color;uniform mat4 u_vp;uniform vec3 u_eye;varying vec3 v_color;varying float v_distance;
      void main(){vec4 pos=vec4(a_position,1.0);gl_Position=u_vp*pos;v_color=a_color;v_distance=distance(a_position,u_eye);}`;
      const fs=`precision mediump float;varying vec3 v_color;varying float v_distance;
      void main(){float f=smoothstep(30.0,98.0,v_distance);vec3 color=mix(v_color,vec3(0.60,0.76,0.78),f*.79);gl_FragColor=vec4(color,1.0);}`;
      program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      ap=gl.getAttribLocation(program,'a_position');ac=gl.getAttribLocation(program,'a_color');uvp=gl.getUniformLocation(program,'u_vp');ueye=gl.getUniformLocation(program,'u_eye');
      positionBuffer=gl.createBuffer();colorBuffer=gl.createBuffer();gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
      return true;
    }catch(err){console.warn('3D graphics unavailable',err);return false}
  }
  function face(v1,v2,v3,color){for(let p of [v1,v2,v3]){geom.verts.push(...p);geom.colors.push(...color)}}
  function quad(a,b,c,d,color){face(a,b,c,color);face(a,c,d,color)}
  function box(x,y,z,w,h,l,yaw,base,opts={}){
    const c=Math.cos(yaw),s=Math.sin(yaw),hx=w/2,hy=h/2,hz=l/2;
    function P(i,j,k){return[x+i*c+k*s,y+j,z-i*s+k*c]}
    const A=P(-hx,-hy,-hz),B=P(hx,-hy,-hz),C=P(hx,-hy,hz),D=P(-hx,-hy,hz);
    const E=P(-hx,hy,-hz),F=P(hx,hy,-hz),G=P(hx,hy,hz),H=P(-hx,hy,hz);
    const b=col(base),shade=t=>b.map(v=>clamp(v*t,0,1));
    quad(E,F,G,H,shade(opts.lit||1.17));quad(A,D,C,B,shade(.5));
    quad(D,H,G,C,shade(.79));quad(A,B,F,E,shade(.71));quad(B,C,G,F,shade(.87));quad(A,E,H,D,shade(.61));
  }
  function coin(x,y,z,n,clock){
    const angle=clock*2+n*2.2,cs=Math.cos(angle),sn=Math.sin(angle),r=.54;
    const point=(a,rad=r)=>[x+Math.cos(a)*rad*cs,y+Math.sin(a)*rad,z+Math.cos(a)*rad*sn];
    const center=[x,y,z],gold=col('#ffd65d'),bright=col('#ffe8a2');
    for(let k=0;k<12;k++){let a=k*PI/6,b=(k+1)*PI/6;face(center,point(a),point(b),k%3===0?bright:gold)}
    const mid=[x,y,z+.025];for(let k=0;k<12;k++){let a=k*PI/6,b=(k+1)*PI/6;face(mid,point(b,.31),point(a,.31),col('#b9862b'))}
  }
  function addRoad(now){
    // Draw real 3D floating platforms, thickness, sides, seams and floating support rockwork.
    let traveled=0;for(let i=0;i<roadNodes.length-1;i++){
      const a=roadNodes[i],b=roadNodes[i+1],dx=b.x-a.x,dz=b.z-a.z,L=Math.hypot(dx,dz),mid=traveled+L/2;
      traveled+=L;
      if(mid<dist-85||mid>dist+195)continue;
      const yaw=Math.atan2(dx,dz),cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,rght={x:Math.cos(yaw),z:-Math.sin(yaw)};
      box(cx,-.72,cz,5.5,1.44,L+.12,yaw,'#385977');
      box(cx,.012,cz,5.18,.04,L+.06,yaw,'#7195a1');
      // Side rail strip creates depth cue but stays flat enough to drive across.
      for(let dir of [-1,1])box(cx+dir*rght.x*2.59,.091,cz+dir*rght.z*2.59,.17,.17,L+.08,yaw,dir===1?'#f8d985':'#f8d985');
      const n=Math.floor(L/3.5);for(let j=1;j<n;j++){
        let t=j/n;box(mix(a.x,b.x,t),.029,mix(a.z,b.z,t),5.15,.043,.045,yaw,'#385c70');
        if(j%2===0)box(mix(a.x,b.x,t),.065,mix(a.z,b.z,t),.08,.054,1.05,yaw,'#fff5c8');
      }
      if(i>0){
        box(a.x,-.69,a.z,5.48,1.40,5.48,0,'#466b82');
        box(a.x,.028,a.z,5.13,.052,5.13,0,'#7195a1');
        // Four golden corner markers emphasize the turn before it happens.
        for(let sx of [-1,1])for(let sz of [-1,1])box(a.x+sx*2.23,.22,a.z+sz*2.23,.54,.34,.54,0,'#ffce66');
        // Road corner light blocks.
        for(let sign of [-1,1]){
          const adx=(b.x-a.x)/L,adz=(b.z-a.z)/L,rx=adz,rz=-adx;
          box(a.x+rx*2.60,.17,a.z+rz*2.60,.28,.23,.7,yaw,'#ffbf75');
        }
      }
      if(i%3===0&&Math.abs(mid-dist)<110){
        box(cx,-4.3,cz,2.1,6.1,2.3,yaw,'#34465a');
        box(cx,-8.1,cz,3.3,2.1,3.4,yaw,'#293e54');
      }
      // Procedural crystals & rocks to make the environment feel expansive.
      if(i%2===1){let leftX=cx+rght.x*11,leftZ=cz+rght.z*11;
        box(leftX,-4.4,leftZ,3,5.7,4,0,'#5c8e91');box(leftX,-1.75,leftZ,4,.7,5,0,'#9ec3a8');
        box(leftX+4,-4.4,leftZ-4,2.7,3.7,2.6,.3,'#3a6d7d');
      }
    }
    // Pickups follow the rounded route, and continue to spawn in fresh track sections.
    for(let n=Math.max(3,Math.floor((dist-18)/15));n<Math.floor((dist+155)/15)+1;n++){
      if(coinHits.has(n))continue;const at=onRoute(n*15),tx=at.dz,tz=-at.dx,side=((n*7)%5-2)*.34;
      coin(at.x+tx*side,1.55+Math.sin(performance.now()*.002+n)*.11,at.z+tz*side,n,performance.now()*.001);
    }
  }
  function addCar(pos,heading,driveTime){
    const p={x:pos.x,z:pos.z},yaw=Math.atan2(heading.dx,heading.dz),chosen=CARS.find(x=>x.id===saveData.car)||CARS[0];
    const fire=chosen.id==='fire',truckL=fire?3.6:2.7,truckW=fire?1.89:1.53;
    // Wheel dark boxes and shadow below body: flat shaded, perspective-correct solid meshes.
    box(p.x,.135,p.z,truckW+1,.07,truckL+.2,yaw,'#203542');
    box(p.x,.46,p.z,truckW,.54,truckL,yaw,chosen.color);
    const fwd={x:Math.sin(yaw),z:Math.cos(yaw)},right={x:Math.cos(yaw),z:-Math.sin(yaw)};
    function relative(side,along,y,w,h,l,color){box(p.x+right.x*side+fwd.x*along,y,p.z+right.z*side+fwd.z*along,w,h,l,yaw,color)}
    for(let side of [-1,1])for(let along of [-.82,.84])relative(side*(truckW/2+.10),along,.29,.30,.47,.51,'#182733');
    relative(0,fire?-.04:-.13,.92,truckW-.33,.51,fire?2.25:1.33,fire?'#f4f2e3':'#98c9d1');
    relative(0,fire?-.79:-.41,1.22,truckW-.5,.06,fire?1.12:.78,fire?'#f7f1e3':'#5d92ad');
    relative(0,truckL/2-.19,.51,truckW-.32,.14,.23,'#fff0ce');
    for(let side of [-1,1]){
      relative(side*(truckW/2-.25),truckL/2+.015,.45,.25,.16,.12,'#fff3c1');
      relative(side*(truckW/2-.25),-truckL/2-.015,.43,.27,.16,.10,'#fc536d');
    }
    if(fire){relative(0,.72,1.30,1.23,.08,.24,'#f7f8f9');relative(-.35,.72,1.38,.32,.13,.27,'#4aaefa');relative(.35,.72,1.38,.32,.13,.27,'#ff6576');
       relative(0,-1.30,.80,1.1,.11,.10,'#f5f5f2')}
    // Turn visual feedback: particles trail more on active steering.
    if(active&&(steerL||steerR||Math.abs(vel)>1.4))for(let s of [-1,1]){
      relative(s*(truckW/2-.03),-truckL/2-.55,.11,.18,.08,.22,'#ffa875');
    }
  }
  function matMul(a,b){const out=new Float32Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let sum=0;for(let k=0;k<4;k++)sum+=a[k*4+j]*b[i*4+k];out[i*4+j]=sum}return out}
  function perspective(fov,aspect,near,far){let f=1/Math.tan(fov/2),m=new Float32Array(16);m[0]=f/aspect;m[5]=f;m[10]=(far+near)/(near-far);m[11]=-1;m[14]=2*far*near/(near-far);return m}
  function lookAt(eye,target,up){const z=norm(subV(eye,target)),x=norm(cross(up,z)),y=cross(z,x),m=new Float32Array(16);
    m[0]=x[0];m[1]=y[0];m[2]=z[0];m[4]=x[1];m[5]=y[1];m[6]=z[1];m[8]=x[2];m[9]=y[2];m[10]=z[2];m[12]=-dot(x,eye);m[13]=-dot(y,eye);m[14]=-dot(z,eye);m[15]=1;return m}
  function softwareRender(m,carStart){
    // Perspective-correct 3D projection fallback for browsers where WebGL is blocked.
    const ctx=fallbackCtx,W=c.width,H=c.height,vertices=geom.verts,colors=geom.colors,triangles=[];
    ctx.clearRect(0,0,W,H);
    for(let i=0;i<vertices.length;i+=9){
      const points=[],rgb=[];let valid=true,depth=0;
      for(let k=0;k<3;k++){
        let j=i+k*3,x=vertices[j],y=vertices[j+1],z=vertices[j+2];
        let w=m[3]*x+m[7]*y+m[11]*z+m[15];
        if(w<.18){valid=false;break}
        const ndcx=(m[0]*x+m[4]*y+m[8]*z+m[12])/w;
        const ndcy=(m[1]*x+m[5]*y+m[9]*z+m[13])/w;
        if(!Number.isFinite(ndcx)||!Number.isFinite(ndcy)){valid=false;break}
        points.push([(ndcx+1)*W*.5,(1-ndcy)*H*.5]);
        rgb.push([colors[j],colors[j+1],colors[j+2]]);
        const d=Math.hypot(camEye[0]-x,camEye[1]-y,camEye[2]-z);depth+=d;
      }
      if(!valid)continue;
      // Avoid painting off-screen faces and backfaces.
      const area=(points[1][0]-points[0][0])*(points[2][1]-points[0][1])-(points[1][1]-points[0][1])*(points[2][0]-points[0][0]);
      if(Math.abs(area)<.06)continue;
      if(points.every(p=>p[0]<-20)||points.every(p=>p[0]>W+20)||points.every(p=>p[1]<-20)||points.every(p=>p[1]>H+20))continue;
      const fog=clamp(((depth/3)-34)/70,0,.75);
      const avg=rgb.reduce((acc,v)=>acc.map((q,n)=>q+v[n]/3),[0,0,0]);
      const fc=[.60,.76,.78];const cc=avg.map((v,n)=>Math.round(255*mix(v,fc[n],fog)));
      triangles.push({points,depth:depth/3,isCar:i>=carStart,color:`rgb(${cc[0]},${cc[1]},${cc[2]})`});
    }
    triangles.sort((a,b)=>a.isCar===b.isCar?b.depth-a.depth:(a.isCar?1:-1));
    ctx.lineJoin='round';
    for(let t of triangles){ctx.fillStyle=t.color;ctx.beginPath();ctx.moveTo(...t.points[0]);ctx.lineTo(...t.points[1]);ctx.lineTo(...t.points[2]);ctx.closePath();ctx.fill()}
  }
  function render(){
    if(!gl&&!fallbackCtx)return;
    ensureRoad();geom.verts.length=0;geom.colors.length=0;
    const at=onRoute(dist),x=driveX,z=driveZ;
    const forward={dx:Math.sin(driveYaw),dz:Math.cos(driveYaw)},normal={x:Math.cos(driveYaw),z:-Math.sin(driveYaw)};
    // Look ahead along the ROAD instead of instantly orbiting when the steering key is held.
    // The steadier isometric camera makes upcoming corners legible and input timing consistent.
    const ahead=onRoute(Math.min(routeLength-1,dist+9));
    const f={dx:ahead.dx,dz:ahead.dz},side={x:f.dz,z:-f.dx};
    let eye=[x-f.dx*19+side.x*13,23,z-f.dz*19+side.z*13];
    let target=[x+f.dx*9,.18,z+f.dz*9];
    const lerpCam=camReady?.065:1;
    for(let i=0;i<3;i++){camEye[i]=mix(camEye[i],eye[i],lerpCam);camAt[i]=mix(camAt[i],target[i],lerpCam)}camReady=true;
    addRoad(at);const carStart=geom.verts.length;addCar({x,z},forward,covered/10);
    let w=c.width,h=c.height;
    const m=matMul(perspective(PI/3.6,w/h,.3,210),lookAt(camEye,camAt,[0,1,0]));
    if(gl){
      gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);gl.uniformMatrix4fv(uvp,false,m);gl.uniform3fv(ueye,camEye);
      gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geom.verts),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geom.colors),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(ac);gl.vertexAttribPointer(ac,3,gl.FLOAT,false,0,0);
      gl.drawArrays(gl.TRIANGLES,0,geom.verts.length/3);
    }else{softwareRender(m,carStart)}
    const upcoming=nextTurn();$id('d-turn').textContent=upcoming&&upcoming.distance<35?`↱ CORNER ${upcoming.distance}m · HOLD TO TURN`:'HOLD SPACE = RIGHT ↱ · RELEASE = STRAIGHT ↑';
    const safety=2.55+(CARS.find(x=>x.id===saveData.car)||CARS[0]).safety;
    $id('d-warning').textContent=off>safety*.82?'⚠ EDGE!':'★ TIME YOUR TURNS';
    $id('d-warning').classList.toggle('danger',Math.abs(off)>safety*.78);
  }
  function currentCar(){return CARS.find(x=>x.id===saveData.car)||CARS[0]}
  function feedback(text){$id('d-feedback').textContent=text}
  function garage(){
    $id('d-coins').textContent=saveData.coins+earned;
    $id('d-garage').innerHTML=CARS.map(car=>`<button type="button" class="garage-car ${car.id===saveData.car?'selected':''}" data-car="${car.id}" ${active?'disabled':''}><b>${car.icon} ${car.name}${car.id===saveData.car?' ✓':''}</b><small>${saveData.owned.includes(car.id)?'OWNED · '+Math.round(car.control*100)+'% steering':car.price+' coins'}${car.id==='fire'?' · Better grip':''}</small></button>`).join('');
    $id('d-boosts').innerHTML=BOOSTS.map(b=>`<button type="button" class="garage-boost" data-boost="${b.id}" ${active?'disabled':''}><b>${b.name}</b><small>${b.cost} coins · owned ${saveData.boosts[b.id]||0}</small></button>`).join('');
    document.querySelectorAll('[data-car]').forEach(b=>b.onclick=()=>{if(active)return;const car=CARS.find(v=>v.id===b.dataset.car);if(!saveData.owned.includes(car.id)){if(saveData.coins<car.price){feedback('Earn '+(car.price-saveData.coins)+' more coins to unlock this car.');return}saveData.coins-=car.price;saveData.owned.push(car.id)}saveData.car=car.id;store();garage();render();feedback(`${car.name} selected. ${car.id==='fire'?'Extra grip and a wider safety margin!':''}`)});
    document.querySelectorAll('[data-boost]').forEach(b=>b.onclick=()=>{if(active)return;const boost=BOOSTS.find(v=>v.id===b.dataset.boost);if(saveData.coins<boost.cost){feedback(`Need ${boost.cost-saveData.coins} more coins.`);return}saveData.coins-=boost.cost;saveData.boosts[boost.id]++;store();garage();feedback(boost.name+' ready for next run.')});
  }
  function finish(){
    if(!active)return;active=false;cancelAnimationFrame(raf);saveData.coins+=earned;store();garage();overlay.hidden=false;
    overlay.innerHTML=`<span class="drift-pill">YOUR RUN</span><strong>${reason||'OFF THE ROAD!'}</strong><p>Distance: <b>${score} m</b> · Earned <b>🪙 ${earned}</b><br/>A fresh track is generated each time you restart.</p><button class="small-btn" id="d-start">↻ RETRY</button>`;
    $id('d-start').onclick=start;feedback('Try the Fire Truck for extra grip or collect more coins.');
  }
  function update(timestamp){
    if(!active)return;
    let dt=clamp((timestamp-last)/1000||.016,.001,.034);last=timestamp;
    // Real one-button driving: movement is always forward at a constant speed.
    // No lateral slide, automatic road following, or steering back when released.
    // Fast, crisp one-button turning: no hidden auto-steering.
    const speed=11.8,step=speed*dt;
    const turning=space||steerR;
    if(turning)driveYaw+=3.25*currentCar().control*dt;
    turningLast=turning;
    driveX+=Math.sin(driveYaw)*step;
    driveZ+=Math.cos(driveYaw)*step;
    covered+=step;
    // Determine where the car actually is on the generated road for scoring,
    // obstacles, distance, and crash testing (not for controlling the car).
    let closest=Infinity,closestS=dist;
    const from=Math.max(0,dist-14),to=Math.min(routeLength,dist+18);
    for(let i=1;i<route.length;i++){
      let a=route[i-1],b=route[i];if(b.s<from||a.s>to)continue;
      const vx=b.x-a.x,vz=b.z-a.z;
      const t=clamp(((driveX-a.x)*vx+(driveZ-a.z)*vz)/(vx*vx+vz*vz||1),0,1);
      const px=a.x+vx*t,pz=a.z+vz*t,d=Math.hypot(driveX-px,driveZ-pz);
      if(d<closest){closest=d;closestS=a.s+(b.s-a.s)*t}
    }
    dist=Math.max(dist,closestS);off=closest;
    ensureRoad();
    // Road segments are 5.6 units wide with overlapping platforms at corners.
    // Slight leniency keeps the first turns playable while retaining real edge risk.
    const safe=2.94+currentCar().safety;
    if(off>safe){
      reason='OFF THE EDGE!';if(!revived&&saveData.boosts.revive>0){
        revived=true;saveData.boosts.revive--;store();
        const rescue=onRoute(dist);driveX=rescue.x;driveZ=rescue.z;driveYaw=Math.atan2(rescue.dx,rescue.dz);off=0;
        feedback('🛟 Saved by insurance!');
      }else{render();finish();return}
    }
    const lastN=Math.floor((Math.max(0,dist-step))/15),nowN=Math.floor(dist/15);
    for(let n=lastN;n<=nowN;n++){if(n<3||coinHits.has(n)||Math.abs(n*15-dist)>2.1)continue;
      const coinAt=onRoute(n*15),side=((n*7)%5-2)*.34;if(Math.hypot(driveX-(coinAt.x+coinAt.dz*side),driveZ-(coinAt.z-coinAt.dx*side))<1.6){coinHits.add(n);earned+=boostRush?10:5;feedback(`🪙 +${boostRush?10:5} coins!`)}}
    score=Math.floor(dist*(boostDouble?2:1));$id('d-score').textContent=score;$id('d-best').textContent=best('drift-switch',score);$id('d-coins').textContent=saveData.coins+earned;
    render();raf=requestAnimationFrame(update);
  }
  function start(){
    cancelAnimationFrame(raf);dist=0;off=0;vel=0;driveX=0;driveZ=-8;driveYaw=0;covered=0;crashFlash=0;score=0;earned=0;revived=false;steerL=steerR=space=false;camReady=false;coinHits.clear();
    pathReset();reason='';boostDouble=!!saveData.boosts.double;boostRush=!!saveData.boosts.rush;
    if(boostDouble)saveData.boosts.double--;if(boostRush)saveData.boosts.rush--;store();
    active=true;overlay.hidden=true;garage();feedback('HOLD to turn RIGHT. RELEASE to drive STRAIGHT. Watch for the gold corner blocks!');last=performance.now();raf=requestAnimationFrame(update);
  }
  function keydown(e){if(['Space','ArrowRight','KeyD'].includes(e.code)){
    e.preventDefault();space=true;
  }}
  function keyup(e){if(['Space','ArrowRight','KeyD'].includes(e.code)){
    e.preventDefault();space=false;
  }}
  function buttonHold(el,on,off){el.addEventListener('pointerdown',e=>{e.preventDefault();on();el.setPointerCapture?.(e.pointerId)});el.addEventListener('pointerup',()=>off());el.addEventListener('pointercancel',()=>off());el.addEventListener('lostpointercapture',()=>off())}
  buttonHold($id('d-right'),()=>space=true,()=>space=false);
  const pointerDown=e=>{if(e.target!==c)return;e.preventDefault();space=true};const pointerUp=()=>space=false;
  c.addEventListener('pointerdown',pointerDown);window.addEventListener('pointerup',pointerUp);
  document.addEventListener('keydown',keydown);document.addEventListener('keyup',keyup);
  window.addEventListener('blur',pointerUp);
  $id('d-reset').onclick=start;
  if(!initializeRenderer()){
    overlay.hidden=false;overlay.innerHTML='<strong>3D graphics unavailable</strong><p>WebGL must be enabled in the browser to run this 3D game. Other PLAYROOM games can still work normally.</p>';
  }else{
    pathReset();render();$id('d-start').onclick=start;
  }
  garage();
  cleanup=()=>{active=false;cancelAnimationFrame(raf);window.removeEventListener('pointerup',pointerUp);window.removeEventListener('blur',pointerUp);document.removeEventListener('keydown',keydown);document.removeEventListener('keyup',keyup);if(gl){gl.deleteBuffer(positionBuffer);gl.deleteBuffer(colorBuffer);gl.deleteProgram(program)}};
};
