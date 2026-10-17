(function () {
  const LD = window.LD;
  const { esc } = LD.ui;

  const MENU = [
    { rota: 'fichas', nome: 'Fichas', rn: 'I', ativo: ['fichas', 'ficha'] },
    { rota: 'habilidades', nome: 'Habilidades', rn: 'II' },
    { rota: 'pictos', nome: 'Pictos', rn: 'III' },
    { rota: 'arsenal', nome: 'Arsenal', rn: 'IV' },
    { rota: 'bestiario', nome: 'Bestiário', rn: 'V', ativo: ['bestiario', 'monstro'] },
    { sep: true },
    { rota: 'mestre', nome: 'Oficina', rn: 'VI' },
    { rota: 'codex', nome: 'Códice', rn: 'VII' }
  ];
  const LIVRES = ['codex']; // abertas mesmo sem login

  const nav = document.querySelector('[data-nav]');
  const main = document.querySelector('[data-main]');
  const numeral = document.querySelector('[data-numeral]');

  function rotaAtual() {
    const h = location.hash.replace(/^#\/?/, '');
    const [nome, param] = h.split('/');
    return { nome: nome || 'fichas', param: param ? decodeURIComponent(param) : null };
  }

  function renderNav() {
    const r = rotaAtual();
    const s = LD.store.state;
    const user = s.user ? (s.user.email || '').split('@')[0] : null;
    nav.innerHTML = `
      <div class="brand">
        <div class="title">Ascensão<br><em>Delta</em></div>
        <div class="sub eyebrow">Biblioteca de Lúmia</div>
      </div>
      <ul class="menu">${MENU.map((m) => m.sep ? '<li class="sep"></li>' : `
        <li><a href="#/${m.rota}" class="${(m.ativo || [m.rota]).includes(r.nome) ? 'on' : ''}"><span class="rn">${m.rn}</span>${m.nome}</a></li>`).join('')}
      </ul>
      <div class="nav-foot">
        ${s.local ? '<span class="caps">Modo local · neste navegador</span>' : user
          ? `<span class="caps">${LD.store.isMaster() ? '<span style="color:var(--accent-2)">Mestre</span> · ' : ''}${esc(user)}</span><button class="btn plain" data-sair style="align-self:flex-start">Sair</button>`
          : '<a href="#/fichas" class="btn" style="align-self:flex-start">Entrar</a>'}
      </div>`;
    const sair = nav.querySelector('[data-sair]');
    if (sair) sair.addEventListener('click', () => LD.store.logout());
  }

  function renderLogin() {
    main.innerHTML = `
      <div class="gate">
        <div class="eyebrow">Expedição Delta</div>
        <h1 style="margin:12px 0 10px">Assine a lista</h1>
        <p class="lead paper-2" style="margin-bottom:28px">Entre com seu usuário e senha. Se for a primeira vez, a conta é criada agora.</p>
        <form data-login class="panel framed" style="padding:28px">
          <div class="field"><label>Usuário</label><input name="u" required autocomplete="username" class="big"></div>
          <div class="field"><label>Senha</label><input name="p" type="password" required autocomplete="current-password"></div>
          <button class="btn-primary" type="submit" style="margin-top:8px">Entrar</button>
        </form>
        <p class="muted" style="margin-top:22px;font-size:13px">Só quer ler as regras? <a href="#/codex">Abra o Códice.</a></p>
      </div>`;
    main.querySelector('[data-login]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      LD.store.login(f.get('u'), f.get('p')).catch((err) => LD.ui.toast(err.message, 'erro'));
    });
  }

  let pendente = false;
  function render() {
    const s = LD.store.state;
    renderNav();
    const r = rotaAtual();
    const view = LD.views[r.nome] || LD.views.fichas;
    numeral.textContent = view.numeral || '';
    document.title = `${view.titulo} · Ascensão Delta`;
    if (!s.ready) { main.innerHTML = '<div class="empty">Acendendo os postes…</div>'; return; }
    if (!s.local && !s.user && !LIVRES.includes(r.nome)) { renderLogin(); return; }
    view.render(main, r.param);
  }

  // Não redesenha enquanto alguém digita: espera o campo perder o foco.
  function talvezRender() {
    const a = document.activeElement;
    const digitando = a && main.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.type !== 'checkbox';
    const gaveta = document.querySelector('.drawer.open');
    if (digitando || gaveta) { pendente = true; return; }
    pendente = false;
    render();
  }
  main.addEventListener('focusout', () => setTimeout(() => { if (pendente) talvezRender(); }, 60));
  document.addEventListener('transitionend', (e) => {
    if (e.target.classList && e.target.classList.contains('drawer') && !e.target.classList.contains('open') && pendente) talvezRender();
  });

  window.addEventListener('hashchange', () => {
    nav.classList.remove('open');
    LD.ui.closeDrawer();
    window.scrollTo(0, 0);
    render();
  });
  document.querySelector('[data-menu]').addEventListener('click', () => nav.classList.toggle('open'));

  // Neve azul
  const snow = document.querySelector('.snow');
  for (let i = 0; i < 26; i++) {
    const f = document.createElement('i');
    f.style.left = Math.random() * 100 + 'vw';
    f.style.animationDuration = 14 + Math.random() * 22 + 's';
    f.style.animationDelay = -Math.random() * 30 + 's';
    const s = 1 + Math.random() * 2.6;
    f.style.width = f.style.height = s + 'px';
    snow.appendChild(f);
  }

  LD.store.on(talvezRender);
  LD.store.init();
  render();
})();
