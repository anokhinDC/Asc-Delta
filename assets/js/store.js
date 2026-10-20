/*
 * Ascensão Delta · Lúmia
 * Dados: Firebase (as mesmas contas do painel antigo) ou modo local.
 *
 * As coleções do sistema novo têm o prefixo "lumia_", para não
 * misturar com as fichas antigas, que continuam intactas no banco.
 */
(function () {
  const LD = (window.LD = window.LD || {});

  const firebaseConfig = {
    apiKey: 'AIzaSyA9vgfJ_fF0hmIZ95uytdW5ggZgpfm4WlI',
    authDomain: 'beyon-depths.firebaseapp.com',
    projectId: 'beyon-depths',
    storageBucket: 'beyon-depths.firebasestorage.app',
    messagingSenderId: '605571730206',
    appId: '1:605571730206:web:3b371ce0dc4c0a7ce4d70f'
  };

  const COLECOES = {
    personagens: 'lumia_personagens',
    habilidades: 'lumia_habilidades',
    pictos: 'lumia_pictos',
    armas: 'lumia_armas',
    itens: 'lumia_itens',
    monstros: 'lumia_monstros',
    expedicao: 'lumia_expedicao'
  };

  // Quem pode criar e editar cada coleção, além do mestre.
  const JOGADOR_PODE_CRIAR = { personagens: true, habilidades: true, pictos: false, armas: true, itens: false, monstros: false, expedicao: true };

  const forceLocal = /[?&]local=1/.test(location.search);

  const state = {
    db: null,
    auth: null,
    user: null,
    local: true,
    ready: false,
    data: { personagens: [], habilidades: [], pictos: [], armas: [], itens: [], monstros: [], expedicao: [] }
  };

  const listeners = new Set();
  const unsub = [];

  function emit() { listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }

  function id() { return 'ld_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

  function lsKey(col) { return 'lumia_' + col; }

  function loadLocal() {
    Object.keys(COLECOES).forEach((col) => {
      try {
        const raw = localStorage.getItem(lsKey(col));
        state.data[col] = raw ? JSON.parse(raw) : [];
      } catch (e) { state.data[col] = []; }
    });
    const vazio = Object.keys(COLECOES).every((c) => c === 'personagens' || state.data[c].length === 0);
    if (vazio && LD.seed) {
      Object.keys(LD.seed).forEach((col) => { state.data[col] = JSON.parse(JSON.stringify(LD.seed[col])); });
      Object.keys(COLECOES).forEach(saveLocal);
    }
  }

  function saveLocal(col) {
    try { localStorage.setItem(lsKey(col), JSON.stringify(state.data[col])); } catch (e) { console.warn(e); }
  }

  // Só estas duas contas são mestre. Qualquer outro usuário, mesmo que comece com 'mestre' ou 'admin', é jogador.
  const MESTRES = ['mestre@beyonddepths.com', 'admin@beyonddepths.com'];

  function isMaster() {
    if (state.local) return true;
    const e = state.user && state.user.email;
    return !!e && MESTRES.includes(e.toLowerCase());
  }

  function canEdit(col, item) {
    if (state.local) return true;
    if (!state.user) return false;
    if (isMaster()) return true;
    if (col === 'expedicao') return true; // Ampolas da expedição: todo mundo logado usa
    if (!item) return !!JOGADOR_PODE_CRIAR[col];
    return item.ownerId === state.user.uid;
  }

  function startListeners() {
    unsub.splice(0).forEach((u) => u && u());
    if (!state.user) {
      Object.keys(state.data).forEach((k) => (state.data[k] = []));
      state.ready = true;
      emit();
      return;
    }
    // Pronto quando cada coleção respondeu (dados ou erro) uma vez. Se alguma não responder em 8 s
    // (rede ruim, aba antiga), libera a tela mesmo assim em vez de ficar carregando para sempre.
    const faltam = new Set(Object.keys(COLECOES));
    const liberar = () => { if (!state.ready) { state.ready = true; emit(); } };
    const respondeu = (col) => { faltam.delete(col); if (!faltam.size) liberar(); };
    setTimeout(() => {
      if (state.ready) return;
      console.warn('Coleções sem resposta em 8 s:', Array.from(faltam).join(', '));
      LD.ui && LD.ui.toast('Algumas coleções demoraram a responder. Se faltar algo, recarregue a página.', 'erro');
      liberar();
    }, 8000);
    Object.entries(COLECOES).forEach(([col, name]) => {
      const u = state.db.collection(name).onSnapshot(
        (snap) => {
          state.data[col] = snap.docs.map((d) => d.data());
          respondeu(col);
          emit();
        },
        (err) => {
          console.error('Firestore', name, err);
          LD.ui && LD.ui.toast(`Sem acesso à coleção ${name}. Veja o README (regras do Firestore).`, 'erro');
          respondeu(col);
          emit();
        }
      );
      unsub.push(u);
    });
  }

  function init() {
    if (!forceLocal && window.firebase && firebaseConfig.apiKey) {
      try {
        firebase.initializeApp(firebaseConfig);
        state.db = firebase.firestore();
        state.auth = firebase.auth();
        state.local = false;
      } catch (e) {
        console.warn('Firebase indisponível, modo local.', e);
      }
    }
    if (state.local) {
      loadLocal();
      state.ready = true;
      emit();
      return;
    }
    state.auth.onAuthStateChanged((user) => {
      state.user = user;
      startListeners();
    });
  }

  function save(col, item) {
    if (!item.id) item.id = id();
    item.updatedAt = Date.now();
    if (!canEdit(col, state.data[col].find((x) => x.id === item.id) || (item.ownerId ? item : null))) {
      LD.ui && LD.ui.toast('Sem permissão para editar isso.', 'erro');
      return Promise.reject(new Error('permissão'));
    }
    const arr = state.data[col];
    const i = arr.findIndex((x) => x.id === item.id);
    if (state.local) {
      if (i > -1) arr[i] = item; else arr.push(item);
      saveLocal(col);
      emit();
      return Promise.resolve(item);
    }
    if (col !== 'expedicao') {
      if (!item.ownerId) item.ownerId = state.user.uid;
      if (!item.ownerName) item.ownerName = (state.user.email || '').split('@')[0];
    }
    const clean = JSON.parse(JSON.stringify(item));
    // Atualiza já a cópia local, para a tela não voltar ao valor antigo enquanto o Firestore confirma.
    if (i > -1) arr[i] = clean; else arr.push(clean);
    return state.db.collection(COLECOES[col]).doc(item.id).set(clean, col === 'expedicao' ? { merge: true } : undefined).then(() => item).catch((e) => {
      console.error(e);
      LD.ui && LD.ui.toast('Erro ao salvar: ' + e.message, 'erro');
      throw e;
    });
  }

  function remove(col, itemId) {
    const item = state.data[col].find((x) => x.id === itemId);
    if (!canEdit(col, item)) { LD.ui && LD.ui.toast('Sem permissão.', 'erro'); return Promise.reject(); }
    if (state.local) {
      state.data[col] = state.data[col].filter((x) => x.id !== itemId);
      saveLocal(col);
      emit();
      return Promise.resolve();
    }
    return state.db.collection(COLECOES[col]).doc(itemId).delete();
  }

  function login(usuario, senha) {
    if (state.local) return Promise.resolve();
    const email = `${usuario.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@beyonddepths.com`;
    return state.auth.signInWithEmailAndPassword(email, senha).catch((err) => {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        return state.auth.createUserWithEmailAndPassword(email, senha);
      }
      throw err;
    });
  }

  function logout() { if (state.auth) state.auth.signOut(); }

  // Grava a biblioteca inicial (ids fixos, então repetir não duplica).
  function semear() {
    if (!LD.seed) return Promise.resolve(0);
    const jobs = [];
    Object.keys(LD.seed).forEach((col) => {
      LD.seed[col].forEach((item) => jobs.push(save(col, JSON.parse(JSON.stringify(item)))));
    });
    return Promise.allSettled(jobs).then((r) => r.filter((x) => x.status === 'fulfilled').length);
  }

  function exportar() {
    return JSON.stringify({ sistema: 'lumia-v1', exportadoEm: new Date().toISOString(), dados: state.data }, null, 2);
  }

  function importar(json, colecoes) {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    const dados = obj.dados || obj;
    const jobs = [];
    (colecoes || Object.keys(COLECOES)).forEach((col) => {
      (dados[col] || []).forEach((item) => {
        const copia = Object.assign({}, item);
        if (!state.local) delete copia.ownerId;
        jobs.push(save(col, copia));
      });
    });
    return Promise.allSettled(jobs);
  }

  // As Ampolas são da expedição inteira: um registro só, igual para todos.
  const AMPOLAS_PADRAO = { cura: 3, lumia: 2, retorno: 1 };

  function expedicao() {
    const reg = (state.data.expedicao || []).find((x) => x.id === 'atual') || {};
    const out = { id: 'atual', ampolas: {}, fragmentos: Math.max(0, Math.min(999, Math.floor(Number(reg.fragmentos) || 0))) };
    Object.keys(AMPOLAS_PADRAO).forEach((k) => {
      const a = (reg.ampolas && reg.ampolas[k]) || {};
      const max = Math.max(0, Math.min(20, Math.floor(a.max === undefined ? AMPOLAS_PADRAO[k] : Number(a.max) || 0)));
      const atual = Math.max(0, Math.min(max, Math.floor(a.atual === undefined ? max : Number(a.atual) || 0)));
      out.ampolas[k] = { atual, max };
    });
    return out;
  }

  function salvarExpedicao(e) {
    return save('expedicao', { id: 'atual', ampolas: e.ampolas, fragmentos: e.fragmentos });
  }

  LD.store = {
    expedicao, salvarExpedicao,
    state, init, save, remove, login, logout, isMaster, canEdit, semear, exportar, importar, newId: id,
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    get: (col, itemId) => state.data[col].find((x) => x.id === itemId),
    list: (col) => state.data[col],
    COLECOES
  };
})();
