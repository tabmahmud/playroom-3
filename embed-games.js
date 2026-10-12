(() => {
  const games = {
    fastlane: {
      title: 'Fastlane: Road to Revenge',
      url: 'https://html5.gamemonetize.co/lnquy874mrycj5mcqmp6vtmxa63qvjvg/',
      credit: 'https://doodoo.love/games/fastlane-road-to-revenge'
    },
    snake: {
      title: 'Snake',
      url: 'https://gamezipper.com/snake/?utm_source=embed',
      credit: 'https://gamezipper.com/snake/',
      provider: 'GameZipper',
      providerUrl: 'https://gamezipper.com/'
    },
    alchemy: {
      title: 'Little Alchemy',
      url: 'https://gamezipper.com/little-alchemy/?utm_source=embed',
      credit: 'https://gamezipper.com/little-alchemy/',
      provider: 'GameZipper',
      providerUrl: 'https://gamezipper.com/'
    },
    neon: {
      title: 'Neon Run',
      url: 'https://gamezipper.com/neon-run/?utm_source=embed',
      credit: 'https://gamezipper.com/neon-run/',
      provider: 'GameZipper',
      providerUrl: 'https://gamezipper.com/'
    },
    survival: {
      title: 'Survival Craft',
      url: 'https://html5.gamemonetize.com/nkq351xyqdf5aqk9m4j3wq3t0k9qjh36/',
      credit: 'https://doodoo.love/games/survival-craft'
    }
  };
  const modal = document.getElementById('modal');
  const ui = document.getElementById('game-ui');
  const originalOpenGame = window.openGame;
  window.openGame = (name) => {
    const game = games[name];
    if (!game) return originalOpenGame?.(name);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('modal-title').textContent = game.title;
    ui.replaceChildren();
    const holder = document.createElement('div');
    holder.className = 'embedded-game-holder';
    const iframe = document.createElement('iframe');
    iframe.src = game.url;
    iframe.title = game.title;
    iframe.setAttribute('allow', 'autoplay; fullscreen; gamepad');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'eager');
    holder.appendChild(iframe);
    const credit = document.createElement('p');
    credit.className = 'embed-credit';
    credit.append('Play ');
    const link = document.createElement('a');
    link.href = game.credit; link.target = '_blank'; link.rel = 'noopener'; link.textContent = game.title;
    credit.append(link, ' on ');
    const provider = document.createElement('a');
    provider.href = game.providerUrl || 'https://doodoo.love'; provider.target = '_blank'; provider.rel = 'noopener'; provider.textContent = game.provider || 'DooDoo.Love';
    credit.append(provider, ' · ');
    const direct = document.createElement('a');
    direct.href = game.url; direct.target = '_blank'; direct.rel = 'noopener'; direct.textContent = 'Open game directly ↗';
    credit.append(direct);
    holder.appendChild(credit);
    ui.appendChild(holder);
    iframe.focus();
  };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => { ui.querySelector('iframe')?.remove(); }));
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !modal.hidden) ui.querySelector('iframe')?.remove(); });
  document.getElementById('fullscreen-btn')?.addEventListener('click', () => {
    const iframe = ui.querySelector('iframe');
    if (iframe && !document.fullscreenElement) iframe.requestFullscreen?.().catch(() => {});
  });
})();
