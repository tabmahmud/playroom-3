(()=>{'use strict';
const $=id=>document.getElementById(id), form=$('browser-form');if(!form)return;
const key='playroom-browser-v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(key))||{}}catch{return {}}};
const stored=read();const state={mode:'video',tabs:[{id:1,title:'Start',url:'',mode:'video'}],active:1,next:2,bookmarks:Array.isArray(stored.bookmarks)?stored.bookmarks.slice(0,50):[],history:Array.isArray(stored.history)?stored.history.slice(0,50):[],back:[],forward:[]};
const save=()=>{try{localStorage.setItem(key,JSON.stringify({bookmarks:state.bookmarks,history:state.history}))}catch{}};
const active=()=>state.tabs.find(t=>t.id===state.active);
const feedKey='playroom-tiktok-feed-v1';
// A curated set of public video IDs from published creator pages. This is not TikTok's personalized For You feed.
const starterFeed=[
 '7673753354996108564', // User-provided TikTok embed
 '7475836662124186926','7515503901714550046', // Minecraft
 '7483741557263306014','7454287844249554206','7425788821863779627','7429411430958501151', // NBA
 '7413771308560960801','7523148589997247766','7456814253731810593', // Red Bull
 '7488363798726790422','7473229778309467414','7512557470313745686', // space
 '7281756810791488810','7476220487534759199','7430521348964797739' // ESPN
];
// Recommendations are local to this browser, based on explicit feedback and viewing time.
const prefKey='playroom-foryou-preferences-v1';
const defaultTopics=['creator','minecraft','minecraft','basketball','basketball','basketball','basketball','sports','sports','sports','space','space','space','sports','sports','sports'];
const topicOf=id=>{const n=starterFeed.indexOf(id);return n>=0?(defaultTopics[n]||'other'):(localPrefs.topics[id]||'other')};
let localPrefs={likes:{},skips:{},watch:{},topics:{}};
try{const v=JSON.parse(localStorage.getItem(prefKey));if(v&&typeof v==='object')localPrefs={...localPrefs,...v}}catch{}
const savePrefs=()=>{try{localStorage.setItem(prefKey,JSON.stringify(localPrefs))}catch{}};
const scoreVideo=id=>{const topic=topicOf(id);let score=0;for(const [other,val] of Object.entries(localPrefs.likes)){if(topicOf(other)===topic)score+=Number(val)*3}for(const [other,val] of Object.entries(localPrefs.skips)){if(topicOf(other)===topic)score-=Number(val)*2}score+=(localPrefs.likes[id]||0)*4-(localPrefs.skips[id]||0)*5+Math.min(5,(localPrefs.watch[id]||0)/15);return score};
const loadFeed=()=>{try{const data=JSON.parse(localStorage.getItem(feedKey));return Array.isArray(data)?data.filter(x=>/^\d{15,22}$/.test(x)).slice(0,100):starterFeed.slice()}catch{return starterFeed.slice()}};
let tikFeed=loadFeed(), tikActive=0;
const saveFeed=()=>{try{localStorage.setItem(feedKey,JSON.stringify(tikFeed))}catch{}};

const ytId=(raw)=>{let v=raw.trim();if(/^[A-Za-z0-9_-]{11}$/.test(v))return v;try{let u=new URL(v);const h=u.hostname.toLowerCase();if(h==='youtu.be'||h==='www.youtu.be')return u.pathname.split('/')[1]?.match(/^[A-Za-z0-9_-]{11}$/)?.[0]||null;if(h==='youtube.com'||h==='www.youtube.com'||h==='m.youtube.com'||h==='youtube-nocookie.com'||h==='www.youtube-nocookie.com'){const id=u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/)?.[1];return id&&/^[A-Za-z0-9_-]{11}$/.test(id)?id:null}}catch{}return null};
const tikId=(raw)=>{try{let v=raw.trim();if(/^\d{15,22}$/.test(v))return v;let u=new URL(v);let host=u.hostname.toLowerCase();if(!['tiktok.com','www.tiktok.com','m.tiktok.com'].includes(host))return null;return u.pathname.match(/\/(?:@[^/]+\/video|video|embed\/v2)\/(\d{15,22})(?:\/|$)/)?.[1]||null}catch{return null}};
function safeUrl(raw){try{const v=raw.trim();if(!v||/\s/.test(v))return null;let u=new URL(/^https?:\/\//i.test(v)?v:'https://'+v);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;if(u.hostname==='localhost'||u.hostname==='127.0.0.1'||u.hostname==='[::1]'||u.hostname.endsWith('.local'))return null;if(location.hostname&&u.origin===location.origin)return null;return u.href}catch{return null}}
function nameOf(url,mode){if(mode==='search')return 'Search: '+url.replace(/^search:/,'').slice(0,24);if(mode==='video'&&url.startsWith('ytsearch:'))return 'YouTube: '+url.slice(9,30);if(!url)return 'Start';if(mode==='video')return 'YouTube video';if(mode==='tiktok')return 'TikTok video';try{return new URL(url).hostname.replace(/^www\./,'')}catch{return 'Website'}}
function status(msg){$('browser-status').textContent=msg}
function record(url,mode){state.history=state.history.filter(e=>e.url!==url);state.history.unshift({url,mode,title:nameOf(url,mode)});state.history=state.history.slice(0,30);save();drawLists()}
function show(){const tab=active();if(!tab)return;state.mode=tab.mode;document.querySelectorAll('.browser-mode').forEach(x=>x.classList.toggle('active',x.dataset.mode===tab.mode));$('browser-address').placeholder=tab.mode==='video'?'Search YouTube videos or paste a video link':tab.mode==='tiktok'?'Optional: paste TikTok video URL or ID':tab.mode==='search'?'Search the encyclopedia (e.g. black holes)':'Enter a website or type a search';$('browser-address').value=tab.mode==='search'?tab.url.replace(/^search:/,''):tab.mode==='video'&&tab.url.startsWith('ytsearch:')?tab.url.slice(9):tab.url||'';const q=tab.mode==='search'?tab.url.replace(/^search:/,''):'';$('browser-external').href=tab.mode==='search'?'https://www.google.com/search?q='+encodeURIComponent(q):tab.mode==='video'&&tab.url.startsWith('ytsearch:')?'https://www.youtube.com/results?search_query='+encodeURIComponent(tab.url.slice(9)):tab.url||(tab.mode==='tiktok'?'https://www.tiktok.com/':'https://www.youtube.com/');$('browser-back').disabled=!state.back.length;$('browser-forward').disabled=!state.forward.length;$('browser-bookmark').textContent=tab.url&&state.bookmarks.some(b=>b.url===tab.url)?'★':'☆';const v=$('browser-view');v.replaceChildren();v.classList.toggle('playroom-tiktok-view',tab.mode==='tiktok');if(tab.mode==='tiktok'){showTikTokFeed(tab);drawTabs();return}if(!tab.url){const box=document.createElement('div');box.className='browser-welcome';box.innerHTML='<div class="browser-welcome-icon">'+(tab.mode==='video'?'▶':tab.mode==='tiktok'?'♫':tab.mode==='search'?'⌕':'◎')+'</div><h3>'+(tab.mode==='video'?'Watch something good.':tab.mode==='tiktok'?'Watch TikTok videos.':tab.mode==='search'?'Search and discover.':'Explore the web.')+'</h3><p>'+(tab.mode==='video'?'Search for videos right here, or paste a YouTube video link.':tab.mode==='tiktok'?'Paste a public TikTok video link (or its numeric video ID) to watch an embeddable video here. Shortened share links may need the full URL. Some videos cannot be embedded.':tab.mode==='search'?'Search Wikipedia articles right here, with clickable results. For broader web searches use the Google search link.':'Enter a website or a search. Websites must permit embedding to display here.')+'</p><div class="browser-actions"><a target="_blank" rel="noopener noreferrer" href="'+(tab.mode==='video'?'https://www.youtube.com/results?search_query=gaming':tab.mode==='tiktok'?'https://www.tiktok.com/':'https://www.wikipedia.org/')+'">'+(tab.mode==='video'?'Search YouTube ↗':tab.mode==='tiktok'?'Visit TikTok ↗':'Wikipedia ↗')+'</a></div>';v.appendChild(box)}else if(tab.mode==='search'){showSearch(tab.url.replace(/^search:/,''),tab.id)}else if(tab.mode==='video'&&tab.url.startsWith('ytsearch:')){showYouTubeSearch(tab.url.slice(9),tab.id)}else{const frame=document.createElement('iframe');frame.title=tab.mode==='video'?'Embedded YouTube player':tab.mode==='tiktok'?'Embedded TikTok video':'Embedded website';frame.referrerPolicy='strict-origin-when-cross-origin';frame.loading='eager';frame.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen');frame.setAttribute('allowfullscreen','');if(tab.mode==='web')frame.setAttribute('sandbox','allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');frame.src=tab.mode==='video'?'https://www.youtube-nocookie.com/embed/'+ytId(tab.url)+'?rel=0':tab.mode==='tiktok'?'https://www.tiktok.com/embed/v2/'+tikId(tab.url):tab.url;v.appendChild(frame);const note=document.createElement('div');note.className='browser-embed-note';note.textContent=tab.mode==='video'?'Playback depends on YouTube and the video uploader.':tab.mode==='tiktok'?'TikTok or the creator may block embedding. Use ↗ to open the original video.':'If this page is blank, the site probably blocks embedding. Use ↗ to open it directly.';v.appendChild(note)}drawTabs()}

function showTikTokFeed(tab){
 const root=$('browser-view');root.replaceChildren();root.classList.add('playroom-tiktok-view');
 const panel=document.createElement('section');panel.className='tik-feed-panel';root.appendChild(panel);
 const heading=document.createElement('div');heading.className='tik-feed-heading';heading.innerHTML='<div><strong>♫ TikTok feed</strong><small>Continuous scrolling with real TikTok embeds · videos repeat when the library runs out</small></div>';
 const count=document.createElement('span');count.className='tik-feed-counter';heading.appendChild(count);panel.appendChild(heading);
 const rail=document.createElement('div');rail.className='tik-feed-rail';rail.tabIndex=0;rail.setAttribute('aria-label','Scrollable TikTok video feed');panel.appendChild(rail);
 const footer=document.createElement('div');footer.className='tik-feed-footer';panel.appendChild(footer);
 const hint=document.createElement('span');hint.textContent='Scroll / swipe or use ↑ ↓. Tap the video to play if autoplay is blocked.';footer.appendChild(hint);
 const controls=document.createElement('div');controls.className='tik-feed-controls';footer.appendChild(controls);
 const prev=document.createElement('button');prev.textContent='↑ Previous';prev.type='button';controls.appendChild(prev);
 const next=document.createElement('button');next.textContent='Next ↓';next.type='button';controls.appendChild(next);
 const like=document.createElement('button');like.textContent='♥ Like';like.type='button';controls.appendChild(like);
 const skip=document.createElement('button');skip.textContent='Not interested';skip.type='button';controls.appendChild(skip);
 const recommend=document.createElement('button');recommend.textContent='✦ For You';recommend.type='button';recommend.title='Rank remaining videos using your preferences';controls.appendChild(recommend);
 const remove=document.createElement('button');remove.textContent='Remove';remove.type='button';remove.title='Remove this video from your feed';controls.appendChild(remove);
 const shuffle=document.createElement('button');shuffle.textContent='↻ Shuffle';shuffle.type='button';shuffle.title='Shuffle the videos already in your feed';controls.appendChild(shuffle);
 const reset=document.createElement('button');reset.textContent='☆ Starter videos';reset.type='button';reset.title='Reload public starter videos';controls.appendChild(reset);
 const clear=document.createElement('button');clear.textContent='Clear feed';clear.type='button';controls.appendChild(clear);
 const editor=document.createElement('details');editor.className='tik-feed-editor';editor.innerHTML='<summary>＋ Add more videos</summary><p>Optional: add more public video links or IDs, one per line. PLAYROOM already includes starter videos. TikTok’s real recommendation feed is not available to embedded websites.</p>';
 const box=document.createElement('textarea');box.placeholder='https://www.tiktok.com/@creator/video/1234567890123456789';box.rows=3;box.setAttribute('aria-label','TikTok video links');editor.appendChild(box);
 const add=document.createElement('button');add.type='button';add.textContent='Add to feed';editor.appendChild(add);panel.appendChild(editor);
 const topicLabel=document.createElement('label');topicLabel.textContent='Video topic: ';topicLabel.className='tik-topic-label';const topicSelect=document.createElement('select');for(const t of ['other','minecraft','basketball','sports','space','music','comedy','art','creator']){const option=document.createElement('option');option.value=t;option.textContent=t;topicSelect.appendChild(option)}topicLabel.appendChild(topicSelect);editor.appendChild(topicLabel);
 const cards=[];let watchStarted=Date.now();
 const saveWatch=()=>{const id=tikFeed[tikActive];if(!id)return;const seconds=Math.min(120,Math.max(0,(Date.now()-watchStarted)/1000));localPrefs.watch[id]=(localPrefs.watch[id]||0)+seconds;savePrefs();watchStarted=Date.now()};
 const syncAddress=()=>{const id=tikFeed[tikActive];tab.url=id?'https://www.tiktok.com/embed/v2/'+id:'';$('browser-address').value=tab.url;$('browser-external').href=id?'https://www.tiktok.com/embed/v2/'+id:'https://www.tiktok.com/';count.textContent=tikFeed.length?(tikActive+1)+' / '+tikFeed.length:'0 videos';prev.disabled=tikActive<=0;next.disabled=!tikFeed.length;remove.disabled=!tikFeed.length};
 const activate=(i,scroll=false)=>{
  if(i<0||i>=tikFeed.length)return; saveWatch();tikActive=i;watchStarted=Date.now();syncAddress();topicSelect.value=topicOf(tikFeed[i]);like.textContent=(localPrefs.likes[tikFeed[i]]||0)>0?'♥ Liked':'♡ Like';
  cards.forEach((card,j)=>{
   const spot=card.querySelector('.tik-feed-video');spot.replaceChildren();
   if(j===i){
    const frame=document.createElement('iframe');
    frame.title='TikTok video '+(j+1);
    frame.src='https://www.tiktok.com/player/v1/'+encodeURIComponent(tikFeed[j])+'?description=1&music_info=1';
    frame.loading='eager';
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.setAttribute('allow','fullscreen; autoplay; encrypted-media; picture-in-picture');
    frame.setAttribute('allowfullscreen','');
    frame.style.cssText='display:block;width:100%;max-width:420px;height:650px;border:0;border-radius:12px;margin:0 auto;background:#101010';
    spot.appendChild(frame);
    const fallback=document.createElement('a');fallback.href='https://www.tiktok.com/embed/v2/'+tikFeed[j];fallback.target='_blank';fallback.rel='noopener noreferrer';fallback.textContent='Video not loading? Open TikTok player ↗';fallback.style.cssText='display:block;text-align:center;padding:8px';spot.appendChild(fallback);
   }
  });
  if(scroll)cards[i].scrollIntoView({behavior:'smooth',block:'nearest'});
 };
 if(!tikFeed.length){const empty=document.createElement('div');empty.className='tik-feed-empty';empty.innerHTML='<div>♫</div><h3>Build your scrolling TikTok feed</h3><p>Paste a public TikTok video URL or ID in the address bar above and press Go. Add multiple links at once to swipe between videos.</p>';rail.appendChild(empty);editor.open=true;}
 tikFeed.forEach((id,i)=>{const card=document.createElement('article');card.className='tik-feed-card';card.dataset.index=i;const spot=document.createElement('div');spot.className='tik-feed-video';card.appendChild(spot);const label=document.createElement('div');label.className='tik-feed-card-label';label.textContent='♫ Video '+(i+1);card.appendChild(label);const open=document.createElement('a');open.href='https://www.tiktok.com/embed/v2/'+id;open.target='_blank';open.rel='noopener noreferrer';open.textContent='Original ↗';open.className='tik-feed-original';card.appendChild(open);rail.appendChild(card);cards.push(card)});
 const nextRound=()=>{if(!tikFeed.length)return;saveWatch();const previous=tikFeed[tikActive];const shuffled=tikFeed.slice().sort((a,b)=>(scoreVideo(b)+Math.random()*3)-(scoreVideo(a)+Math.random()*3));if(shuffled.length>1&&shuffled[0]===previous)shuffled.push(shuffled.shift());tikFeed=shuffled;tikActive=0;saveFeed();show();status('More videos queued! This round reuses real TikTok embeds; it cannot fetch unlimited unique posts.');};
 const jump=i=>i>=tikFeed.length?nextRound():activate(i,true);
 like.onclick=()=>{const id=tikFeed[tikActive];if(!id)return;localPrefs.likes[id]=(localPrefs.likes[id]||0)+1;savePrefs();like.textContent='♥ Liked';status('Liked. For You will recommend more videos with this topic.')};
 skip.onclick=()=>{const id=tikFeed[tikActive];if(!id)return;localPrefs.skips[id]=(localPrefs.skips[id]||0)+1;savePrefs();status('Not interested. Fewer videos with this topic will be recommended.');jump(tikActive+1)};
 recommend.onclick=()=>{saveWatch();const seen=tikFeed.slice(0,tikActive+1);const remaining=tikFeed.slice(tikActive+1).sort((a,b)=>scoreVideo(b)-scoreVideo(a));tikFeed=[...seen,...remaining];saveFeed();show();status('For You reordered upcoming videos based on your feedback.')};
 topicSelect.onchange=()=>{const id=tikFeed[tikActive];if(!id)return;localPrefs.topics[id]=topicSelect.value;savePrefs();status('Topic saved. Tap For You to update recommendations.')};
 shuffle.onclick=()=>{if(tikFeed.length<2)return;for(let i=tikFeed.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[tikFeed[i],tikFeed[j]]=[tikFeed[j],tikFeed[i]]}tikActive=0;saveFeed();show();status('Shuffled videos. Scroll to watch.')};
 reset.onclick=()=>{tikFeed=[...new Set([...starterFeed,...tikFeed])].slice(0,100);tikActive=0;saveFeed();show();status('Loaded public starter videos.')};
 prev.onclick=()=>jump(tikActive-1);next.onclick=()=>jump(tikActive+1);
 remove.onclick=()=>{if(!tikFeed.length)return;tikFeed.splice(tikActive,1);tikActive=Math.max(0,Math.min(tikActive,tikFeed.length-1));saveFeed();show();status('Video removed from feed.')};
 clear.onclick=()=>{if(!tikFeed.length)return;if(!confirm('Clear your saved TikTok playlist?'))return;tikFeed=[];tikActive=0;saveFeed();show();status('TikTok feed cleared.')};
 add.onclick=()=>{const str=box.value.trim();if(!str)return;const valid=str.split(/[\s,]+/).map(tikId).filter(Boolean);if(!valid.length){status('No supported TikTok URLs or IDs found.');return}navigate(str,'tiktok')};
 rail.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();jump(tikActive+(e.key==='ArrowDown'?1:-1))}});
 let scrollTimer;rail.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{if(!cards.length)return;const i=Math.round(rail.scrollTop / Math.max(1,rail.clientHeight));if(i!==tikActive&&i>=0&&i<cards.length)activate(i);if(tikActive===cards.length-1&&cards.length>0&&rail.scrollTop+rail.clientHeight>=rail.scrollHeight-8){nextRound()}},120)},{passive:true});
 syncAddress();if(cards.length){tikActive=Math.min(tikActive,cards.length-1);activate(tikActive);requestAnimationFrame(()=>{rail.scrollTop=tikActive*rail.clientHeight})}
}

function drawTabs(){const bar=$('browser-tabbar');bar.replaceChildren();for(const t of state.tabs){const item=document.createElement('div');item.className='browser-tab'+(t.id===state.active?' active':'');const b=document.createElement('button');b.className='browser-tab-select';b.textContent=t.title;b.title=t.title;b.onclick=()=>{state.active=t.id;state.back=[];state.forward=[];show()};item.appendChild(b);const close=document.createElement('button');close.className='browser-tab-close';close.title='Close tab';close.textContent='×';close.onclick=()=>{if(state.tabs.length===1){t.url='';t.title='Start';show();return}state.tabs=state.tabs.filter(x=>x.id!==t.id);if(state.active===t.id)state.active=state.tabs.at(-1).id;state.back=[];state.forward=[];show()};item.appendChild(close);bar.appendChild(item)}const add=document.createElement('button');add.className='browser-new-tab';add.textContent='+ New tab';add.onclick=()=>{let t={id:state.next++,title:'Start',url:'',mode:state.mode};state.tabs.push(t);state.active=t.id;state.back=[];state.forward=[];show()};bar.appendChild(add)}
function drawLists(){for(const [id,items] of [['browser-bookmarks',state.bookmarks],['browser-history',state.history]]){const root=$(id);root.replaceChildren();if(!items.length){const e=document.createElement('span');e.className='browser-empty';e.textContent=id==='browser-bookmarks'?'No bookmarks yet':'Nothing viewed yet';root.appendChild(e)}for(const entry of items){const row=document.createElement('div');row.className='browser-side-entry';const open=document.createElement('button');open.className='browser-entry-open';open.textContent=entry.title;open.title=entry.url;open.onclick=()=>navigate(entry.url,entry.mode);row.appendChild(open);if(id==='browser-bookmarks'){const del=document.createElement('button');del.className='browser-entry-delete';del.textContent='×';del.title='Remove bookmark';del.onclick=()=>{state.bookmarks=state.bookmarks.filter(b=>b.url!==entry.url);save();drawLists();show()};row.appendChild(del)}root.appendChild(row)}}}
function isSearchTerm(input){const v=input.trim();if(!v)return false;if(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v))return false;if(/^\S+\.\S{2,}(?:\/.*)?$/.test(v))return false;return true}

// YouTube search: use a user-supplied official YouTube Data API key if configured.
// Otherwise try public Invidious search endpoints, which are independent and may be unavailable.
const ytSearchEndpoints=['https://inv.nadeko.net/api/v1/search','https://invidious.nerdvpn.de/api/v1/search'];
function videoResult(root,video,tabId){
 if(!/^[A-Za-z0-9_-]{11}$/.test(video.id))return;
 const card=document.createElement('button');card.type='button';card.className='playroom-yt-card';
 const img=document.createElement('img');img.loading='lazy';img.alt='';img.referrerPolicy='no-referrer';img.src='https://i.ytimg.com/vi/'+video.id+'/mqdefault.jpg';card.appendChild(img);
 const body=document.createElement('span');body.className='playroom-yt-meta';const title=document.createElement('strong');title.textContent=video.title||'YouTube video';body.appendChild(title);
 const channel=document.createElement('small');channel.textContent=video.channel||'YouTube';body.appendChild(channel);card.appendChild(body);
 card.onclick=()=>{if(active()?.id!==tabId)return;navigate('https://www.youtube.com/watch?v='+video.id,'video')};root.appendChild(card);
}
async function showYouTubeSearch(query,tabId){
 const view=$('browser-view');view.replaceChildren();const shell=document.createElement('div');shell.className='playroom-yt-search';view.appendChild(shell);
 const heading=document.createElement('div');heading.className='browser-results-heading';const h=document.createElement('h3');h.textContent='YouTube: '+query;heading.appendChild(h);
 const external=document.createElement('a');external.href='https://www.youtube.com/results?search_query='+encodeURIComponent(query);external.target='_blank';external.rel='noopener noreferrer';external.textContent='Open YouTube ↗';heading.appendChild(external);shell.appendChild(heading);
 const note=document.createElement('p');note.className='browser-results-hint';note.textContent='Search results appear here when a search provider is reachable. Tap a video to play it in PLAYROOM.';shell.appendChild(note);
 const grid=document.createElement('div');grid.className='playroom-yt-grid';grid.textContent='Searching for videos…';shell.appendChild(grid);
 const settings=document.createElement('details');settings.className='playroom-yt-settings';settings.innerHTML='<summary>Reliable search setup (optional)</summary><p>For more reliable search, add your own YouTube Data API v3 key. This key is stored in this browser only, but is visible to anyone using this device and is not secure for a public/shared site. Restrict it to your Netlify website in Google Cloud. Search also works without a key when a public provider is available.</p>';
 const input=document.createElement('input');input.type='password';input.placeholder='YouTube Data API v3 key';input.autocomplete='off';input.value=localStorage.getItem('playroom-youtube-api-key')||'';input.setAttribute('aria-label','YouTube API key');settings.appendChild(input);
 const saveKey=document.createElement('button');saveKey.type='button';saveKey.textContent='Save key and retry';saveKey.onclick=()=>{if(input.value.trim())localStorage.setItem('playroom-youtube-api-key',input.value.trim());else localStorage.removeItem('playroom-youtube-api-key');showYouTubeSearch(query,tabId)};settings.appendChild(saveKey);shell.appendChild(settings);
 const isCurrent=()=>active()?.id===tabId&&active()?.url==='ytsearch:'+query;
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),9000);
 try{
  const key=localStorage.getItem('playroom-youtube-api-key');let videos=[];
  if(key){const params=new URLSearchParams({part:'snippet',type:'video',maxResults:'18',q:query,key});const r=await fetch('https://www.googleapis.com/youtube/v3/search?'+params,{signal:ctrl.signal});const data=await r.json();if(!r.ok)throw Error(data.error?.message||'YouTube API error');videos=(data.items||[]).map(x=>({id:x.id?.videoId,title:x.snippet?.title,channel:x.snippet?.channelTitle}));}
  else{for(const endpoint of ytSearchEndpoints){try{const params=new URLSearchParams({q:query,type:'video',sort_by:'relevance'});const r=await fetch(endpoint+'?'+params,{signal:ctrl.signal});if(!r.ok)continue;const data=await r.json();videos=(Array.isArray(data)?data:[]).filter(x=>x.type==='video'||x.videoId).map(x=>({id:x.videoId,title:x.title,channel:x.author}));if(videos.length)break}catch(e){if(e.name==='AbortError')throw e}}}
  if(!isCurrent())return;grid.replaceChildren();if(!videos.length)throw Error('No search provider returned results');videos.forEach(v=>videoResult(grid,v,tabId));status('YouTube search results loaded. Select a video to play.');
 }catch(err){if(!isCurrent())return;grid.replaceChildren();const fail=document.createElement('div');fail.className='playroom-yt-error';const strong=document.createElement('strong');strong.textContent='Search provider unavailable';fail.appendChild(strong);const p=document.createElement('p');p.textContent=err.message==='No search provider returned results'?'Public search providers may be down or blocked. Add a YouTube Data API key above for a more reliable search.':(err.message||'Search failed. Check your connection or API key.');fail.appendChild(p);grid.appendChild(fail);status('YouTube search is unavailable. See search setup.');}
 finally{clearTimeout(timer)}
}

function showSearch(query,tabId){
 const view=$('browser-view');view.replaceChildren();
 const root=document.createElement('div');root.className='browser-results';view.appendChild(root);
 const heading=document.createElement('div');heading.className='browser-results-heading';
 const title=document.createElement('h3');title.textContent='Search results for “'+query+'”';heading.appendChild(title);
 const broader=document.createElement('a');broader.href='https://www.google.com/search?q='+encodeURIComponent(query);broader.target='_blank';broader.rel='noopener noreferrer';broader.textContent='Search full web ↗';heading.appendChild(broader);root.appendChild(heading);
 const hint=document.createElement('p');hint.className='browser-results-hint';hint.textContent='Showing results from Wikipedia. Full-web searches open in a new tab because search engines do not permit embedded results.';root.appendChild(hint);
 const results=document.createElement('div');results.className='browser-result-list';results.textContent='Searching Wikipedia…';root.appendChild(results);
 if(!query.trim()){results.textContent='Enter a search to begin.';return}
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),11000);
 const params=new URLSearchParams({action:'query',generator:'search',gsrsearch:query,gsrlimit:'12',prop:'extracts|info',exintro:'1',explaintext:'1',exsentences:'2',inprop:'url',format:'json',origin:'*'});
 fetch('https://en.wikipedia.org/w/api.php?'+params,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Request failed');return r.json()}).then(data=>{
  if(active()?.id!==tabId||active()?.url!=='search:'+query)return;
  results.replaceChildren();const pages=Object.values(data.query?.pages||{}).sort((a,b)=>(a.index??999)-(b.index??999));
  if(!pages.length){results.textContent='No matching articles. Try a different search.';return}
  pages.forEach(page=>{const item=document.createElement('article');item.className='browser-result';const a=document.createElement('a');a.className='browser-result-title';a.textContent=page.title;a.href=page.fullurl||'https://en.wikipedia.org/wiki/'+encodeURIComponent(page.title.replaceAll(' ','_'));a.target='_blank';a.rel='noopener noreferrer';item.appendChild(a);const domain=document.createElement('span');domain.className='browser-result-domain';domain.textContent='en.wikipedia.org';item.appendChild(domain);const summary=document.createElement('p');summary.textContent=(page.extract||'Read the article on Wikipedia.').slice(0,360);item.appendChild(summary);const open=document.createElement('button');open.textContent='Read inside PLAYROOM';open.type='button';open.onclick=()=>showArticle(page,query,tabId);item.appendChild(open);results.appendChild(item)})
 }).catch(()=>{if(active()?.id===tabId&&active()?.url==='search:'+query){results.replaceChildren();const note=document.createElement('p');note.textContent='Search results could not load. Your connection or school network may block Wikipedia.';results.appendChild(note)}}).finally(()=>clearTimeout(timeout));
}
function showArticle(page,query,tabId){if(active()?.id!==tabId)return;const root=document.createElement('div');root.className='browser-article';const back=document.createElement('button');back.type='button';back.textContent='← Back to search results';back.onclick=()=>showSearch(query,tabId);root.appendChild(back);const h=document.createElement('h3');h.textContent=page.title;root.appendChild(h);const p=document.createElement('p');p.textContent=page.extract||'Full content is available from the source.';root.appendChild(p);const link=document.createElement('a');link.textContent='Read full article on Wikipedia ↗';link.href=page.fullurl||'https://en.wikipedia.org/wiki/'+encodeURIComponent(page.title.replaceAll(' ','_'));link.target='_blank';link.rel='noopener noreferrer';root.appendChild(link);$('browser-view').replaceChildren(root)}
function navigate(raw,mode=state.mode,fromHistory=false){if(mode!=='video'&&mode!=='search'&&isSearchTerm(raw))mode='search';let url=(mode==='video'||mode==='tiktok')?null:mode==='search'?'search:'+raw.trim():safeUrl(raw);if(mode==='video'){const id=ytId(raw);if(!id){if(!raw.trim()){status('Enter a YouTube search or video URL.');return}url='ytsearch:'+raw.trim()}else url='https://www.youtube.com/watch?v='+id}if(mode==='tiktok'){
 const incoming=raw.split(/[\s,]+/).map(tikId).filter(Boolean);
 if(!incoming.length){status('Paste one or more full public TikTok video URLs or numeric video IDs.');return}
 let added=0;for(const id of incoming){const existing=tikFeed.indexOf(id);if(existing===-1){tikFeed.push(id);tikActive=tikFeed.length-1;added++}else tikActive=existing}
 tikFeed=tikFeed.slice(-100);tikActive=Math.min(tikActive,tikFeed.length-1);saveFeed();
 const t=active();t.mode='tiktok';t.url='https://www.tiktok.com/embed/v2/'+tikFeed[tikActive];t.title='TikTok feed';record(t.url,'tiktok');status(added?'Added '+added+' video(s) to your TikTok feed. Scroll to switch videos.':'Jumped to an existing video in your feed.');show();return
 }if(!url||url==='search:'){status('Type a search term or enter a public website address.');return}const t=active();if(!fromHistory&&t.url)state.back.push({url:t.url,mode:t.mode});if(!fromHistory)state.forward=[];t.url=url;t.mode=mode;t.title=nameOf(url,mode);record(url,mode);status(mode==='video'?(url.startsWith('ytsearch:')?'Searching YouTube videos inside PLAYROOM…':'Loading YouTube embed. Some videos cannot be embedded.'):mode==='tiktok'?'Loading TikTok embed. Creator, platform, and network restrictions still apply.':mode==='search'?'Searching Wikipedia inside PLAYROOM…':'Loading website. Some pages block embeds or network access.');show()}
form.addEventListener('submit',e=>{e.preventDefault();navigate($('browser-address').value)});
document.querySelectorAll('.browser-mode').forEach(btn=>btn.onclick=()=>{const t=active();t.mode=btn.dataset.mode;t.url='';t.title='Start';state.back=[];state.forward=[];status(t.mode==='video'?'Paste a YouTube video URL to play.':t.mode==='tiktok'?'Open the scrollable starter feed or add a link.':t.mode==='search'?'Search Wikipedia inside PLAYROOM.':'Paste a website address or type a search.');show()});
$('browser-reload').onclick=()=>show();$('browser-back').onclick=()=>{if(!state.back.length)return;const t=active();if(t.url)state.forward.push({url:t.url,mode:t.mode});const p=state.back.pop();t.url=p.url;t.mode=p.mode;t.title=nameOf(t.url,t.mode);show()};$('browser-forward').onclick=()=>{if(!state.forward.length)return;const t=active();if(t.url)state.back.push({url:t.url,mode:t.mode});const p=state.forward.pop();t.url=p.url;t.mode=p.mode;t.title=nameOf(t.url,t.mode);show()};
$('browser-bookmark').onclick=()=>{const t=active();if(!t.url)return status('Open a page or video before bookmarking.');if(state.bookmarks.some(b=>b.url===t.url)){state.bookmarks=state.bookmarks.filter(b=>b.url!==t.url);status('Bookmark removed.')}else{state.bookmarks.unshift({url:t.url,mode:t.mode,title:t.title});state.bookmarks=state.bookmarks.slice(0,50);status('Bookmark saved on this device.')}save();drawLists();show()};
$('browser-clear-bookmarks').onclick=()=>{state.bookmarks=[];save();drawLists();show();status('Bookmarks cleared.')};$('browser-clear-history').onclick=()=>{state.history=[];save();drawLists();status('Recent history cleared.')};
const example=$('browser-open-example');if(example)example.onclick=()=>{active().mode='web';navigate('https://example.com','web')};
show();drawLists();
})();
