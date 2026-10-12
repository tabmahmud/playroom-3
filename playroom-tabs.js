(()=>{'use strict';
const tabs=[...document.querySelectorAll('.playroom-main-tab')];
const keys=['games','assistant','browser'];
const path=document.getElementById('playroom-page-path');
const label={games:'games · 100-game arcade',assistant:'ai assistant · Groq + study tools',browser:'browser · websites & videos'};
let current='games';
function select(page,updateHash=true){if(!keys.includes(page))page='games';current=page;document.body.dataset.prPage=page;for(const tab of tabs){let active=tab.dataset.page===page;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}path.textContent='playroom / '+label[page];if(updateHash&&location.hash!=='#'+page)history.replaceState(null,'','#'+page);if(page==='browser'&&!window.__prOpenedBrowser){window.__prOpenedBrowser=true;document.querySelector('.browser-mode[data-mode="web"]')?.click();}window.scrollTo({top:0,behavior:'instant'});}
tabs.forEach(tab=>tab.addEventListener('click',()=>select(tab.dataset.page)));
const back=document.getElementById('playroom-tab-back'),next=document.getElementById('playroom-tab-next');back?.addEventListener('click',()=>select(keys[(keys.indexOf(current)+keys.length-1)%keys.length]));next?.addEventListener('click',()=>select(keys[(keys.indexOf(current)+1)%keys.length]));
document.addEventListener('click',e=>{const anchor=e.target.closest('a[href^="#"]');if(!anchor)return;const h=anchor.getAttribute('href');if(h==='#games'||h==='#home')select('games');else if(h==='#assistant')select('assistant');else if(h==='#browser')select('browser');});
window.addEventListener('hashchange',()=>{let hash=location.hash.slice(1);if(keys.includes(hash))select(hash,false)});
select(keys.includes(location.hash.slice(1))?location.hash.slice(1):'games',false);
})();
