(function () {
  const LD = window.LD;

  // Faixas de fundo, tocadas em sequência e repetidas. Basta colocar os arquivos em assets/audio/.
  const FAIXAS = [
    { arquivo: 'assets/audio/tema.mp3', nome: 'Tema' }
  ];
  const VOLUME_PADRAO = 0.3;

  const guardar = (k, v) => { try { localStorage.setItem('ld_musica_' + k, String(v)); } catch (e) {} };
  const ler = (k, padrao) => { try { const v = localStorage.getItem('ld_musica_' + k); return v == null ? padrao : v; } catch (e) { return padrao; } };

  let ligada = ler('ligada', '1') === '1';
  let volume = Math.min(1, Math.max(0, Number(ler('volume', VOLUME_PADRAO))));
  let faixa = Math.min(FAIXAS.length - 1, Math.max(0, Number(ler('faixa', 0)) || 0));
  let retomarEm = Number(ler('tempo', 0)) || 0;
  let falhou = false;
  let fade = null;

  const audio = new Audio();
  audio.preload = 'none';
  audio.loop = FAIXAS.length === 1;

  const el = document.createElement('div');
  el.className = 'musica';
  el.innerHTML = `
    <button class="icon-btn" data-tocar aria-label="Música de fundo"><span>♪</span></button>
    <div class="musica-painel">
      <div class="caps" data-nome></div>
      <input type="range" min="0" max="100" data-vol aria-label="Volume">
      ${FAIXAS.length > 1 ? '<button class="btn plain" data-prox>Próxima</button>' : ''}
    </div>`;
  document.body.appendChild(el);
  const btn = el.querySelector('[data-tocar]');
  const nome = el.querySelector('[data-nome]');
  const vol = el.querySelector('[data-vol]');
  vol.value = Math.round(volume * 100);

  function atualizar() {
    const tocando = !audio.paused && !falhou;
    btn.querySelector('span').textContent = tocando ? '❚❚' : '♪';
    el.classList.toggle('tocando', tocando);
    el.classList.toggle('falhou', falhou);
    nome.textContent = falhou ? 'Arquivo não encontrado' : (tocando ? FAIXAS[faixa].nome : 'Música pausada');
  }

  function rampa(alvo, ms, depois) {
    clearInterval(fade);
    const passos = Math.max(1, Math.round(ms / 40));
    const ini = audio.volume;
    let i = 0;
    fade = setInterval(() => {
      i++;
      audio.volume = Math.min(1, Math.max(0, ini + (alvo - ini) * (i / passos)));
      if (i >= passos) { clearInterval(fade); if (depois) depois(); }
    }, 40);
  }

  function carregar(i) {
    faixa = (i + FAIXAS.length) % FAIXAS.length;
    guardar('faixa', faixa);
    audio.src = FAIXAS[faixa].arquivo;
  }

  function tocar() {
    if (!audio.src) carregar(faixa);
    falhou = false;
    audio.volume = 0;
    const p = audio.play();
    if (p && p.then) {
      p.then(() => {
        if (retomarEm) { try { audio.currentTime = retomarEm; } catch (e) {} retomarEm = 0; }
        rampa(volume, 1800);
        atualizar();
      }).catch((e) => {
        if (e && e.name === 'NotAllowedError') return; // o navegador espera um clique
        falhou = true;
        atualizar();
      });
    }
  }

  function pausar() {
    rampa(0, 500, () => { audio.pause(); atualizar(); });
  }

  audio.addEventListener('error', () => {
    if (!audio.src) return;
    falhou = true;
    atualizar();
    LD.ui && LD.ui.toast(`Música não encontrada: coloque o arquivo em ${FAIXAS[faixa].arquivo}`, 'erro');
  });
  audio.addEventListener('ended', () => { if (!audio.loop) { carregar(faixa + 1); tocar(); } });
  audio.addEventListener('play', atualizar);
  audio.addEventListener('pause', atualizar);
  // Guarda onde parou, para continuar do mesmo ponto ao recarregar a página.
  setInterval(() => { if (!audio.paused) guardar('tempo', Math.floor(audio.currentTime)); }, 3000);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audio.paused) { ligada = true; tocar(); } else { ligada = false; pausar(); }
    guardar('ligada', ligada ? '1' : '0');
  });
  vol.addEventListener('input', () => {
    volume = vol.value / 100;
    clearInterval(fade);
    audio.volume = volume;
    guardar('volume', volume);
  });
  const prox = el.querySelector('[data-prox]');
  if (prox) prox.addEventListener('click', () => { retomarEm = 0; carregar(faixa + 1); tocar(); });

  // O navegador só deixa tocar som depois de um clique: começa no primeiro, se estiver ligada.
  function primeiroGesto(e) {
    if (el.contains(e.target)) return;
    document.removeEventListener('pointerdown', primeiroGesto, true);
    document.removeEventListener('keydown', primeiroGesto, true);
    if (ligada && audio.paused) tocar();
  }
  document.addEventListener('pointerdown', primeiroGesto, true);
  document.addEventListener('keydown', primeiroGesto, true);

  atualizar();
  LD.musica = { tocar, pausar, FAIXAS };
})();
