/*
 * Beyond Depths - System Logic (Multiplayer & Secure)
 * VTT Architecture: Global Armors, Skills & Conditions
 */

// --- FIREBASE SETUP ---
const firebaseConfig = {
    apiKey: "AIzaSyA9vgfJ_fF0hmIZ95uytdW5ggZgpfm4WlI",
    authDomain: "beyon-depths.firebaseapp.com",
    projectId: "beyon-depths",
    storageBucket: "beyon-depths.firebasestorage.app",
    messagingSenderId: "605571730206",
    appId: "1:605571730206:web:3b371ce0dc4c0a7ce4d70f",
    measurementId: "G-RDPYZWNMD0"
};

let db = null;
let auth = null;
let currentUser = null;
let unsubscribeChars = null;
let unsubscribeArmors = null;
let unsubscribeSkills = null;
let unsubscribeWeapons = null;
let unsubscribeAccessories = null;

// Expose the runtime state to auxiliary modules (item_manager.js).
// `let` variables are not properties of window, so the old item manager
// could not see the authenticated user/database instance.
Object.defineProperties(window, {
    db: { configurable: true, get: () => db },
    auth: { configurable: true, get: () => auth },
    currentUser: { configurable: true, get: () => currentUser },
    characters: { configurable: true, get: () => characters, set: (v) => { characters = v; } },
    monsters: { configurable: true, get: () => monsters, set: (v) => { monsters = v; } },
    globalArmors: { configurable: true, get: () => globalArmors, set: (v) => { globalArmors = v; } },
    globalSkills: { configurable: true, get: () => globalSkills, set: (v) => { globalSkills = v; } }
});

if (firebaseConfig.apiKey) {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
    } catch(e) {
        console.warn("Erro ao iniciar Firebase. Modo local ativado.");
    }
}

// --- SECURITY (ANTI-XSS) ---
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

// --- DATA STRUCTURES (GLOBALS) ---

function getArmorBaseStats(type) {
    return ARMOR_DB[type] || ARMOR_DB.none;
}

// --- STATE ---
let characters = [];
let monsters = [];
let combatState = JSON.parse(localStorage.getItem('bd_combat_state')) || { round: 1, combatants: [] };
let globalArmors = [];
let globalSkills = [];
let activeCharId = null;
let editingArmorId = null;
let editingWeaponId = null;
let editingAccessoryId = null;
let editingSkillId = null;
const currentTab = window.currentTab;
let unsubscribeMonsters = null;

function generateId() { return 'id_' + Math.random().toString(36).substr(2, 9); }

function migrateChar(char) {
    if (!char) return {};
    if (!char.id) char.id = generateId();
    if (!char.attr) char.attr = {};
    
    // Expedition 33 Attributes
    if (char.attr.vit === undefined) {
        char.attr.for = char.attr.for || char.attr.str || 0;
        char.attr.agi = char.attr.agi || 0;
        char.attr.vit = char.attr.vit !== undefined ? char.attr.vit : (char.attr.con !== undefined ? char.attr.con : (char.attr.vig || 0));
        char.attr.chr = char.attr.chr !== undefined ? char.attr.chr : (char.attr.mis !== undefined ? char.attr.mis : (char.attr.sed || 0));
        char.attr.per = char.attr.per !== undefined ? char.attr.per : (char.attr.von !== undefined ? char.attr.von : (char.attr.will || 0));
    }
    // Backward compatibility aliases
    char.attr.con = char.attr.vit;
    char.attr.vig = char.attr.vit;
    char.attr.von = char.attr.per;
    char.attr.sed = char.attr.chr;
    char.attr.mis = char.attr.chr;

    if (char.energy === undefined) char.energy = 30; // Chroma
    if (char.lust === undefined) char.lust = 0; // Postura (Break Meter)
    
    // Auto-heal NaN corruptions from previous bug
    if(isNaN(char.hp) || char.hp === null) char.hp = 100;
    if(isNaN(char.stamina) || char.stamina === null) char.stamina = 100;
    if(isNaN(char.lust) || char.lust === null) char.lust = 0;
    if(isNaN(char.energy) || char.energy === null) char.energy = 30;
    
    // Arrays for relations
    if (!char.equippedArmorId) char.equippedArmorId = "";
    if (!char.equippedSkillIds) char.equippedSkillIds = [];
    if (!char.activeConditionIds) char.activeConditionIds = [];
    if (!char.logs) char.logs = [];
    if (!char.perks) char.perks = {};
    const perkAlias = { con: 'vit', vig: 'vit', von: 'per', sed: 'chr', mis: 'chr' };
    for (const oldA in perkAlias) {
        if (char.perks[oldA]) {
            const newA = perkAlias[oldA];
            char.perks[newA] = char.perks[newA] || {};
            for (const pName in char.perks[oldA]) {
                if (!char.perks[newA][pName]) {
                    char.perks[newA][pName] = char.perks[oldA][pName];
                }
            }
            delete char.perks[oldA];
        }
    }
    
    return char;
}

// --- DB SYNC LOGIC ---
function saveToDB(collection, item, localArray, storageKey) {
    const idx = localArray.findIndex(x => x.id === item.id);
    if (idx > -1) localArray[idx] = item;
    else localArray.push(item);

    if (db && currentUser) {
        item.ownerId = currentUser.uid;
        db.collection(collection).doc(item.id).set(item).catch(e => console.error("Erro:", e));
    }
    if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(localArray));
    }
    
    renderSidebar();
    if(collection === 'characters') renderDashboard();
}

window.saveToDB = saveToDB;

function deleteFromDB(collection, id, localArray, storageKey) {
    if (!collection || !id) return;

    if (collection === 'characters') {
        window.deleteCharacter(id);
        return;
    }

    try {
        let deletedSet = JSON.parse(localStorage.getItem('bd_deleted_ids') || '[]');
        if (!deletedSet.includes(String(id))) {
            deletedSet.push(String(id));
            localStorage.setItem('bd_deleted_ids', JSON.stringify(deletedSet));
        }
    } catch(e) {}

    if (collection === 'monsters') {
        monsters = monsters.filter(x => String(x.id) !== String(id));
        localStorage.setItem('bd_monsters', JSON.stringify(monsters));
    } else if (collection === 'global_armors') {
        globalArmors = globalArmors.filter(x => String(x.id) !== String(id));
        localStorage.setItem('bd_armors', JSON.stringify(globalArmors));
    } else if (collection === 'global_skills') {
        globalSkills = globalSkills.filter(x => String(x.id) !== String(id));
        localStorage.setItem('bd_skills', JSON.stringify(globalSkills));
    } else if (collection === 'global_weapons') {
        window.globalWeapons = (window.globalWeapons || []).filter(x => String(x.id) !== String(id));
        localStorage.setItem('bd_weapons', JSON.stringify(window.globalWeapons));
    } else if (collection === 'global_accessories') {
        window.globalAccessories = (window.globalAccessories || []).filter(x => String(x.id) !== String(id));
        localStorage.setItem('bd_accessories', JSON.stringify(window.globalAccessories));
    } else if (localArray && Array.isArray(localArray)) {
        const filtered = localArray.filter(x => String(x.id) !== String(id));
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(filtered));
    }

    if (typeof db !== 'undefined' && db && typeof currentUser !== 'undefined' && currentUser) {
        db.collection(collection).doc(id).delete().catch(err => {
            console.warn("Exclusão no Firestore falhou (removido localmente): ", err);
        });
    }

    renderSidebar();
}

window.deleteFromDB = deleteFromDB;

function loadData() {
    activeCharId = localStorage.getItem('bd_active');
    
    if (db) {
        auth.onAuthStateChanged(user => {
            currentUser = user;
            updateAuthUI();

            // Stop every realtime listener before replacing the authenticated session.
            if (unsubscribeChars) unsubscribeChars();
            if (unsubscribeArmors) unsubscribeArmors();
            if (unsubscribeSkills) unsubscribeSkills();
            if (unsubscribeMonsters) unsubscribeMonsters();
            if (unsubscribeWeapons) unsubscribeWeapons();
            if (unsubscribeAccessories) unsubscribeAccessories();
            unsubscribeChars = unsubscribeArmors = unsubscribeSkills = null;
            unsubscribeMonsters = unsubscribeWeapons = unsubscribeAccessories = null;

            if (user) {
                if (typeof window.initItemListeners === 'function') {
                    const itemUnsubs = window.initItemListeners(db) || {};
                    unsubscribeWeapons = itemUnsubs.weapons || null;
                    unsubscribeAccessories = itemUnsubs.accessories || null;
                }
                unsubscribeChars = db.collection('characters').onSnapshot(snap => {
                    let deletedSet = [];
                    try { deletedSet = JSON.parse(localStorage.getItem('bd_deleted_ids') || '[]'); } catch(e) {}
                    characters = snap.docs
                        .map(doc => migrateChar(doc.data()))
                        .filter(c => !deletedSet.includes(c.id));
                    if (activeCharId && !characters.find(c => c.id === activeCharId)) activeCharId = characters[0]?.id || null;
                    if(currentTab === 'chars') renderSidebar();
                    renderDashboard();
                    if(currentTab === 'rpg') renderRPG();
                });
                unsubscribeArmors = db.collection('global_armors').onSnapshot(snap => {
                    let deletedSet = [];
                    try { deletedSet = JSON.parse(localStorage.getItem('bd_deleted_ids') || '[]'); } catch(e) {}
                    globalArmors = snap.docs.map(doc => doc.data()).filter(a => !deletedSet.includes(String(a.id)));
                    if(currentTab === 'armors') renderSidebar();
                    renderDashboard();
                });
                unsubscribeSkills = db.collection('global_skills').onSnapshot(snap => {
                    let deletedSet = [];
                    try { deletedSet = JSON.parse(localStorage.getItem('bd_deleted_ids') || '[]'); } catch(e) {}
                    globalSkills = snap.docs.map(doc => doc.data()).filter(s => !deletedSet.includes(String(s.id)));
                    if(currentTab === 'skills') renderSidebar();
                    renderDashboard();
                });
                unsubscribeMonsters = db.collection('monsters').onSnapshot(snap => {
                    let deletedSet = [];
                    try { deletedSet = JSON.parse(localStorage.getItem('bd_deleted_ids') || '[]'); } catch(e) {}
                    monsters = snap.docs.map(doc => doc.data()).filter(m => !deletedSet.includes(String(m.id)));
                    if(currentTab === 'monsters') renderSidebar();
                    if(currentTab === 'rpg') {
                        renderSidebar();
                        renderRPG();
                    }
                });
            } else {
                let deletedSet = [];
                try { deletedSet = JSON.parse(localStorage.getItem('bd_deleted_ids') || '[]'); } catch(e) {}
                const dc = localStorage.getItem('bd_characters');
                if (dc) {
                    try {
                        characters = JSON.parse(dc).map(migrateChar).filter(c => !deletedSet.includes(String(c.id)));
                    } catch(e) { characters = []; }
                } else characters = [];
                const dm = localStorage.getItem('bd_monsters');
                if (dm) {
                    try { monsters = JSON.parse(dm).filter(m => !deletedSet.includes(String(m.id))); } catch(e) { monsters = []; }
                } else monsters = [];
                const da = localStorage.getItem('bd_armors');
                if (da) { try { globalArmors = JSON.parse(da).filter(a => !deletedSet.includes(String(a.id))); } catch(e) {} }
                const ds = localStorage.getItem('bd_skills');
                if (ds) { try { globalSkills = JSON.parse(ds).filter(s => !deletedSet.includes(String(s.id))); } catch(e) {} }

                if (activeCharId && !characters.find(c => c.id === activeCharId)) activeCharId = characters[0]?.id || null;
                if (typeof window.initItemListeners === 'function') {
                    window.initItemListeners(null);
                }
                renderSidebar(); renderDashboard(); renderRPG();
            }
        });
    } else {
        let deletedSet = [];
        try { deletedSet = JSON.parse(localStorage.getItem('bd_deleted_ids') || '[]'); } catch(e) {}
        const dc = localStorage.getItem('bd_characters');
        if (dc) {
            try {
                characters = JSON.parse(dc).map(migrateChar).filter(c => !deletedSet.includes(String(c.id)));
            } catch(e) { characters = []; }
        } else characters = [];
        const da = localStorage.getItem('bd_armors');
        if (da) { try { globalArmors = JSON.parse(da).filter(a => !deletedSet.includes(String(a.id))); } catch(e) {} }
        const ds = localStorage.getItem('bd_skills');
        if (ds) { try { globalSkills = JSON.parse(ds).filter(s => !deletedSet.includes(String(s.id))); } catch(e) {} }
        const dm = localStorage.getItem('bd_monsters');
        if (dm) { try { monsters = JSON.parse(dm).filter(m => !deletedSet.includes(String(m.id))); } catch(e) {} }
        
        if (activeCharId && !characters.find(c => c.id === activeCharId)) activeCharId = characters[0]?.id || null;
        updateAuthUI(); renderSidebar(); renderDashboard(); renderRPG();
    }
}

function canEdit(item) {
    return true; // Permissão total para o usuário interagir, editar e apagar
}

function isMaster() {
    if (!db) return true;
    if (!currentUser || !currentUser.email) return false;
    return currentUser.email.startsWith('admin@') || currentUser.email.startsWith('mestre@');
}

function addLog(char, msg, type = 'info') {
    const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    char.logs.push({ text: msg, type: type, time: time });
    if(char.logs.length > 50) char.logs.shift(); // Keep last 50 logs max
}

// --- AUTH UI ---
const elAuthPanel = document.getElementById('auth-panel');
const btnShowLogin = document.getElementById('btn-show-login');
const elUserInfo = document.getElementById('user-info');
const elUserEmail = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');
const modalLogin = document.getElementById('modal-login');
const formLogin = document.getElementById('form-login');

function updateAuthUI() {
    if (!db) { elAuthPanel.innerHTML = '<span class="text-xs text-green-400">Modo Local (Sem BD)</span>'; return; }
    if (currentUser) {
        btnShowLogin.classList.add('hidden'); elUserInfo.classList.remove('hidden');
        elUserEmail.innerText = escapeHTML(currentUser.email.replace('@beyonddepths.local', ''));
    } else {
        btnShowLogin.classList.remove('hidden'); elUserInfo.classList.add('hidden');
    }
    
    if (isMaster()) {
        document.getElementById('btn-master-damage')?.classList.remove('hidden');
    } else {
        document.getElementById('btn-master-damage')?.classList.add('hidden');
    }
}

if(btnShowLogin) btnShowLogin.addEventListener('click', () => { formLogin.reset(); modalLogin.showModal(); });
if(btnLogout) btnLogout.addEventListener('click', () => { if(auth) auth.signOut(); });

document.getElementById('btn-login-cancel').addEventListener('click', () => modalLogin.close());
document.getElementById('btn-login-submit').addEventListener('click', (e) => {
    e.preventDefault();
    if(!formLogin.checkValidity()) { formLogin.reportValidity(); return; }
    const email = `${document.getElementById('inp-username').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@beyonddepths.com`;
    const pwd = document.getElementById('inp-password').value;
    
    auth.signInWithEmailAndPassword(email, pwd)
        .then(() => modalLogin.close())
        .catch(err => {
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                auth.createUserWithEmailAndPassword(email, pwd).then(() => modalLogin.close()).catch(e => alert(e.message));
            } else alert(err.message);
        });
});

// --- SIDEBAR TABS ---
// removed switchTab and updateTabsUI

// removed onclick tab listeners

// removed updateTabsUI

document.getElementById('btn-new-item').addEventListener('click', () => {
    if (currentTab === 'chars') {
        editingCharId = null;
        document.getElementById('modal-title').innerText = "Nova Ficha";
        document.getElementById('form-character').reset();
        draftPerks = {};
        switchCharTab('base');
        populateCharModalSelects();
        enforceClassConditions();
        document.getElementById('skills-select-list').innerHTML = ''; // reset dynamic slots
        updatePointsCounter();
        document.getElementById('modal-character').showModal();
    } else if (currentTab === 'monsters') {
        openNewMonsterModal();
    } else if (currentTab === 'rpg') {
        document.getElementById('btn-combat-add').click();
    } else if (currentTab === 'armors') {
        editingArmorId = null;
        document.getElementById('form-armor').reset();
        document.getElementById('modal-armor').showModal();
    } else if (currentTab === 'weapons') {
        window.editingWeaponId = null;
        document.getElementById('form-weapon').reset();
        document.getElementById('modal-weapon').showModal();
    } else if (currentTab === 'accessories') {
        window.editingAccessoryId = null;
        document.getElementById('form-accessory').reset();
        document.getElementById('modal-accessory').showModal();
    } else if (currentTab === 'skills') {
        editingSkillId = null;
        document.getElementById('form-skill').reset();
        document.getElementById('modal-skill').showModal();
    }
});

const btnImportChar = document.getElementById('btn-import-char');
const importFileInput = document.getElementById('import-file');
if (btnImportChar && importFileInput) {
    btnImportChar.onclick = () => importFileInput.click();
    importFileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.name && (data.attr || data.class)) {
                    data.id = 'char_' + Date.now();
                    if (currentUser) data.ownerId = currentUser.uid;
                    const migrated = migrateChar(data);
                    characters.push(migrated);
                    activeCharId = migrated.id;
                    localStorage.setItem('bd_active', activeCharId);
                    saveToDB('characters', migrated, characters, 'bd_characters');
                    renderSidebar();
                    renderDashboard();
                    alert(`Ficha de "${data.name}" importada com sucesso!`);
                } else {
                    alert("Arquivo JSON inválido. Certifique-se de que é uma ficha válida.");
                }
            } catch (err) {
                console.error("Erro na importação:", err);
                alert("Erro ao ler o arquivo JSON.");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };
}

function renderSidebar() {
    const listEl = document.getElementById('sidebar-list');
    listEl.innerHTML = '';
    
    let arr = [];
    if (currentTab === 'chars') {
        arr = characters;
    } else if (currentTab === 'monsters') {
        arr = monsters;
    } else if (currentTab === 'rpg') {
        listEl.innerHTML = '<div class="text-center text-sm text-purple-400 mt-10">Tracker ativo.</div>';
        return;
    } else if (currentTab === 'armors') {
        arr = globalArmors;
    } else if (currentTab === 'weapons') {
        arr = globalWeapons;
    } else if (currentTab === 'accessories') {
        arr = globalAccessories;
    } else if (currentTab === 'skills') {
        arr = globalSkills.filter(s => isMaster() || (currentUser && s.ownerId === currentUser.uid));
    }
    
    if (arr.length === 0) {
        listEl.innerHTML = '<div class="text-center text-sm text-gray-500 mt-10">Nenhum item encontrado.</div>';
        return;
    }
    
    arr.forEach(item => {
        const isAct = (currentTab === 'chars' && item.id === activeCharId);
        const div = document.createElement('div');
        div.className = `p-3 rounded transition flex items-center justify-between border ${isAct ? 'bg-gold/10 border-gold' : 'glass-card border-transparent'}`;
        
        if (currentTab === 'chars') {
            div.classList.add('cursor-pointer');
            div.onclick = (e) => {
                if (e.target.closest('.btn-char-quick-del')) return;
                activeCharId = item.id;
                localStorage.setItem('bd_active', item.id);
                renderSidebar();
                renderDashboard();
            };
            div.innerHTML = `
                <div class="flex-1">
                    <div class="font-bold text-sm ${isAct ? 'text-gold' : 'text-gray-200'}">${escapeHTML(item.name)}</div>
                    <div class="text-xs text-gray-400">${escapeHTML(item.class)}</div>
                </div>
                ${canEdit(item) ? `
                <button type="button" class="btn-char-quick-del text-red-400 hover:text-red-300 px-2 py-1 transition" title="Excluir Ficha" data-char-id="${item.id}" data-char-name="${escapeHTML(item.name)}">
                    <i class="fa-solid fa-trash text-xs pointer-events-none"></i>
                </button>
                ` : ''}
            `;
        } else if (currentTab === 'monsters') {
            div.innerHTML = `
                <div class="flex-1 cursor-pointer" onclick="openEditMonster('${item.id}')">
                    <div class="font-bold text-sm text-gray-200">${escapeHTML(item.name)}</div>
                    <div class="text-xs text-gray-400">HP: ${item.hp} | LUST: ${item.lust}</div>
                </div>
                ${canEdit(item) ? `<button onclick="event.stopPropagation(); window.requestDeleteMonster('${item.id}', '${escapeHTML(item.name).replace(/'/g, "\\'")}')" class="text-red-400 hover:text-red-300 px-2 py-1" title="Apagar Monstro"><i class="fa-solid fa-trash text-xs"></i></button>` : ''}
            `;
        } else {
            let sub = `Tipo: ${item.type || item.category || 'Item'}`;
            if (currentTab === 'armors') sub = `DF (HP): +${item.mods?.df_hp || item.mods?.df || 0}`;
            else if (currentTab === 'weapons') {
                const dc = Number(item.diceCount) || 0;
                const df = Number(item.diceFaces) || 0;
                const dm = Number(item.dmgMod) || 0;
                const dmg = dc && df ? `${dc}d${df}${dm > 0 ? '+' + dm : dm < 0 ? dm : ''}` : (item.damage || '-');
                sub = `Dano: ${dmg}`;
            }
            
            const viewModalName = (currentTab === 'armors' ? 'armor' : (currentTab === 'weapons' ? 'weapon' : (currentTab === 'accessories' ? 'accessory' : 'skill')));
            const dbName = currentTab === 'skills' ? 'global_skills' : `global_${currentTab}`;
            
            div.innerHTML = `
                <div class="flex-1 cursor-pointer" onclick="openViewModal('${viewModalName}', '${item.id}')">
                    <div class="font-bold text-sm text-gray-200">${escapeHTML(item.name)}</div>
                    <div class="text-xs text-gray-400">${escapeHTML(sub)}</div>
                </div>
                ${canEdit(item) ? `
                <div class="flex flex-col gap-1 sm:flex-row sm:gap-2">
                    <button onclick="openEditItem('${viewModalName}', '${item.id}')" class="text-blue-400 hover:text-blue-300 px-1" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="event.stopPropagation(); window.requestDeleteItem('${dbName}', '${item.id}', '${escapeHTML(item.name).replace(/'/g, "\\'")}')" class="text-red-400 hover:text-red-300 px-1" title="Apagar"><i class="fa-solid fa-trash"></i></button>
                </div>
                ` : ''}
            `;
        }
        listEl.appendChild(div);
    });
}

// --- GLOBAL MODALS LOGIC ---
document.getElementById('btn-save-g-armor').addEventListener('click', (e) => {
    e.preventDefault();
    const form = document.getElementById('form-armor');
    if(!form.checkValidity()) { form.reportValidity(); return; }
    
    const nameVal = document.getElementById('inp-g-armor-name').value.trim();
    
    if (globalArmors.some(a => a.name.toLowerCase() === nameVal.toLowerCase() && a.id !== editingArmorId)) {
        alert("Já existe uma armadura cadastrada com esse nome!");
        return;
    }
    
    let selProtected = Array.from(document.querySelectorAll('.inp-armor-zone:checked')).map(cb => cb.value);

    const obj = {
        id: editingArmorId || generateId(),
        name: nameVal,
        base: document.getElementById('inp-g-armor-base').value,
        desc: document.getElementById('inp-g-armor-desc').value,
        slot: document.getElementById('inp-g-armor-slot')?.value || 'body',
        category: document.getElementById('inp-g-armor-category')?.value || 'Leve',
        reqAttr: document.getElementById('inp-g-armor-req-attr')?.value || 'none',
        reqVal: parseInt(document.getElementById('inp-g-armor-req-val')?.value) || 0,
        durability: parseInt(document.getElementById('inp-g-armor-durability')?.value) || 100,
        maxDurability: parseInt(document.getElementById('inp-g-armor-durability')?.value) || 100,
        attrBonus: document.getElementById('inp-g-armor-attr-bonus')?.value || '',
        agiMod: document.getElementById('inp-g-armor-agi-mod')?.value || '',
        staminaCost: document.getElementById('inp-g-armor-stamina-cost')?.value || '',
        exposure: document.getElementById('inp-g-armor-exposure')?.value || '',
        protectedZones: selProtected,
        special: document.getElementById('inp-g-armor-special')?.value || '',
        mods: {
            df_hp: parseInt(document.getElementById('inp-g-armor-df-hp').value) || 0,
            df_hpmag: parseInt(document.getElementById('inp-g-armor-df-hpmag').value) || 0,
            df_mag: parseInt(document.getElementById('inp-g-armor-df-mag').value) || 0,
            df_lust: parseInt(document.getElementById('inp-g-armor-df-lust').value) || 0,
            df_lustmag: parseInt(document.getElementById('inp-g-armor-df-lustmag').value) || 0,
            agi: parseInt(document.getElementById('inp-g-armor-agi').value) || 0,
            sed: parseInt(document.getElementById('inp-g-armor-sed').value) || 0,
            mis: parseInt(document.getElementById('inp-g-armor-mis').value) || 0,
            st_cost: parseInt(document.getElementById('inp-g-armor-st-cost').value) || 0
        }
    };
    saveToDB('global_armors', obj, globalArmors, 'bd_armors');
    document.getElementById('modal-armor').close();
});

document.getElementById('btn-save-g-skill').addEventListener('click', (e) => {
    e.preventDefault();
    const form = document.getElementById('form-skill');
    if(!form.checkValidity()) { form.reportValidity(); return; }
    
    const nameVal = document.getElementById('inp-g-skill-name').value.trim();
    
    if (globalSkills.some(s => s.name.toLowerCase() === nameVal.toLowerCase() && s.id !== editingSkillId)) {
        alert("Já existe uma habilidade cadastrada com esse nome!");
        return;
    }
    
    const obj = {
        id: editingSkillId || generateId(),
        name: nameVal,
        type: document.getElementById('inp-g-skill-type').value,
        cost: document.getElementById('inp-g-skill-cost').value,
        test: document.getElementById('inp-g-skill-test')?.value || '',
        desc: document.getElementById('inp-g-skill-desc')?.value || '',
        bodyPart: document.getElementById('inp-g-skill-bodypart')?.value || 'Geral',
        castTime: document.getElementById('inp-g-skill-cast-time')?.value || '',
        cooldown: document.getElementById('inp-g-skill-cooldown')?.value || '',
        range: document.getElementById('inp-g-skill-range')?.value || '',
        effect: document.getElementById('inp-g-skill-effect').value,
        secEffect: document.getElementById('inp-g-skill-sec-effect')?.value || '',
        scaling: document.getElementById('inp-g-skill-scaling')?.value || '',
        penalty: document.getElementById('inp-g-skill-penalty')?.value || ''
    };
    saveToDB('global_skills', obj, globalSkills, 'bd_skills');
    document.getElementById('modal-skill').close();
});

window.openViewModal = function(type, id) {
    if (!id) return;
    const titleEl = document.getElementById('modal-view-title');
    const contentEl = document.getElementById('modal-view-content');
    
    if (type === 'skill') {
        const sk = globalSkills.find(s => s.id === id);
        if (!sk) return;
        titleEl.innerHTML = `<i class="fa-solid fa-scroll text-[#bfa888] mr-2"></i>PICTO &bull; HABILIDADE`;
        contentEl.innerHTML = `
            <div class="mb-4 text-center pb-3 border-b border-[#bfa888]/20">
                <div class="font-bold text-lg text-[#ede3d2] mb-1">✦ ${escapeHTML(sk.name)}</div>
                ${sk.desc ? `<div class="italic text-[#a89f91] text-xs leading-relaxed">***${escapeHTML(sk.desc)}***</div>` : ''}
            </div>
            
            <div class="mb-4 bg-[#0e0e10]/80 border border-[#bfa888]/20 p-3 rounded-lg">
                <div class="text-[#bfa888] font-bold border-b border-[#bfa888]/20 pb-1 mb-2 text-xs uppercase tracking-wider"><i class="fa-solid fa-circle-dot mr-1 text-[10px]"></i> Propriedades Místicas</div>
                <ul class="text-xs text-[#ede3d2] space-y-1.5 ml-1">
                    <li><strong class="text-[#a89f91]">Tipo:</strong> ${escapeHTML(sk.type || '-')}</li>
                    <li><strong class="text-[#a89f91]">Custo de Ação:</strong> <span class="font-mono text-sky-300 font-bold">${escapeHTML(sk.cost || '-')}</span></li>
                    <li><strong class="text-[#a89f91]">Tempo de Conjuração:</strong> ${escapeHTML(sk.castTime || '-')}</li>
                    <li><strong class="text-[#a89f91]">Recarga:</strong> ${escapeHTML(sk.cooldown || '-')}</li>
                    <li><strong class="text-[#a89f91]">Alcance & Alvo:</strong> ${escapeHTML(sk.range || '-')}</li>
                    ${sk.test ? `<li><strong class="text-[#a89f91]">Teste Requerido:</strong> <span class="font-mono text-[#bfa888]">${escapeHTML(sk.test)}</span></li>` : ''}
                </ul>
            </div>

            <div class="mb-4 bg-[#0e0e10]/80 border border-[#bfa888]/20 p-3 rounded-lg">
                <div class="text-[#bfa888] font-bold border-b border-[#bfa888]/20 pb-1 mb-2 text-xs uppercase tracking-wider"><i class="fa-solid fa-wand-magic-sparkles mr-1 text-[10px]"></i> Efeito &amp; Ressonância</div>
                <ul class="text-xs text-[#ede3d2] space-y-1.5 ml-1">
                    <li><strong class="text-[#a89f91]">Efeito Principal:</strong> <span class="italic text-[#ede3d2]">${escapeHTML(sk.effect || '-')}</span></li>
                    ${sk.secEffect ? `<li><strong class="text-[#a89f91]">Efeito Secundário:</strong> <span class="italic text-[#ede3d2]">${escapeHTML(sk.secEffect)}</span></li>` : ''}
                    ${sk.scaling ? `<li><strong class="text-[#a89f91]">Modificador:</strong> <span class="italic text-[#bfa888]">${escapeHTML(sk.scaling)}</span></li>` : ''}
                </ul>
            </div>

            ${sk.penalty ? `
            <div class="bg-[#1a0f0e]/80 border border-red-900/40 p-3 rounded-lg">
                <div class="text-red-400 font-bold border-b border-red-900/40 pb-1 mb-2 text-xs uppercase tracking-wider"><i class="fa-solid fa-triangle-exclamation mr-1 text-[10px]"></i> Penalidade de Chroma</div>
                <ul class="text-xs text-[#ede3d2] space-y-1 ml-1">
                    <li><strong class="text-red-300">Penalidade:</strong> <span class="italic text-red-200">${escapeHTML(sk.penalty)}</span></li>
                </ul>
            </div>
            ` : ''}
        `;
    } else if (type === 'weapon') {
        const wp = globalWeapons.find(w => w.id === id);
        if (!wp) return;
        const dice = `${Number(wp.diceCount) || 0}d${Number(wp.diceFaces) || 0}${(Number(wp.dmgMod) || 0) > 0 ? '+' + Number(wp.dmgMod) : (Number(wp.dmgMod) || 0) < 0 ? Number(wp.dmgMod) : ''}`;
        titleEl.innerHTML = `<i class="fa-solid fa-khanda text-[#bfa888] mr-2"></i>FORJA &bull; ARMA`;
        contentEl.innerHTML = `
            <div class="mb-4 text-center pb-3 border-b border-[#bfa888]/20">
                <div class="font-bold text-lg text-[#ede3d2] mb-1">⚔️ ${escapeHTML(wp.name)}</div>
                ${wp.desc ? `<div class="italic text-[#a89f91] text-xs leading-relaxed">***${escapeHTML(wp.desc)}***</div>` : ''}
            </div>
            <div class="mb-4 bg-[#0e0e10]/80 border border-[#bfa888]/20 p-3 rounded-lg">
                <div class="text-[#bfa888] font-bold border-b border-[#bfa888]/20 pb-1 mb-2 text-xs uppercase tracking-wider">Propriedades Bélicas</div>
                <ul class="text-xs text-[#ede3d2] space-y-1.5 ml-1">
                    <li><strong class="text-[#a89f91]">Categoria:</strong> ${escapeHTML(wp.category || '-')}</li>
                    <li><strong class="text-[#a89f91]">Potencial de Dano:</strong> <span class="font-mono text-red-400 font-bold">${escapeHTML(dice)}</span></li>
                    <li><strong class="text-[#a89f91]">Natureza do Dano:</strong> ${escapeHTML(wp.dmgType || 'HP')}</li>
                    <li><strong class="text-[#a89f91]">Custo de Fôlego:</strong> <span class="font-mono text-purple-300">${escapeHTML(wp.stCost ?? 0)}</span></li>
                    <li><strong class="text-[#a89f91]">Durabilidade:</strong> <span class="font-mono">${escapeHTML(wp.durability ?? '-')} / ${escapeHTML(wp.maxDurability ?? '-')}</span></li>
                    <li><strong class="text-[#a89f91]">Requisito Mínimo:</strong> <span class="font-mono text-[#bfa888]">${escapeHTML(wp.reqAttr || 'Nenhum')} ${wp.reqVal ? `(${escapeHTML(wp.reqVal)})` : ''}</span></li>
                </ul>
            </div>
            ${wp.effectType && wp.effectType !== 'none' ? `<div class="mb-4 bg-[#0e0e10]/80 border border-[#bfa888]/20 p-3 rounded-lg"><div class="text-[#bfa888] font-bold border-b border-[#bfa888]/20 pb-1 mb-2 text-xs uppercase tracking-wider">Efeito Especial</div><div class="text-xs text-[#ede3d2] italic">${escapeHTML(wp.effectType)} ${wp.effectPower ? '• ' + escapeHTML(wp.effectPower) : ''}${wp.effectDuration ? ' • ' + escapeHTML(wp.effectDuration) + ' turnos' : ''}</div></div>` : ''}
        `;
    } else if (type === 'accessory') {
        const ac = globalAccessories.find(a => a.id === id);
        if (!ac) return;
        const m = ac.mods || {};
        const rows = [
            ['DF Física', m.df_hp], ['DF Física Mágica', m.df_hpmag], ['DF Mágica', m.df_mag],
            ['DF Lust', m.df_lust], ['DF Lust Mágica', m.df_lustmag], ['AGI', m.agi], ['SED', m.sed], ['MIS', m.mis]
        ].filter(([,v]) => Number(v) !== 0);
        titleEl.innerHTML = `<i class="fa-solid fa-gem text-[#bfa888] mr-2"></i>RELÍQUIA &bull; ACESSÓRIO`;
        contentEl.innerHTML = `
            <div class="mb-4 text-center pb-3 border-b border-[#bfa888]/20">
                <div class="font-bold text-lg text-[#ede3d2] mb-1">💎 ${escapeHTML(ac.name)}</div>
                ${ac.desc ? `<div class="italic text-[#a89f91] text-xs leading-relaxed">***${escapeHTML(ac.desc)}***</div>` : ''}
            </div>
            <div class="mb-4 bg-[#0e0e10]/80 border border-[#bfa888]/20 p-3 rounded-lg">
                <div class="text-[#bfa888] font-bold border-b border-[#bfa888]/20 pb-1 mb-2 text-xs uppercase tracking-wider">Especificações</div>
                <ul class="text-xs text-[#ede3d2] space-y-1.5 ml-1">
                    <li><strong class="text-[#a89f91]">Categoria:</strong> ${escapeHTML(ac.category || '-')}</li>
                    <li><strong class="text-[#a89f91]">Requisito Mínimo:</strong> <span class="font-mono text-[#bfa888]">${escapeHTML(ac.reqAttr || 'Nenhum')} ${ac.reqVal ? `(${escapeHTML(ac.reqVal)})` : ''}</span></li>
                </ul>
            </div>
            <div class="bg-[#0e0e10]/80 border border-[#bfa888]/20 p-3 rounded-lg">
                <div class="text-[#bfa888] font-bold border-b border-[#bfa888]/20 pb-1 mb-2 text-xs uppercase tracking-wider">Bênçãos &amp; Modificadores</div>
                ${rows.length ? rows.map(([k,v]) => `<div class="flex justify-between text-xs text-[#ede3d2] py-1 border-b border-stone-800/60 last:border-0"><span class="text-[#a89f91]">${escapeHTML(k)}</span><span class="text-[#bfa888] font-mono font-bold">${Number(v) > 0 ? '+' : ''}${escapeHTML(v)}</span></div>`).join('') : '<div class="text-xs text-[#7a7164] italic">Nenhum modificador direto registrado.</div>'}
            </div>
        `;
    } else if (type === 'armor') {
        const ar = globalArmors.find(a => a.id === id);
        if (!ar) return;
        const b = getArmorBaseStats(ar.base);
        titleEl.innerHTML = `<i class="fa-solid fa-shield-halved text-[#bfa888] mr-2"></i>INDUMENTÁRIA &bull; PROTEÇÃO`;
        contentEl.innerHTML = `
            <div class="mb-4 text-center pb-3 border-b border-[#bfa888]/20">
                <div class="font-bold text-lg text-[#ede3d2] mb-1">🛡️ ${escapeHTML(ar.name)}</div>
                ${ar.desc ? `<div class="italic text-[#a89f91] text-xs leading-relaxed">***${escapeHTML(ar.desc)}***</div>` : ''}
            </div>

            <div class="mb-4 bg-[#0e0e10]/80 border border-[#bfa888]/20 p-3 rounded-lg">
                <div class="text-[#bfa888] font-bold border-b border-[#bfa888]/20 pb-1 mb-2 text-xs uppercase tracking-wider"><i class="fa-solid fa-info-circle mr-1 text-[10px]"></i> Dados Básicos</div>
                <ul class="text-xs text-[#ede3d2] space-y-1.5 ml-1">
                    <li><strong class="text-[#a89f91]">Categoria:</strong> ${escapeHTML(ar.category || ar.type || '-')}</li>
                    <li><strong class="text-[#a89f91]">Raridade:</strong> ${escapeHTML(ar.rarity || 'Comum')}</li>
                    <li><strong class="text-[#a89f91]">Requisito Mínimo:</strong> <span class="font-mono text-[#bfa888]">${escapeHTML(ar.reqAttr || 'Nenhum')} ${ar.reqVal ? `(${escapeHTML(ar.reqVal)})` : ''}</span></li>
                    <li><strong class="text-[#a89f91]">Durabilidade:</strong> <span class="font-mono">${escapeHTML(ar.durability ?? '-')} / ${escapeHTML(ar.maxDurability ?? '-')}</span></li>
                </ul>
            </div>

            <div class="mb-4 bg-[#0e0e10]/80 border border-[#bfa888]/20 p-3 rounded-lg">
                <div class="text-[#bfa888] font-bold border-b border-[#bfa888]/20 pb-1 mb-2 text-xs uppercase tracking-wider"><i class="fa-solid fa-shield mr-1 text-[10px]"></i> Atributos Defensivos</div>
                <ul class="text-xs text-[#ede3d2] space-y-1.5 ml-1">
                    <li><strong class="text-[#a89f91]">Defesa Física (HP):</strong> <span class="font-mono font-bold text-emerald-400">${escapeHTML(ar.defPhys || `+${ar.mods?.df_hp ?? 0}`)}</span></li>
                    <li><strong class="text-[#a89f91]">Defesa de Guarda / Postura:</strong> <span class="font-mono font-bold text-purple-300">${escapeHTML(ar.defLust || `+${ar.mods?.df_lust ?? 0}`)}</span></li>
                    ${ar.mods?.df_hpmag ? `<li><strong class="text-[#a89f91]">Def. Físico-Mágica:</strong> <span class="font-mono">+${escapeHTML(ar.mods.df_hpmag)}</span></li>` : ''}
                    ${ar.mods?.df_mag ? `<li><strong class="text-[#a89f91]">Def. Mágica Pura:</strong> <span class="font-mono">+${escapeHTML(ar.mods.df_mag)}</span></li>` : ''}
                    ${ar.mods?.df_lustmag ? `<li><strong class="text-[#a89f91]">Def. Lust Mágica:</strong> <span class="font-mono">+${escapeHTML(ar.mods.df_lustmag)}</span></li>` : ''}
                </ul>
            </div>

            <div class="mb-4 bg-[#0e0e10]/80 border border-[#bfa888]/20 p-3 rounded-lg">
                <div class="text-[#bfa888] font-bold border-b border-[#bfa888]/20 pb-1 mb-2 text-xs uppercase tracking-wider"><i class="fa-solid fa-person-running mr-1 text-[10px]"></i> Modificadores de Agilidade</div>
                <ul class="text-xs text-[#ede3d2] space-y-1.5 ml-1">
                    <li><strong class="text-[#a89f91]">Modificador de AGI:</strong> <span class="font-mono">${escapeHTML(ar.agiMod || (ar.mods?.agi ? `${ar.mods.agi}` : '-'))}</span></li>
                    <li><strong class="text-[#a89f91]">Custo de Fôlego:</strong> <span class="font-mono text-purple-300">${escapeHTML(ar.staminaCost || (ar.mods?.st_cost ? `${ar.mods.st_cost}` : '-'))}</span></li>
                    ${ar.mods?.sed ? `<li><strong class="text-[#a89f91]">Sedução:</strong> <span class="font-mono text-purple-300">${escapeHTML(ar.mods.sed)}</span></li>` : ''}
                    ${ar.mods?.mis ? `<li><strong class="text-[#a89f91]">Misticismo:</strong> <span class="font-mono text-sky-300">${escapeHTML(ar.mods.mis)}</span></li>` : ''}
                    ${(ar.exposure || ar.exposedPart) ? `<li><strong class="text-[#a89f91]">Exposição:</strong> ${escapeHTML(ar.exposure || '-')} ${ar.exposedPart ? `<span class="text-red-400 italic font-mono">(Local: ${escapeHTML(ar.exposedPart)})</span>` : ''}</li>` : ''}
                </ul>
            </div>

            ${ar.special ? `
            <div class="mb-4 bg-[#0e0e10]/80 border border-[#bfa888]/20 p-3 rounded-lg">
                <div class="text-[#bfa888] font-bold border-b border-[#bfa888]/20 pb-1 mb-2 text-xs uppercase tracking-wider"><i class="fa-solid fa-sparkles mr-1 text-[10px]"></i> Encanto Passivo</div>
                <div class="p-3 bg-[#0a0807] border-l-2 border-[#bfa888] rounded text-[#ede3d2] text-xs italic whitespace-pre-wrap leading-relaxed">${escapeHTML(ar.special)}</div>
            </div>
            ` : ''}

            ${ar.mods ? `
            <details class="bg-[#0a0807] rounded-lg p-2.5 border border-stone-800">
                <summary class="text-[10px] text-[#a89f91] uppercase cursor-pointer hover:text-[#ede3d2] tracking-wider">Mecânica de Base (Oculta)</summary>
                <div class="pt-2 mt-2 border-t border-stone-800 text-xs text-[#a89f91] font-mono">
                    Base: ${escapeHTML(ar.base)}<br>
                    Mods: DF ${ar.mods.df_hp ?? 0}, DLUST ${ar.mods.df_lust ?? 0}, AGI ${ar.mods.agi ?? 0}, SED ${ar.mods.sed ?? 0}, MIS ${ar.mods.mis ?? 0}
                </div>
            </details>
            ` : ''}
        `;
    }
    
    let itemObj = null;
    if (type === 'skill') itemObj = globalSkills.find(s => s.id === id);
    else if (type === 'weapon') itemObj = globalWeapons.find(w => w.id === id);
    else if (type === 'accessory') itemObj = globalAccessories.find(a => a.id === id);
    else if (type === 'armor') itemObj = globalArmors.find(a => a.id === id);

    if (itemObj && canEdit(itemObj)) {
        contentEl.innerHTML += `
            <div class="mt-5 pt-4 border-t border-[#bfa888]/20 flex justify-center">
                <button onclick="document.getElementById('modal-view').close(); openEditItem('${type}', '${id}')" class="btn-gold px-6 py-2 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-2">
                    <i class="fa-solid fa-pen"></i> Ajustar Registro
                </button>
            </div>
        `;
    }

    document.getElementById('modal-view').showModal();
};

// --- CHARACTER MODAL LOGIC ---
let editingCharId = null;

function populateCharModalSelects() {
    const slots = [
        {id: 'inp-equip-head', type: 'head'},
        {id: 'inp-equip-back', type: 'back'},
        {id: 'inp-equip-body', type: 'body'},
        {id: 'inp-equip-waist', type: 'waist'},
        {id: 'inp-equip-feet', type: 'feet'},
        {id: 'inp-equip-intimate', type: 'intimate'},
        {id: 'inp-equip-hand_1', type: 'hand_1'},
        {id: 'inp-equip-hand_2', type: 'hand_2'},
        {id: 'inp-equip-ring_1', type: 'ring'},
        {id: 'inp-equip-ring_2', type: 'ring'},
        {id: 'inp-equip-charm', type: 'charm'}
    ];

    slots.forEach(slotInfo => {
        const sel = document.getElementById(slotInfo.id);
        if(!sel) return;
        sel.innerHTML = '<option value="">Nenhum</option>';
        globalArmors.forEach(a => {
            const itemSlot = a.slot || 'body'; // Legacy items default to body
            if (itemSlot === slotInfo.type || 
                (slotInfo.type === 'hand_1' && itemSlot === 'hand_2') || 
                (slotInfo.type === 'hand_2' && itemSlot === 'hand_2')) {
                sel.innerHTML += `<option value="${a.id}">${escapeHTML(a.name)} (Base: ${getArmorBaseStats(a.base).name})</option>`;
            }
        });
    });
}

function updateSkillSelectOptions() {
    const classNameVal = document.getElementById('inp-class').value.toLowerCase();
    const targetOwner = editingCharId ? characters.find(c => c.id === editingCharId)?.ownerId : (currentUser ? currentUser.uid : null);
    
    const allSelects = Array.from(document.querySelectorAll('.inp-skill-slot'));
    const selectedIds = allSelects.map(sel => sel.value).filter(val => val !== "");
    
    allSelects.forEach(select => {
        const currentVal = select.value;
        select.innerHTML = '<option value="">Selecione Habilidade...</option>';
        const seenNames = new Set();
        
        globalSkills.forEach(s => {
            const isClassSkill = !!s.classRestricted;
            const isOwner = (s.ownerId === targetOwner) || isMaster() || isClassSkill;
            const matchesClass = !s.classRestricted || classNameVal.includes(s.classRestricted.toLowerCase());
            
            if (isOwner && matchesClass && !seenNames.has(s.name)) {
                seenNames.add(s.name);
                const isSelectedElsewhere = selectedIds.includes(s.id) && s.id !== currentVal;
                const disabledAttr = isSelectedElsewhere ? 'disabled' : '';
                select.innerHTML += `<option value="${s.id}" ${s.id === currentVal ? 'selected' : ''} ${disabledAttr}>${escapeHTML(s.name)}${isSelectedElsewhere ? ' (Já anexada)' : ''}</option>`;
            }
        });
    });
}

function enforceClassConditions() {
    const classNameVal = document.getElementById('inp-class').value.toLowerCase();
    let mandatoryConds = [];
    Object.keys(CLASS_TEMPLATES).forEach(k => {
        if (classNameVal.includes(k.toLowerCase())) {
            const tpl = CLASS_TEMPLATES[k];
            mandatoryConds = mandatoryConds.concat(tpl.conditions || []);
            
            if (tpl.skillsToCreate) {
                for(let sk of tpl.skillsToCreate) {
                    let existingSk = globalSkills.find(s => s.name === sk.name && s.classRestricted === sk.classRestricted);
                    if (!existingSk) {
                        existingSk = { id: generateId(), ...sk };
                        saveToDB('global_skills', existingSk, globalSkills, 'bd_skills');
                    }
                    
                    let alreadyInList = false;
                    document.querySelectorAll('.inp-skill-slot').forEach(select => {
                        if (select.value === existingSk.id) alreadyInList = true;
                    });
    
                    if (!alreadyInList) {
                        const div = document.createElement('div');
                        div.className = 'flex gap-2 mb-2 items-center';
                        div.innerHTML = `
                            <select class="input-dark flex-1 inp-skill-slot" onchange="updateSkillSelectOptions(); this.nextElementSibling.onclick = () => openViewModal('skill', this.value)"><option value="${existingSk.id}" selected></option></select>
                            <button type="button" class="btn-icon text-blue-400 px-2" onclick="openViewModal('skill', this.previousElementSibling.value)" title="Ver Detalhes"><i class="fa-solid fa-circle-info"></i></button>
                            <button type="button" class="btn-icon text-red-400 px-2" onclick="this.parentElement.remove(); updateSkillSelectOptions();"><i class="fa-solid fa-xmark"></i></button>
                        `;
                        document.getElementById('skills-select-list').appendChild(div);
                    }
                }
            }
        }
    });

    const condList = document.getElementById('conditions-list');
    const existingChecked = Array.from(document.querySelectorAll('.inp-cond-check')).filter(c => c.checked).map(c => c.value);
    condList.innerHTML = '';
    
    Object.keys(CONDITIONS_DB).forEach(k => {
        const c = CONDITIONS_DB[k];
        
        // Hide classOnly condition if class doesn't match
        if (c.classOnly && !classNameVal.includes(c.classOnly.toLowerCase())) return;
        
        const isMandatory = mandatoryConds.includes(k);
        const isChecked = isMandatory || existingChecked.includes(k);
        
        const extraClass = isMandatory ? 'opacity-70 cursor-not-allowed border border-red-500/50' : '';
        const titleAttr = isMandatory ? 'title="Condição obrigatória da Classe"' : '';
        const disabledAttr = isMandatory ? 'disabled' : '';
        const checkedAttr = isChecked ? 'checked' : '';
        
        condList.innerHTML += `<label class="flex items-center gap-2 bg-black/30 p-1 rounded ${extraClass}" ${titleAttr}>
            <input type="checkbox" value="${k}" class="inp-cond-check" ${checkedAttr} ${disabledAttr}> 
            <span>${escapeHTML(c.name)}</span>
        </label>`;
    });

    updateSkillSelectOptions();
}

document.getElementById('inp-class').addEventListener('input', enforceClassConditions);

function updatePointsCounter() {
    const className = document.getElementById('inp-class').value.trim();
    const tplKey = Object.keys(CLASS_TEMPLATES).find(k => k.toLowerCase() === className.toLowerCase());
    const baseMods = tplKey && CLASS_TEMPLATES[tplKey].attrMods ? CLASS_TEMPLATES[tplKey].attrMods : {};
    
    const attrKeys = ['for', 'agi', 'vit', 'chr', 'per'];
    const attrs = attrKeys.map(k => {
        const el = document.getElementById(`inp-${k}`);
        return el ? (parseInt(el.value) || 0) : 0;
    });
    
    let isInvalidDistribution = false;
    let overLimitStr = "";
    let totalDistributed = 0;
    
    attrs.forEach((v, idx) => {
        const k = attrKeys[idx];
        const base = baseMods[k] || 0;
        const distributed = v - base;
        
        totalDistributed += distributed;
        
        // Limite: nenhum atributo inicial ultrapassa 5 na criação
        if (v > 5) {
            isInvalidDistribution = true;
            overLimitStr = " (Máx 5/atributo)";
        }
        if (distributed > 3) {
            isInvalidDistribution = true;
            if (!overLimitStr) overLimitStr = " (Máx +3/atributo)";
        }
        if (distributed < 0) {
            isInvalidDistribution = true;
            if (!overLimitStr) overLimitStr = " (Abaixo base)";
        }
    });

    const limit = 8;
    
    const counterEl = document.getElementById('points-counter');
    if (counterEl) counterEl.innerText = totalDistributed;
    
    const limitEl = document.getElementById('points-limit-display');
    if (limitEl) limitEl.innerText = limit + overLimitStr;

    if(totalDistributed !== limit || isInvalidDistribution) {
        if (counterEl) counterEl.className = 'text-red-500 font-bold';
        if (limitEl) limitEl.className = 'text-red-500 text-xs';
    } else {
        if (counterEl) counterEl.className = 'text-white';
        if (limitEl) limitEl.className = '';
    }
    
    updatePerksMath();
    return { total: totalDistributed, limit, isInvalidDistribution };
}

document.querySelectorAll('.inp-attr-group input').forEach(inp => {
    inp.addEventListener('input', updatePointsCounter);
});

document.getElementById('btn-add-skill-slot').addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'flex gap-2 mb-2 items-center';
    div.innerHTML = `
        <select class="input-dark flex-1 inp-skill-slot" onchange="updateSkillSelectOptions(); this.nextElementSibling.onclick = () => openViewModal('skill', this.value)"></select>
        <button type="button" class="btn-icon text-blue-400 px-2" onclick="openViewModal('skill', this.previousElementSibling.value)" title="Ver Detalhes"><i class="fa-solid fa-circle-info"></i></button>
        <button type="button" class="btn-icon text-red-400 px-2" onclick="this.parentElement.remove(); updateSkillSelectOptions();"><i class="fa-solid fa-xmark"></i></button>
    `;
    document.getElementById('skills-select-list').appendChild(div);
    updateSkillSelectOptions();
});

const inpTemplate = document.getElementById('inp-template');
if (inpTemplate) {
    inpTemplate.addEventListener('change', async (e) => {
        const tplName = e.target.value;
        const tpl = CLASS_TEMPLATES[tplName];
        if (tpl) {
            document.getElementById('inp-class').value = tplName;
            
            // Reset all attributes to 0 before applying base stats
            const attrKeys = ['for', 'agi', 'vit', 'chr', 'per'];
            attrKeys.forEach(k => {
                const el = document.getElementById(`inp-${k}`);
                if (el) el.value = 0;
            });

            // Apply base mods
            if (tpl.attrMods) {
                Object.keys(tpl.attrMods).forEach(attrKey => {
                    const el = document.getElementById(`inp-${attrKey}`);
                    if (el) el.value = tpl.attrMods[attrKey];
                });
            }
            
            enforceClassConditions();
            updatePointsCounter();
            e.target.value = '';
        }
    });
}

document.getElementById('btn-modal-cancel').addEventListener('click', () => document.getElementById('modal-character').close());
document.getElementById('btn-modal-save').addEventListener('click', (e) => {
    e.preventDefault();
    
    if (!document.getElementById('inp-name').value.trim()) {
        switchCharTab('base');
        return alert("O Nome do personagem é obrigatório.");
    }
    if (!document.getElementById('inp-class').value.trim()) {
        switchCharTab('base');
        return alert("A Classe do personagem é obrigatória.");
    }

    const form = document.getElementById('form-character');
    if(!form.checkValidity()) { form.reportValidity(); return; }
    
    let isUnlocked = document.getElementById('inp-unlock-points').checked;
    if (editingCharId) {
        const existingChar = characters.find(c => c.id === editingCharId);
        if (existingChar && existingChar.isUnlockedPoints) isUnlocked = true;
    }
    
    const pts = updatePointsCounter();
    const isMasterOverride = isMaster() && isUnlocked;
    
    if (!isMasterOverride) {
        if (pts.total !== pts.limit) {
            switchCharTab('base');
            return alert(`Você deve distribuir exatamente todos os ${pts.limit} pontos de atributo! (Distribuiu: ${pts.total})`);
        }
        if (pts.isInvalidDistribution) {
            switchCharTab('base');
            return alert("Distribuição inválida: nenhum atributo inicial pode ser maior que 5, você não pode adicionar mais de +3 pontos em um único atributo e não pode reduzir os atributos base da classe.");
        }
    }
    
    const perkStatus = updatePerksMath();
    if (!isMasterOverride) {
        if (!perkStatus.allValid) {
            switchCharTab('perks');
            return alert("Você gastou mais Pontos de Vantagem (PV) do que seus Atributos Base permitem! Reduza suas Vantagens ou aumente o Atributo.");
        }
        if (!perkStatus.allSpent) {
            switchCharTab('perks');
            return alert("Você possui Pontos de Vantagem (PV) não gastos! É obrigatório distribuir todos os seus pontos nas vantagens antes de salvar a ficha.");
        }
    }

    const classNameVal = document.getElementById('inp-class').value.toLowerCase();
    
    const equipment = {
        head: document.getElementById('inp-equip-head').value,
        back: document.getElementById('inp-equip-back').value,
        body: document.getElementById('inp-equip-body').value,
        waist: document.getElementById('inp-equip-waist').value,
        feet: document.getElementById('inp-equip-feet').value,
        intimate: document.getElementById('inp-equip-intimate').value,
        hand_1: document.getElementById('inp-equip-hand_1').value,
        hand_2: document.getElementById('inp-equip-hand_2').value,
        ring_1: document.getElementById('inp-equip-ring_1').value,
        ring_2: document.getElementById('inp-equip-ring_2').value,
        charm: document.getElementById('inp-equip-charm').value
    };
    
    const valFor = parseInt(document.getElementById('inp-for')?.value) || 0;
    const valAgi = parseInt(document.getElementById('inp-agi')?.value) || 0;
    const valVit = parseInt(document.getElementById('inp-vit')?.value) || parseInt(document.getElementById('inp-con')?.value) || parseInt(document.getElementById('inp-vig')?.value) || 0;
    const valChr = parseInt(document.getElementById('inp-chr')?.value) || parseInt(document.getElementById('inp-mis')?.value) || parseInt(document.getElementById('inp-sed')?.value) || 0;
    const valPer = parseInt(document.getElementById('inp-per')?.value) || parseInt(document.getElementById('inp-von')?.value) || 0;

    const attrBase = { 
        for: valFor,
        agi: valAgi,
        vit: valVit,
        chr: valChr,
        per: valPer,
        // Compatibilidade reversa com sistemas legados
        con: valVit,
        vig: valVit,
        von: valPer,
        sed: valChr,
        mis: valChr
    };

    // Class restrictions
    if (classNameVal.includes('sacerdote') && equipment.body) {
        const armor = globalArmors.find(a => a.id === equipment.body);
        if (armor && (armor.base === 'heavy' || armor.base.startsWith('mixed_h'))) {
            alert("Sacerdotes não podem equipar armaduras pesadas no corpo. Armadura desequipada.");
            equipment.body = "";
        }
    }

    // Requirements Validation
    let removedItems = [];
    Object.keys(equipment).forEach(slot => {
        let itemId = equipment[slot];
        if (!itemId) return;
        
        let item = globalWeapons.find(w => w.id === itemId) || 
                   globalArmors.find(a => a.id === itemId) || 
                   globalAccessories.find(a => a.id === itemId);
                   
        if (item && item.reqAttr && item.reqAttr !== 'none' && item.reqVal > 0) {
            let charAttrVal = attrBase[item.reqAttr] || 0;
            if (charAttrVal < item.reqVal) {
                equipment[slot] = "";
                removedItems.push(`${item.name} (Requer ${item.reqAttr.toUpperCase()} >= ${item.reqVal})`);
            }
        }
    });

    if (removedItems.length > 0) {
        alert("Os seguintes itens foram desequipados pois você não atende aos requisitos mecânicos:\\n\\n" + removedItems.join("\\n"));
    }

    const selSkills = Array.from(document.querySelectorAll('.inp-skill-slot')).map(s => s.value).filter(v => v !== "");
    const selConds = Array.from(document.querySelectorAll('.inp-cond-check')).filter(c => c.checked).map(c => c.value);
    
    let selErogenous = Array.from(document.querySelectorAll('.inp-ero-zone:checked')).map(cb => cb.value);
    if (selErogenous.length > 2) selErogenous = selErogenous.slice(0, 2);

    const newCharData = {
        name: document.getElementById('inp-name').value,
        race: document.getElementById('inp-race')?.value || '',
        class: document.getElementById('inp-class').value,
        gender: document.getElementById('inp-gender')?.value || '',
        orientation: document.getElementById('inp-orientation')?.value || '',
        avatarUrl: document.getElementById('inp-avatar').value,
        equipment: equipment,
        equippedArmorId: equipment.body, // Backwards compatibility if needed somewhere loosely
        equippedSkillIds: selSkills,
        activeConditionIds: selConds,
        erogenousZones: selErogenous,
        isUnlockedPoints: isUnlocked,
        perks: JSON.parse(JSON.stringify(draftPerks)),
        attr: attrBase
    };

    if (editingCharId) {
        const char = characters.find(c => c.id === editingCharId);
        if(char && canEdit(char)) {
            const hasAttrChange = JSON.stringify(char.attr) !== JSON.stringify(newCharData.attr);
            Object.assign(char, newCharData);
            if (hasAttrChange) addLog(char, "Atributos Base foram modificados na ficha.", "info");
            saveToDB('characters', char, characters, 'bd_characters');
        }
    } else {
        newCharData.id = generateId();
        newCharData.logs = [];
        const cStats = getClassStats(classNameVal);
        newCharData.hp = Math.max(1, cStats.hp + (newCharData.attr.con * 10));
        newCharData.stamina = Math.max(1, cStats.st + (newCharData.attr.vig * 5));
        newCharData.lust = 0;
        newCharData.energy = cStats.en;
        
        activeCharId = newCharData.id;
        localStorage.setItem('bd_active', activeCharId);
        saveToDB('characters', newCharData, characters, 'bd_characters');
    }
    document.getElementById('modal-character').close();
});

// --- DASHBOARD RENDER ---
function getActiveChar() { return characters.find(c => String(c.id) === String(activeCharId)); }

function getEquippedItems(char) {
    if (!char) return [];

    // Characters may reference armor, weapons and accessories from different
    // Firestore collections. The previous implementation searched only
    // globalArmors, making all weapon/accessory equipment appear missing.
    const allItems = [
        ...(Array.isArray(globalArmors) ? globalArmors : []),
        ...(Array.isArray(globalWeapons) ? globalWeapons : []),
        ...(Array.isArray(globalAccessories) ? globalAccessories : [])
    ];

    const ids = [];
    if (char.equipment && typeof char.equipment === 'object') {
        Object.values(char.equipment).forEach(id => {
            if (id) ids.push(id);
        });
    } else if (char.equippedArmorId) {
        ids.push(char.equippedArmorId);
    }

    return ids
        .map(id => allItems.find(item => item.id === id))
        .filter(Boolean)
        .filter((item, index, arr) => arr.findIndex(x => x.id === item.id) === index);
}

function getClassStats(className) {
    if(!className) return { hp: 10, st: 10, en: 35, lust: 100, ecstasy: 25 };
    const tplKey = Object.keys(CLASS_TEMPLATES).find(k => k.toLowerCase() === className.toLowerCase());
    if (tplKey && CLASS_TEMPLATES[tplKey].baseStats) {
        const st = CLASS_TEMPLATES[tplKey].baseStats;
        return { hp: st.hp, st: st.st, en: st.en, lust: st.lust, ecstasy: st.ecstasy || 25 };
    }
    if (className.toLowerCase().includes('sacerdote')) {
        return { hp: 90, st: 90, en: 50, lust: 120, ecstasy: 20 };
    }
    return { hp: 10, st: 10, en: 35, lust: 100, ecstasy: 25 };
}

function getCharModifiers(char, targetZone = 'Qualquer', attackBodyPart = 'Geral') {
    const items = getEquippedItems(char);
    
    let mods = { df: 0, dlust: 0, df_hp: 0, df_hpmag: 0, df_mag: 0, df_lust: 0, df_lustmag: 0, agi: 0, sed: 0, mis: 0, hp_mult: 1, st_mult: 1, esq: 0, dlust_set: null, ecstasy_set: null, danFis: 0, danLust: 0, danMag: 0, danDist: 0, danFurt: 0, hp_max: 0, st_max: 0, lust_max: 0, danLustDice: [], danFisDice: [] };
    let bk = { hp: [], st: [], en: [], lust: [], df: [], dlust: [], df_hp: [], df_hpmag: [], df_mag: [], df_lust: [], df_lustmag: [], esq: [], danFis: [], danLust: [], agi: [], sed: [], mis: [], con: [], for: [], vig: [], von: [] };
    
    // Sum Equipment
    items.forEach(armor => {
        const isWeapon = armor.type === 'weapon';
        const isAccessory = armor.type === 'accessory';

        // Accessories use their own modifier schema and are not tied to a hit zone.
        if (isAccessory && armor.mods) {
            ['df_hp','df_hpmag','df_mag','df_lust','df_lustmag', 'df', 'dlust'].forEach(k => {
                const v = Number(armor.mods[k]) || 0;
                if (v) { mods[k] += v; bk[k].push({label: armor.name, val: v}); }
            });
            ['agi','sed','mis'].forEach(k => {
                const v = Number(armor.mods[k]) || 0;
                if (v) { mods[k] += v; bk[k].push({label: armor.name, val: v}); }
            });
        }
        
        let protectsZone = true;
        if (!isWeapon && !isAccessory && targetZone !== 'Qualquer') {
            if (armor.protectedZones && armor.protectedZones.length > 0) {
                if (!armor.protectedZones.includes(targetZone)) {
                    protectsZone = false;
                }
            } else {
                // Legacy armors or armors without specific zones
                // Generally assume they protect the body/trunk, but we can just say if it doesn't explicitly protect it, it doesn't.
                // To be safe, if they haven't set protected zones, we'll assume it protects everything if it's body armor, otherwise none.
                if (armor.slot !== 'body') protectsZone = false; 
            }
        }
        
        const baseArmorStats = getArmorBaseStats(armor.base || 'none');
        
        let armDfHp = Number(armor?.mods?.df_hp || armor?.mods?.df || 0);
        if (protectsZone && (baseArmorStats.mods.df || armDfHp)) {
            let v = Number(baseArmorStats.mods.df || 0) + armDfHp;
            mods.df_hp += v;
            bk.df_hp.push({label: armor.name + ' (HP)', val: v});
        }
        let armDfHpMag = Number(armor?.mods?.df_hpmag || 0);
        if (protectsZone && armDfHpMag) {
            let v = armDfHpMag;
            mods.df_hpmag += v;
            bk.df_hpmag.push({label: armor.name + ' (HP_MAG)', val: v});
        }
        let armDfMag = Number(armor?.mods?.df_mag || 0);
        if (protectsZone && armDfMag) {
            let v = armDfMag;
            mods.df_mag += v;
            bk.df_mag.push({label: armor.name + ' (MAG)', val: v});
        }
        
        let armDfLust = Number(armor?.mods?.df_lust || armor?.mods?.dlust || 0);
        if (protectsZone && (baseArmorStats.mods.dlust || armDfLust)) {
            let v = Number(baseArmorStats.mods.dlust || 0) + armDfLust;
            mods.df_lust += v;
            bk.df_lust.push({label: armor.name + ' (LUST)', val: v});
        }
        let armDfLustMag = Number(armor?.mods?.df_lustmag || 0);
        if (protectsZone && armDfLustMag) {
            let v = armDfLustMag;
            mods.df_lustmag += v;
            bk.df_lustmag.push({label: armor.name + ' (LUST_MAG)', val: v});
        }
        
        // Agility and other stats always apply regardless of hit zone
        let armAgi = Number(armor?.mods?.agi || 0);
        if (baseArmorStats.mods.agi || armAgi) {
            let v = Number(baseArmorStats.mods.agi || 0) + armAgi;
            mods.agi += v;
            bk.agi.push({label: armor.name, val: v});
        }
        let armSed = Number(armor?.mods?.sed || 0);
        if (baseArmorStats.mods.sed || armSed) {
            let v = Number(baseArmorStats.mods.sed || 0) + armSed;
            mods.sed += v;
            bk.sed.push({label: armor.name, val: v});
        }
        let armMis = Number(armor?.mods?.mis || 0);
        if (baseArmorStats.mods.mis || armMis) {
            let v = Number(baseArmorStats.mods.mis || 0) + armMis;
            mods.mis += v;
            bk.mis.push({label: armor.name, val: v});
        }
        if (armor?.mods?.hp) {
            mods.hp_mult *= armor.mods.hp;
            bk.hp.push({label: armor.name, val: 'x'+armor.mods.hp});
        }
        if (armor?.mods?.st) {
            mods.st_mult *= armor.mods.st;
            bk.st.push({label: armor.name, val: 'x'+armor.mods.st});
        }
    });
    
    // Class Passives
    if (char.class && char.class.toLowerCase().includes('sacerdote')) {
        mods.dlust += 5; // Mente Consagrada
        bk.dlust.push({label: 'Mente Consagrada', val: 5});
    }
    
    // Apply Conditions
    char.activeConditionIds.forEach(cid => {
        const c = CONDITIONS_DB[cid];
        if (c && c.mods) {
            if (c.mods.df) { mods.df += c.mods.df; bk.df.push({label: c.name, val: c.mods.df}); }
            if (c.mods.dlust) { mods.dlust += c.mods.dlust; bk.dlust.push({label: c.name, val: c.mods.dlust}); }
            if (c.mods.agi) { mods.agi += c.mods.agi; bk.agi.push({label: c.name, val: c.mods.agi}); }
            if (c.mods.esq) { mods.esq += c.mods.esq; bk.esq.push({label: c.name, val: c.mods.esq}); }
            if (c.mods.hp_mult) { mods.hp_mult *= c.mods.hp_mult; bk.hp.push({label: c.name, val: 'x'+c.mods.hp_mult}); }
            if (c.mods.st_mult) { mods.st_mult *= c.mods.st_mult; bk.st.push({label: c.name, val: 'x'+c.mods.st_mult}); }
            if (c.mods.dlust_set !== undefined) { mods.dlust_set = c.mods.dlust_set; bk.dlust.push({label: c.name, val: '=' + c.mods.dlust_set}); }
            if (c.mods.ecstasy_set !== undefined) { mods.ecstasy_set = c.mods.ecstasy_set; }
        }
    });

    // Extract Perks values
    if (char.perks && typeof PERKS_DB !== 'undefined' && PERKS_DB) {
        for (const rawAttr in char.perks) {
            const attr = (rawAttr === 'con' || rawAttr === 'vig') ? 'vit' : (rawAttr === 'von' ? 'per' : ((rawAttr === 'sed' || rawAttr === 'mis') ? 'chr' : rawAttr));
            if (!PERKS_DB[attr] || !PERKS_DB[attr].perks) continue;
            for (const pName in char.perks[rawAttr]) {
                let lvl = char.perks[rawAttr][pName];
                if (lvl > 0 && PERKS_DB[attr].perks[pName]) {
                    let desc = PERKS_DB[attr].perks[pName][lvl - 1];
                    if (!desc) continue;
                    
                    const extract = (regex) => {
                        let m = desc.match(regex);
                        return m ? (m[1] || m[2]) : null;
                    };

                    const bodyPartMap = {
                        'Toque/Mãos': ['Mãos/Dedos', 'Punhos', 'Braços', 'Pegada'],
                        'Pés/Pernas': ['Pés/Pernas', 'Coxas', 'Pés'],
                        'Lábios/Fala': ['Lábios/Fala'],
                        'Quadril/Glúteos': ['Quadril/Glúteos'],
                        'Peitos/Peitoral': ['Peitos/Peitoral'],
                        'Dotação / Membro': ['Dotação / Membro', 'Fluidos']
                    };
                    
                    let isRestricted = false;
                    let requiredBodyPart = null;
                    for (const [bp, categories] of Object.entries(bodyPartMap)) {
                        if (categories.some(c => pName.includes(c) || c.includes(pName))) {
                            isRestricted = true;
                            requiredBodyPart = bp;
                            break;
                        }
                    }

                    let applyDamage = true;
                    if (isRestricted && attackBodyPart !== 'Geral' && attackBodyPart !== requiredBodyPart) {
                        applyDamage = false; 
                    }
                    if (isRestricted && attackBodyPart === 'Geral' && requiredBodyPart !== 'Toque/Mãos' && requiredBodyPart !== 'Pés/Pernas') {
                        applyDamage = false;
                    }

                    const apply = (val, numKey, diceKey, bkKey, isDamageObj = false) => {
                        if (!val) return;
                        if (isDamageObj && !applyDamage) return;
                        if (val.includes('d')) {
                            if (diceKey) mods[diceKey].push(val);
                            bk[bkKey].push({label: pName, val: '+' + val});
                        } else {
                            mods[numKey] += parseInt(val);
                            bk[bkKey].push({label: pName, val: '+' + val});
                        }
                    };

                    apply(extract(/Dano(?: de)? LUST \+([0-9]+(?:d[0-9]+)?)/i), 'danLust', 'danLustDice', 'danLust', true);
                    apply(extract(/Dano Físico \+([0-9]+(?:d[0-9]+)?)/i), 'danFis', 'danFisDice', 'danFis', true);
                    
                    let justDmg = extract(/Dano \+([0-9]+(?:d[0-9]+)?)/i);
                    if (justDmg && !desc.match(/Dano(?: de)? LUST/i) && !desc.match(/Dano Físico/i)) {
                        if (attr === 'sed' || attr === 'con') apply(justDmg, 'danLust', 'danLustDice', 'danLust', true);
                        else apply(justDmg, 'danFis', 'danFisDice', 'danFis', true);
                    }

                    apply(extract(/Defesa LUST \+([0-9]+(?:d[0-9]+)?)/i), 'dlust', null, 'dlust');
                    apply(extract(/Defesa Fís(?:ica)? \+([0-9]+(?:d[0-9]+)?)/i), 'df', null, 'df');
                    
                    apply(extract(/(?:\+([0-9]+) de LUST Máximo|LUST Máximo \+([0-9]+))/i), 'lust_max', null, 'lust');
                    apply(extract(/(?:\+([0-9]+) de HP Máximo|HP Máximo \+([0-9]+))/i), 'hp_max', null, 'hp');
                    apply(extract(/(?:\+([0-9]+) de Stamina Máxim[oa]|Stamina Máxim[oa] \+([0-9]+))/i), 'st_max', null, 'st');
                }
            }
        }
    }
    
    mods.breakdown = bk;
    return mods;
}

function openPerkModal(attrKey) {
    const char = getActiveChar();
    if (!char || !char.perks || !char.perks[attrKey]) return;
    
    const db = (typeof PERKS_DB !== 'undefined' && PERKS_DB) ? PERKS_DB[attrKey] : null;
    if (!db || !db.perks) return;
    document.getElementById('modal-vp-title').innerHTML = `—◇— VANTAGENS: ${escapeHTML((db.name || attrKey).toUpperCase())} &bull; EXPEDIÇÃO 33 —◇—`;
    
    let html = '';
    const myPerks = char.perks[attrKey];
    let hasAny = false;
    
    for (const pName in myPerks) {
        let lvl = myPerks[pName];
        if (lvl > 0) {
            hasAny = true;
            let desc = db.perks[pName][lvl - 1];
            html += `<div class="bg-[#0e0e10]/90 border border-[#bfa888]/25 p-3.5 rounded-lg text-sm shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                <div class="text-[#bfa888] font-bold mb-1 flex justify-between items-center">
                    <span>${escapeHTML(pName)}</span>
                    <span class="text-[#a89f91] text-xs font-mono font-normal bg-[#141416] px-2 py-0.5 rounded border border-[#bfa888]/20">Nível ${lvl}</span>
                </div>
                <div class="text-[#ede3d2] text-xs leading-relaxed italic">${desc}</div>
            </div>`;
        }
    }
    
    if (!hasAny) html = '<div class="text-[#7a7164] text-center py-6 italic text-xs tracking-wider">Nenhuma bênção ou disciplina adquirida neste atributo.</div>';
    
    document.getElementById('modal-vp-content').innerHTML = html;
    document.getElementById('modal-view-perks').showModal();
}

function renderDashboard() {
    if (typeof window !== 'undefined' && window.currentTab === 'rpg') {
        document.getElementById('dashboard-container')?.classList.add('hidden');
        document.getElementById('no-char-selected')?.classList.add('hidden');
        document.getElementById('rpg-dashboard-container')?.classList.remove('hidden');
        return;
    }

    const char = getActiveChar();
    const dash = document.getElementById('dashboard-container');
    const noChar = document.getElementById('no-char-selected');
    if (!char) { dash.classList.add('hidden'); noChar.classList.remove('hidden'); return; }

    dash.classList.remove('hidden'); noChar.classList.add('hidden');
    document.getElementById('dash-name').innerHTML = escapeHTML(char.name);
    document.getElementById('dash-class').innerHTML = escapeHTML((char.race ? char.race + " • " : "") + char.class);
    
    const goEl = document.getElementById('dash-gender-orientation');
    let goText = [];
    if(char.gender) goText.push(char.gender);
    if(char.orientation) goText.push(char.orientation);
    if(goText.length > 0) {
        goEl.innerHTML = goText.map(escapeHTML).join(' • ');
        goEl.classList.remove('hidden');
    } else {
        goEl.classList.add('hidden');
    }
    
    if (char.avatarUrl && char.avatarUrl.startsWith('http')) {
        document.getElementById('dash-avatar').src = char.avatarUrl;
        document.getElementById('dash-avatar').classList.remove('hidden');
    } else document.getElementById('dash-avatar').classList.add('hidden');

    const mods = getCharModifiers(char);

    // Conditions Text
    const condList = char.activeConditionIds.map(id => CONDITIONS_DB[id]?.name).filter(Boolean);
    document.getElementById('dash-conditions').innerHTML = condList.length > 0 ? condList.join('<br>') : "Nenhuma condição ativa.";
    
    // Skills Grid
    const gridSkills = document.getElementById('dash-skills-grid');
    gridSkills.innerHTML = '';
    
    // Race Skills & Weaknesses
    if (char.race && RACE_TEMPLATES[char.race]) {
        const raceTpl = RACE_TEMPLATES[char.race];
        if (raceTpl.skills) {
            raceTpl.skills.forEach(sk => {
                const card = document.createElement('div');
                card.className = "border border-gray-400/40 bg-black/40 rounded p-3 text-sm";
                card.innerHTML = `
                    <div class="font-bold text-gray-300 mb-1 border-b border-gray-400/20 pb-1"><i class="fa-solid fa-dna mr-1"></i> ${escapeHTML(sk.name)} <span class="text-[10px] text-gray-500 float-right uppercase">${escapeHTML(char.race)}</span></div>
                    <div class="text-xs text-gray-400 mb-2"><span class="font-bold">Tipo:</span> ${escapeHTML(sk.type)}</div>
                    <div class="text-gray-300 italic text-xs">${escapeHTML(sk.desc)}</div>
                `;
                gridSkills.appendChild(card);
            });
        }
        if (raceTpl.weaknesses) {
            raceTpl.weaknesses.forEach(wk => {
                const card = document.createElement('div');
                card.className = "border border-red-500/30 bg-black/40 rounded p-3 text-sm";
                card.innerHTML = `
                    <div class="font-bold text-red-400 mb-1 border-b border-red-500/20 pb-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i> ${escapeHTML(wk.name)} <span class="text-[10px] text-gray-500 float-right uppercase">FRAQUEZA DA RAÇA</span></div>
                    <div class="text-gray-300 italic text-xs">${escapeHTML(wk.desc)}</div>
                `;
                gridSkills.appendChild(card);
            });
        }
    }

    // Class Skills & Weaknesses
    if (char.class) {
        const tplKey = Object.keys(CLASS_TEMPLATES).find(k => k.toLowerCase() === char.class.toLowerCase());
        if (tplKey && CLASS_TEMPLATES[tplKey]) {
            const classTpl = CLASS_TEMPLATES[tplKey];
            if (classTpl.skills) {
                classTpl.skills.forEach(sk => {
                    const card = document.createElement('div');
                    card.className = "border border-blue-400/30 bg-black/40 rounded p-3 text-sm";
                    card.innerHTML = `
                        <div class="font-bold text-blue-300 mb-1 border-b border-blue-400/20 pb-1"><i class="fa-solid fa-book-journal-whills mr-1"></i> ${escapeHTML(sk.name)} <span class="text-[10px] text-gray-500 float-right uppercase">${escapeHTML(char.class)}</span></div>
                        <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-400 mb-2">
                            <div><span class="font-bold">Tipo:</span> ${escapeHTML(sk.type || '-')}</div>
                            <div><span class="font-bold">Custo:</span> ${escapeHTML(sk.cost || '-')}</div>
                            <div class="col-span-2"><span class="font-bold">Teste:</span> ${escapeHTML(sk.test || '-')}</div>
                        </div>
                        <div class="text-gray-300 italic text-xs">${escapeHTML(sk.desc)}</div>
                    `;
                    gridSkills.appendChild(card);
                });
            }
            if (classTpl.weaknesses) {
                classTpl.weaknesses.forEach(wk => {
                    const card = document.createElement('div');
                    card.className = "border border-red-500/30 bg-black/40 rounded p-3 text-sm";
                    card.innerHTML = `
                        <div class="font-bold text-red-400 mb-1 border-b border-red-500/20 pb-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i> ${escapeHTML(wk.name)} <span class="text-[10px] text-gray-500 float-right uppercase">FRAQUEZA DA CLASSE</span></div>
                        <div class="text-gray-300 italic text-xs">${escapeHTML(wk.desc)}</div>
                    `;
                    gridSkills.appendChild(card);
                });
            }
        }
    }

    // Global Skills
    const mySkills = (char.equippedSkillIds || []).map(id => globalSkills.find(s => s.id === id)).filter(Boolean);
    if (mySkills.length > 0) {
        mySkills.forEach(sk => {
            const card = document.createElement('div');
            card.className = "border border-gold/20 bg-black/30 rounded p-3 text-sm";
            card.innerHTML = `
                <div class="font-bold text-gold mb-1 border-b border-gold/10 pb-1"><i class="fa-solid fa-star mr-1 text-xs"></i> ${escapeHTML(sk.name)}</div>
                <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-400 mb-2">
                    <div><span class="font-bold">Tipo:</span> ${escapeHTML(sk.type || '-')}</div>
                    <div><span class="font-bold">Custo:</span> ${escapeHTML(sk.cost || '-')}</div>
                    <div class="col-span-2"><span class="font-bold">Teste:</span> ${escapeHTML(sk.test || '-')}</div>
                </div>
                <div class="text-gray-300 italic text-xs">${escapeHTML(sk.effect)}</div>
            `;
            gridSkills.appendChild(card);
        });
    }

    if (gridSkills.children.length === 0) {
        gridSkills.innerHTML = '<div class="text-sm text-gray-400">Nenhuma habilidade associada ao personagem.</div>';
    }

    updateBars(char, mods);
    renderAttributesAndDerivedStats(char, mods);
    
    const canEditChar = canEdit(char);
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = !canEditChar);

    // Render Logs
    const dashLogs = document.getElementById('dash-logs');
    dashLogs.innerHTML = '';
    if (char.logs && char.logs.length > 0) {
        // Reverse so newest is on top or bottom? Chronological is bottom, newest top is easier for scrolling
        const reversed = [...char.logs].reverse();
        reversed.forEach(lg => {
            const el = document.createElement('div');
            el.className = "border-l-2 pl-2 py-1 border-white/10";
            let color = 'text-gray-300';
            if (lg.type === 'increase') color = 'text-red-400 font-bold'; // Por solicitação, vermelho para aumentos
            else if (lg.type === 'decrease') color = 'text-yellow-400';
            el.innerHTML = `<span class="text-gray-500 mr-2">[${lg.time}]</span> <span class="${color}">${escapeHTML(lg.text)}</span>`;
            dashLogs.appendChild(el);
        });
    } else {
        dashLogs.innerHTML = '<div class="text-gray-500 text-center py-4">Nenhum registro encontrado.</div>';
    }

    document.getElementById('btn-edit-char').onclick = () => {
        if(!canEditChar) return alert("Sem permissão.");
        editingCharId = char.id;
        document.getElementById('modal-title').innerText = "Editar Ficha";
        document.getElementById('inp-name').value = char.name;
        const rEl = document.getElementById('inp-race'); if(rEl) rEl.value = char.race || '';
        document.getElementById('inp-class').value = char.class;
        const gEl = document.getElementById('inp-gender'); if(gEl) gEl.value = char.gender || '';
        const oEl = document.getElementById('inp-orientation'); if(oEl) oEl.value = char.orientation || '';
        document.getElementById('inp-avatar').value = char.avatarUrl || "";
        
        document.querySelectorAll('.inp-ero-zone').forEach(cb => {
            cb.checked = char.erogenousZones && char.erogenousZones.includes(cb.value);
        });
        
        draftPerks = char.perks ? JSON.parse(JSON.stringify(char.perks)) : {};
        switchCharTab('base');
        
        populateCharModalSelects();
        
        // Master UI
        const mop = document.getElementById('master-options-panel');
        const chkUnlock = document.getElementById('inp-unlock-points');
        if (isMaster()) {
            mop.classList.remove('hidden');
            chkUnlock.checked = char.isUnlockedPoints || false;
        } else {
            mop.classList.add('hidden');
            chkUnlock.checked = char.isUnlockedPoints || false;
        }

        // Restore conditions
        // Temporary set a fake element property so enforceClassConditions can capture it
        const condList = document.getElementById('conditions-list');
        condList.innerHTML = '';
        char.activeConditionIds.forEach(id => {
            condList.innerHTML += `<input type="checkbox" class="inp-cond-check" value="${id}" checked>`;
        });
        
        // Restore skills
        const slotsContainer = document.getElementById('skills-select-list');
        slotsContainer.innerHTML = '';
        char.equippedSkillIds.forEach(sId => {
            const div = document.createElement('div');
            div.className = 'flex gap-2 mb-2';
            div.innerHTML = `
                <select class="input-dark flex-1 inp-skill-slot" onchange="updateSkillSelectOptions(); this.nextElementSibling.onclick = () => openViewModal('skill', this.value)"><option value="${sId}" selected></option></select>
                <button type="button" class="btn-icon text-blue-400 px-2" onclick="openViewModal('skill', this.previousElementSibling.value)" title="Ver Detalhes"><i class="fa-solid fa-circle-info"></i></button>
                <button type="button" class="btn-icon text-red-400 px-2" onclick="this.parentElement.remove(); updateSkillSelectOptions();"><i class="fa-solid fa-xmark"></i></button>
            `;
            slotsContainer.appendChild(div);
        });

        enforceClassConditions(); // Applies condition visibility and loads select options
        
        if (char.equipment) {
            document.getElementById('inp-equip-head').value = char.equipment.head || "";
            document.getElementById('inp-equip-back').value = char.equipment.back || "";
            document.getElementById('inp-equip-body').value = char.equipment.body || "";
            document.getElementById('inp-equip-waist').value = char.equipment.waist || "";
            document.getElementById('inp-equip-feet').value = char.equipment.feet || "";
            document.getElementById('inp-equip-intimate').value = char.equipment.intimate || "";
            document.getElementById('inp-equip-hand_1').value = char.equipment.hand_1 || "";
            document.getElementById('inp-equip-hand_2').value = char.equipment.hand_2 || "";
            document.getElementById('inp-equip-ring_1').value = char.equipment.ring_1 || "";
            document.getElementById('inp-equip-ring_2').value = char.equipment.ring_2 || "";
            document.getElementById('inp-equip-charm').value = char.equipment.charm || "";
        } else {
            // Legacy load
            document.getElementById('inp-equip-body').value = char.equippedArmorId || "";
            document.getElementById('inp-equip-head').value = "";
            document.getElementById('inp-equip-back').value = "";
            document.getElementById('inp-equip-waist').value = "";
            document.getElementById('inp-equip-feet').value = "";
            document.getElementById('inp-equip-intimate').value = "";
            document.getElementById('inp-equip-hand_1').value = "";
            document.getElementById('inp-equip-hand_2').value = "";
            document.getElementById('inp-equip-ring_1').value = "";
            document.getElementById('inp-equip-ring_2').value = "";
            document.getElementById('inp-equip-charm').value = "";
        }
        
        if (document.getElementById('inp-for')) document.getElementById('inp-for').value = char.attr.for ?? 0;
        if (document.getElementById('inp-agi')) document.getElementById('inp-agi').value = char.attr.agi ?? 0;
        if (document.getElementById('inp-vit')) document.getElementById('inp-vit').value = char.attr.vit ?? char.attr.con ?? char.attr.vig ?? 0;
        if (document.getElementById('inp-chr')) document.getElementById('inp-chr').value = char.attr.chr ?? char.attr.mis ?? char.attr.sed ?? 0;
        if (document.getElementById('inp-per')) document.getElementById('inp-per').value = char.attr.per ?? char.attr.von ?? 0;
        
        // Aliases para legado
        if (document.getElementById('inp-con')) document.getElementById('inp-con').value = char.attr.con ?? char.attr.vit ?? 0;
        if (document.getElementById('inp-vig')) document.getElementById('inp-vig').value = char.attr.vig ?? char.attr.vit ?? 0;
        if (document.getElementById('inp-von')) document.getElementById('inp-von').value = char.attr.von ?? char.attr.per ?? 0;
        if (document.getElementById('inp-sed')) document.getElementById('inp-sed').value = char.attr.sed ?? char.attr.chr ?? 0;
        if (document.getElementById('inp-mis')) document.getElementById('inp-mis').value = char.attr.mis ?? char.attr.chr ?? 0;
        
        updatePointsCounter();
        document.getElementById('modal-character').showModal();
    };

    const btnExp = document.getElementById('btn-export-char');
    if (btnExp) {
        btnExp.onclick = () => exportChar(char);
    }

    const btnDel = document.getElementById('btn-delete-char');
    if (btnDel) {
        btnDel.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.requestDeleteChar(char.id, char.name);
        };
    }
}

window.showConfirmDialog = function(options) {
    options = options || {};
    const modal = document.getElementById('modal-confirm-delete');
    if (!modal) {
        if (confirm(options.message || 'Confirmar ação?')) {
            if (typeof options.onConfirm === 'function') options.onConfirm();
        }
        return;
    }

    const titleEl = document.getElementById('confirm-delete-title');
    const headEl = document.getElementById('confirm-delete-heading');
    const msgEl = document.getElementById('confirm-delete-msg');
    const subEl = document.getElementById('confirm-delete-sub');
    const btnExec = document.getElementById('btn-confirm-delete-exec');

    if (titleEl) titleEl.textContent = options.title || 'Confirmar Ação';
    if (headEl) headEl.textContent = options.heading || options.title || 'Confirmar Exclusão';
    if (msgEl) {
        if (options.messageHtml) msgEl.innerHTML = options.messageHtml;
        else msgEl.textContent = options.message || 'Tem certeza que deseja prosseguir?';
    }
    if (subEl) subEl.textContent = options.subtext !== undefined ? options.subtext : 'Esta ação não poderá ser desfeita.';
    if (btnExec) {
        btnExec.textContent = options.confirmText || 'Apagar';
    }

    window._confirmActionCallback = options.onConfirm || null;
    modal.showModal();
};

window.requestDeleteChar = function(charId, charName) {
    if (!charId) return;
    window._pendingDeleteCharId = charId;
    window.showConfirmDialog({
        title: 'Apagar Ficha',
        heading: 'Confirmar Exclusão',
        messageHtml: `Tem certeza que deseja apagar a ficha de <strong class="text-white">${escapeHTML(charName || 'este personagem')}</strong>?`,
        subtext: 'O personagem será removido permanentemente da expedição.',
        confirmText: 'Apagar',
        onConfirm: () => {
            window.deleteCharacter(charId);
        }
    });
};

window.requestDeleteMonster = function(monsterId, monsterName) {
    if (!monsterId) return;
    window.showConfirmDialog({
        title: 'Apagar Monstro',
        heading: 'Excluir Criatura',
        messageHtml: `Deseja apagar a criatura <strong class="text-white">${escapeHTML(monsterName || 'este monstro')}</strong>?`,
        subtext: 'O registro será removido permanentemente do bestiário.',
        confirmText: 'Apagar',
        onConfirm: () => {
            deleteFromDB('monsters', monsterId);
        }
    });
};

window.requestDeleteItem = function(collection, itemId, itemName) {
    if (!collection || !itemId) return;
    window.showConfirmDialog({
        title: 'Apagar Item',
        heading: 'Excluir Registro',
        messageHtml: `Deseja apagar o registro <strong class="text-white">${escapeHTML(itemName || 'este item')}</strong>?`,
        subtext: 'O registro será removido permanentemente.',
        confirmText: 'Apagar',
        onConfirm: () => {
            deleteFromDB(collection, itemId);
        }
    });
};

window.deleteCharacter = function(charId) {
    if (!charId) return;
    
    // Fechar o modal imediatamente
    try { document.getElementById('modal-confirm-delete')?.close(); } catch(e) {}

    // 1. Filtrar do array em memória
    characters = characters.filter(c => String(c.id) !== String(charId));
    window.characters = characters;

    // 2. Gravar no set de IDs excluídos para evitar ressuscitação por snapshot do Firestore
    try {
        let deletedSet = JSON.parse(localStorage.getItem('bd_deleted_ids') || '[]');
        if (!deletedSet.includes(String(charId))) {
            deletedSet.push(String(charId));
            localStorage.setItem('bd_deleted_ids', JSON.stringify(deletedSet));
        }
    } catch(e) {}

    // 3. Atualizar bd_characters no localStorage
    try {
        localStorage.setItem('bd_characters', JSON.stringify(characters));
    } catch(e) {}

    // 4. Se a ficha ativa for a que foi apagada, seleciona a próxima ou limpa
    if (String(activeCharId) === String(charId)) {
        activeCharId = characters.length > 0 ? characters[0].id : null;
        if (activeCharId) {
            localStorage.setItem('bd_active', activeCharId);
        } else {
            localStorage.removeItem('bd_active');
        }
    }

    // 5. Tenta deletar no Firestore se conectado
    if (typeof db !== 'undefined' && db && typeof currentUser !== 'undefined' && currentUser) {
        db.collection('characters').doc(charId).delete().catch(err => {
            console.warn("Exclusão remota no Firestore falhou (removido localmente):", err);
        });
    }

    // 6. Atualizar a UI imediatamente com proteção de erros
    try { renderSidebar(); } catch(e) { console.error("Erro ao renderizar sidebar após exclusão:", e); }
    try { renderDashboard(); } catch(e) { console.error("Erro ao renderizar dashboard após exclusão:", e); }
    try { if (typeof renderRPG === 'function') renderRPG(); } catch(e) { console.error("Erro ao renderizar RPG após exclusão:", e); }
};

document.addEventListener('click', (e) => {
    // 1. Confirm deletion dialog execution
    if (e.target && (e.target.id === 'btn-confirm-delete-exec' || e.target.closest('#btn-confirm-delete-exec'))) {
        e.preventDefault();
        const cb = window._confirmActionCallback;
        window._confirmActionCallback = null;
        const pendingId = window._pendingDeleteCharId;
        window._pendingDeleteCharId = null;
        try {
            if (typeof cb === 'function') {
                cb();
            } else if (pendingId) {
                window.deleteCharacter(pendingId);
            }
        } finally {
            document.getElementById('modal-confirm-delete')?.close();
        }
        return;
    }

    // 2. Header Delete Character Button
    const btnDel = e.target.closest('#btn-delete-char');
    if (btnDel) {
        e.preventDefault();
        e.stopPropagation();
        const cur = characters.find(c => c.id === activeCharId) || (characters.length > 0 ? characters[0] : null);
        if (cur) {
            window.requestDeleteChar(cur.id, cur.name);
        } else if (activeCharId) {
            window.requestDeleteChar(activeCharId, 'este personagem');
        } else {
            alert("Nenhum personagem selecionado para apagar.");
        }
        return;
    }

    // 3. Quick Delete in Sidebar
    const quickDel = e.target.closest('.btn-char-quick-del');
    if (quickDel) {
        e.preventDefault();
        e.stopPropagation();
        const cid = quickDel.dataset.charId || quickDel.getAttribute('data-char-id');
        const cname = quickDel.dataset.charName || quickDel.getAttribute('data-char-name') || 'este personagem';
        if (cid) {
            window.requestDeleteChar(cid, cname);
        }
        return;
    }
});

function exportChar(char) {
    if (!char) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(char, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `e33_${(char.name || 'personagem').toLowerCase().replace(/\s+/g, '_')}.json`);
    dlAnchorElem.click();
}
window.exportChar = exportChar;

function updateBars(char, mods) {
    const cStats = getClassStats(char.class);
    const vit = char.attr.vit ?? char.attr.con ?? char.attr.vig ?? 0;
    const chrAttr = char.attr.chr ?? char.attr.mis ?? char.attr.sed ?? 0;
    
    // Multiplicadores e Modificadores
    let maxHp = Math.max(1, Math.floor((cStats.hp + (vit * 10) + (mods.hp_max || 0)) * mods.hp_mult));
    let maxSt = Math.max(1, Math.floor((cStats.st + (vit * 5) + (mods.st_max || 0)) * mods.st_mult));
    const maxEn = (cStats.en || 30) + (chrAttr * 5); // Chroma
    const maxLu = (cStats.lust || 100) + (vit * 5) + (mods.lust_max || 0); // Postura / Guarda
    
    const hp = Math.max(0, Math.min(maxHp, char.hp));
    if (document.getElementById('val-hp')) document.getElementById('val-hp').innerText = hp; 
    if (document.getElementById('max-hp')) document.getElementById('max-hp').innerText = maxHp;
    if (document.getElementById('bar-hp')) document.getElementById('bar-hp').style.width = (hp / maxHp * 100) + '%';

    const st = Math.max(0, Math.min(maxSt, char.stamina));
    if (document.getElementById('val-stamina')) document.getElementById('val-stamina').innerText = st; 
    if (document.getElementById('max-stamina')) document.getElementById('max-stamina').innerText = maxSt;
    if (document.getElementById('bar-stamina')) document.getElementById('bar-stamina').style.width = (st / maxSt * 100) + '%';

    const en = Math.max(0, Math.min(maxEn, char.energy !== undefined ? char.energy : 30));
    if (document.getElementById('val-energy')) document.getElementById('val-energy').innerText = en; 
    if (document.getElementById('max-energy')) document.getElementById('max-energy').innerText = maxEn;
    if (document.getElementById('bar-energy')) document.getElementById('bar-energy').style.width = (en / maxEn * 100) + '%';
    
    if (document.getElementById('chk-convert-lust')) {
        document.getElementById('chk-convert-lust').checked = !!char.autoConvertLust;
    }

    // Postura: 0 (totalmente firme) até maxLu (quebra de guarda)
    const lu = Math.max(0, Math.min(maxLu, char.lust || 0));
    if (document.getElementById('val-lust')) document.getElementById('val-lust').innerText = lu;
    if (document.getElementById('max-lust')) document.getElementById('max-lust').innerText = maxLu;
    const barLust = document.getElementById('bar-lust');
    const isStagger = lu >= maxLu;
    if (barLust) {
        barLust.style.width = (lu / maxLu * 100) + '%';
        if (isStagger) barLust.classList.add('mind-break');
        else barLust.classList.remove('mind-break');
    }

    if (document.getElementById('dash-ecstasy-threshold')) {
        document.getElementById('dash-ecstasy-threshold').innerText = maxLu;
    }
    
    if (document.getElementById('lust-stage')) {
        document.getElementById('lust-stage').innerText = isStagger 
            ? `⚠️ GUARDA QUEBRADA (STAGGER)` 
            : `Impacto: ${Math.round((lu / maxLu) * 100)}% (${lu} / ${maxLu})`;
    }

    const badge = document.getElementById('dash-condition');
    if (badge) {
        if (isStagger) { badge.className = 'badge badge-lust'; badge.innerHTML = '⚠️ Quebra de Guarda'; }
        else if (hp <= 0) { badge.className = 'badge badge-danger'; badge.innerHTML = 'Inconsciente'; }
        else if (st <= 0) { badge.className = 'badge badge-warning'; badge.innerHTML = 'Caído / Exausto'; }
        else if (lu > maxLu * 0.7) { badge.className = 'badge badge-warning'; badge.innerHTML = 'Guarda Fragilizada'; }
        else { badge.className = 'badge badge-normal'; badge.innerHTML = 'Firme'; }
    }
}

function renderAttributesAndDerivedStats(char, mods) {
    const vit = char.attr.vit ?? char.attr.con ?? char.attr.vig ?? 0;
    const forAttr = char.attr.for ?? 0;
    const agi = char.attr.agi ?? 0;
    const chr = char.attr.chr ?? char.attr.mis ?? char.attr.sed ?? 0;
    const per = char.attr.per ?? char.attr.von ?? 0;

    const totalDF = vit + mods.df + mods.df_hp;
    const totalDL = mods.dlust_set !== null ? mods.dlust_set : (per + mods.dlust + mods.df_lust);
    
    const totalAgi = agi + mods.agi;
    const baseEsq = 8 + mods.esq;
    const minDodge = totalAgi > 0 ? 2 : 0;
    const maxDodge = totalAgi > 0 ? 2 * totalAgi : 0;
    const totalEsq = minDodge === maxDodge ? (baseEsq + minDodge) : `${baseEsq + minDodge}-${baseEsq + maxDodge}`;
    
    const formatDamageRange = (base, diceArr) => {
        if (!diceArr || diceArr.length === 0) return base;
        let parsed = diceArr.map(d => {
            let m = d.toLowerCase().match(/(\d*)d(\d+)/);
            if (m) {
                let count = m[1] ? parseInt(m[1]) : 1;
                let faces = parseInt(m[2]);
                return { count, faces, max: count * faces, min: count };
            }
            return { count: 0, faces: 0, max: 0, min: 0 };
        });
        parsed.sort((a, b) => b.max - a.max);
        let topTwo = parsed.slice(0, 2);
        let minAdd = 0, maxAdd = 0;
        topTwo.forEach(d => { minAdd += d.min; maxAdd += d.max; });
        return `${base + minAdd}-${base + maxAdd}`;
    };

    let totalDanFis = formatDamageRange(5 + forAttr + mods.danFis, mods.danFisDice);
    let totalDanChr = formatDamageRange(5 + chr + mods.danLust, mods.danLustDice);

    if (document.getElementById('dash-df')) document.getElementById('dash-df').innerText = totalDF;
    if (document.getElementById('dash-dl')) document.getElementById('dash-dl').innerText = totalDL;
    if (document.getElementById('dash-esq')) document.getElementById('dash-esq').innerText = totalEsq;
    if (document.getElementById('dash-danfis')) document.getElementById('dash-danfis').innerText = totalDanFis;
    if (document.getElementById('dash-danlust')) document.getElementById('dash-danlust').innerText = totalDanChr;

    // Tooltips helper
    const buildTT = (baseLabel, baseVal, bks) => {
        let h = `<div class='border-b border-white/20 pb-1 mb-1 font-bold'>${baseLabel}: ${baseVal}</div>`;
        if (bks && bks.length > 0) {
            bks.forEach(b => h += `<div class='flex justify-between'><span>${b.label}:</span> <span class='text-cyan-400'>${b.val}</span></div>`);
        } else {
            h += `<div class='text-gray-500 italic'>Sem modificadores</div>`;
        }
        return h;
    };

    if (document.getElementById('tt-df')) document.getElementById('tt-df').innerHTML = buildTT('Base (VIT)', vit, mods.breakdown.df.concat(mods.breakdown.df_hp));
    if (document.getElementById('tt-dl')) document.getElementById('tt-dl').innerHTML = buildTT('Base (PER)', per, mods.breakdown.dlust.concat(mods.breakdown.df_lust));
    if (document.getElementById('tt-esq')) document.getElementById('tt-esq').innerHTML = buildTT('Base (8 + 2dAGI)', `8${totalAgi > 0 ? ` + (2 a ${maxDodge})` : ''}`, mods.breakdown.esq);
    if (document.getElementById('tt-danfis')) document.getElementById('tt-danfis').innerHTML = buildTT('Base (5 + FOR)', 5 + forAttr, mods.breakdown.danFis);
    if (document.getElementById('tt-danlust')) document.getElementById('tt-danlust').innerHTML = buildTT('Base (5 + CHR)', 5 + chr, mods.breakdown.danLust);

    // HP, ST, Lust, Chroma tooltips
    const baseStats = getClassStats(char.class);
    if (document.getElementById('tt-hp')) document.getElementById('tt-hp').innerHTML = buildTT('Base', baseStats.hp, mods.breakdown.hp);
    if (document.getElementById('tt-st')) document.getElementById('tt-st').innerHTML = buildTT('Base', baseStats.st, mods.breakdown.st);
    if (document.getElementById('tt-lust')) document.getElementById('tt-lust').innerHTML = buildTT('Base', baseStats.lust, mods.breakdown.lust);
    if (document.getElementById('tt-energy')) document.getElementById('tt-energy').innerHTML = buildTT('Base', baseStats.en, mods.breakdown.en);

    const mkRow = (name, key, base, mod, icon) => {
        let finalVal = base + (mod || 0);
        let modStr = mod > 0 ? `<span class="text-green-400 text-xs">(+${mod})</span>` : (mod < 0 ? `<span class="text-red-400 text-xs">(${mod})</span>` : '');
        let bks = (mods.breakdown && mods.breakdown[key]) || [];
        let ttHtml = buildTT('Base', base, bks);
        
        return `<div class="group relative flex justify-between items-center py-1.5 border-b border-white/5 cursor-pointer hover:bg-white/5 px-2 -mx-2 rounded transition" onclick="openPerkModal('${key}')">
            <span class="text-gray-400"><i class="fa-solid fa-${icon} w-5"></i> ${name}</span>
            <span class="font-semibold text-lg text-white">${finalVal} ${modStr}</span>
            <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-48 bg-black/95 border border-cyan-500/40 text-left p-3 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-gray-300 shadow-xl">
                ${ttHtml}
                <div class="mt-2 text-center text-[10px] text-cyan-400/80 border-t border-cyan-500/20 pt-1">Clique para ver vantagens</div>
            </div>
        </div>`;
    };

    if (document.getElementById('dash-attributes')) {
        document.getElementById('dash-attributes').innerHTML = `
            ${mkRow('Força', 'for', forAttr, 0, 'fist-raised')}
            ${mkRow('Agilidade', 'agi', agi, mods.agi, 'person-running')}
            ${mkRow('Vitalidade', 'vit', vit, 0, 'heart')}
            ${mkRow('Chroma', 'chr', chr, mods.mis, 'palette')}
            ${mkRow('Percepção', 'per', per, mods.von, 'eye')}
        `;
    }

    const items = getEquippedItems(char);
    const equipContainer = document.getElementById('dash-equipment-list');
    if (items.length > 0) {
        let html = '';
        items.forEach(item => {
            const isWeapon = item.type === 'weapon';
            const isAccessory = item.type === 'accessory';
            const viewType = isWeapon ? 'weapon' : isAccessory ? 'accessory' : 'armor';
            let modHtml = '';
            const aMod = item.mods || {};

            if (isWeapon) {
                const dc = Number(item.diceCount) || 0;
                const df = Number(item.diceFaces) || 0;
                const dm = Number(item.dmgMod) || 0;
                const dmg = dc && df ? `${dc}d${df}${dm > 0 ? '+' + dm : dm < 0 ? dm : ''}` : (item.damage || '-');
                modHtml += `<span class="text-red-300">${escapeHTML(dmg)} ${escapeHTML(item.dmgType || 'HP')}</span>`;
                if (item.durability !== undefined) modHtml += `<span class="text-gray-400">Dur. ${item.durability}/${item.maxDurability || item.durability}</span>`;
            } else {
                const baseArmorStats = getArmorBaseStats(item.base || 'none');
                let totalDfHp = Number(baseArmorStats.mods.df || 0) + Number(aMod.df_hp || aMod.df || 0);
                let totalDfLust = Number(baseArmorStats.mods.dlust || 0) + Number(aMod.df_lust || aMod.dlust || 0);
                let totalAgi = Number(baseArmorStats.mods.agi || 0) + Number(aMod.agi || 0);
                let totalSed = Number(baseArmorStats.mods.sed || 0) + Number(aMod.sed || 0);
                let totalMis = Number(baseArmorStats.mods.mis || 0) + Number(aMod.mis || 0);

                if(totalDfHp) modHtml += `<span class="text-green-400">DF ${totalDfHp > 0 ? '+' + totalDfHp : totalDfHp}</span>`;
                if(totalDfLust) modHtml += `<span class="text-purple-300">DLUST ${totalDfLust > 0 ? '+' + totalDfLust : totalDfLust}</span>`;
                if(totalAgi) modHtml += `<span class="text-green-400">AGI ${totalAgi > 0 ? '+'+totalAgi : totalAgi}</span>`;
                if(totalSed) modHtml += `<span class="text-pink-300">SED ${totalSed > 0 ? '+'+totalSed : totalSed}</span>`;
                if(totalMis) modHtml += `<span class="text-blue-300">MIS ${totalMis > 0 ? '+'+totalMis : totalMis}</span>`;
            }

            const icon = isWeapon ? 'fa-khanda' : isAccessory ? 'fa-gem' : 'fa-shield-halved';
            const kind = isWeapon ? 'Arma' : isAccessory ? 'Acessório' : (item.slot || 'Equipamento');
            html += `
            <div class="p-3 bg-black/40 rounded border border-gray-700/50 flex justify-between items-center cursor-pointer hover:border-gold/50 transition-colors" onclick="openViewModal('${viewType}', '${item.id}')">
                <div>
                    <div class="font-bold text-gold text-sm"><i class="fa-solid ${icon} mr-1"></i> ${escapeHTML(item.name)}</div>
                    <div class="text-[10px] text-gray-400 uppercase">${escapeHTML(kind)}${item.category ? ' | ' + escapeHTML(item.category) : ''}</div>
                </div>
                <div class="flex gap-2 text-[10px] md:text-xs flex-wrap justify-end max-w-[55%]">
                    ${modHtml || '<span class="text-gray-600">Sem bônus diretos</span>'}
                </div>
            </div>`;
        });
        equipContainer.innerHTML = html;
    } else {
        equipContainer.innerHTML = '<div class="text-sm text-gray-400 text-center italic mt-4 mb-4">Nenhum equipamento ativo. (Vestindo trajes comuns)</div>';
    }
}

// --- QUICK ACTIONS ---
window.adjustStat = function(stat, amount) {
    const char = getActiveChar();
    if(!char) return;
    if(!canEdit(char)) return alert("Sem permissão.");
    
    if (char.race === 'Sexualizados') {
        if (amount < 0 && (stat === 'energy' || stat === 'lust')) {
            amount = Math.ceil(amount * 0.9); // Gasto reduzido em 10%
        } else if (amount > 0 && (stat === 'stamina' || stat === 'energy')) {
            amount = Math.floor(amount * 1.1); // Recuperação 10% mais eficiente
        }
    }

    const oldVal = char[stat];
    char[stat] += amount;
    
    const mods = getCharModifiers(char);
    const cStats = getClassStats(char.class);
    
    if (stat === 'lust') {
        const mx = cStats.lust;
        if(char[stat] > mx) char[stat] = mx;
        if(char[stat] < 0) char[stat] = 0;
        
        // Auto-conversão de Lust para Magia ao ganhar Lust
        if (amount > 0 && char.autoConvertLust) {
            const energyGain = Math.floor(amount / 2);
            if (energyGain > 0) {
                char.energy = (char.energy || 0) + energyGain;
                if (char.energy > cStats.en) char.energy = cStats.en;
                addLog(char, `Conversão Automática (Dashboard): +${energyGain} Magia gerada por ganhar Lust.`, "info");
            }
        }
    } else if (stat === 'hp') {
        const mx = Math.max(1, Math.floor((cStats.hp + (char.attr.con * 10)) * mods.hp_mult));
        if(char[stat] > mx) char[stat] = mx;
        if(char[stat] < 0) char[stat] = 0;
    } else if (stat === 'stamina') {
        const mx = Math.max(1, Math.floor((cStats.st + (char.attr.vig * 5)) * mods.st_mult));
        if(char[stat] > mx) char[stat] = mx;
        if(char[stat] < 0) char[stat] = 0;
    } else if (stat === 'energy') {
        const mx = cStats.en;
        if(char[stat] > mx) char[stat] = mx;
        if(char[stat] < 0) char[stat] = 0;
    }

    if (char[stat] !== oldVal) {
        const statName = stat.toUpperCase();
        if (char[stat] > oldVal) {
            addLog(char, `${statName} aumentado: ${oldVal} -> ${char[stat]}`, "increase");
        } else {
            addLog(char, `${statName} diminuído: ${oldVal} -> ${char[stat]}`, "decrease");
        }
    }

    saveToDB('characters', char, characters, 'bd_characters');
}

window.toggleLustConversion = function() {
    const char = getActiveChar();
    if(!char) return;
    if(!canEdit(char)) return alert("Sem permissão.");
    
    char.autoConvertLust = document.getElementById('chk-convert-lust').checked;
    saveToDB('characters', char, characters, 'bd_characters');
};

window.manualTransmuteLust = function() {
    const char = getActiveChar();
    if(!char) return;
    if(!canEdit(char)) return alert("Sem permissão.");
    
    const cost = 2;
    if (char.lust < cost) {
        return alert("Lust insuficiente para transmutar! Você precisa de pelo menos 2 Lust.");
    }
    
    char.lust -= cost;
    char.energy = (char.energy || 0) + 1;
    
    const cStats = getClassStats(char.class);
    if(char.energy > cStats.en) char.energy = cStats.en;
    if(char.lust < 0) char.lust = 0;
    
    addLog(char, `Transmutação Ativa: Consumiu ${cost} Lust para recuperar 1 Magia.`, "info");
    saveToDB('characters', char, characters, 'bd_characters');
};

window.applyDamage = () => adjustStat('hp', -15);
window.rest = () => adjustStat('stamina', 30);
window.relieve = () => adjustStat('lust', -20);

// --- PERKS SYSTEM ---
let draftPerks = {};

function initPerksUI() {
    const container = document.getElementById('perks-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (typeof PERKS_DB === 'undefined' || !PERKS_DB) return;
    Object.keys(PERKS_DB).forEach(attrKey => {
        const attrData = PERKS_DB[attrKey];
        if (!attrData || !attrData.perks) return;
        
        const block = document.createElement('div');
        block.className = 'border border-[#bfa888]/25 rounded-lg bg-[#0e0b09] mb-3 overflow-hidden shadow-md';
        block.innerHTML = `
            <div class="p-3 flex justify-between items-center cursor-pointer bg-[#181310] hover:bg-[#201915] transition border-b border-[#bfa888]/15" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <div class="text-[#bfa888] font-bold text-xs tracking-wider uppercase"><i class="fa-solid ${attrData.icon} mr-2"></i>${attrData.name}</div>
                <div class="text-xs text-[#a89f91] font-mono bg-[#0c0a08] px-2 py-0.5 rounded border border-[#bfa888]/20">PV: <span id="pv-used-${attrKey}" class="text-[#bfa888] font-bold">0</span> / <span id="pv-max-${attrKey}">0</span></div>
            </div>
            <div class="p-3 hidden space-y-3 bg-[#0a0807]/90" id="perks-list-${attrKey}">
                ${Object.keys(attrData.perks).length === 0 ? '<div class="text-xs text-[#7a7164] italic text-center py-2 ">Vantagens em desenvolvimento pelo Game Designer...</div>' : ''}
            </div>
        `;
        container.appendChild(block);

        const list = document.getElementById(`perks-list-${attrKey}`);
        Object.keys(attrData.perks).forEach(pName => {
            const row = document.createElement('div');
            row.className = 'p-3 bg-[#0e0e10] rounded border border-[#bfa888]/20 shadow-sm flex flex-col gap-2 transition-all opacity-70';
            row.id = `pcard-${attrKey}-${btoa(pName).replace(/=/g, '')}`;
            row.innerHTML = `
                <div class="flex justify-between items-start gap-2">
                    <span class="font-bold text-xs text-[#ede3d2] tracking-wide leading-tight flex-1">${escapeHTML(pName)}</span>
                    <div class="flex items-center bg-[#070605] rounded border border-[#bfa888]/30 shrink-0">
                        <button type="button" class="w-7 h-7 flex items-center justify-center text-[#991b1b] hover:bg-[#251e18] transition-colors" onclick="adjustPerk('${attrKey}', '${pName.replace(/'/g, "\\'")}', -1)"><i class="fa-solid fa-minus text-[10px]"></i></button>
                        <span class="font-mono text-xs w-6 text-center text-[#ede3d2] font-bold" id="plvl-${attrKey}-${btoa(pName).replace(/=/g, '')}">0</span>
                        <button type="button" class="w-7 h-7 flex items-center justify-center text-[#bfa888] hover:bg-[#251e18] transition-colors" onclick="adjustPerk('${attrKey}', '${pName.replace(/'/g, "\\'")}', 1)"><i class="fa-solid fa-plus text-[10px]"></i></button>
                    </div>
                </div>
                <div class="text-[11px] md:text-xs text-[#7a7164] italic bg-[#070605]/80 p-2 rounded border-l-2 border-[#bfa888]/30 transition-colors min-h-[36px]" id="pdesc-${attrKey}-${btoa(pName).replace(/=/g, '')}">Nenhum ponto investido. Toque em (+) para revelar.</div>
            `;
            list.appendChild(row);
        });
    });
}

function updatePerksMath() {
    const vFor = parseInt(document.getElementById('inp-for')?.value) || 0;
    const vAgi = parseInt(document.getElementById('inp-agi')?.value) || 0;
    const vVit = parseInt(document.getElementById('inp-vit')?.value) || parseInt(document.getElementById('inp-con')?.value) || parseInt(document.getElementById('inp-vig')?.value) || 0;
    const vChr = parseInt(document.getElementById('inp-chr')?.value) || parseInt(document.getElementById('inp-mis')?.value) || parseInt(document.getElementById('inp-sed')?.value) || 0;
    const vPer = parseInt(document.getElementById('inp-per')?.value) || parseInt(document.getElementById('inp-von')?.value) || 0;

    const attrs = {
        for: vFor,
        agi: vAgi,
        vit: vVit,
        chr: vChr,
        per: vPer,
        con: vVit,
        vig: vVit,
        von: vPer,
        sed: vChr,
        mis: vChr
    };

    let allValid = true;
    let allSpent = true;

    if (typeof PERKS_DB === 'object' && PERKS_DB) {
        Object.keys(PERKS_DB).forEach(attrKey => {
            if (!PERKS_DB[attrKey] || !PERKS_DB[attrKey].perks) return;
            const maxPV = Math.max(0, (attrs[attrKey] || 0) * 2);
            let usedPV = 0;
            
            // Reset Visuals
            Object.keys(PERKS_DB[attrKey].perks).forEach(pName => {
                const safeName = btoa(pName).replace(/=/g, '');
                const lvlEl = document.getElementById(`plvl-${attrKey}-${safeName}`);
                const descEl = document.getElementById(`pdesc-${attrKey}-${safeName}`);
                const cardEl = document.getElementById(`pcard-${attrKey}-${safeName}`);
                
                if (lvlEl) { lvlEl.innerText = `0`; }
                if (descEl) { 
                    descEl.innerText = 'Nenhum ponto investido. Toque em (+) para revelar as bênçãos.'; 
                    descEl.className = 'text-[11px] md:text-xs text-[#7a7164] italic bg-[#070605]/80 p-2 rounded border-l-2 border-[#bfa888]/30 transition-colors min-h-[36px]';
                }
                if (cardEl) {
                    cardEl.className = 'p-3 bg-[#0e0e10] rounded border border-[#bfa888]/20 shadow-sm flex flex-col gap-2 transition-all opacity-70';
                }
            });

            if (draftPerks[attrKey]) {
                Object.keys(draftPerks[attrKey]).forEach(pName => {
                    const lvl = draftPerks[attrKey][pName];
                    if (lvl > 0) {
                        usedPV += PERK_COSTS[lvl] || 0;
                        const safeName = btoa(pName).replace(/=/g, '');
                        const lvlEl = document.getElementById(`plvl-${attrKey}-${safeName}`);
                        const descEl = document.getElementById(`pdesc-${attrKey}-${safeName}`);
                        const cardEl = document.getElementById(`pcard-${attrKey}-${safeName}`);
                        
                        if (lvlEl && descEl && cardEl && PERKS_DB[attrKey] && PERKS_DB[attrKey].perks && PERKS_DB[attrKey].perks[pName]) {
                            lvlEl.innerText = `${lvl}`;
                        descEl.innerText = PERKS_DB[attrKey].perks[pName][lvl-1];
                        
                        cardEl.className = 'p-3 bg-[#181310] rounded border border-[#bfa888]/50 shadow-[0_2px_12px_rgba(0,0,0,0.8)] flex flex-col gap-2 transition-all';
                        descEl.className = 'text-[11px] md:text-xs text-[#ede3d2] bg-[#070605] p-2 rounded border-l-2 border-[#bfa888] transition-colors min-h-[36px] font-medium leading-relaxed italic';
                        
                        if(lvl === 7) {
                            cardEl.classList.add('border-purple-500/80', 'shadow-[0_0_15px_rgba(168,85,247,0.3)]');
                            descEl.classList.add('text-purple-300', 'font-bold');
                        }
                    }
                }
            });
        }
        
        const usedEl = document.getElementById(`pv-used-${attrKey}`);
        const maxEl = document.getElementById(`pv-max-${attrKey}`);
        if(usedEl && maxEl) {
            usedEl.innerText = usedPV;
            maxEl.innerText = maxPV;
            if(usedPV > maxPV) {
                usedEl.className = 'text-red-400 font-bold';
                allValid = false;
            } else {
                usedEl.className = 'text-[#bfa888] font-bold';
            }
            if(usedPV < maxPV) {
                allSpent = false;
            }
        }
    });
    }
    
    return { allValid, allSpent };
}

window.adjustPerk = function(attrKey, perkName, delta) {
    if(!draftPerks[attrKey]) draftPerks[attrKey] = {};
    let lvl = draftPerks[attrKey][perkName] || 0;
    lvl += delta;
    if(lvl < 0) lvl = 0;
    if(lvl > 7) lvl = 7;
    draftPerks[attrKey][perkName] = lvl;
    updatePerksMath();
}

window.switchCharTab = function(tab) {
    document.getElementById('char-tab-base').classList.add('hidden');
    document.getElementById('char-tab-perks').classList.add('hidden');
    document.getElementById('btn-tab-base').className = 'px-3 py-1.5 text-xs font-medium tracking-wider uppercase border-b-2 border-transparent text-stone-400 hover:text-[#ede3d2] transition';
    document.getElementById('btn-tab-perks').className = 'px-3 py-1.5 text-xs font-medium tracking-wider uppercase border-b-2 border-transparent text-stone-400 hover:text-[#ede3d2] transition';
    
    if (tab === 'base') {
        document.getElementById('char-tab-base').classList.remove('hidden');
        document.getElementById('btn-tab-base').className = 'px-3 py-1.5 text-xs font-bold tracking-wider uppercase border-b-2 border-[#bfa888] text-[#ede3d2] transition';
    } else {
        document.getElementById('char-tab-perks').classList.remove('hidden');
        document.getElementById('btn-tab-perks').className = 'px-3 py-1.5 text-xs font-bold tracking-wider uppercase border-b-2 border-[#bfa888] text-[#ede3d2] transition';
        updatePerksMath();
    }
}

// --- MONSTER LOGIC ---
window.openNewMonsterModal = function() {
    editingMonsterId = null;
    document.getElementById('form-monster').reset();
    if (document.getElementById('inp-monster-flying')) document.getElementById('inp-monster-flying').checked = false;
    document.querySelectorAll('#monster-modifiers-table tbody tr').forEach(row => {
        row.querySelector('.mod-vuln').value = '';
        row.querySelector('.mod-red').value = '';
        row.querySelector('.mod-def').value = '';
    });
    document.getElementById('modal-monster').showModal();
}

document.getElementById('form-monster').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isMaster()) return alert("Sem permissão. Apenas o Mestre pode criar monstros.");
    
    const nameVal = document.getElementById('inp-monster-name').value.trim();
    
    if (!editingMonsterId && monsters.some(m => m.name.toLowerCase() === nameVal.toLowerCase())) {
        alert("Já existe um monstro cadastrado com esse nome!");
        return;
    }
    
    const mods = {};
    document.querySelectorAll('#monster-modifiers-table tbody tr').forEach(row => {
        const dmgType = row.getAttribute('data-dmg');
        if (dmgType) {
            mods[dmgType] = {
                vuln: parseInt(row.querySelector('.mod-vuln').value) || 0,
                red: parseInt(row.querySelector('.mod-red').value) || 0,
                def: parseInt(row.querySelector('.mod-def').value) || 0
            };
        }
    });
    
    const isFlyingVal = document.getElementById('inp-monster-flying')?.checked || false;

    const newMonster = {
        id: editingMonsterId || generateId(),
        ownerId: currentUser ? currentUser.uid : null,
        name: nameVal,
        avatar: document.getElementById('inp-monster-avatar').value,
        type: document.getElementById('inp-monster-type')?.value || '',
        hp: parseInt(document.getElementById('inp-monster-hp').value) || 50,
        stamina: parseInt(document.getElementById('inp-monster-st').value) || 50,
        lust: parseInt(document.getElementById('inp-monster-lust').value) || 100,
        ini: parseInt(document.getElementById('inp-monster-ini').value) || 10,
        con: parseInt(document.getElementById('inp-monster-con').value) || 5,
        von: parseInt(document.getElementById('inp-monster-von').value) || 5,
        desc: document.getElementById('inp-monster-desc').value,
        modifiers: mods,
        isFlying: isFlyingVal,
        isMonster: true
    };
    
    if (editingMonsterId) {
        const m = monsters.find(x => x.id === editingMonsterId);
        if (m) Object.assign(m, newMonster);
    } else {
        monsters.push(newMonster);
    }
    
    saveToDB('monsters', editingMonsterId ? monsters.find(x => x.id === editingMonsterId) : newMonster, monsters, 'bd_monsters');
    document.getElementById('modal-monster').close();
    renderSidebar();
});

window.openEditMonster = function(id) {
    const m = monsters.find(x => x.id === id);
    if (!m) return;
    editingMonsterId = id;
    document.getElementById('inp-monster-name').value = m.name;
    document.getElementById('inp-monster-avatar').value = m.avatar || '';
    if(document.getElementById('inp-monster-type')) document.getElementById('inp-monster-type').value = m.type || '';
    if(document.getElementById('inp-monster-flying')) document.getElementById('inp-monster-flying').checked = !!m.isFlying;
    document.getElementById('inp-monster-hp').value = m.hp;
    document.getElementById('inp-monster-st').value = m.stamina;
    document.getElementById('inp-monster-lust').value = m.lust;
    document.getElementById('inp-monster-ini').value = m.ini || 10;
    document.getElementById('inp-monster-con').value = m.con || 5;
    document.getElementById('inp-monster-von').value = m.von || 5;
    document.getElementById('inp-monster-desc').value = m.desc || '';
    
    document.querySelectorAll('#monster-modifiers-table tbody tr').forEach(row => {
        const dmgType = row.getAttribute('data-dmg');
        const mdata = m.modifiers && m.modifiers[dmgType] ? m.modifiers[dmgType] : {vuln:0, red:0, def:0};
        row.querySelector('.mod-vuln').value = mdata.vuln || '';
        row.querySelector('.mod-red').value = mdata.red || '';
        row.querySelector('.mod-def').value = mdata.def || '';
    });
    
    document.getElementById('modal-monster').showModal();
};

// --- RPG TRACKER LOGIC ---
window.combatAddMode = 'select';
window.switchCombatAddMode = function(mode) {
    window.combatAddMode = mode;
    const btnSel = document.getElementById('tab-combat-add-select');
    const btnCust = document.getElementById('tab-combat-add-custom');
    const divSel = document.getElementById('combat-add-mode-select');
    const divCust = document.getElementById('combat-add-mode-custom');
    if (mode === 'select') {
        if(btnSel) btnSel.className = 'flex-1 py-2 font-bold text-xs tracking-wider uppercase bg-[#251e18] text-[#ede3d2] border-b-2 border-[#bfa888] transition';
        if(btnCust) btnCust.className = 'flex-1 py-2 font-bold text-xs tracking-wider uppercase bg-[#0e0e10] text-stone-400 border-b-2 border-transparent hover:text-stone-200 transition';
        if(divSel) divSel.classList.remove('hidden');
        if(divCust) divCust.classList.add('hidden');
    } else {
        if(btnCust) btnCust.className = 'flex-1 py-2 font-bold text-xs tracking-wider uppercase bg-[#251e18] text-[#ede3d2] border-b-2 border-[#bfa888] transition';
        if(btnSel) btnSel.className = 'flex-1 py-2 font-bold text-xs tracking-wider uppercase bg-[#0e0e10] text-stone-400 border-b-2 border-transparent hover:text-stone-200 transition';
        if(divCust) divCust.classList.remove('hidden');
        if(divSel) divSel.classList.add('hidden');
    }
};

const EXPEDITION_ARCHETYPES = [
    { id: 'tpl_gustave', name: 'Gustave (Vanguarda)', type: 'char', hp: 120, maxHp: 120, stamina: 110, maxSt: 110, lust: 0, maxLust: 115, energy: 30, maxEn: 30, attr: { for: 3, agi: 1, vit: 3, chr: 0, per: 1 } },
    { id: 'tpl_lune', name: 'Lune (Pintora Mística)', type: 'char', hp: 90, maxHp: 90, stamina: 100, maxSt: 100, lust: 0, maxLust: 85, energy: 60, maxEn: 60, attr: { for: 0, agi: 2, vit: 1, chr: 4, per: 2 } },
    { id: 'tpl_maelle', name: 'Maelle (Esgrimista)', type: 'char', hp: 100, maxHp: 100, stamina: 120, maxSt: 120, lust: 0, maxLust: 95, energy: 35, maxEn: 35, attr: { for: 1, agi: 4, vit: 1, chr: 1, per: 3 } },
    { id: 'tpl_renoir', name: 'Renoir (Atirador da Névoa)', type: 'char', hp: 95, maxHp: 95, stamina: 115, maxSt: 115, lust: 0, maxLust: 90, energy: 40, maxEn: 40, attr: { for: 1, agi: 2, vit: 1, chr: 2, per: 4 } },
    { id: 'tpl_verso', name: 'Verso (Guardião do Monólito)', type: 'char', hp: 140, maxHp: 140, stamina: 100, maxSt: 100, lust: 0, maxLust: 130, energy: 25, maxEn: 25, attr: { for: 4, agi: 0, vit: 4, chr: 0, per: 2 } }
];

const EXPEDITION_NEVII = [
    { id: 'tpl_nevii_soldado', name: 'Nevii de Tinta (Soldado)', type: 'monster', hp: 80, maxHp: 80, stamina: 80, maxSt: 80, lust: 0, maxLust: 70, energy: 40, maxEn: 40, ini: 11, isFlying: false },
    { id: 'tpl_nevii_alado', name: 'Nevii Alado (Ágil)', type: 'monster', hp: 65, maxHp: 65, stamina: 100, maxSt: 100, lust: 0, maxLust: 50, energy: 30, maxEn: 30, ini: 15, isFlying: true },
    { id: 'tpl_nevii_titanico', name: 'Nevii Titânico do Monólito (Bruto)', type: 'monster', hp: 220, maxHp: 220, stamina: 90, maxSt: 90, lust: 0, maxLust: 160, energy: 50, maxEn: 50, ini: 8, isFlying: false },
    { id: 'tpl_nevii_corruptor', name: 'Nevii Corruptor de Pigmento', type: 'monster', hp: 110, maxHp: 110, stamina: 95, maxSt: 95, lust: 0, maxLust: 85, energy: 70, maxEn: 70, ini: 13, isFlying: false }
];

document.getElementById('btn-combat-add').onclick = () => {
    switchCombatAddMode('select');
    const sel = document.getElementById('inp-combat-select');
    sel.innerHTML = '<option value="">-- Selecione um Combatente ou Modelo --</option>';
    
    // Check fallback if memory array is empty
    let charList = characters.length > 0 ? characters : [];
    if (charList.length === 0) {
        try {
            const raw = localStorage.getItem('bd_characters');
            if (raw) charList = JSON.parse(raw);
        } catch(e) {}
    }
    
    let monList = monsters.length > 0 ? monsters : [];
    if (monList.length === 0) {
        try {
            const raw = localStorage.getItem('bd_monsters');
            if (raw) monList = JSON.parse(raw);
        } catch(e) {}
    }

    if (charList.length > 0) {
        const optGroupChars = document.createElement('optgroup');
        optGroupChars.label = 'Expedicionários Salvos';
        charList.forEach(c => {
            const opt = document.createElement('option');
            opt.value = 'char|' + c.id;
            opt.innerText = c.name + (c.class ? ` (${c.class})` : '');
            optGroupChars.appendChild(opt);
        });
        sel.appendChild(optGroupChars);
    }
    
    if (monList.length > 0) {
        const optGroupMonsters = document.createElement('optgroup');
        optGroupMonsters.label = 'Nevii & Monstros Salvos';
        monList.forEach(m => {
            const opt = document.createElement('option');
            opt.value = 'monster|' + m.id;
            opt.innerText = m.name;
            optGroupMonsters.appendChild(opt);
        });
        sel.appendChild(optGroupMonsters);
    }

    // Modelos da Expedição 33
    const optGroupArch = document.createElement('optgroup');
    optGroupArch.label = 'Modelos da Expedição 33 (Pré-definidos)';
    EXPEDITION_ARCHETYPES.forEach(a => {
        const opt = document.createElement('option');
        opt.value = 'arch|' + a.id;
        opt.innerText = `[Expedição] ${a.name}`;
        optGroupArch.appendChild(opt);
    });
    sel.appendChild(optGroupArch);

    // Nevii Inimigos
    const optGroupNevii = document.createElement('optgroup');
    optGroupNevii.label = 'Nevii Inimigos (Pré-definidos)';
    EXPEDITION_NEVII.forEach(n => {
        const opt = document.createElement('option');
        opt.value = 'nevii|' + n.id;
        opt.innerText = `[Nevii] ${n.name}`;
        optGroupNevii.appendChild(opt);
    });
    sel.appendChild(optGroupNevii);
    
    // Auto-select first available option
    if (charList.length > 0) {
        sel.value = 'char|' + charList[0].id;
    } else {
        sel.value = 'arch|tpl_gustave';
    }
    
    document.getElementById('inp-combat-ini').value = '';
    document.getElementById('modal-combat-add').showModal();
};

document.getElementById('btn-combat-confirm').onclick = () => {
    try {
        let combatant = null;
        const iniVal = document.getElementById('inp-combat-ini').value;
        let roll = parseInt(iniVal);

        if (window.combatAddMode === 'custom') {
            const customName = document.getElementById('inp-combat-custom-name').value.trim() || 'Combatente Rápido';
            const customType = document.getElementById('inp-combat-custom-type').value;
            const isMon = customType === 'monster';
            const hp = parseInt(document.getElementById('inp-combat-custom-hp').value) || 100;
            const postura = parseInt(document.getElementById('inp-combat-custom-postura').value) || 80;
            const stamina = parseInt(document.getElementById('inp-combat-custom-stamina').value) || 100;
            
            if (isNaN(roll)) {
                roll = Math.floor(Math.random() * 20) + 1 + 10;
            }

            combatant = {
                cid: generateId(),
                refId: null,
                isMonster: isMon,
                name: customName,
                avatar: '',
                ini: roll,
                hp: hp,
                maxHp: hp,
                stamina: stamina,
                maxSt: stamina,
                lust: 0,
                maxLust: postura,
                energy: 30,
                maxEn: 50,
                attr: { for: 2, agi: 2, vit: 2, chr: 2, per: 2 }
            };
        } else {
            const val = document.getElementById('inp-combat-select').value;
            if(!val) return alert("Por favor, selecione um combatente ou modelo da lista!");
            
            const parts = val.split('|');
            const type = parts[0];
            const id = parts[1];
            
            if (type === 'arch') {
                const arch = EXPEDITION_ARCHETYPES.find(a => a.id === id);
                if (!arch) return;
                if (isNaN(roll)) roll = Math.floor(Math.random() * 20) + 1 + (arch.attr?.agi || 0);
                combatant = {
                    cid: generateId(),
                    refId: null,
                    isMonster: false,
                    name: arch.name,
                    avatar: '',
                    ini: roll,
                    hp: arch.hp,
                    maxHp: arch.maxHp,
                    stamina: arch.stamina,
                    maxSt: arch.maxSt,
                    lust: 0,
                    maxLust: arch.maxLust,
                    energy: arch.energy,
                    maxEn: arch.maxEn,
                    attr: arch.attr
                };
            } else if (type === 'nevii') {
                const nevii = EXPEDITION_NEVII.find(n => n.id === id);
                if (!nevii) return;
                if (isNaN(roll)) roll = (nevii.ini || 10) + Math.floor(Math.random() * 20) + 1;
                combatant = {
                    cid: generateId(),
                    refId: null,
                    isMonster: true,
                    isFlying: !!nevii.isFlying,
                    name: nevii.name,
                    avatar: '',
                    ini: roll,
                    hp: nevii.hp,
                    maxHp: nevii.maxHp,
                    stamina: nevii.stamina,
                    maxSt: nevii.maxSt,
                    lust: 0,
                    maxLust: nevii.maxLust,
                    energy: nevii.energy,
                    maxEn: nevii.maxEn,
                    attr: { for: 2, agi: 2, vit: 2, chr: 2, per: 2 }
                };
            } else {
                let source = null;
                if (type === 'char') {
                    source = characters.find(c => c.id === id);
                    if (!source) {
                        try {
                            const raw = localStorage.getItem('bd_characters');
                            if (raw) source = JSON.parse(raw).find(c => c.id === id);
                        } catch(e) {}
                    }
                }
                if (type === 'monster') {
                    source = monsters.find(m => m.id === id);
                    if (!source) {
                        try {
                            const raw = localStorage.getItem('bd_monsters');
                            if (raw) source = JSON.parse(raw).find(m => m.id === id);
                        } catch(e) {}
                    }
                }
                
                if(!source) return alert("Não foi possível carregar os dados do combatente.");
                
                const isMon = type === 'monster';
                if (isNaN(roll)) {
                    const baseIni = isMon ? (source.ini || 10) : (source.attr?.agi || 0);
                    roll = baseIni + Math.floor(Math.random() * 20) + 1;
                }
                
                const cStats = isMon ? null : getClassStats(source.class);
                const mods = isMon ? null : getCharModifiers(source);
                
                const attr = source.attr || { for: 0, agi: 0, vit: 0, chr: 0, per: 0 };
                const vit = attr.vit ?? attr.con ?? attr.vig ?? 0;
                const chrAttr = attr.chr ?? attr.mis ?? attr.sed ?? 0;
                let mhp = isMon ? (source.hp || 100) : Math.max(1, Math.floor((cStats.hp + (vit * 10)) * (mods ? mods.hp_mult : 1)));
                let mst = isMon ? (source.stamina || 100) : Math.max(1, Math.floor((cStats.st + (vit * 5)) * (mods ? mods.st_mult : 1)));
                let mlu = isMon ? (source.lust || 100) : ((cStats.lust || 100) + (vit * 5) + (mods && mods.lust_max ? mods.lust_max : 0));
                let men = isMon ? 50 : ((cStats.en || 30) + (chrAttr * 5));
                
                combatant = {
                    cid: generateId(),
                    refId: source.id,
                    isMonster: isMon,
                    isFlying: isMon ? (!!source.isFlying || window.isFlyingCreature(source)) : false,
                    name: source.name,
                    avatar: isMon ? (source.avatar || '') : (source.avatarUrl || ''),
                    ini: roll,
                    hp: source.hp !== undefined ? source.hp : mhp,
                    maxHp: mhp,
                    stamina: source.stamina !== undefined ? source.stamina : mst,
                    maxSt: mst,
                    lust: source.lust || 0,
                    maxLust: mlu,
                    energy: source.energy !== undefined ? source.energy : 30,
                    maxEn: men,
                    attr: attr
                };
            }
        }

        if (combatant) {
            combatState.combatants.push(combatant);
            sortCombatants();
            if (!combatState.selectedTargetCid) {
                combatState.selectedTargetCid = combatant.cid;
            }
            document.getElementById('modal-combat-add').close();
            renderRPG();
            appendCombatLog(`➕ <strong>${escapeHTML(combatant.name)}</strong> entrou na batalha (Iniciativa: ${combatant.ini}, HP: ${combatant.hp}/${combatant.maxHp}).`, 'info');
        }
    } catch (err) {
        alert("Erro ao adicionar combatente: " + err.message);
        console.error(err);
    }
};

window.nextTurn = function() {
    if(!combatState.combatants || combatState.combatants.length === 0) return;
    
    if (combatState.combatants.length === 1) {
        combatState.round++;
        renderRPG();
        appendCombatLog(`🔔 Novo turno de <strong>${escapeHTML(combatState.combatants[0].name)}</strong>! (Rodada ${combatState.round})`, 'info');
        return;
    }

    const first = combatState.combatants.shift();
    combatState.combatants.push(first);
    combatState.round++;
    renderRPG();
    if (combatState.combatants[0]) {
        appendCombatLog(`🔔 Início do turno de <strong>${escapeHTML(combatState.combatants[0].name)}</strong>! (Rodada ${Math.floor((combatState.round - 1) / Math.max(1, combatState.combatants.length)) + 1})`, 'info');
    }
};

window.advanceTurnForCombatant = function(cid) {
    if (!combatState.combatants || combatState.combatants.length === 0) return;
    
    const idx = combatState.combatants.findIndex(x => x.cid === cid);
    if (idx <= 0) {
        // Se o primeiro agiu, avança normalmente
        window.nextTurn();
    } else {
        // Se um combatente agiu fora do primeiro slot, rotaciona a fila
        // para que ele e os anteriores vão para o fim da rodada e o próximo assuma a vez
        const moved = combatState.combatants.splice(0, idx + 1);
        combatState.combatants.push(...moved);
        combatState.round++;
        renderRPG();
        if (combatState.combatants[0]) {
            appendCombatLog(`🔔 Início do turno de <strong>${escapeHTML(combatState.combatants[0].name)}</strong>! (Rodada ${Math.floor((combatState.round - 1) / Math.max(1, combatState.combatants.length)) + 1})`, 'info');
        }
    }
};

window.setTurnToCombatant = function(cid) {
    if (!combatState.combatants || combatState.combatants.length <= 1) return;
    const idx = combatState.combatants.findIndex(x => x.cid === cid);
    if (idx <= 0) return;
    const moved = combatState.combatants.splice(0, idx);
    combatState.combatants.push(...moved);
    renderRPG();
    if (combatState.combatants[0]) {
        appendCombatLog(`⚡ Turno concedido manualmente a <strong>${escapeHTML(combatState.combatants[0].name)}</strong>!`, 'info');
    }
};

const elBtnCombatNext = document.getElementById('btn-combat-next');
if (elBtnCombatNext) {
    elBtnCombatNext.onclick = window.nextTurn;
}

const elBtnCombatClear = document.getElementById('btn-combat-clear');
if (elBtnCombatClear) {
    elBtnCombatClear.onclick = () => {
        window.showConfirmDialog({
            title: 'Limpar Combate',
            heading: 'Encerrar Batalha',
            messageHtml: 'Deseja encerrar o combate e limpar a mesa da <strong>Expedição 33</strong>?',
            subtext: 'Todos os combatentes ativos serão removidos da mesa.',
            confirmText: 'Limpar Mesa',
            onConfirm: () => {
                combatState.combatants = [];
                combatState.round = 1;
                combatState.selectedTargetCid = null;
                clearCombatLog();
                renderRPG();
            }
        });
    };
}

function sortCombatants() {
    combatState.combatants.sort((a, b) => b.ini - a.ini);
}

window.adjustCombatStat = function(cid, stat, delta) {
    const c = combatState.combatants.find(x => x.cid === cid);
    if(!c) return;
    
    // Auto-heal NaN corruptions
    if(isNaN(c[stat]) || c[stat] === null) {
        if(stat === 'hp') c[stat] = c.maxHp || 100;
        else if(stat === 'stamina') c[stat] = c.maxSt || 100;
        else if(stat === 'lust') c[stat] = 0;
        else if(stat === 'energy') c[stat] = c.maxEn || 30;
        else c[stat] = 0;
    }

    c[stat] += delta;
    
    if(isNaN(c[stat])) {
        if(stat === 'hp') c[stat] = c.maxHp || 100;
        else if(stat === 'stamina') c[stat] = c.maxSt || 100;
        else if(stat === 'lust') c[stat] = 0;
        else if(stat === 'energy') c[stat] = c.maxEn || 30;
        else c[stat] = 0;
    }

    if(c[stat] < 0) c[stat] = 0;
    
    if(stat === 'hp' && c[stat] > c.maxHp) c[stat] = c.maxHp;
    if(stat === 'stamina' && c[stat] > c.maxSt) c[stat] = c.maxSt;
    if(stat === 'lust' && c[stat] > c.maxLust) c[stat] = c.maxLust;
    if(stat === 'energy' && c[stat] > c.maxEn) c[stat] = c.maxEn;
    
    let ref = null;
    let col = '';
    let arr = null;
    let storageKey = '';
    
    if (c.isMonster && c.refId) {
        ref = monsters.find(m => m.id === c.refId);
        col = 'monsters'; arr = monsters; storageKey = 'bd_monsters';
    } else if (c.refId) {
        ref = characters.find(ch => ch.id === c.refId);
        col = 'characters'; arr = characters; storageKey = 'bd_characters';
    }
    
    if (ref && canEdit(ref)) {
        ref[stat] = c[stat];
        saveToDB(col, ref, arr, storageKey);
    }
    
    renderRPG();
};

window.appendCombatLog = function(msg, type = 'info') {
    const logEl = document.getElementById('combat-action-log');
    if (!logEl) return;
    
    const emptyNotice = logEl.querySelector('.italic');
    if (emptyNotice) emptyNotice.remove();
    
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let badgeClass = 'text-gray-300 border-white/5 bg-white/5';
    if (type === 'attack') badgeClass = 'text-red-300 bg-red-950/30 border-red-500/30';
    else if (type === 'picto') badgeClass = 'text-cyan-300 bg-cyan-950/30 border-cyan-500/30';
    else if (type === 'parry') badgeClass = 'text-purple-300 bg-amber-950/30 border-amber-500/30';
    else if (type === 'dodge') badgeClass = 'text-emerald-300 bg-emerald-950/30 border-emerald-500/30';
    else if (type === 'stagger') badgeClass = 'text-yellow-200 bg-red-900/60 border-red-500 font-bold shadow-lg';
    else if (type === 'recover') badgeClass = 'text-blue-300 bg-blue-950/30 border-blue-500/30';

    const item = document.createElement('div');
    item.className = `p-2 rounded border transition text-xs ${badgeClass}`;
    item.innerHTML = `<span class="text-gray-500 font-mono text-[10px] mr-2">[${time}]</span> ${msg}`;
    logEl.insertBefore(item, logEl.firstChild);
};

window.clearCombatLog = function() {
    const logEl = document.getElementById('combat-action-log');
    if (logEl) {
        logEl.innerHTML = '<div class="text-gray-500 italic py-2">Registro de combate limpo.</div>';
    }
};

window.selectCombatTarget = function(cid) {
    if (combatState.selectedTargetCid === cid) {
        combatState.selectedTargetCid = null;
    } else {
        combatState.selectedTargetCid = cid;
    }
    renderRPG();
    if (combatState.selectedTargetCid) {
        const t = combatState.combatants.find(x => x.cid === cid);
        if (t) appendCombatLog(`🎯 <strong>${escapeHTML(t.name)}</strong> selecionado como alvo principal!`, 'info');
    }
};

window.isFlyingCreature = function(c) {
    if (!c) return false;
    if (c.isFlying === true) return true;
    
    // Check monster source ref if exists
    if (c.isMonster && c.refId) {
        const m = monsters.find(x => x.id === c.refId);
        if (m) {
            if (m.isFlying === true) return true;
            const text = `${m.name || ''} ${m.type || ''} ${m.desc || ''}`.toLowerCase();
            if (text.includes('voador') || text.includes('voadora') || text.includes('alado') || text.includes('alada') || text.includes('voo') || text.includes('asas') || text.includes('flying')) {
                return true;
            }
        }
    }
    
    // Check combatant fields
    const cText = `${c.name || ''} ${c.type || ''}`.toLowerCase();
    if (cText.includes('voador') || cText.includes('voadora') || cText.includes('alado') || cText.includes('alada') || cText.includes('voo') || cText.includes('asas') || cText.includes('flying')) {
        return true;
    }

    return false;
};

window.currentIncomingAttack = null;

window.triggerIncomingAttack = function(attacker, target, hitTotal, hpDmg, postureDmg, actionName = 'Golpe', dmgType = 'HP') {
    const finalHpDmg = Math.max(1, hpDmg || 5);
    const finalPostureDmg = Math.max(1, postureDmg || 2);

    // REGRA ESPECÍFICA: Criaturas não podem aparar nem desviar, exceto voadoras que tentam desviar com vantagem automaticamente.
    if (target && target.isMonster) {
        const isFlying = window.isFlyingCreature(target);
        if (isFlying) {
            // Criatura Voadora: tenta desviar com vantagem automaticamente! (2d20, pega o maior)
            const d1 = Math.floor(Math.random() * 20) + 1;
            const d2 = Math.floor(Math.random() * 20) + 1;
            const bestRoll = Math.max(d1, d2);
            
            let defMon = target.refId ? monsters.find(m => m.id === target.refId) : null;
            let defAgi = defMon?.agi ?? target.attr?.agi ?? 2;
            let dodgeBonus = (defAgi * 2) + 2;
            let totalDodge = bestRoll + dodgeBonus;
            let dc = hitTotal;

            if (target.stamina >= 1) {
                adjustCombatStat(target.cid, 'stamina', -1);
            }

            if (totalDodge >= dc) {
                // Sucesso da esquiva aérea
                appendCombatLog(`🦅💨 <strong>ESQUIVA AÉREA AUTOMÁTICA (COM VANTAGEM)!</strong> <strong>${escapeHTML(target.name)}</strong> (Criatura Voadora) realizou manobras evasivas no ar e desviou do ataque de <strong>${escapeHTML(attacker.name)}</strong>!<br>• Rolagem com Vantagem: <strong class="text-emerald-400 font-mono">${totalDodge}</strong> [d20s: ${d1}, ${d2} → Maior: ${bestRoll} + 2xAGI+2: +${dodgeBonus}] vs Acerto: <strong>${dc}</strong>.<br>• Nenhum dano sofrido! (-1 PA)`, 'dodge');
                return;
            } else {
                // Falha da esquiva aérea
                adjustCombatStat(target.cid, 'hp', -finalHpDmg);
                adjustCombatStat(target.cid, 'lust', finalPostureDmg);
                appendCombatLog(`❌ <strong>FALHA NA ESQUIVA AÉREA!</strong> <strong>${escapeHTML(target.name)}</strong> (Criatura Voadora) tentou esquivar em voo com vantagem mas foi atingida pelo ataque de <strong>${escapeHTML(attacker.name)}</strong>!<br>• Esquiva com Vantagem: <strong class="text-red-400 font-mono">${totalDodge}</strong> [d20s: ${d1}, ${d2} → Maior: ${bestRoll} + ${dodgeBonus}] vs Acerto: <strong>${dc}</strong>.<br>• Dano Sofrido: <strong class="text-red-400">${finalHpDmg} HP</strong> e <strong class="text-purple-300">+${finalPostureDmg} Postura</strong>. (-1 PA)`, 'attack');
                if (target.lust >= target.maxLust) {
                    appendCombatLog(`💥 <strong>GUARDA QUEBRADA!</strong> <strong>${escapeHTML(target.name)}</strong> atingiu 100% de Postura e entrou em <strong>STAGGER</strong>!`, 'stagger');
                }
                return;
            }
        } else {
            // Criatura terrestre (não-voadora): não pode aparar nem desviar!
            adjustCombatStat(target.cid, 'hp', -finalHpDmg);
            adjustCombatStat(target.cid, 'lust', finalPostureDmg);
            appendCombatLog(`🐾 <strong>${escapeHTML(target.name)}</strong> sofreu o impacto total de <strong>${escapeHTML(attacker.name)}</strong>!<br>• Dano Sofrido: <strong class="text-red-400">${finalHpDmg} HP</strong> e <strong class="text-purple-300">+${finalPostureDmg} Postura</strong>.<br><span class="text-gray-400 text-[10px]"><em>(Criaturas terrestres não podem aparar nem desviar).</em></span>`, 'attack');
            if (target.lust >= target.maxLust) {
                appendCombatLog(`💥 <strong>GUARDA QUEBRADA!</strong> <strong>${escapeHTML(target.name)}</strong> atingiu 100% de Postura e entrou em <strong>STAGGER</strong>!`, 'stagger');
            }
            return;
        }
    }

    // Alvo é um Jogador / Aliado: abre o Modal de Reação Interativa (Expedition 33)
    window.currentIncomingAttack = {
        attackerCid: attacker.cid,
        attackerName: attacker.name,
        attackerAvatar: attacker.avatar || '',
        isMonster: !!attacker.isMonster,
        targetCid: target.cid,
        targetName: target.name,
        actionName: actionName,
        hitTotal: hitTotal,
        hpDmg: finalHpDmg,
        postureDmg: finalPostureDmg,
        dmgType: dmgType
    };

    const modal = document.getElementById('modal-incoming-attack');
    if (!modal) return;

    // Populate attacker card
    const avEl = document.getElementById('inc-atk-avatar');
    if (avEl) {
        if (attacker.avatar) {
            avEl.innerHTML = `<img src="${attacker.avatar}" class="w-full h-full object-cover">`;
        } else {
            avEl.innerHTML = `<i class="fa-solid ${attacker.isMonster ? 'fa-ghost' : 'fa-user-ninja'}"></i>`;
        }
    }
    const nameEl = document.getElementById('inc-atk-name');
    if (nameEl) nameEl.textContent = attacker.name;

    const actEl = document.getElementById('inc-atk-action');
    if (actEl) actEl.textContent = actionName;

    const rollEl = document.getElementById('inc-atk-roll');
    if (rollEl) rollEl.textContent = hitTotal;

    const dmgEl = document.getElementById('inc-atk-dmg');
    if (dmgEl) dmgEl.textContent = `${window.currentIncomingAttack.hpDmg} HP`;

    const postEl = document.getElementById('inc-atk-posture');
    if (postEl) postEl.textContent = `+${window.currentIncomingAttack.postureDmg} Postura`;

    // Populate defender card
    const defNameEl = document.getElementById('inc-def-name');
    if (defNameEl) defNameEl.textContent = target.name;

    const defStEl = document.getElementById('inc-def-stamina');
    if (defStEl) defStEl.textContent = `${target.stamina || 0} PA`;

    // Reset reaction result & rhythm arena
    const resEl = document.getElementById('inc-reaction-result');
    if (resEl) {
        resEl.classList.add('hidden');
        resEl.innerHTML = '';
    }
    const actionsEl = document.getElementById('inc-defense-actions');
    const rhythmEl = document.getElementById('inc-e33-rhythm-container');
    if (actionsEl) actionsEl.classList.remove('hidden');
    if (rhythmEl) rhythmEl.classList.add('hidden');

    // Enable reaction buttons inside modal
    modal.querySelectorAll('button').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'pointer-events-none');
    });

    modal.showModal();
};

window.closeIncomingAttackModal = function() {
    if (window.e33RhythmState && window.e33RhythmState.animationFrameId) {
        cancelAnimationFrame(window.e33RhythmState.animationFrameId);
    }
    window.e33RhythmState = null;

    const modal = document.getElementById('modal-incoming-attack');
    if (modal && modal.open) {
        modal.close();
    }
    const attackerCid = window.currentIncomingAttack ? window.currentIncomingAttack.attackerCid : null;
    window.currentIncomingAttack = null;
    if (attackerCid) {
        window.advanceTurnForCombatant(attackerCid);
    }
};

// Database of distinct rhythms and event patterns for each ability in Clair Obscur: Expedition 33
const EXPEDITION_SKILL_RHYTHMS = {
    'ataque físico': {
        name: 'Ataque Físico',
        type: 'Corte Ágil',
        tempo: 'Moderato (950ms)',
        beats: [950],
        totalDuration: 1300,
        desc: 'Golpe clássico de lâmina fluida.'
    },
    'mira livre (atirar)': {
        name: 'Mira Livre (Atirar)',
        type: 'Projétil em Voo',
        tempo: 'Trajetória Rápida (850ms)',
        beats: [850],
        totalDuration: 1200,
        desc: 'Projétil em aproximação balística veloz.'
    },
    'golpe rompe-postura': {
        name: 'Golpe Rompe-Postura',
        type: 'Impacto Pesado',
        tempo: 'Largo / Impacto Tardio (1450ms)',
        beats: [1450],
        totalDuration: 1850,
        desc: 'Golpe com peso maciço telegrafado, exigindo paciência no timing.'
    },
    'impacto esmaecido': {
        name: 'Impacto Esmaecido',
        type: 'Pulso de Chroma',
        tempo: 'Condensação de Tinta (1100ms)',
        beats: [1100],
        totalDuration: 1500,
        desc: 'Massa de tinta mística que condensa e detona subitamente.'
    },
    'tormenta de golpes': {
        name: 'Tormenta de Golpes',
        type: 'Sequência Tripla (3 Golpes)',
        tempo: 'Allegro Rítmico (650ms, 1200ms, 1750ms)',
        beats: [650, 1200, 1750],
        totalDuration: 2200,
        desc: 'Sequência contínua de 3 estocadas: reaja a cada batida!'
    },
    'investida com garras': {
        name: 'Investida com Garras',
        type: 'Salto Predatório',
        tempo: 'Arrancada Feral (800ms)',
        beats: [800],
        totalDuration: 1150,
        desc: 'Investida feroz de garras no solo.'
    },
    'mergulho alado': {
        name: 'Mergulho Alado',
        type: 'Rasante Aéreo',
        tempo: 'Queda Rápida (750ms)',
        beats: [750],
        totalDuration: 1100,
        desc: 'Manobra aérea descendente em mergulho rápido.'
    },
    'esmagamento monolítico': {
        name: 'Esmagamento Monolítico',
        type: 'Onda de Choque',
        tempo: 'Pisotão Pesado (1600ms)',
        beats: [1600],
        totalDuration: 2000,
        desc: 'Tremor com impacto pesado tardio.'
    }
};

window.getSkillRhythmProfile = function(actionName) {
    if (!actionName) return EXPEDITION_SKILL_RHYTHMS['ataque físico'];
    const key = actionName.toLowerCase().trim();
    if (EXPEDITION_SKILL_RHYTHMS[key]) return EXPEDITION_SKILL_RHYTHMS[key];

    for (const k in EXPEDITION_SKILL_RHYTHMS) {
        if (key.includes(k) || k.includes(key)) return EXPEDITION_SKILL_RHYTHMS[k];
    }

    if (key.includes('pesad') || key.includes('brut') || key.includes('tit') || key.includes('smash') || key.includes('esmag') || key.includes('ruptura')) {
        return {
            name: actionName,
            type: 'Impacto Pesado',
            tempo: 'Cadência Lenta (1450ms)',
            beats: [1450],
            totalDuration: 1850,
            desc: 'Ataque pesado com telegrafia demorada e impacto tardio.'
        };
    }
    if (key.includes('frenes') || key.includes('torment') || key.includes('sequ') || key.includes('combo') || key.includes('fur')) {
        return {
            name: actionName,
            type: 'Sequência Múltipla',
            tempo: 'Cadência Tripla (700ms, 1250ms, 1800ms)',
            beats: [700, 1250, 1800],
            totalDuration: 2200,
            desc: 'Sequência rápida de golpes em cadeia.'
        };
    }
    if (key.includes('tiro') || key.includes('dispar') || key.includes('flech') || key.includes('mira') || key.includes('proj')) {
        return {
            name: actionName,
            type: 'Projétil em Voo',
            tempo: 'Disparo Rápido (850ms)',
            beats: [850],
            totalDuration: 1200,
            desc: 'Projétil cruzando a distância de combate.'
        };
    }

    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xffffff;
    const duration = 850 + (hash % 500);
    return {
        name: actionName,
        type: 'Golpe Declarado',
        tempo: `Ritmo Distinto (${duration}ms)`,
        beats: [duration],
        totalDuration: duration + 350,
        desc: 'Golpe característico da criatura.'
    };
};

window.e33RhythmState = null;

window.startE33RhythmEvent = function(defenseType) {
    if (!window.currentIncomingAttack) return;
    const target = combatState.combatants.find(c => c.cid === window.currentIncomingAttack.targetCid);
    if (!target) return;

    if (target.isMonster) {
        if (defenseType === 'parry') {
            alert("Criaturas não podem aparar!");
            return;
        }
        if (defenseType === 'dodge' && !window.isFlyingCreature(target)) {
            alert("Criaturas terrestres não podem desviar!");
            return;
        }
    }

    const actionsEl = document.getElementById('inc-defense-actions');
    const rhythmEl = document.getElementById('inc-e33-rhythm-container');
    const resEl = document.getElementById('inc-reaction-result');
    if (resEl) resEl.classList.add('hidden');
    if (actionsEl) actionsEl.classList.add('hidden');
    if (rhythmEl) rhythmEl.classList.remove('hidden');

    const profile = window.getSkillRhythmProfile(window.currentIncomingAttack.actionName);

    let defChar = !target.isMonster && target.refId ? characters.find(ch => ch.id === target.refId) : null;
    let defMon = target.isMonster && target.refId ? monsters.find(m => m.id === target.refId) : null;
    let defAgi = defChar?.attr?.agi ?? defMon?.agi ?? target.attr?.agi ?? 0;
    let defPer = defChar?.attr?.per ?? defChar?.attr?.sed ?? defChar?.attr?.von ?? defMon?.sed ?? defMon?.per ?? target.attr?.per ?? 0;

    const keyEl = document.getElementById('rhythm-mode-key');
    const titleEl = document.getElementById('rhythm-event-title');
    const tempoEl = document.getElementById('rhythm-event-tempo');
    const badgeEl = document.getElementById('rhythm-mode-badge');
    const triggerBtn = document.getElementById('btn-e33-rhythm-trigger');

    if (keyEl) keyEl.textContent = defenseType === 'dodge' ? 'Q' : 'E';
    if (titleEl) titleEl.textContent = `${defenseType === 'dodge' ? 'Desvio' : 'Aparo'}: ${profile.name}`;
    if (tempoEl) tempoEl.textContent = `Cadência: ${profile.tempo} • ${profile.type}`;
    if (badgeEl) {
        if (defenseType === 'dodge') {
            badgeEl.textContent = 'Redução 0% a 100%';
            badgeEl.className = 'text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-bold bg-black border border-stone-700 text-stone-300';
        } else {
            badgeEl.textContent = 'Aparo Requer 100%';
            badgeEl.className = 'text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-bold bg-black border border-[#bfa888]/50 text-[#bfa888]';
        }
    }

    if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.className = "w-full py-3 bg-[#111111] hover:bg-[#181818] active:scale-[0.98] border border-stone-700 hover:border-stone-500 text-[#ede3d2] font-cinzel font-bold text-xs uppercase tracking-[0.2em] rounded-lg shadow-md flex items-center justify-center gap-2 cursor-pointer transition select-none";
        triggerBtn.innerHTML = `<span class="e33-key text-[10px]">Espaço</span> REAGIR NA CONVERGÊNCIA (${defenseType === 'dodge' ? 'DESVIAR' : 'APARAR'})`;
    }

    const beatsContainer = document.getElementById('rhythm-beats-container');
    if (beatsContainer) {
        beatsContainer.innerHTML = '';
        profile.beats.forEach((b, idx) => {
            const chip = document.createElement('div');
            chip.id = `beat-chip-${idx}`;
            chip.className = `e33-beat-chip ${idx === 0 ? 'active' : ''}`;
            chip.innerHTML = `<span>Batida ${idx + 1}</span> <span class="chip-val font-bold">◇</span>`;
            beatsContainer.appendChild(chip);
        });
    }

    const canvas = document.getElementById('e33-rhythm-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const perfectWindow = defenseType === 'parry' ? Math.min(80, 55 + (defPer * 5)) : Math.min(90, 60 + (defAgi * 5));

    window.e33RhythmState = {
        active: true,
        defenseType: defenseType,
        profile: profile,
        perfectWindow: perfectWindow,
        startTime: performance.now(),
        currentBeatIdx: 0,
        beatResults: [],
        flashBeatTime: 0,
        flashAccuracy: 0,
        animationFrameId: null
    };

    const targetRadius = 36;
    const maxRadius = 110;

    function renderFrame(now) {
        if (!window.e33RhythmState || !window.e33RhythmState.active) return;
        const state = window.e33RhythmState;
        const elapsed = now - state.startTime;

        if (state.currentBeatIdx < state.profile.beats.length) {
            const currentBeatTarget = state.profile.beats[state.currentBeatIdx];
            if (elapsed > currentBeatTarget + 260) {
                state.beatResults.push({ beat: state.currentBeatIdx + 1, accuracy: 0, delta: 999 });
                const chip = document.getElementById(`beat-chip-${state.currentBeatIdx}`);
                if (chip) {
                    chip.className = 'e33-beat-chip miss';
                    const val = chip.querySelector('.chip-val');
                    if (val) val.textContent = '✕ 0%';
                }
                state.currentBeatIdx++;
                if (state.currentBeatIdx < state.profile.beats.length) {
                    const nextChip = document.getElementById(`beat-chip-${state.currentBeatIdx}`);
                    if (nextChip) nextChip.classList.add('active');
                }
            }
        }

        if (state.currentBeatIdx >= state.profile.beats.length) {
            window.finishE33RhythmEvent();
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;

        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(237, 227, 210, 0.08)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(cx - 130, cy);
        ctx.lineTo(cx + 130, cy);
        ctx.moveTo(cx, cy - 85);
        ctx.lineTo(cx, cy + 85);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 75, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#bfa888';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, targetRadius, 0, Math.PI * 2);
        ctx.stroke();

        const notchLen = 6;
        ctx.beginPath();
        ctx.moveTo(cx, cy - targetRadius - notchLen); ctx.lineTo(cx, cy - targetRadius + 2);
        ctx.moveTo(cx, cy + targetRadius + notchLen); ctx.lineTo(cx, cy + targetRadius - 2);
        ctx.moveTo(cx - targetRadius - notchLen, cy); ctx.lineTo(cx - targetRadius + 2, cy);
        ctx.moveTo(cx + targetRadius + notchLen, cy); ctx.lineTo(cx + targetRadius - 2, cy);
        ctx.stroke();

        ctx.fillStyle = '#ede3d2';
        ctx.font = 'bold 16px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(state.defenseType === 'dodge' ? 'Q' : 'E', cx, cy - 2);

        ctx.fillStyle = '#bfa888';
        ctx.font = '8px sans-serif';
        ctx.fillText('◆', cx, cy + 14);

        const beatTargetTime = state.profile.beats[state.currentBeatIdx];
        const leadInTime = 800;
        const ringStartTime = Math.max(0, beatTargetTime - leadInTime);

        if (elapsed >= ringStartTime) {
            const timeDiff = elapsed - ringStartTime;
            const progress = Math.min(1.0, timeDiff / leadInTime);
            
            let curRadius;
            if (elapsed <= beatTargetTime) {
                curRadius = maxRadius - ((maxRadius - targetRadius) * progress);
            } else {
                const postProgress = Math.min(1.0, (elapsed - beatTargetTime) / 250);
                curRadius = targetRadius - (targetRadius * postProgress);
            }

            if (curRadius > 0) {
                const distToTarget = Math.abs(curRadius - targetRadius);
                const isConvergingNow = distToTarget <= 4;

                ctx.strokeStyle = isConvergingNow ? '#ffffff' : (distToTarget <= 12 ? '#bfa888' : '#ede3d2');
                ctx.lineWidth = isConvergingNow ? 2.5 : 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, curRadius, 0, Math.PI * 2);
                ctx.stroke();

                const pipAngle = (elapsed / 400) % (Math.PI * 2);
                const px1 = cx + Math.cos(pipAngle) * curRadius;
                const py1 = cy + Math.sin(pipAngle) * curRadius;
                const px2 = cx + Math.cos(pipAngle + Math.PI) * curRadius;
                const py2 = cy + Math.sin(pipAngle + Math.PI) * curRadius;

                ctx.fillStyle = ctx.strokeStyle;
                ctx.beginPath();
                ctx.arc(px1, py1, 2, 0, Math.PI * 2);
                ctx.arc(px2, py2, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let b = state.currentBeatIdx + 1; b < state.profile.beats.length; b++) {
            const futureBeat = state.profile.beats[b];
            const futureStart = futureBeat - leadInTime;
            if (elapsed >= futureStart) {
                const fProgress = Math.min(1.0, (elapsed - futureStart) / leadInTime);
                const fRadius = maxRadius - ((maxRadius - targetRadius) * fProgress);
                ctx.strokeStyle = 'rgba(197, 160, 89, 0.25)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(targetRadius + 10, fRadius), 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        if (state.flashBeatTime && (now - state.flashBeatTime < 140)) {
            const flashAge = (now - state.flashBeatTime) / 140;
            const flashR = targetRadius + (flashAge * 14);
            ctx.strokeStyle = state.flashAccuracy === 100 ? '#ffffff' : (state.flashAccuracy > 0 ? '#bfa888' : '#7f1d1d');
            ctx.lineWidth = 2 * (1 - flashAge);
            ctx.beginPath();
            ctx.arc(cx, cy, flashR, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = '#8c734b';
        ctx.font = '10px "Inter", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`BATIDA ${state.currentBeatIdx + 1}/${state.profile.beats.length}`, 14, 20);

        ctx.textAlign = 'right';
        ctx.fillText(state.profile.tempo, width - 14, 20);

        state.animationFrameId = requestAnimationFrame(renderFrame);
    }

    state.animationFrameId = requestAnimationFrame(renderFrame);
};

window.recordE33RhythmBeat = function() {
    if (!window.e33RhythmState || !window.e33RhythmState.active) return;
    const state = window.e33RhythmState;
    if (state.currentBeatIdx >= state.profile.beats.length) return;

    const now = performance.now();
    const elapsed = now - state.startTime;
    const targetBeatTime = state.profile.beats[state.currentBeatIdx];
    const delta = Math.abs(elapsed - targetBeatTime);

    let accuracy = 0;
    if (delta <= state.perfectWindow) {
        accuracy = 100;
    } else if (delta <= 160) {
        const ratio = (delta - state.perfectWindow) / (160 - state.perfectWindow);
        accuracy = Math.round(92 - (ratio * 30));
    } else if (delta <= 280) {
        const ratio = (delta - 160) / (280 - 160);
        accuracy = Math.round(55 - (ratio * 40));
    } else {
        accuracy = 0;
    }

    state.beatResults.push({
        beat: state.currentBeatIdx + 1,
        accuracy: accuracy,
        delta: Math.round(delta)
    });

    state.flashBeatTime = now;
    state.flashAccuracy = accuracy;

    const chip = document.getElementById(`beat-chip-${state.currentBeatIdx}`);
    if (chip) {
        chip.classList.remove('active');
        if (accuracy === 100) {
            chip.className = 'e33-beat-chip perfect';
            const val = chip.querySelector('.chip-val');
            if (val) val.textContent = '◆ 100%';
        } else if (accuracy > 0) {
            chip.className = 'e33-beat-chip';
            chip.style.borderColor = '#bfa888';
            const val = chip.querySelector('.chip-val');
            if (val) val.textContent = `◆ ${accuracy}%`;
        } else {
            chip.className = 'e33-beat-chip miss';
            const val = chip.querySelector('.chip-val');
            if (val) val.textContent = '✕ 0%';
        }
    }

    state.currentBeatIdx++;

    if (state.currentBeatIdx < state.profile.beats.length) {
        const nextChip = document.getElementById(`beat-chip-${state.currentBeatIdx}`);
        if (nextChip) nextChip.classList.add('active');
    } else {
        window.finishE33RhythmEvent();
    }
};

window.finishE33RhythmEvent = function() {
    if (!window.e33RhythmState || !window.e33RhythmState.active) return;
    const state = window.e33RhythmState;
    state.active = false;
    if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
    }

    const { defenseType, beatResults } = state;
    if (beatResults.length === 0) {
        beatResults.push({ beat: 1, accuracy: 0, delta: 999 });
    }

    const totalAccuracy = beatResults.reduce((sum, b) => sum + b.accuracy, 0);
    const avgAccuracy = Math.round(totalAccuracy / beatResults.length);
    const all100 = beatResults.every(b => b.accuracy === 100);

    const triggerBtn = document.getElementById('btn-e33-rhythm-trigger');
    if (triggerBtn) {
        triggerBtn.disabled = true;
        if (defenseType === 'parry') {
            if (all100) {
                triggerBtn.innerHTML = `⭐ 100% PERFEIÇÃO! PARRY ATIVADO! ⭐`;
                triggerBtn.className = "w-full py-3 bg-[#14100a] border border-[#bfa888] text-[#ede3d2] font-cinzel font-bold text-xs uppercase tracking-widest rounded-lg shadow-md";
            } else {
                triggerBtn.innerHTML = `❌ ${avgAccuracy}% - PARRY FALHOU (EXIGE 100%)`;
                triggerBtn.className = "w-full py-3 bg-[#140808] border border-red-900 text-red-200 font-cinzel font-bold text-xs uppercase tracking-widest rounded-lg shadow-md";
            }
        } else {
            if (all100) {
                triggerBtn.innerHTML = `⭐ 100% REDUÇÃO! DESVIO PERFEITO! ⭐`;
                triggerBtn.className = "w-full py-3 bg-[#0a1410] border border-emerald-600 text-[#ede3d2] font-cinzel font-bold text-xs uppercase tracking-widest rounded-lg shadow-md";
            } else if (avgAccuracy > 0) {
                triggerBtn.innerHTML = `💨 ${avgAccuracy}% DE DANO REDUZIDO!`;
                triggerBtn.className = "w-full py-3 bg-[#0a0f14] border border-stone-600 text-stone-200 font-cinzel font-bold text-xs uppercase tracking-widest rounded-lg shadow-md";
            } else {
                triggerBtn.innerHTML = `❌ 0% REDUÇÃO - IMPACTO TOTAL!`;
                triggerBtn.className = "w-full py-3 bg-[#140808] border border-red-900 text-red-200 font-cinzel font-bold text-xs uppercase tracking-widest rounded-lg shadow-md";
            }
        }
    }

    const finalAccuracy = defenseType === 'parry' ? (all100 ? 100 : avgAccuracy) : avgAccuracy;

    setTimeout(() => {
        window.resolveIncomingDefense(defenseType, finalAccuracy);
    }, 500);
};

// Aliases for compatibility
window.startQTE = window.startE33RhythmEvent;
window.stopQTE = window.recordE33RhythmBeat;

window.resolveIncomingDefense = function(choice, qteAccuracy) {
    if (!window.currentIncomingAttack) return;
    const attack = window.currentIncomingAttack;
    const attacker = combatState.combatants.find(c => c.cid === attack.attackerCid);
    const target = combatState.combatants.find(c => c.cid === attack.targetCid);

    if (!target) {
        window.closeIncomingAttackModal();
        return;
    }

    const modal = document.getElementById('modal-incoming-attack');
    const resEl = document.getElementById('inc-reaction-result');

    if (target.isMonster) {
        if (choice === 'parry') {
            alert("Criaturas não podem aparar!");
            if (modal) modal.querySelectorAll('button').forEach(btn => btn.disabled = false);
            return;
        }
        if (choice === 'dodge' && !window.isFlyingCreature(target)) {
            alert("Criaturas terrestres não podem desviar!");
            if (modal) modal.querySelectorAll('button').forEach(btn => btn.disabled = false);
            return;
        }
    }

    if (modal) {
        modal.querySelectorAll('button').forEach(btn => {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'pointer-events-none');
        });
    }

    let defChar = !target.isMonster && target.refId ? characters.find(ch => ch.id === target.refId) : null;
    let defMon = target.isMonster && target.refId ? monsters.find(m => m.id === target.refId) : null;

    let defAgi = defChar?.attr?.agi ?? defMon?.agi ?? target.attr?.agi ?? 0;
    let defPer = defChar?.attr?.per ?? defChar?.attr?.sed ?? defChar?.attr?.von ?? defMon?.sed ?? defMon?.per ?? target.attr?.per ?? 0;
    let defFor = defChar?.attr?.for ?? defMon?.for ?? target.attr?.for ?? 0;
    let defCon = defChar?.attr?.con ?? defChar?.attr?.vit ?? defMon?.con ?? target.attr?.con ?? 0;

    let resultHtml = '';
    let autoCloseDelay = 1800;

    if (choice === 'dodge') {
        let hasPA = target.stamina >= 1;
        if (hasPA) {
            adjustCombatStat(target.cid, 'stamina', -1);
        }

        const accuracy = typeof qteAccuracy === 'number' ? qteAccuracy : 0;
        const pct = accuracy / 100;
        const hpReduced = Math.round(attack.hpDmg * pct);
        const postureReduced = Math.round(attack.postureDmg * pct);
        const finalHpDmg = Math.max(0, attack.hpDmg - hpReduced);
        const finalPostureDmg = Math.max(0, attack.postureDmg - postureReduced);

        if (finalHpDmg > 0) adjustCombatStat(target.cid, 'hp', -finalHpDmg);
        if (finalPostureDmg > 0) adjustCombatStat(target.cid, 'lust', finalPostureDmg);

        if (accuracy === 100) {
            appendCombatLog(`💨 <strong>DESVIO PERFEITO (100% REDUÇÃO)!</strong> <strong>${escapeHTML(target.name)}</strong> rolou sobre as cinzas no compasso exato de <strong>${escapeHTML(attack.actionName || 'Golpe')}</strong> de <strong>${escapeHTML(attack.attackerName)}</strong>!<br>• Ritmo: <strong class="text-stone-200 font-mono">100% PERFEIÇÃO</strong> &bull; Dano evitado: <strong>100% (${attack.hpDmg} HP / +${attack.postureDmg} Postura)</strong>.<br>• Nenhum dano sofrido! ${hasPA ? '(-1 PA)' : '<em>(Esquiva reativa sem PA)</em>'}`, 'dodge');
            resultHtml = `
                <div class="p-3 bg-[#0c140e] border border-stone-600 rounded-lg text-center shadow">
                    <div class="text-stone-200 font-cinzel font-bold text-sm flex items-center justify-center gap-1.5 mb-1">
                        <span class="text-[#bfa888]">◆</span> DESVIO PERFEITO (100% REDUÇÃO) <span class="text-[#bfa888]">◆</span>
                    </div>
                    <div class="text-xs text-stone-400">Ritmo de Esquiva: <strong class="text-stone-200 font-mono">100% no Compasso</strong></div>
                    <div class="text-[11px] text-stone-300 font-semibold mt-1">Dano 100% evitado! (0 HP sofrido) ${hasPA ? '(-1 PA)' : ''}</div>
                </div>
            `;
        } else if (accuracy > 0) {
            appendCombatLog(`💨 <strong>DESVIO PARCIAL (${accuracy}% REDUZIDO)!</strong> <strong>${escapeHTML(target.name)}</strong> esquivou parcialmente da cadência de <strong>${escapeHTML(attack.attackerName)}</strong>!<br>• Ritmo: <strong class="text-stone-300 font-mono">${accuracy}% Precisão</strong> &bull; Dano Mitigado: <strong class="text-stone-200">-${hpReduced} HP</strong> e <strong class="text-stone-200">-${postureReduced} Postura</strong>.<br>• Dano Sofrido: apenas <strong class="text-red-400">${finalHpDmg} HP</strong> e <strong class="text-purple-300">+${finalPostureDmg} Postura</strong>. ${hasPA ? '(-1 PA)' : ''}`, 'dodge');
            resultHtml = `
                <div class="p-3 bg-[#0a0e14] border border-stone-700 rounded-lg text-center shadow">
                    <div class="text-stone-200 font-cinzel font-bold text-sm flex items-center justify-center gap-1.5 mb-1">
                        DESVIO PARCIAL (${accuracy}% REDUÇÃO)
                    </div>
                    <div class="text-xs text-stone-400">Mitigou: <strong class="text-stone-200">-${hpReduced} HP</strong> / <strong class="text-stone-200">-${postureReduced} Postura</strong></div>
                    <div class="text-[11px] text-stone-300 font-semibold mt-1">Sofreu apenas ${finalHpDmg} HP e +${finalPostureDmg} Postura ${hasPA ? '(-1 PA)' : ''}</div>
                </div>
            `;
            if (target.lust >= target.maxLust) {
                appendCombatLog(`💥 <strong>GUARDA QUEBRADA!</strong> <strong>${escapeHTML(target.name)}</strong> atingiu 100% de Postura e entrou em <strong>STAGGER</strong>!`, 'stagger');
            }
        } else {
            appendCombatLog(`❌ <strong>FALHA NO DESVIO (0% REDUÇÃO)!</strong> <strong>${escapeHTML(target.name)}</strong> perdeu o ritmo da esquiva e recebeu o impacto pleno de <strong>${escapeHTML(attack.attackerName)}</strong>!<br>• Ritmo: <strong class="text-red-400 font-mono">0% (Fora do compasso)</strong>.<br>• Dano Sofrido: <strong class="text-red-400">${attack.hpDmg} HP</strong> e <strong class="text-purple-300">+${attack.postureDmg} Postura</strong>. ${hasPA ? '(-1 PA)' : ''}`, 'attack');
            resultHtml = `
                <div class="p-3 bg-[#140808] border border-red-900 rounded-lg text-center shadow">
                    <div class="text-red-400 font-cinzel font-bold text-sm flex items-center justify-center gap-1.5 mb-1">
                        ERROU O RITMO DO DESVIO (0%)
                    </div>
                    <div class="text-xs text-stone-400">Dano Pleno: <strong class="text-red-400 font-mono">${attack.hpDmg} HP</strong> e <strong class="text-purple-300 font-mono">+${attack.postureDmg} Postura</strong></div>
                    <div class="text-[11px] text-stone-400 font-semibold mt-1">Nenhum dano reduzido. ${hasPA ? '(-1 PA)' : ''}</div>
                </div>
            `;
            if (target.lust >= target.maxLust) {
                appendCombatLog(`💥 <strong>GUARDA QUEBRADA!</strong> <strong>${escapeHTML(target.name)}</strong> atingiu 100% de Postura e entrou em <strong>STAGGER</strong>!`, 'stagger');
            }
        }
    } else if (choice === 'parry') {
        const accuracy = typeof qteAccuracy === 'number' ? qteAccuracy : 0;
        const isSuccess = (accuracy === 100);

        if (isSuccess) {
            const counterPostureDmg = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 4 + Math.max(defFor, defAgi, 1);
            const counterHpDmg = Math.floor(Math.random() * 6) + 2 + Math.max(defFor, 1);

            if (attacker) {
                adjustCombatStat(attacker.cid, 'lust', counterPostureDmg);
                adjustCombatStat(attacker.cid, 'hp', -counterHpDmg);
            }

            appendCombatLog(`🛡️⚡ <strong>APARADA PERFEITA! (100% NO PARRY!)</strong> <strong>${escapeHTML(target.name)}</strong> defletiu a cadência de <strong>${escapeHTML(attack.actionName || 'Golpe')}</strong> de <strong>${escapeHTML(attack.attackerName)}</strong> no milissegundo exato!<br>• Ritmo: <strong class="text-[#bfa888] font-mono">100% PERFEIÇÃO</strong> (Aparo Completo!).<br>• <strong>CONTRA-ATAQUE DE POSTURA:</strong> Infligiu <strong class="text-[#bfa888] font-bold">+${counterPostureDmg} Dano de Postura</strong> e <strong class="text-stone-200 font-bold">${counterHpDmg} HP</strong> em <strong>${escapeHTML(attack.attackerName)}</strong>! Dano recebido anulado!`, 'parry');

            resultHtml = `
                <div class="p-3 bg-[#141008] border border-[#bfa888] rounded-lg text-center shadow">
                    <div class="text-[#bfa888] font-cinzel font-bold text-sm flex items-center justify-center gap-1.5 mb-1">
                        ◆ PARRY PERFEITO (100%) &bull; CONTRA-ATAQUE! ◆
                    </div>
                    <div class="text-xs text-stone-300">Convergência: <strong class="text-[#bfa888] font-mono">100% EXATOS</strong></div>
                    <div class="text-[11px] text-[#ede3d2] font-bold mt-1">Dano anulado! Contra-atacou com +${counterPostureDmg} Postura e ${counterHpDmg} HP no atacante!</div>
                </div>
            `;

            if (attacker && attacker.lust >= attacker.maxLust) {
                appendCombatLog(`💥 <strong>QUEBRA DE GUARDA POR PARRY!</strong> <strong>${escapeHTML(attacker.name)}</strong> teve a postura estilhaçada pelo contra-ataque e entrou em <strong>STAGGER TOTAL</strong>!`, 'stagger');
            }
        } else {
            const penHp = attack.hpDmg + 2;
            const penPosture = attack.postureDmg + 2;
            adjustCombatStat(target.cid, 'hp', -penHp);
            adjustCombatStat(target.cid, 'lust', penPosture);

            appendCombatLog(`💥 <strong>FALHA NO PARRY! GUARDA EXPOSTA!</strong> <strong>${escapeHTML(target.name)}</strong> errou a convergência da aparada contra <strong>${escapeHTML(attack.attackerName)}</strong>!<br>• Ritmo: <strong class="text-red-400 font-mono">${accuracy}%</strong> (O Aparar <strong>exige 100%</strong> exatos em todas as batidas!).<br>• Penalidade de Exposição: Sofreu <strong class="text-red-400">${penHp} HP</strong> (+2) e <strong class="text-purple-300">+${penPosture} Postura</strong> (+2).`, 'attack');

            resultHtml = `
                <div class="p-3 bg-[#140808] border border-red-900 rounded-lg text-center shadow">
                    <div class="text-red-400 font-cinzel font-bold text-sm flex items-center justify-center gap-1.5 mb-1">
                        FALHA NO PARRY &bull; GUARDA EXPOSTA
                    </div>
                    <div class="text-xs text-stone-400">Precisão: <strong class="text-red-400 font-mono">${accuracy}%</strong> (Exige 100% para funcionar)</div>
                    <div class="text-[11px] text-red-300 font-semibold mt-1">Penalidade: ${penHp} HP (+2) e +${penPosture} Postura (+2)!</div>
                </div>
            `;

            if (target.lust >= target.maxLust) {
                appendCombatLog(`💥 <strong>GUARDA QUEBRADA!</strong> <strong>${escapeHTML(target.name)}</strong> atingiu 100% de Postura e entrou em <strong>STAGGER</strong>!`, 'stagger');
            }
        }
    } else if (choice === 'block') {
        const absorbed = Math.max(3, Math.floor((defCon || 2) * 1.5));
        const finalHp = Math.max(1, attack.hpDmg - absorbed);
        const finalPosture = attack.postureDmg + Math.floor(absorbed / 2);

        adjustCombatStat(target.cid, 'hp', -finalHp);
        adjustCombatStat(target.cid, 'lust', finalPosture);

        appendCombatLog(`🛡️ <strong>BLOQUEIO FIRME!</strong> <strong>${escapeHTML(target.name)}</strong> absorveu o impacto de <strong>${escapeHTML(attack.attackerName)}</strong> na guarda.<br>• Absorção: <strong>${absorbed} HP</strong> mitigados | Dano Sofrido: <strong class="text-red-400">${finalHp} HP</strong> e <strong class="text-purple-300">+${finalPosture} Postura</strong>.`, 'parry');

        resultHtml = `
            <div class="p-3 bg-[#0a0a0a] border border-stone-700 rounded-lg text-center shadow">
                <div class="text-stone-300 font-cinzel font-bold text-sm flex items-center justify-center gap-1.5 mb-1">
                    BLOQUEIO FIRME (ABSORÇÃO)
                </div>
                <div class="text-xs text-stone-400">${absorbed} HP absorvidos pela guarda.</div>
                <div class="text-[11px] text-stone-300 font-semibold mt-1">Dano Sofrido: ${finalHp} HP e +${finalPosture} Postura</div>
            </div>
        `;

        if (target.lust >= target.maxLust) {
            appendCombatLog(`💥 <strong>GUARDA QUEBRADA!</strong> <strong>${escapeHTML(target.name)}</strong> atingiu 100% de Postura e entrou em <strong>STAGGER</strong>!`, 'stagger');
        }
    } else {
        adjustCombatStat(target.cid, 'hp', -attack.hpDmg);
        adjustCombatStat(target.cid, 'lust', attack.postureDmg);

        appendCombatLog(`💥 <strong>${escapeHTML(target.name)}</strong> recebeu o impacto total do ataque de <strong>${escapeHTML(attack.attackerName)}</strong>!<br>• Dano Sofrido: <strong class="text-red-400">${attack.hpDmg} HP</strong> e <strong class="text-purple-300">+${attack.postureDmg} Postura</strong>.`, 'attack');

        resultHtml = `
            <div class="p-3 bg-[#080808] border border-stone-800 rounded-lg text-center shadow">
                <div class="text-stone-400 font-cinzel font-bold text-sm mb-1">DANO RECEBIDO</div>
                <div class="text-[11px] text-stone-500 font-mono">${attack.hpDmg} HP e +${attack.postureDmg} Postura aplicados.</div>
            </div>
        `;

        if (target.lust >= target.maxLust) {
            appendCombatLog(`💥 <strong>GUARDA QUEBRADA!</strong> <strong>${escapeHTML(target.name)}</strong> atingiu 100% de Postura e entrou em <strong>STAGGER</strong>!`, 'stagger');
        }
    }

    if (resEl) {
        resEl.innerHTML = resultHtml;
        resEl.classList.remove('hidden');
    }

    const rhythmEl = document.getElementById('inc-e33-rhythm-container');
    if (rhythmEl) rhythmEl.classList.add('hidden');

    setTimeout(() => {
        window.closeIncomingAttackModal();
    }, autoCloseDelay);
};

window.quickCombatShoot = function(cid) {
    const c = combatState.combatants.find(x => x.cid === cid);
    if (!c) return;
    if (c.stamina < 1) {
        alert(`${c.name} não possui Fôlego/PA suficiente para disparar! (Requer 1 PA)`);
        return;
    }
    
    // Choose target: prioritize selected target (if opponent), otherwise opposite team, otherwise any other combatant
    let target = null;
    if (combatState.selectedTargetCid && combatState.selectedTargetCid !== cid) {
        const st = combatState.combatants.find(x => x.cid === combatState.selectedTargetCid);
        if (st && st.isMonster !== c.isMonster) target = st;
    }
    if (!target) {
        const potentialTargets = combatState.combatants.filter(x => x.cid !== cid);
        if (potentialTargets.length > 0) {
            target = potentialTargets.find(x => x.isMonster !== c.isMonster) || potentialTargets[0];
        }
    }
    
    adjustCombatStat(cid, 'stamina', -1);
    
    let charRef = !c.isMonster && c.refId ? characters.find(ch => ch.id === c.refId) : null;
    let monRef = c.isMonster && c.refId ? monsters.find(m => m.id === c.refId) : null;
    
    // Base damage equal to character's base damage (AGI/FOR/level)
    let baseDmg = 4;
    if (charRef) {
        baseDmg = Math.max(3, (charRef.attr?.agi ?? charRef.attr?.for ?? 4));
    } else if (monRef) {
        baseDmg = Math.max(3, (monRef.agi ?? monRef.for ?? 4));
    } else if (c.attr) {
        baseDmg = Math.max(3, (c.attr.agi ?? c.attr.for ?? 4));
    }
    
    let agiBonus = (charRef?.attr?.agi ?? monRef?.agi ?? c.attr?.agi ?? 0);
    let perBonus = (charRef?.attr?.per ?? monRef?.sed ?? c.attr?.per ?? 0);
    let hitBonus = Math.max(agiBonus, perBonus);
    
    let postureMultiplier = 1;
    if (c._hasFocus) {
        hitBonus += perBonus;
        postureMultiplier = 2;
        c._hasFocus = false;
    }

    const d20 = Math.floor(Math.random() * 20) + 1;
    const hitTotal = d20 + hitBonus;
    const postureDmg = 3 * postureMultiplier;
    
    if (target) {
        if (target.isMonster) {
            const isFlying = window.isFlyingCreature(target);
            if (isFlying) {
                // Free Aim in Expedition 33 grounds flying enemies!
                target.isFlying = false;
                if (target.tags) {
                    target.tags = target.tags.filter(t => !/voa/i.test(t));
                }
                adjustCombatStat(target.cid, 'hp', -baseDmg);
                adjustCombatStat(target.cid, 'lust', postureDmg + 2);
                appendCombatLog(`🎯 <strong>${escapeHTML(c.name)}</strong> disparou com <strong>Mira Livre (Atirar)</strong> contra a criatura voadora <strong>${escapeHTML(target.name)}</strong>!<br>• Mira Precisa: <strong>${hitTotal}</strong> (d20: ${d20} + ${hitBonus}) | Dano Base: <strong class="text-red-400">${baseDmg} HP</strong> e <strong class="text-purple-300">+${postureDmg + 2} Postura</strong>. (-1 PA)<br>🦅💥 <strong>ALVO DERRUBADO!</strong> O tiro atingiu as asas de <strong>${escapeHTML(target.name)}</strong> e <strong>a criatura caiu no solo</strong>! Agora é terrestre e perdeu a esquiva aérea com vantagem!`, 'attack');
                if (target.lust >= target.maxLust) {
                    appendCombatLog(`💥 <strong>STAGGER!</strong> <strong>${escapeHTML(target.name)}</strong> atingiu 100% de Postura e ficou atordoado!`, 'stagger');
                }
            } else {
                adjustCombatStat(target.cid, 'hp', -baseDmg);
                adjustCombatStat(target.cid, 'lust', postureDmg);
                appendCombatLog(`🎯 <strong>${escapeHTML(c.name)}</strong> disparou com <strong>Mira Livre (Atirar)</strong> em <strong>${escapeHTML(target.name)}</strong>!<br>• Acerto: <strong>${hitTotal}</strong> | Dano Base: <strong class="text-red-400">${baseDmg} HP</strong> e <strong class="text-purple-300">+${postureDmg} Postura</strong>. (-1 PA)`, 'attack');
                if (target.lust >= target.maxLust) {
                    appendCombatLog(`💥 <strong>STAGGER!</strong> <strong>${escapeHTML(target.name)}</strong> atingiu 100% de Postura e ficou atordoado!`, 'stagger');
                }
            }
            window.advanceTurnForCombatant(cid);
        } else {
            // Target is a player/character -> reaction modal opens!
            appendCombatLog(`🎯 <strong>${escapeHTML(c.name)}</strong> disparou com <strong>Mira Livre (Atirar)</strong> mirando em <strong>${escapeHTML(target.name)}</strong>!<br>• Acerto: <strong>${hitTotal}</strong> | Dano Base Potencial: <strong class="text-red-400">${baseDmg} HP</strong> e <strong class="text-purple-300">+${postureDmg} Postura</strong>. (-1 PA)<br>⚡ <em>Aguardando reação do defensor...</em>`, 'attack');
            window.triggerIncomingAttack(c, target, hitTotal, baseDmg, postureDmg, 'Mira Livre (Atirar)', 'HP');
        }
    } else {
        appendCombatLog(`🎯 <strong>${escapeHTML(c.name)}</strong> disparou um tiro no ar (Acerto: ${hitTotal}, Dano: ${baseDmg} HP). (-1 PA)`, 'attack');
        window.advanceTurnForCombatant(cid);
    }
};

window.quickCombatPhysical = function(cid) {
    const c = combatState.combatants.find(x => x.cid === cid);
    if (!c) return;

    // In Expedition 33, standard physical attack generates +1 PA!
    adjustCombatStat(cid, 'stamina', 1);

    // Choose target: prioritize selected target (if opponent), otherwise opposite team, otherwise any other combatant
    let target = null;
    if (combatState.selectedTargetCid && combatState.selectedTargetCid !== cid) {
        const st = combatState.combatants.find(x => x.cid === combatState.selectedTargetCid);
        if (st && st.isMonster !== c.isMonster) target = st;
    }
    if (!target) {
        const potentialTargets = combatState.combatants.filter(x => x.cid !== cid);
        if (potentialTargets.length > 0) {
            target = potentialTargets.find(x => x.isMonster !== c.isMonster) || potentialTargets[0];
        }
    }

    let charRef = !c.isMonster && c.refId ? characters.find(ch => ch.id === c.refId) : null;
    let forBonus = (charRef?.attr?.for || c.attr?.for || 0);

    let hitBonus = forBonus;
    let postureMultiplier = 1;
    if (c._hasFocus) {
        let perBonus = (charRef?.attr?.per ?? charRef?.attr?.von ?? c.attr?.per ?? 0);
        hitBonus += perBonus;
        postureMultiplier = 2;
        c._hasFocus = false;
    }

    const d20 = Math.floor(Math.random() * 20) + 1;
    const hitTotal = d20 + hitBonus;
    const dmgD6 = Math.floor(Math.random() * 6) + 1;
    const hpDmg = 5 + forBonus + dmgD6;
    const postureDmg = (Math.floor(Math.random() * 4) + 2) * postureMultiplier;

    if (target) {
        if (target.isMonster) {
            const isFlying = window.isFlyingCreature(target);
            if (isFlying) {
                // Flying creature rolls dodge with advantage
                const defMon = target.refId ? monsters.find(m => m.id === target.refId) : null;
                const agi = defMon?.agi || target.attr?.agi || 0;
                const d1 = Math.floor(Math.random() * 20) + 1;
                const d2 = Math.floor(Math.random() * 20) + 1;
                const best = Math.max(d1, d2);
                const dodgeTotal = best + (agi * 2) + 2;

                if (dodgeTotal >= hitTotal) {
                    appendCombatLog(`🦅💨 <strong>${escapeHTML(target.name)}</strong> (Criatura Voadora) esquivou com vantagem do <strong>Ataque Físico</strong> de <strong>${escapeHTML(c.name)}</strong>!<br>• Esquiva Aérea: <strong class="text-emerald-400 font-mono">${dodgeTotal}</strong> [d20s: ${d1}, ${d2} → ${best} + ${agi*2+2}] vs Acerto: <strong>${hitTotal}</strong>. Dano evitado! (+1 PA gerado)`, 'dodge');
                } else {
                    adjustCombatStat(target.cid, 'hp', -hpDmg);
                    adjustCombatStat(target.cid, 'lust', postureDmg);
                    appendCombatLog(`⚔️💥 <strong>${escapeHTML(c.name)}</strong> acertou um <strong>Ataque Físico</strong> em pleno voo contra <strong>${escapeHTML(target.name)}</strong>!<br>• Acerto: <strong>${hitTotal}</strong> vs Esquiva: <strong>${dodgeTotal}</strong> | Dano: <strong class="text-red-400">${hpDmg} HP</strong> e <strong class="text-purple-300">+${postureDmg} Postura</strong>. (+1 PA gerado)`, 'attack');
                    if (target.lust >= target.maxLust) {
                        appendCombatLog(`💥 <strong>STAGGER!</strong> <strong>${escapeHTML(target.name)}</strong> atingiu 100% de Postura e está atordoado!`, 'stagger');
                    }
                }
            } else {
                // Terrestrial monster cannot dodge or parry, takes direct hit
                adjustCombatStat(target.cid, 'hp', -hpDmg);
                adjustCombatStat(target.cid, 'lust', postureDmg);
                appendCombatLog(`⚔️ <strong>${escapeHTML(c.name)}</strong> desferiu um <strong>Ataque Físico</strong> certeiro contra <strong>${escapeHTML(target.name)}</strong>!<br>• Acerto: <strong>${hitTotal}</strong> (d20: ${d20} + FOR: ${forBonus}) | Dano: <strong class="text-red-400">${hpDmg} HP</strong> e <strong class="text-purple-300">+${postureDmg} Postura</strong>. (+1 PA gerado)`, 'attack');
                if (target.lust >= target.maxLust) {
                    appendCombatLog(`💥 <strong>STAGGER!</strong> <strong>${escapeHTML(target.name)}</strong> atingiu 100% de Postura e está atordoado!`, 'stagger');
                }
            }
            window.advanceTurnForCombatant(cid);
        } else {
            // Target is a player/character -> reaction modal opens!
            appendCombatLog(`⚔️ <strong>${escapeHTML(c.name)}</strong> desferiu um <strong>Ataque Físico</strong> mirando em <strong>${escapeHTML(target.name)}</strong>!<br>• Acerto: <strong>${hitTotal}</strong> (d20: ${d20} + ${hitBonus}) | Dano Potencial: <strong class="text-red-400">${hpDmg} HP</strong> e <strong class="text-purple-300">+${postureDmg} Postura</strong>. (+1 PA gerado)<br>⚡ <em>Aguardando reação do defensor (Aparar ou Desviar)...</em>`, 'attack');
            window.triggerIncomingAttack(c, target, hitTotal, hpDmg, postureDmg, 'Ataque Físico', 'HP');
        }
    } else {
        appendCombatLog(`⚔️ <strong>${escapeHTML(c.name)}</strong> desferiu um Ataque Físico no ar (Acerto: ${hitTotal}, Potencial: ${hpDmg} HP / +${postureDmg} Postura). (+1 PA gerado)`, 'attack');
        window.advanceTurnForCombatant(cid);
    }
};

window.quickCombatAttack = window.quickCombatPhysical;

window.openCombatSkillsModal = function(cid) {
    const c = combatState.combatants.find(x => x.cid === cid);
    if (!c) return;

    combatState.activeSkillCasterCid = cid;
    const modal = document.getElementById('modal-combat-skills');
    if (!modal) return;

    let charRef = !c.isMonster && c.refId ? characters.find(ch => ch.id === c.refId) : null;

    const nameEl = document.getElementById('cskills-caster-name');
    if (nameEl) nameEl.textContent = c.name;
    const paEl = document.getElementById('cskills-caster-pa');
    if (paEl) paEl.textContent = c.stamina !== undefined ? c.stamina : 0;
    
    const infoEl = document.getElementById('cskills-combatant-info');
    if (infoEl) {
        infoEl.textContent = `${c.name} (${c.isMonster ? 'Criatura' : (charRef?.class || 'Expedicionário')}) • Selecione uma habilidade para usar seus Pontos de Ação (PA)`;
    }

    // Populate Target Select
    const targetSelect = document.getElementById('cskills-target-select');
    if (targetSelect) {
        targetSelect.innerHTML = '';
        let defaultTargetCid = null;
        if (combatState.selectedTargetCid && combatState.selectedTargetCid !== c.cid) {
            const st = combatState.combatants.find(x => x.cid === combatState.selectedTargetCid);
            if (st && st.isMonster !== c.isMonster) defaultTargetCid = st.cid;
        }
        if (!defaultTargetCid) {
            const opp = combatState.combatants.find(x => x.cid !== c.cid && x.isMonster !== c.isMonster);
            if (opp) defaultTargetCid = opp.cid;
        }

        combatState.combatants.forEach(target => {
            const opt = document.createElement('option');
            opt.value = target.cid;
            const isTargetFlying = window.isFlyingCreature(target);
            opt.textContent = `${target.name} [${target.isMonster ? (isTargetFlying ? 'Criatura Voadora' : 'Criatura Terrestre') : 'Expedicionário'}] (HP: ${target.hp}/${target.maxHp} | Postura: ${target.lust}/${target.maxLust})`;
            if (defaultTargetCid && defaultTargetCid === target.cid) {
                opt.selected = true;
            }
            targetSelect.appendChild(opt);
        });
    }

    // Build skill list (Expedition 33 uses ONLY Action Points (PA) for skills & attacks!)
    const skillsListEl = document.getElementById('cskills-list');
    if (!skillsListEl) return;
    skillsListEl.innerHTML = '';

    const availableSkills = [
        {
            key: 'picto_chroma_blast',
            name: 'Impacto Esmaecido',
            type: 'Ofensiva Tática',
            costPA: 2,
            desc: 'Canaliza poder de combate concentrado e desfere contra o alvo, causando alto impacto na postura.',
            formula: '2d8 + CHR (Dano Mágico) • +8 Postura'
        },
        {
            key: 'skill_posture_break',
            name: 'Golpe Rompe-Postura',
            type: 'Físico / Ruptura',
            costPA: 2,
            desc: 'Ataque pesado desferido no centro de massa inimigo com o objetivo de quebrar a postura e provocar Stagger.',
            formula: '1d6 + FOR (Dano Físico) • +14 Postura'
        },
        {
            key: 'picto_ink_storm',
            name: 'Tormenta de Golpes',
            type: 'Habilidade Suprema',
            costPA: 3,
            desc: 'Uma torrente violenta de ataques contínuos que engole o alvo com múltiplas estocadas cáusticas.',
            formula: '3d8 + CHR (Dano Alto) • +12 Postura'
        },
        {
            key: 'skill_focus_weakpoint',
            name: 'Análise de Ponto Fraco',
            type: 'Tático / Foco',
            costPA: 1,
            desc: 'Mira meticulosamente na brecha do inimigo. O próximo ataque ganha +PER no Acerto e causa o DOBRO de Dano de Postura!',
            formula: '+PER no Acerto • 2x Postura no próximo ataque'
        },
        {
            key: 'skill_recover_guard',
            name: 'Recompor Guarda',
            type: 'Técnica Defensiva',
            costPA: 1,
            desc: 'Recua um passo, reajusta a empunhadura e limpa a pressão sobre o escudo, reduzindo 25 de postura acumulada.',
            formula: '-25 Postura de si mesmo'
        }
    ];

    // Add character-specific archetype skills if available
    if (charRef && charRef.class && charRef.class.toLowerCase().includes('franco')) {
        availableSkills.unshift({
            key: 'skill_franco_parry',
            name: 'Aparar de Franco Golpeador',
            type: 'Assinatura Ativa',
            costPA: 1,
            desc: 'Assume a postura de combate agressiva dos Francos Golpeadores, com bônus de +3 para parry imediato e contra-ataque avassalador.',
            formula: '+3 no Teste de Aparar • Contra-ataque de Postura'
        });
    }

    // Add character equipped skills if any
    if (charRef && charRef.equippedSkillIds && typeof globalSkills !== 'undefined') {
        charRef.equippedSkillIds.forEach(skId => {
            const sk = globalSkills.find(s => s.id === skId);
            if (sk) {
                availableSkills.push({
                    key: `custom_${sk.id}`,
                    name: sk.name,
                    type: sk.type || 'Habilidade Equipada',
                    costPA: 2,
                    desc: sk.desc || 'Habilidade customizada equipada na ficha.',
                    formula: sk.test ? `Teste: ${sk.test}` : '2d6 + Atributo'
                });
            }
        });
    }

    availableSkills.forEach(sk => {
        const canAfford = (c.stamina >= sk.costPA);
        const card = document.createElement('div');
        card.className = `p-3.5 rounded-xl border transition ${canAfford ? 'bg-[#0e0e10] border-stone-800 hover:border-stone-600 shadow-md' : 'bg-[#0a0a0c] border-stone-900 opacity-50'}`;
        card.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                        <span class="font-bold text-xs text-[#ede3d2] tracking-wider">${escapeHTML(sk.name)}</span>
                        <span class="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-black/60 border border-stone-800 text-stone-400 font-mono">${escapeHTML(sk.type)}</span>
                    </div>
                    <p class="text-xs text-stone-400 italic leading-snug mb-1.5">${escapeHTML(sk.desc)}</p>
                    <div class="flex items-center gap-3 text-xs flex-wrap font-mono">
                        <span class="text-sky-300 font-bold"><i class="fa-solid fa-bolt mr-1"></i>${sk.costPA} PA</span>
                        <span class="text-purple-300"><i class="fa-solid fa-shield-halved mr-1"></i>${sk.formula}</span>
                    </div>
                </div>
                <button ${canAfford ? '' : 'disabled'} class="shrink-0 ${canAfford ? 'border border-stone-700 bg-[#141416] hover:bg-[#202024] text-[#ede3d2] active:scale-95' : 'bg-[#0a0a0c] text-stone-600 border-stone-900 cursor-not-allowed'} border px-3 py-2 rounded-lg text-xs font-bold transition shadow flex items-center justify-center gap-1.5" onclick="executeCombatSkill('${sk.key}')">
                    <span class="e33-key text-[9px]"><i class="fa-solid fa-wand-magic-sparkles"></i></span> Executar
                </button>
            </div>
        `;
        skillsListEl.appendChild(card);
    });

    modal.showModal();
};

window.executeCombatSkill = function(skillKey) {
    const casterCid = combatState.activeSkillCasterCid;
    const c = combatState.combatants.find(x => x.cid === casterCid);
    if (!c) return;

    const targetSelect = document.getElementById('cskills-target-select');
    const targetCid = targetSelect ? targetSelect.value : null;
    let target = combatState.combatants.find(x => x.cid === targetCid);
    if (!target || target.cid === casterCid || (c.isMonster && target.isMonster)) {
        target = combatState.combatants.find(x => x.cid !== casterCid && x.isMonster !== c.isMonster)
              || combatState.combatants.find(x => x.cid !== casterCid);
    }

    let charRef = !c.isMonster && c.refId ? characters.find(ch => ch.id === c.refId) : null;
    let monRef = c.isMonster && c.refId ? monsters.find(m => m.id === c.refId) : null;
    let chrBonus = (charRef?.attr?.chr ?? charRef?.attr?.mis ?? monRef?.sed ?? c.attr?.chr ?? 2);
    let forBonus = (charRef?.attr?.for ?? monRef?.con ?? c.attr?.for ?? 2);
    let perBonus = (charRef?.attr?.per ?? charRef?.attr?.von ?? monRef?.von ?? c.attr?.per ?? 2);

    const modal = document.getElementById('modal-combat-skills');

    if (skillKey === 'skill_focus_weakpoint') {
        if (c.stamina < 1) {
            alert(`${c.name} não possui 1 PA suficiente!`);
            return;
        }
        adjustCombatStat(c.cid, 'stamina', -1);
        c._hasFocus = true;
        appendCombatLog(`🎯 <strong>${escapeHTML(c.name)}</strong> analisou as brechas de <strong>${target ? escapeHTML(target.name) : 'seus inimigos'}</strong>!<br>• Ponto Fraco Identificado: O próximo ataque causará <strong class="text-purple-300">+${perBonus} Acerto</strong> e <strong>DOBRO de Dano de Postura</strong>! (-1 PA)`, 'info');
        if (modal) modal.close();
        renderRPG();
        window.advanceTurnForCombatant(c.cid);
        return;
    }

    if (skillKey === 'skill_recover_guard') {
        if (c.stamina < 1) {
            alert(`${c.name} não possui 1 PA suficiente!`);
            return;
        }
        adjustCombatStat(c.cid, 'stamina', -1);
        adjustCombatStat(c.cid, 'lust', -25);
        appendCombatLog(`🛡️ <strong>${escapeHTML(c.name)}</strong> recuou um passo e recompôs a guarda!<br>• Postura Aliviada: <strong class="text-emerald-400">-25 Postura acumulada</strong>. (-1 PA)`, 'recover');
        if (modal) modal.close();
        renderRPG();
        window.advanceTurnForCombatant(c.cid);
        return;
    }

    if (skillKey === 'skill_franco_parry') {
        if (c.stamina < 1) {
            alert(`${c.name} não possui 1 PA suficiente!`);
            return;
        }
        adjustCombatStat(c.cid, 'stamina', -1);
        c._parryBonus = (c._parryBonus || 0) + 3;
        appendCombatLog(`⚡ <strong>${escapeHTML(c.name)}</strong> assumiu a guarda do <strong>Franco Golpeador</strong>!<br>• Técnica de Aparar Ativada: Concede <strong class="text-purple-300">+3 de Bônus em Aparar</strong> no próximo confronto! (-1 PA)`, 'parry');
        if (modal) modal.close();
        renderRPG();
        window.advanceTurnForCombatant(c.cid);
        return;
    }

    let costPA = 2;
    let skillName = 'Impacto Esmaecido';
    let hpDmg = 12;
    let postureDmg = 8;
    let dmgType = 'MAG';

    if (skillKey === 'picto_chroma_blast') {
        costPA = 2;
        skillName = 'Impacto Esmaecido';
        hpDmg = (Math.floor(Math.random() * 8) + 1) + (Math.floor(Math.random() * 8) + 1) + chrBonus;
        postureDmg = 8;
        dmgType = 'MAG';
    } else if (skillKey === 'skill_posture_break') {
        costPA = 2;
        skillName = 'Golpe Rompe-Postura';
        hpDmg = (Math.floor(Math.random() * 6) + 1) + forBonus;
        postureDmg = 14;
        dmgType = 'HP';
    } else if (skillKey === 'picto_ink_storm') {
        costPA = 3;
        skillName = 'Tormenta de Golpes';
        hpDmg = (Math.floor(Math.random() * 8) + 1) + (Math.floor(Math.random() * 8) + 1) + (Math.floor(Math.random() * 8) + 1) + chrBonus;
        postureDmg = 12;
        dmgType = 'MAG';
    } else {
        // Custom or equipped skill
        costPA = 2;
        skillName = skillKey.replace(/^custom_/, '');
        if (typeof globalSkills !== 'undefined') {
            const customSk = globalSkills.find(s => s.id === skillName);
            if (customSk) skillName = customSk.name;
        }
        hpDmg = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1) + Math.max(forBonus, chrBonus);
        postureDmg = 8;
    }

    if (c.stamina < costPA) {
        alert(`${c.name} não possui PA suficiente! (Requer ${costPA} PA)`);
        return;
    }

    adjustCombatStat(c.cid, 'stamina', -costPA);

    if (c._hasFocus) {
        postureDmg *= 2;
        c._hasFocus = false;
    }

    const d20 = Math.floor(Math.random() * 20) + 1;
    const hitTotal = d20 + (dmgType === 'MAG' ? chrBonus : forBonus);

    if (modal) modal.close();

    if (target) {
        if (target.isMonster) {
            const isFlying = window.isFlyingCreature(target);
            if (isFlying) {
                // Flying creature auto-dodge with advantage
                const defMon = target.refId ? monsters.find(m => m.id === target.refId) : null;
                const agi = defMon?.agi || target.attr?.agi || 0;
                const d1 = Math.floor(Math.random() * 20) + 1;
                const d2 = Math.floor(Math.random() * 20) + 1;
                const best = Math.max(d1, d2);
                const dodgeTotal = best + (agi * 2) + 2;

                if (dodgeTotal >= hitTotal) {
                    appendCombatLog(`⚔️💨 <strong>${escapeHTML(c.name)}</strong> desferiu <strong>${escapeHTML(skillName)}</strong> contra <strong>${escapeHTML(target.name)}</strong>!<br>• A criatura voadora <strong>desviou em voo com vantagem</strong>! (Esquiva: <strong>${dodgeTotal}</strong> [${d1}, ${d2}] vs Acerto: <strong>${hitTotal}</strong>). Dano evitado! (-${costPA} PA)`, 'dodge');
                } else {
                    adjustCombatStat(target.cid, 'hp', -hpDmg);
                    adjustCombatStat(target.cid, 'lust', postureDmg);
                    appendCombatLog(`⚔️💥 <strong>${escapeHTML(c.name)}</strong> acertou <strong>${escapeHTML(skillName)}</strong> em <strong>${escapeHTML(target.name)}</strong>!<br>• Acerto: <strong>${hitTotal}</strong> vs Esquiva: <strong>${dodgeTotal}</strong>.<br>• Dano: <strong class="text-cyan-300">${hpDmg}</strong> | Ruptura: <strong class="text-purple-300">+${postureDmg} Postura</strong>. (-${costPA} PA)`, 'picto');
                    if (target.lust >= target.maxLust) {
                        appendCombatLog(`💥 <strong>STAGGER TOTAL!</strong> <strong>${escapeHTML(target.name)}</strong> teve sua guarda despedaçada e está atordoado!`, 'stagger');
                    }
                }
            } else {
                // Terrestrial creature takes direct hit
                adjustCombatStat(target.cid, 'hp', -hpDmg);
                adjustCombatStat(target.cid, 'lust', postureDmg);
                appendCombatLog(`⚔️💥 <strong>${escapeHTML(c.name)}</strong> desferiu a habilidade <strong>${escapeHTML(skillName)}</strong> em <strong>${escapeHTML(target.name)}</strong>!<br>• Acerto: <strong>${hitTotal}</strong> | Dano: <strong class="text-cyan-300">${hpDmg}</strong> | Ruptura: <strong class="text-purple-300">+${postureDmg} Postura</strong>. (-${costPA} PA)`, 'picto');
                if (target.lust >= target.maxLust) {
                    appendCombatLog(`💥 <strong>STAGGER TOTAL!</strong> <strong>${escapeHTML(target.name)}</strong> teve a postura estilhaçada e entrou em colapso!`, 'stagger');
                }
            }
            window.advanceTurnForCombatant(c.cid);
        } else {
            // Target is a player/character -> reaction modal opens!
            appendCombatLog(`⚔️ <strong>${escapeHTML(c.name)}</strong> desferiu <strong>${escapeHTML(skillName)}</strong> mirando em <strong>${escapeHTML(target.name)}</strong>!<br>• Acerto: <strong>${hitTotal}</strong> | Dano Potencial: <strong class="text-cyan-300">${hpDmg}</strong> e <strong class="text-purple-300">+${postureDmg} Postura</strong>. (-${costPA} PA)<br>⚡ <em>Aguardando reação do defensor...</em>`, 'picto');
            window.triggerIncomingAttack(c, target, hitTotal, hpDmg, postureDmg, skillName, dmgType);
        }
    } else {
        appendCombatLog(`⚔️ <strong>${escapeHTML(c.name)}</strong> executou ${escapeHTML(skillName)}. (-${costPA} PA)`, 'picto');
        window.advanceTurnForCombatant(c.cid);
    }

    renderRPG();
};

window.openCombatItemsModal = function(cid) {
    const c = combatState.combatants.find(x => x.cid === cid);
    if (!c) return;

    combatState.activeItemUserCid = cid;
    const modal = document.getElementById('modal-combat-items');
    if (!modal) return;

    const targetSelect = document.getElementById('citems-target-select');
    if (targetSelect) {
        targetSelect.innerHTML = '';
        combatState.combatants.forEach(target => {
            const opt = document.createElement('option');
            opt.value = target.cid;
            opt.textContent = `${target.name} (${target.cid === cid ? 'A si mesmo' : (target.isMonster ? 'Criatura' : 'Aliado')}) [HP: ${target.hp}/${target.maxHp} | Postura: ${target.lust}/${target.maxLust}]`;
            if (target.cid === cid) opt.selected = true;
            targetSelect.appendChild(opt);
        });
    }

    modal.showModal();
};

window.executeCombatItem = function(itemType) {
    const userCid = combatState.activeItemUserCid;
    const user = combatState.combatants.find(x => x.cid === userCid);
    if (!user) return;

    const targetSelect = document.getElementById('citems-target-select');
    const targetCid = targetSelect ? targetSelect.value : userCid;
    const target = combatState.combatants.find(x => x.cid === targetCid);
    if (!target) return;

    const modal = document.getElementById('modal-combat-items');

    if (itemType === 'heal_hp') {
        adjustCombatStat(target.cid, 'hp', 35);
        appendCombatLog(`🧪 <strong>${escapeHTML(user.name)}</strong> usou <strong>Tingimento de Cura</strong> em <strong>${escapeHTML(target.name)}</strong>!<br>• Efeito: Restabeleceu <strong class="text-emerald-400 font-bold">+35 HP</strong> com pigmento revitalizante.`, 'recover');
    } else if (itemType === 'heal_posture') {
        adjustCombatStat(target.cid, 'lust', -30);
        appendCombatLog(`🛡️ <strong>${escapeHTML(user.name)}</strong> aplicou <strong>Bálsamo de Guarda</strong> em <strong>${escapeHTML(target.name)}</strong>!<br>• Efeito: Aliviou a tensão na defesa (<strong class="text-purple-300 font-bold">-30 Postura acumulada</strong>), prevenindo Stagger.`, 'recover');
    } else if (itemType === 'heal_status') {
        adjustCombatStat(target.cid, 'stamina', 1);
        appendCombatLog(`✨ <strong>${escapeHTML(user.name)}</strong> usou <strong>Pó Restaurador</strong> em <strong>${escapeHTML(target.name)}</strong>!<br>• Efeito: Aliviou aflições e concedeu <strong class="text-sky-300 font-bold">+1 PA de foco</strong>.`, 'recover');
    } else if (itemType === 'heal_pa') {
        adjustCombatStat(target.cid, 'stamina', 2);
        appendCombatLog(`⚡ <strong>${escapeHTML(user.name)}</strong> administrou um <strong>Elixir de Fôlego</strong> em <strong>${escapeHTML(target.name)}</strong>!<br>• Efeito: Concedeu <strong class="text-sky-400 font-bold">+2 PA imediatos</strong> para agir no combate.`, 'recover');
    }

    if (modal) modal.close();
    renderRPG();
    window.advanceTurnForCombatant(userCid);
};

window.quickCombatPicto = function(cid) {
    window.openCombatSkillsModal(cid);
};

window.quickCombatRecover = function(cid) {
    const c = combatState.combatants.find(x => x.cid === cid);
    if (!c) return;
    if (c.stamina < 1) {
        alert(`${c.name} não possui Fôlego/PA suficiente! (Requer 1 PA)`);
        return;
    }
    
    adjustCombatStat(cid, 'stamina', -1);
    adjustCombatStat(cid, 'lust', -20);
    adjustCombatStat(cid, 'stamina', 2);
    
    appendCombatLog(`🛡️ <strong>${escapeHTML(c.name)}</strong> recompôs a guarda e recuperou o fôlego!<br>• Postura: <strong class="text-emerald-400">-20 Postura acumulada</strong> (Guarda restabelecida). (-1 PA, +2 Fôlego)`, 'recover');
    window.advanceTurnForCombatant(cid);
};

window.quickCombatFocus = function(cid) {
    const c = combatState.combatants.find(x => x.cid === cid);
    if (!c) return;
    if (c.stamina < 1) {
        alert(`${c.name} não possui Fôlego/PA suficiente! (Requer 1 PA)`);
        return;
    }
    
    adjustCombatStat(cid, 'stamina', -1);
    c._hasFocus = true;
    
    let charRef = !c.isMonster && c.refId ? characters.find(ch => ch.id === c.refId) : null;
    let perBonus = (charRef?.attr?.per ?? charRef?.attr?.von ?? c.attr?.per ?? 0);
    
    appendCombatLog(`🎯 <strong>${escapeHTML(c.name)}</strong> focou no <strong>Ponto Fraco</strong> do alvo!<br>• Análise da Pintora: Próximo ataque ganha <strong class="text-purple-300">+${perBonus} Acerto</strong> e causa <strong>dobro de Dano de Postura</strong>! (-1 PA)`, 'info');
    window.advanceTurnForCombatant(cid);
};

window.quickCombatParry = function(cid) {
    const c = combatState.combatants.find(x => x.cid === cid);
    if (!c) return;

    if (c.isMonster) {
        alert("Criaturas não podem aparar!");
        return;
    }

    if (window.currentIncomingAttack && window.currentIncomingAttack.targetCid === cid) {
        window.resolveIncomingDefense('parry');
        return;
    }
    
    let charRef = !c.isMonster && c.refId ? characters.find(ch => ch.id === c.refId) : null;
    let perBonus = (charRef?.attr?.per ?? charRef?.attr?.von ?? c.attr?.per ?? 0);
    
    const d20 = Math.floor(Math.random() * 20) + 1;
    const parryTotal = d20 + perBonus;
    
    appendCombatLog(`⚡ <strong>${escapeHTML(c.name)}</strong> assumiu postura de <strong>Aparar (Parry)</strong>!<br>• Teste de Percepção: <strong>${parryTotal}</strong> (d20: ${d20} + PER: ${perBonus}).<br>• Se o valor superar a CD do golpe inimigo: <em>Dano 100% anulado e contra-ataque imediato de Postura!</em>`, 'parry');
};

window.quickCombatDodge = function(cid) {
    const c = combatState.combatants.find(x => x.cid === cid);
    if (!c) return;

    const isFlying = window.isFlyingCreature(c);
    if (c.isMonster && !isFlying) {
        alert("Criaturas terrestres não podem desviar!");
        return;
    }

    if (window.currentIncomingAttack && window.currentIncomingAttack.targetCid === cid) {
        window.resolveIncomingDefense('dodge');
        return;
    }

    if (c.stamina < 1) {
        alert(`${c.name} não possui Fôlego/PA para esquivar! (Requer 1 PA)`);
        return;
    }
    
    adjustCombatStat(cid, 'stamina', -1);
    
    let charRef = !c.isMonster && c.refId ? characters.find(ch => ch.id === c.refId) : null;
    let defMon = c.isMonster && c.refId ? monsters.find(m => m.id === c.refId) : null;
    let agiBonus = (charRef?.attr?.agi || defMon?.agi || c.attr?.agi || 0);
    
    if (isFlying) {
        const d1 = Math.floor(Math.random() * 20) + 1;
        const d2 = Math.floor(Math.random() * 20) + 1;
        const best = Math.max(d1, d2);
        const dodgeTotal = best + (agiBonus * 2) + 2;
        appendCombatLog(`🦅💨 <strong>${escapeHTML(c.name)}</strong> (Criatura Voadora) realizou uma <strong>Esquiva Aérea com Vantagem</strong>!<br>• Teste com Vantagem: <strong class="text-emerald-400 font-mono">${dodgeTotal}</strong> [d20s: ${d1}, ${d2} → Maior: ${best} + 2xAGI+2: +${agiBonus * 2 + 2}]. (-1 PA)`, 'dodge');
    } else {
        const d20 = Math.floor(Math.random() * 20) + 1;
        const dodgeTotal = d20 + (agiBonus * 2) + 2;
        appendCombatLog(`💨 <strong>${escapeHTML(c.name)}</strong> realizou uma <strong>Esquiva Fluida</strong>!<br>• Teste de Agilidade: <strong>${dodgeTotal}</strong> (d20: ${d20} + 2x AGI + 2: ${agiBonus * 2 + 2}).<br>• Se o valor superar o acerto inimigo: <em>Nenhum dano é sofrido!</em> (-1 PA)`, 'dodge');
    }
};

function renderRPG() {
    const currentRound = Math.floor((combatState.round - 1) / Math.max(1, combatState.combatants.length)) + 1;
    const roundEl = document.getElementById('rpg-round-counter');
    if (roundEl) roundEl.innerText = currentRound;

    const arenaEl = document.getElementById('e33-battle-arena');
    const listEl = document.getElementById('combat-tracker-list');

    // Estado Vazio (Sem Combatentes)
    if (!combatState.combatants || combatState.combatants.length === 0) {
        if (arenaEl) {
            arenaEl.innerHTML = `
                <div class="flex flex-col items-center justify-center py-24 text-center space-y-4 my-auto relative z-10">
                    <div class="w-16 h-16 border border-stone-700 bg-[#141416] flex items-center justify-center font-cinzel text-3xl text-[#ede3d2] shadow-2xl">
                        33
                    </div>
                    <div class="font-cinzel text-xl md:text-2xl tracking-[0.25em] text-[#ede3d2] uppercase font-bold">
                        A Expedição Aguarda em Lumière
                    </div>
                    <p class="italic text-sm text-stone-400 max-w-md">
                        Adicione expedicionários ou criaturas Nevii para ingressar no campo de batalha de Clair Obscur.
                    </p>
                    <button onclick="document.getElementById('btn-combat-add').click()" class="mt-2 px-5 py-2.5 border border-stone-600 bg-[#141416] hover:bg-[#202024] text-[#ede3d2] text-xs tracking-widest transition flex items-center gap-2 shadow-xl active:scale-95">
                        <span class="e33-key">+</span> Adicionar Primeiro Combatente
                    </button>
                </div>
            `;
        }
        if (listEl) {
            listEl.innerHTML = `
                <div class="col-span-full text-center text-stone-500 py-8 italic text-sm">
                    Nenhum combatente ativo. Clique em "Novo Combatente" para iniciar.
                </div>
            `;
        }
        localStorage.setItem('bd_combat_state', JSON.stringify(combatState));
        return;
    }

    const active = combatState.combatants[0];
    
    // Identificar Alvo (Prioriza selecionado, senão o primeiro oponente da equipe oposta, senão o próximo combatente)
    let target = null;
    if (combatState.selectedTargetCid && combatState.selectedTargetCid !== active.cid) {
        target = combatState.combatants.find(c => c.cid === combatState.selectedTargetCid);
    }
    if (!target) {
        const potential = combatState.combatants.filter(c => c.cid !== active.cid);
        target = potential.find(c => c.isMonster !== active.isMonster) || potential[0] || null;
    }

    // Grau de Perfeição (Clair Obscur Rank: D, C, B, A, S)
    if (!combatState.perfectionGrade) combatState.perfectionGrade = 'D';

    // 1. RENDERIZAR ARENA DE BATALHA DE CLAIR OBSCUR (Inspirada diretamente na screenshot do jogo)
    if (arenaEl) {
        const isTargetStagger = target && (target.lust || 0) >= (target.maxLust || 100);
        const isTargetFlying = target && window.isFlyingCreature(target);
        const activeStamina = Math.max(0, active.stamina || 0);

        // Gera os 10 marcadores de PA (pontos de ação / fôlego em formato de traços chanfrados azuis)
        let apTicksHtml = '';
        for (let t = 0; t < 10; t++) {
            apTicksHtml += `<span class="e33-ap-tick ${t < activeStamina ? '' : 'empty'}"></span>`;
        }

        // Roda a lista vertical de turnos (Initiative Rail da esquerda)
        let queueHtml = combatState.combatants.map((cb, idx) => {
            const isFirst = idx === 0;
            const isFlyingCb = window.isFlyingCreature(cb);
            const isAlly = !cb.isMonster;

            return `
                <div onclick="window.setTurnToCombatant('${cb.cid}')" class="e33-queue-item ${isFirst ? 'active' : 'opacity-70 hover:opacity-100'} flex items-center gap-2 group" title="${isFirst ? 'Combatente atualmente no turno' : 'Clique para transferir a vez para este combatente'}">
                    <div class="relative flex items-center justify-center">
                        ${isFirst ? '<div class="e33-sunburst"></div>' : ''}
                        <div class="e33-portrait-box ${isFirst ? 'border-[#bfa888] ring-1 ring-[#bfa888]/60' : 'border-stone-700'}">
                            ${cb.avatar ? `
                                <img src="${escapeHTML(cb.avatar)}" class="w-full h-full object-cover">
                            ` : `
                                <div class="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                                    <i class="fa-solid ${cb.isMonster ? 'fa-ghost' : 'fa-user-ninja'}"></i>
                                </div>
                            `}
                            <div class="absolute bottom-0 right-0 w-2.5 h-2.5 ${isAlly ? 'bg-sky-500' : 'bg-red-500'}"></div>
                        </div>
                    </div>
                    <div class="hidden sm:flex flex-col text-left">
                        <span class="text-[11px] font-bold leading-tight ${isFirst ? 'text-[#ede3d2]' : 'text-stone-400'} flex items-center gap-1">
                            ${escapeHTML(cb.name)}
                            ${isFlyingCb ? '<i class="fa-solid fa-feather-pointed text-[9px] text-sky-400"></i>' : ''}
                        </span>
                        <span class="text-[9px] text-stone-500 font-mono">
                            ${cb.hp} HP &bull; ${cb.stamina} PA
                        </span>
                    </div>
                </div>
            `;
        }).join('<div class="w-0.5 h-3 bg-stone-700/50 mx-5 my-0.5"></div>');

        arenaEl.innerHTML = `
            <!-- Topo: HUD do Chefe / Alvo Inimigo (GOLGRA HUD) -->
            <div class="relative z-10 w-full flex flex-col items-center justify-center pb-4 border-b border-stone-800/80">
                ${target ? `
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[#bfa888] text-xs">◆</span>
                        <span class="e33-boss-name text-sm md:text-base">${escapeHTML(target.name)}</span>
                        <span class="text-[#bfa888] text-xs">◆</span>
                        ${isTargetFlying ? '<span class="text-[9px] uppercase tracking-wider text-sky-300 font-bold border border-sky-500/30 px-1.5 py-0.2 bg-sky-950/40 rounded ml-1"><i class="fa-solid fa-feather-pointed"></i> Voo</span>' : ''}
                        <button onclick="window.selectCombatTarget('${target.cid}')" class="text-stone-400 hover:text-[#ede3d2] text-[10px] ml-2 border border-stone-800 px-2 py-0.5 rounded bg-black/40" title="Trocar ou focar alvo">
                            <i class="fa-solid fa-crosshairs text-[9px] text-[#bfa888]"></i> Alvo Focado
                        </button>
                    </div>

                    <!-- Barra de Vida do Inimigo (Estilo Clair Obscur) -->
                    <div class="w-full max-w-xl flex flex-col gap-1 px-4">
                        <div class="relative h-2 bg-[#0c0c0c] border border-stone-800 rounded-sm overflow-hidden shadow-inner">
                            <div class="h-full bg-[#c22d2d] transition-all duration-300" style="width: ${Math.min(100, Math.max(0, (target.hp / (target.maxHp || 100)) * 100))}%"></div>
                        </div>
                        
                        <!-- Barra de Postura / Guarda Quebrada (Stagger) -->
                        <div class="flex items-center justify-between text-[10px] font-mono text-stone-400 pt-0.5">
                            <div class="flex items-center gap-1.5">
                                <span class="text-stone-500 uppercase text-[9px]">Postura:</span>
                                <div class="w-32 h-1 bg-stone-900 border border-stone-800 overflow-hidden inline-block align-middle">
                                    <div class="h-full ${isTargetStagger ? 'bg-red-500 animate-pulse' : 'bg-[#bfa888]'}" style="width: ${Math.min(100, ((target.lust || 0) / (target.maxLust || 100)) * 100)}%"></div>
                                </div>
                                <span class="${isTargetStagger ? 'text-red-400 font-bold' : 'text-stone-400'}">${target.lust || 0}/${target.maxLust || 100}</span>
                            </div>
                            <div class="font-bold ${isTargetStagger ? 'text-red-400 animate-pulse' : 'text-stone-300'}">
                                ${isTargetStagger ? '💥 STAGGER (GUARDA QUEBRADA)' : `HP: ${target.hp} / ${target.maxHp}`}
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="text-stone-500 italic text-xs tracking-wider">
                        — Nenhum alvo focado —
                    </div>
                `}
            </div>

            <!-- Centro: Campo de Batalha com Fila Vertical, Menu de Pinceladas e Perfeição -->
            <div class="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 my-auto py-6 items-center">
                
                <!-- Coluna Esquerda: Fila Vertical de Iniciativa (Turn Order Rail) -->
                <div class="md:col-span-3 flex md:flex-col items-center md:items-start gap-1 overflow-x-auto md:overflow-visible py-2 custom-scrollbar">
                    <div class="text-[9.5px] uppercase tracking-widest text-[#bfa888]/80 mb-2 hidden md:block">
                        <i class="fa-solid fa-hourglass-half mr-1"></i> Ordem dos Turnos
                    </div>
                    ${queueHtml}
                </div>

                <!-- Coluna Central: Menu de Ações em Pinceladas a Óleo (Oil Brush Strokes) -->
                <div class="md:col-span-5 flex flex-col items-start space-y-3 pl-0 md:pl-4">
                    
                    <!-- Medidor Curvado de PA / Fôlego com Traços Azuis -->
                    <div class="flex items-center gap-2 mb-1.5 pl-1">
                        <div class="w-6 h-6 border border-sky-400/50 bg-[#0d1620] flex items-center justify-center font-bold text-xs text-sky-300 shadow">
                            ${active.stamina || 0}
                        </div>
                        <div class="flex items-center gap-1">
                            ${apTicksHtml}
                        </div>
                        <span class="text-[9px] uppercase tracking-widest text-sky-400/80 ml-1">PA / Fôlego</span>
                    </div>

                    <!-- Botão Lateral de Mira Livre -->
                    <div class="flex items-center gap-2">
                        <button onclick="quickCombatShoot('${active.cid}')" class="e33-aim-banner text-xs font-bold" title="Mira Livre: Disparo com arma de fogo. Derruba criaturas aladas!">
                            <i class="fa-solid fa-crosshairs text-sky-400 text-xs"></i>
                            <span class="tracking-wider">MIRA</span>
                        </button>
                    </div>

                    <!-- As 4 Pinceladas Oficiais de Ação (Clair Obscur Action Strokes) -->
                    <div class="flex flex-col space-y-2.5 w-full max-w-sm">
                        <!-- Q: Atirar (Ataque Esmaecido / Mira Livre) -->
                        <button onclick="quickCombatShoot('${active.cid}')" class="e33-brush-btn group" title="Atalho: [Q] Disparo de precisão. Custa 1 PA. Causa dano base e derruba criaturas voadoras ao solo!">
                            <span class="e33-key">Q</span>
                            <span class="tracking-[0.12em] text-xs font-bold text-[#ede3d2] group-hover:text-white transition">
                                ATIRAR (MIRA LIVRE)
                            </span>
                            <span class="text-[10px] text-stone-400 italic ml-auto pr-3">1 PA</span>
                        </button>

                        <!-- W: Itens -->
                        <button onclick="openCombatItemsModal('${active.cid}')" class="e33-brush-btn group" title="Atalho: [W] Abre a bolsa de suprimentos da expedição">
                            <span class="e33-key">W</span>
                            <span class="tracking-[0.12em] text-xs font-bold text-[#ede3d2] group-hover:text-white transition">
                                ITENS
                            </span>
                            <span class="text-[10px] text-stone-400 italic ml-auto pr-3">Bolsa</span>
                        </button>

                        <!-- E: Habilidades -->
                        <button onclick="openCombatSkillsModal('${active.cid}')" class="e33-brush-btn group" title="Atalho: [E] Abre técnicas ativas e Pictos de tinta do expedicionário">
                            <span class="e33-key">E</span>
                            <span class="tracking-[0.12em] text-xs font-bold text-[#ede3d2] group-hover:text-white transition">
                                HABILIDADES
                            </span>
                            <span class="text-[10px] text-stone-400 italic ml-auto pr-3">Pictos</span>
                        </button>

                        <!-- F: Ataque Físico -->
                        <button onclick="quickCombatPhysical('${active.cid}')" class="e33-brush-btn group" title="Atalho: [F] Ataque físico com arma corpo a corpo. Gera +1 PA e causa dano de HP e postura!">
                            <span class="e33-key">F</span>
                            <span class="tracking-[0.12em] text-xs font-bold text-[#ede3d2] group-hover:text-white transition">
                                ATAQUE FÍSICO
                            </span>
                            <span class="text-[10px] text-[#bfa888] italic ml-auto pr-3">+1 PA</span>
                        </button>
                    </div>

                    <!-- Reações Defensivas ou Indicadores de Tipo -->
                    <div class="pt-2 pl-1">
                        ${!active.isMonster ? `
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] text-stone-400 uppercase tracking-wider">Reação:</span>
                                <button onclick="quickCombatParry('${active.cid}')" class="px-2.5 py-1 border border-stone-700 bg-[#141416] hover:bg-[#202024] text-[#ede3d2] text-[10px] font-bold flex items-center gap-1 transition shadow active:scale-95" title="Aparar: Anula dano com tempo perfeito e contra-ataca a Postura do inimigo!">
                                    <i class="fa-solid fa-shield-virus text-stone-300"></i> Aparar (d20+PER)
                                </button>
                                <button onclick="quickCombatDodge('${active.cid}')" class="px-2.5 py-1 border border-stone-700 bg-[#141416] hover:bg-[#202024] text-stone-300 text-[10px] font-bold flex items-center gap-1 transition shadow active:scale-95" title="Desviar: Custa 1 PA para evitar o golpe">
                                    <i class="fa-solid fa-person-running text-sky-400"></i> Desviar (1 PA)
                                </button>
                            </div>
                        ` : `
                            <div class="text-[10px] text-stone-500 font-mono italic">
                                ${window.isFlyingCreature(active) ? '🦅 Criatura Alada (Esquiva com vantagem contra golpes físicos e Pictos)' : '🐾 Criatura Terrestre (Não pode aparar nem desviar)'}
                            </div>
                        `}
                    </div>
                </div>

                <!-- Coluna Direita: Emblema de PERFEIÇÃO (Perfection Sigil HUD) -->
                <div class="md:col-span-4 flex flex-col items-center md:items-end justify-center text-center md:text-right pr-0 md:pr-4">
                    <div class="e33-perfection-card flex flex-col items-center md:items-end max-w-xs">
                        <div class="e33-rank-emblem mb-3">
                            ${escapeHTML(combatState.perfectionGrade)}
                        </div>
                        <h4 class="font-bold text-sm tracking-[0.2em] text-[#ede3d2] uppercase mb-1">
                            PERFEIÇÃO
                        </h4>
                        <p class="italic text-[11px] text-stone-400 leading-relaxed">
                            Suba seu Grau de Perfeição ao atacar e não ser atingido. Graus mais elevados aumentam seu poder e desbloqueiam novos efeitos de habilidade.
                        </p>
                        <div class="mt-2 pt-2 border-t border-stone-800 w-full flex justify-between text-[10px] font-mono text-stone-500">
                            <span>Sequência / Combo:</span>
                            <span class="text-[#bfa888] font-bold">${combatState.comboStreak || 0}x</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rodapé da Arena: Prompts de Teclado e HUD do Herói Ativo (Bottom Right HUD) -->
            <div class="relative z-10 w-full flex flex-wrap items-end justify-between pt-4 border-t border-stone-800/80 gap-4">
                
                <!-- Prompt de Pular Turno (Estilo [ ↹ Pular turno ] do jogo) -->
                <div class="flex items-center gap-3">
                    <button onclick="window.nextTurn()" class="px-3 py-1.5 border border-stone-700 bg-stone-900/80 hover:bg-stone-800 text-[#ede3d2] text-xs flex items-center gap-2 transition active:scale-95 shadow" title="Passar para o próximo combatente (Atalho: Tab)">
                        <span class="e33-key text-[10px]"><i class="fa-solid fa-arrow-right-arrow-left"></i></span>
                        <span class="tracking-wider">Pular turno</span>
                    </button>
                    <span class="text-[10px] italic text-stone-500 hidden lg:inline">
                        Atalhos rápidos: [Q] Atirar &bull; [W] Itens &bull; [E] Habilidades &bull; [F] Ataque Físico &bull; [Tab] Passar
                    </span>
                </div>

                <!-- HUD do Combatente em Turno (Bottom Right Hero Card com CARGAS ESMAECIDAS) -->
                <div class="flex items-center gap-3.5 bg-black/60 border border-stone-800 p-2.5 rounded-xl shadow-2xl">
                    <div class="relative">
                        <div class="w-12 h-12 rounded-full border-2 border-[#bfa888] overflow-hidden bg-[#0e0e10] shadow-lg">
                            ${active.avatar ? `
                                <img src="${escapeHTML(active.avatar)}" class="w-full h-full object-cover">
                            ` : `
                                <div class="w-full h-full flex items-center justify-center text-[#bfa888] text-base">
                                    <i class="fa-solid ${active.isMonster ? 'fa-ghost' : 'fa-user-ninja'}"></i>
                                </div>
                            `}
                        </div>
                        <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-[#bfa888] text-black text-[9px] font-mono font-bold flex items-center justify-center rounded-full shadow">
                            ${active.ini || 10}
                        </div>
                    </div>
                    <div class="flex flex-col text-left">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-xs text-[#ede3d2] tracking-wider">${escapeHTML(active.name)}</span>
                            <span class="text-[9px] text-stone-500 font-mono">Turno Atual</span>
                        </div>
                        
                        <!-- Barra de HP do Herói -->
                        <div class="flex items-center gap-2 mt-1">
                            <div class="w-28 h-2 bg-[#0c0c0c] border border-stone-800 rounded-sm overflow-hidden shadow-inner">
                                <div class="h-full bg-[#c22d2d]" style="width: ${Math.min(100, Math.max(0, (active.hp / (active.maxHp || 100)) * 100))}%"></div>
                            </div>
                            <span class="font-mono text-[10px] text-red-300 font-bold">${active.hp} / ${active.maxHp}</span>
                        </div>

                        <!-- Cargas Esmaecidas (0/3 slots geométricos angulares) -->
                        <div class="flex items-center justify-between gap-2 mt-1 pt-0.5">
                            <span class="text-[8.5px] uppercase tracking-widest text-stone-400">CARGAS ESMAECIDAS</span>
                            <div class="flex items-center gap-1">
                                <span class="e33-charge-slot ${active.stamina >= 2 ? 'filled' : ''}"></span>
                                <span class="e33-charge-slot ${active.stamina >= 4 ? 'filled' : ''}"></span>
                                <span class="e33-charge-slot ${active.stamina >= 6 ? 'filled' : ''}"></span>
                            </div>
                            <span class="text-[9px] font-mono text-stone-400">${Math.min(3, Math.floor((active.stamina || 0) / 2))}/3</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 2. RENDERIZAR GESTÃO TÁTICA DOS COMBATENTES (Abaixo da Arena para mestres e jogadores)
    if (listEl) {
        listEl.innerHTML = '';
        combatState.combatants.forEach((c, idx) => {
            const isTurn = idx === 0;
            const isTarget = combatState.selectedTargetCid === c.cid;
            const isFlying = window.isFlyingCreature(c);
            const isStagger = (c.lust || 0) >= (c.maxLust || 100);

            const card = document.createElement('div');
            card.className = `p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${isTurn ? 'border-stone-500/80 bg-[#141418] shadow-lg ring-1 ring-stone-400/20' : isTarget ? 'border-sky-700/60 bg-[#0e1217]' : 'border-stone-800 bg-[#0a0a0d]'}`;

            card.innerHTML = `
                <div>
                    <!-- Header do Combatente -->
                    <div class="flex items-center justify-between pb-2 mb-2 border-b border-stone-800/80">
                        <div class="flex items-center gap-2">
                            <span class="font-mono text-[10px] px-1.5 py-0.5 rounded border border-stone-800 bg-black/50 ${isTurn ? 'text-[#ede3d2] font-bold' : 'text-stone-400'}">#${idx + 1}</span>
                            <div class="font-bold text-xs text-[#ede3d2] flex items-center gap-1.5">
                                ${escapeHTML(c.name)}
                                ${isFlying ? '<i class="fa-solid fa-feather-pointed text-[9px] text-sky-400" title="Alado"></i>' : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <button onclick="window.setTurnToCombatant('${c.cid}')" class="px-2 py-0.5 text-[9.5px] rounded border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-300" title="Ativar vez deste combatente">
                                Vez
                            </button>
                            <button onclick="window.selectCombatTarget('${c.cid}')" class="px-2 py-0.5 text-[9.5px] rounded border ${isTarget ? 'border-sky-500 bg-sky-950/40 text-sky-300' : 'border-stone-800 bg-black/40 text-stone-400 hover:text-white'}" title="Focar este alvo">
                                ${isTarget ? 'Alvo' : 'Focar'}
                            </button>
                            <button onclick="window.removeCombatant('${c.cid}')" class="text-stone-600 hover:text-red-400 px-1" title="Remover da mesa">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Medidores Numéricos e Ajustes Rápidos -->
                    <div class="space-y-2">
                        <!-- HP -->
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="text-red-400/90 font-bold flex items-center gap-1"><i class="fa-solid fa-heart text-[9px]"></i> HP</span>
                            <div class="flex items-center gap-1 font-mono">
                                <button onclick="adjustCombatStat('${c.cid}', 'hp', -5)" class="px-1 text-[9px] border border-stone-800 rounded bg-black/40 hover:bg-red-950/40 text-red-300">-5</button>
                                <span class="font-bold text-red-300 mx-1">${c.hp}/${c.maxHp}</span>
                                <button onclick="adjustCombatStat('${c.cid}', 'hp', 5)" class="px-1 text-[9px] border border-stone-800 rounded bg-black/40 hover:bg-green-950/40 text-green-300">+5</button>
                            </div>
                        </div>

                        <!-- Postura / Guarda -->
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="text-purple-400/90 font-bold flex items-center gap-1"><i class="fa-solid fa-shield-halved text-[9px]"></i> Postura</span>
                            <div class="flex items-center gap-1 font-mono">
                                <button onclick="adjustCombatStat('${c.cid}', 'lust', -10)" class="px-1 text-[9px] border border-stone-800 rounded bg-black/40 hover:bg-emerald-950/40 text-emerald-300">-10</button>
                                <span class="font-bold ${isStagger ? 'text-red-400 animate-pulse' : 'text-purple-300'} mx-1">${c.lust || 0}/${c.maxLust || 100}</span>
                                <button onclick="adjustCombatStat('${c.cid}', 'lust', 10)" class="px-1 text-[9px] border border-stone-800 rounded bg-black/40 hover:bg-purple-950/40 text-purple-300">+10</button>
                            </div>
                        </div>

                        <!-- PA / Fôlego -->
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="text-sky-400/90 font-bold flex items-center gap-1"><i class="fa-solid fa-bolt text-[9px]"></i> PA</span>
                            <div class="flex items-center gap-1 font-mono">
                                <button onclick="adjustCombatStat('${c.cid}', 'stamina', -1)" class="px-1 text-[9px] border border-stone-800 rounded bg-black/40 hover:bg-sky-950/40 text-sky-300">-1</button>
                                <span class="font-bold text-sky-300 mx-1">${c.stamina}/${c.maxSt}</span>
                                <button onclick="adjustCombatStat('${c.cid}', 'stamina', 1)" class="px-1 text-[9px] border border-stone-800 rounded bg-black/40 hover:bg-sky-950/40 text-sky-300">+1</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            listEl.appendChild(card);
        });
    }

    // Auto-salvar no localStorage
    localStorage.setItem('bd_combat_state', JSON.stringify(combatState));

    // Inicializar listener de teclado para atalhos autênticos de Clair Obscur (Q, W, E, F, Tab)
    if (!window._e33KeysAttached) {
        window._e33KeysAttached = true;
        window.addEventListener('keydown', (e) => {
            if (window.currentTab !== 'rpg') return;
            const tag = (document.activeElement && document.activeElement.tagName) || '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            // Se o modal de reação (Ataque Iminente) estiver aberto, processa as teclas Q, E, F, Espaço, Esc
            const incomingModal = document.getElementById('modal-incoming-attack');
            if (incomingModal && incomingModal.open) {
                const k = e.key.toLowerCase();
                // Se o minigame rítmico E33 estiver rodando, registra a batida com Espaço, Enter, Q ou E
                if (window.e33RhythmState && window.e33RhythmState.active) {
                    if (k === ' ' || k === 'enter' || k === 'q' || k === 'e') {
                        e.preventDefault();
                        window.recordE33RhythmBeat();
                        return;
                    }
                }
                // Fallback para qteState legado se existente
                if (window.qteState && window.qteState.active) {
                    if (k === ' ' || k === 'enter' || k === 'q' || k === 'e') {
                        e.preventDefault();
                        window.stopQTE();
                        return;
                    }
                }
                if (k === 'q') {
                    e.preventDefault();
                    window.startE33RhythmEvent('dodge');
                    return;
                } else if (k === 'e') {
                    e.preventDefault();
                    window.startE33RhythmEvent('parry');
                    return;
                } else if (k === 'f') {
                    e.preventDefault();
                    window.resolveIncomingDefense('block');
                    return;
                } else if (k === ' ' || k === 'enter') {
                    e.preventDefault();
                    window.resolveIncomingDefense('take');
                    return;
                } else if (k === 'escape') {
                    e.preventDefault();
                    window.closeIncomingAttackModal();
                    return;
                }
            }

            const openModal = document.querySelector('dialog[open]');
            if (openModal) return;

            if (!combatState.combatants || combatState.combatants.length === 0) return;
            const curActive = combatState.combatants[0];
            if (!curActive) return;

            const key = e.key.toLowerCase();
            if (key === 'q') {
                e.preventDefault();
                window.quickCombatShoot(curActive.cid);
            } else if (key === 'w') {
                e.preventDefault();
                window.openCombatItemsModal(curActive.cid);
            } else if (key === 'e') {
                e.preventDefault();
                window.openCombatSkillsModal(curActive.cid);
            } else if (key === 'f') {
                e.preventDefault();
                window.quickCombatPhysical(curActive.cid);
            } else if (key === 'tab') {
                e.preventDefault();
                window.nextTurn();
            }
        });
    }
}

window.removeCombatant = function(cid) {
    combatState.combatants = combatState.combatants.filter(c => c.cid !== cid);
    renderRPG();
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
};

window.openExtendedActionsModal = function() {
    const char = getActiveChar();
    if (!char) return;
    
    document.getElementById('extended-actions-char-name').innerText = char.name;
    const tbody = document.getElementById('extended-actions-table');
    tbody.innerHTML = '';
    
    const force = char.attr.for || 0;
    const agi = char.attr.agi || 0;
    const vit = char.attr.vit ?? char.attr.con ?? 0;
    const chr = char.attr.chr ?? char.attr.mis ?? 0;
    const per = char.attr.per ?? char.attr.von ?? 0;
    
    const actions = [
        // FÍSICO
        { cat: "Físico", name: "Golpe Básico", effect: `Dano Arma + ${force} HP (+1d4 Postura)`, cost: "1 PA", desc: "Ataque veloz com a arma equipada. Teste de FOR vs Defesa." },
        { cat: "Físico", name: "Golpe Pesado de Ruptura", effect: `1d10 + ${force} HP (+2d4 Postura)`, cost: "2 PA", desc: "Ataque com peso concentrado visando rachar a postura do adversário." },
        { cat: "Físico", name: "Estocada de Lumière", effect: `1d8 + ${agi} HP (Crítico 18-20)`, cost: "1 PA", desc: "Ataque rápido e penetrante que explora brechas na guarda do Nevii." },
        { cat: "Físico", name: "Disparo em Ponto Fraco", effect: `1d10 + ${per} HP (+3d4 Postura)`, cost: "2 PA", desc: "Disparo à distância mirando no ponto fraco revelado pela Percepção." },
        { cat: "Físico", name: "Sequência Rápida", effect: `2x (1d4 + ${Math.floor(force/2)}) HP`, cost: "2 PA", desc: "Dois golpes rápidos consecutivos. Cada acerto acumula impacto de postura." },
        { cat: "Físico", name: "Investida com Escudo / Guarda", effect: `1d6 + ${force} HP + Derruba`, cost: "1 PA", desc: "Colide contra o alvo com a guarda erguida, forçando teste resistido de Força." },
        { cat: "Físico", name: "Finalização de Stagger", effect: `3d10 + ${force * 2} HP Crítico`, cost: "2 PA", desc: "Só pode ser usado contra alvos em Guarda Quebrada (Stagger). Golpe devastador." },

        // PICTOS / HABILIDADES
        { cat: "Pictos", name: "Pincelada Ardente", effect: `2d8 + ${chr} Dano (+Fogo)`, cost: "2 PA", desc: "Traço incandescente que incendeia e desestabiliza a matéria do Nevii." },
        { cat: "Pictos", name: "Mancha de Gelo", effect: `1d8 + ${chr} Dano + Reduz PA Alvo`, cost: "2 PA", desc: "Pigmento congelante que retarda a velocidade e a recuperação de postura do inimigo." },
        { cat: "Pictos", name: "Impacto Esmaecido", effect: `2d8 + ${chr} Dano • +8 Postura`, cost: "2 PA", desc: "Canaliza poder concentrado de ataque que atinge o cerne da postura adversária." },
        { cat: "Pictos", name: "Pincelada Curativa", effect: `Cura 2d8 + ${chr} HP do Aliado`, cost: "2 PA", desc: "Pinta uma runa curativa de Lumière restaurando a vitalidade de um aliado." },
        { cat: "Pictos", name: "Barreira Cromática", effect: `Concede +25 Postura e +2 DF`, cost: "1 PA", desc: "Escudo de tinta endurecida que absorve impacto e protege a postura." },
        { cat: "Pictos", name: "Tormenta de Golpes", effect: `3d8 + ${chr} em área + 12 Postura`, cost: "3 PA", desc: "Uma torrente violenta de ataques contínuos que engole o alvo com múltiplas estocadas." },

        // DEFESA & REATIVO
        { cat: "Defesa", name: "Aparar (Parry de Precisão)", effect: `Anula Dano + Contra-Ataque`, cost: "Reação (0 PA)", desc: "Teste de Percepção vs Acerto. Se vencer, desvia 100% do golpe e causa dano de postura imediato." },
        { cat: "Defesa", name: "Esquiva Fluida", effect: `Evita Dano Inteiramente`, cost: "Reação (1 PA)", desc: "Rolamento sobre cinzas. Teste de Agilidade (8 + 2dAGI) contra ataque inimigo." },
        { cat: "Defesa", name: "Bloqueio com Guarda", effect: `Absorve com Postura (-DF)`, cost: "Reação (0 PA)", desc: "Ergue a guarda. Reduz o dano de HP a zero, convertendo o impacto em dano de Postura." },
        { cat: "Defesa", name: "Recuperar Guarda", effect: `Restaura 25 de Postura`, cost: "1 PA", desc: "Recua um passo, respira e recompõe a postura defensiva antes que quebre." },
        { cat: "Defesa", name: "Proteger Companheiro", effect: `Intercepta Ataque no Aliado`, cost: "Reação (1 PA)", desc: "Entra na frente do golpe direcionado a um companheiro de expedição vulnerável." },

        // TÁTICA & SUPORTE
        { cat: "Suporte", name: "Focar Ponto Fraco", effect: `+${per} no Próx. Ataque e 2x Postura`, cost: "1 PA", desc: "Analisa a criatura e aponta o núcleo frágil do monstro para o grupo." },
        { cat: "Suporte", name: "Gritar Encorajamento de Lumière", effect: `+1d4 em todos os Testes de Aliados`, cost: "1 PA", desc: "Lembrar a todos pelo que estão lutando na Expedição 33." },
        { cat: "Suporte", name: "Elixir de Fôlego", effect: `Restaura +2 PA Imediatamente`, cost: "Item (1 Ação)", desc: "Consome essência revigorante para recuperar pontos de ação em combate." },
        { cat: "Suporte", name: "Pó Restaurador", effect: `Alivia Aflições e +1 PA`, cost: "Item (1 Ação)", desc: "Sais aromáticos que recuperam a clareza e concedem 1 PA." },
        { cat: "Suporte", name: "Distrair Nevii", effect: `Desvantagem no Ataque do Inimigo`, cost: "1 PA", desc: "Chama a atenção do monstro com barulho ou movimento em falso." }
    ];
    
    actions.forEach(act => {
        let catColor = act.cat === 'Físico' ? 'text-red-400' : act.cat === 'ERPG' ? 'text-purple-300' : act.cat === 'Defesa' ? 'text-sky-300' : 'text-[#bfa888]';
        tbody.innerHTML += `
            <tr class="hover:bg-[#141416]/70 transition-colors border-b border-[#bfa888]/15">
                <td class="py-3 pr-2 align-top">
                    <div class="font-bold text-xs text-[#ede3d2]">${escapeHTML(act.name)}</div>
                    <div class="text-[9px] ${catColor} uppercase mt-1 tracking-wider font-mono">${escapeHTML(act.cat)}</div>
                </td>
                <td class="py-3 pr-2 text-[#bfa888] font-bold align-top text-xs font-mono">${escapeHTML(act.effect)}</td>
                <td class="py-3 pr-2 text-[#a89f91] text-xs align-top font-mono">${escapeHTML(act.cost)}</td>
                <td class="py-3 text-[#a89f91] text-xs align-top leading-relaxed italic ">${escapeHTML(act.desc)}</td>
            </tr>
        `;
    });
    
    document.getElementById('modal-extended-actions').showModal();
};

// INIT
initPerksUI();
loadData();

// --- SISTEMA DE DANO DO MESTRE ---

window.updateMasterDamageUI = function() {
    const sSelect = document.getElementById('inp-dmg-source');
    const diceDiv = document.getElementById('dmg-manual-dice');
    if (sSelect && diceDiv) {
        if (sSelect.value === 'custom') {
            diceDiv.classList.remove('hidden');
        } else {
            diceDiv.classList.add('hidden');
        }
    }
};

const btnMasterDmg = document.getElementById('btn-master-damage');
if (btnMasterDmg) {
    btnMasterDmg.addEventListener('click', () => {
        const tSelect = document.getElementById('inp-dmg-target');
        const aSelectAttr = document.getElementById('inp-dmg-attacker');
        if (!tSelect || !aSelectAttr) return;
        tSelect.innerHTML = '';
        aSelectAttr.innerHTML = '<option value="">Nenhum / Ambiente / Nevii</option>';
        
        if (!aSelectAttr.dataset.listenerAdded) {
            aSelectAttr.addEventListener('change', (e) => {
                window.populateAttackerWeapons(e.target.value);
                window.updateMasterDamageUI();
            });
            aSelectAttr.dataset.listenerAdded = "true";
        }
        
        combatState.combatants.forEach(c => {
            const optT = document.createElement('option');
            optT.value = c.cid;
            optT.innerText = c.name + (c.isMonster ? ' [Criatura]' : ' [Expedicionário]');
            tSelect.appendChild(optT);
            
            const optA = document.createElement('option');
            optA.value = c.cid;
            optA.innerText = c.name + (c.isMonster ? ' [Criatura]' : ' [Expedicionário]');
            aSelectAttr.appendChild(optA);
        });
        
        // Auto-select target: prefer an expedicionário if attacker is monster
        if (combatState.selectedTargetCid && combatState.combatants.some(c => c.cid === combatState.selectedTargetCid)) {
            tSelect.value = combatState.selectedTargetCid;
        } else if (combatState.combatants.length > 0) {
            tSelect.value = combatState.combatants[0].cid;
        }
        
        window.populateAttackerWeapons('');
        window.updateMasterDamageUI();
        
        const dmgModal = document.getElementById('modal-apply-damage');
        if (dmgModal) dmgModal.showModal();
    });
}

window.populateAttackerWeapons = function(cid) {
    const sSelect = document.getElementById('inp-dmg-source');
    if (!sSelect) return;
    let weaponGroup = '<option value="custom">Rolagem Manual (Personalizada)</option>';
    
    if (cid) {
        let combatant = combatState.combatants.find(c => c.cid === cid);
        if (combatant) {
            if (!combatant.isMonster) {
                let char = characters.find(c => c.id === combatant.refId);
                if (char && char.equipment) {
                    let equippedWeapons = [];
                    ['hand_1', 'hand_2'].forEach(slot => {
                        if (char.equipment[slot]) {
                            let wp = globalWeapons.find(w => w.id === char.equipment[slot]);
                            if (wp && !equippedWeapons.find(ew => ew.id === wp.id)) {
                                equippedWeapons.push(wp);
                            }
                        }
                    });
                    
                    if (equippedWeapons.length > 0) {
                        weaponGroup += `<optgroup label="Armas Equipadas">`;
                        equippedWeapons.forEach(wp => {
                            let dmgStr = `${wp.diceCount}d${wp.diceFaces}`;
                            if (wp.dmgMod > 0) dmgStr += `+${wp.dmgMod}`;
                            else if (wp.dmgMod < 0) dmgStr += `${wp.dmgMod}`;
                            weaponGroup += `<option value="weapon:${wp.id}">Atacar com ${escapeHTML(wp.name)} (${dmgStr})</option>`;
                        });
                        weaponGroup += `</optgroup>`;
                    }
                }
            } else {
                weaponGroup += `<optgroup label="Golpes de Nevii / Criatura">
                    <option value="1d6+2">Garras de Tinta (1d6+2)</option>
                    <option value="2d6+4">Investida Brutal de Nevii (2d6+4)</option>
                    <option value="2d8+3">Pincelada Corrompida (2d8+3)</option>
                </optgroup>`;
            }
        }
    }
    sSelect.innerHTML = weaponGroup;
    window.updateMasterDamageUI();
};

window.getAttackTags = function(attackName) {
    let tags = [];
    if(!attackName) return tags;
    let n = attackName.toLowerCase();
    
    if (n.includes("soco") || n.includes("chute") || n.includes("fricção") || n.includes("arma") || n.includes("pesado") || n.includes("brutal")) tags.push("Punhos / Artes Marciais", "Armas Colossais / Machado e Montante", "Pés/Pernas", "Braços");
    if (n.includes("arremesso") || n.includes("encontrão")) tags.push("Braços", "Pegada/Mãos");
    if (n.includes("furtivo") || n.includes("adaga")) tags.push("Mãos/Dedos");
    
    if (n.includes("raio") || n.includes("magia") || n.includes("ritual")) tags.push("Bruxaria / Maldições", "Artes Proibidas");
    if (n.includes("fogo") || n.includes("explosão")) tags.push("Pirotecnia", "Bruxaria / Maldições");
    
    if (n.includes("toque") || n.includes("apalpar") || n.includes("masturbação")) tags.push("Mãos/Dedos", "Pegada/Mãos");
    if (n.includes("beijo") || n.includes("oral") || n.includes("verbal")) tags.push("Lábios/Fala", "Fluidos Excitantes");
    if (n.includes("penetração") || n.includes("cavalgada") || n.includes("montaria") || n.includes("fricção")) tags.push("Dotação / Membro", "Quadril/Glúteos");
    if (n.includes("brinquedos") || n.includes("amarras")) tags.push("Bondage / Amarras", "Mãos/Dedos");
    
    return tags;
};

window.parsePerkBuffs = function(char, dmgType, isAttacker, attackBodyPart = 'Geral') {
    let buff = { flat: 0, pct: 0, diceCount: 0, diceFaces: 0, notes: [] };
    if(!char || !char.perks) return buff;

    const parseText = (text, perkName) => {
        if (!text) return;
        
        let applicable = false;
        let isLust = text.toLowerCase().includes('lust');
        let isMag = text.toLowerCase().includes('mágic') || text.toLowerCase().includes('magic');
        let isDef = text.toLowerCase().includes('defesa') || text.toLowerCase().includes('reduz') || text.toLowerCase().includes('resist');
        
        if (isAttacker && isDef) return; // Attackers don't get defense buffs on attack
        if (!isAttacker && text.toLowerCase().includes('dano') && !isDef) return; // Defenders don't get attack buffs

        if (isLust && !['LUST', 'LUST_MAG'].includes(dmgType)) return;
        if (isMag && !['MAG', 'HP_MAG', 'LUST_MAG'].includes(dmgType)) return;
        
        if (isAttacker) {
            const bodyPartMap = {
                'Toque/Mãos': ['Mãos/Dedos', 'Punhos', 'Braços', 'Pegada'],
                'Pés/Pernas': ['Pés/Pernas', 'Coxas', 'Pés'],
                'Lábios/Fala': ['Lábios/Fala'],
                'Quadril/Glúteos': ['Quadril/Glúteos'],
                'Peitos/Peitoral': ['Peitos/Peitoral'],
                'Dotação / Membro': ['Dotação / Membro', 'Fluidos']
            };
            
            let isRestricted = false;
            let requiredBodyPart = null;
            for (const [bp, categories] of Object.entries(bodyPartMap)) {
                if (categories.some(c => perkName.includes(c) || c.includes(perkName))) {
                    isRestricted = true;
                    requiredBodyPart = bp;
                    break;
                }
            }

            if (isRestricted && attackBodyPart !== 'Geral' && attackBodyPart !== requiredBodyPart) {
                return; 
            }
            if (isRestricted && attackBodyPart === 'Geral' && requiredBodyPart !== 'Toque/Mãos' && requiredBodyPart !== 'Pés/Pernas') {
                if (!perkName.includes('Feromônios') && !perkName.includes('Presença')) return;
            }

            let mPct = text.match(/Dano.*?(\+|-)\s*(\d+)%/i);
            if (mPct) { buff.pct += parseInt(mPct[1] + mPct[2]); buff.notes.push(`${perkName} (${mPct[1]}${mPct[2]}%)`); applicable = true; }
            
            let mDice = text.match(/Dano.*?(\+|-)\s*(\d+)d(\d+)/i);
            if (mDice) { buff.diceCount += parseInt(mDice[2]); buff.diceFaces += parseInt(mDice[3]); buff.notes.push(`${perkName} (${mDice[1]}${mDice[2]}d${mDice[3]})`); applicable = true; }
            else {
                let mFlat = text.match(/Dano.*?(\+|-)\s*(\d+)(?!\w|d|%)/i);
                if (mFlat) { buff.flat += parseInt(mFlat[1] + mFlat[2]); buff.notes.push(`${perkName} (${mFlat[1]}${mFlat[2]})`); applicable = true; }
            }
        } else {
            let mPct1 = text.match(/Reduz.*?(\+|-)?\s*(\d+)%/i) || text.match(/Resist.*?(\+|-)?\s*(\d+)%/i);
            let mPct2 = text.match(/Dano.*?-\s*(\d+)%/i);
            
            if (mPct1) { buff.pct -= parseInt(mPct1[2] || 0); buff.notes.push(`${perkName} (-${mPct1[2] || 0}% Dano)`); applicable = true; }
            else if (mPct2) { buff.pct -= parseInt(mPct2[1] || 0); buff.notes.push(`${perkName} (-${mPct2[1] || 0}% Dano)`); applicable = true; }
            
            let mFlat1 = text.match(/Defesa.*?(\+|-)\s*(\d+)/i);
            let mFlat2 = text.match(/Dano.*?-\s*(\d+)(?!\w|d|%)/i);
            
            if (mFlat1) { buff.flat += parseInt((mFlat1[1] || '+') + (mFlat1[2] || 0)); buff.notes.push(`${perkName} (Defesa ${mFlat1[1] || '+'}${mFlat1[2] || 0})`); applicable = true; }
            else if (mFlat2) { buff.flat += parseInt(mFlat2[1] || 0); buff.notes.push(`${perkName} (Defesa +${mFlat2[1] || 0})`); applicable = true; }
        }
    };

    if (char.perks && typeof PERKS_DB !== 'undefined' && PERKS_DB) {
        Object.keys(char.perks).forEach(rawAttr => {
            const attr = (rawAttr === 'con' || rawAttr === 'vig') ? 'vit' : (rawAttr === 'von' ? 'per' : ((rawAttr === 'sed' || rawAttr === 'mis') ? 'chr' : rawAttr));
            if (!PERKS_DB[attr] || !PERKS_DB[attr].perks) return;
            Object.keys(char.perks[rawAttr] || {}).forEach(pName => {
                let lvl = char.perks[rawAttr][pName];
                if (lvl > 0) {
                    const perkDef = PERKS_DB[attr].perks[pName];
                    if (!perkDef) return; 
                    
                    const pText = perkDef[lvl - 1];
                    if (!pText) return;
                    
                    parseText(pText, pName);
                }
            });
        });
    }
    
    return buff;
};

window.rollDiceExpr = function(expr) {
    if(!expr || typeof expr !== 'string') return 0;
    
    // Replace attributes like MAX(SED, FOR) with max values
    expr = expr.replace(/MAX\(([^,]+),\s*([^)]+)\)/gi, (match, p1, p2) => {
        let v1 = parseInt(p1) || 0;
        let v2 = parseInt(p2) || 0;
        return Math.max(v1, v2).toString();
    });
    
    let parts = expr.toLowerCase().replace(/-/g, '+-').split('+').map(s => s.trim()).filter(s => s);
    let total = 0;
    
    for(let p of parts) {
        const match = p.match(/^(-?)(\d+)d(\d+)$/);
        if(match) {
            let sign = match[1] === '-' ? -1 : 1;
            let count = parseInt(match[2]);
            let faces = parseInt(match[3]);
            let subtotal = 0;
            for(let i=0; i<count; i++) subtotal += Math.floor(Math.random() * faces) + 1;
            total += (subtotal * sign);
        } else {
            let val = parseInt(p);
            if(!isNaN(val)) total += val;
        }
    }
    return total;
};

document.getElementById('btn-dmg-confirm').addEventListener('click', () => {
    try {
        const targetCid = document.getElementById('inp-dmg-target').value;
        const target = combatState.combatants.find(c => c.cid === targetCid);
        if(!target) {
            alert("Alvo não encontrado!");
            return;
        }

        let srcVal = document.getElementById('inp-dmg-source')?.value || 'custom';
        let diceC = parseInt(document.getElementById('inp-dmg-dice-c')?.value) || 1;
        let diceF = parseInt(document.getElementById('inp-dmg-dice-f')?.value) || 8;
        let expr = `${diceC}d${diceF}`;
        let weaponToDegrade = null;
        
        if (srcVal && srcVal.startsWith('weapon:')) {
            let wpId = srcVal.split(':')[1];
            let wp = globalWeapons.find(w => w.id === wpId);
            if (wp) {
                weaponToDegrade = wp;
                expr = `${wp.diceCount}d${wp.diceFaces}`;
                if (wp.dmgMod > 0) expr += `+${wp.dmgMod}`;
                else if (wp.dmgMod < 0) expr += `${wp.dmgMod}`;
            }
        }

        const attackerCid = document.getElementById('inp-dmg-attacker').value;
        const attacker = combatState.combatants.find(c => c.cid === attackerCid);
        let attackerChar = null;

        if(attacker && !attacker.isMonster) {
            attackerChar = characters.find(c => c.id === attacker.refId);
            if(attackerChar) {
                const a = attackerChar.attr || {};
                expr = expr.replace(/FOR/gi, a.for || 0)
                           .replace(/AGI/gi, a.agi || 0)
                           .replace(/SED/gi, a.sed || 0)
                           .replace(/MIS/gi, a.mis || 0)
                           .replace(/CON/gi, a.con || 0)
                           .replace(/VIG/gi, a.vig || 0)
                           .replace(/VON/gi, a.von || 0);

                expr = expr.replace(/MAX\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi, (m, p1, p2) => Math.max(parseInt(p1), parseInt(p2)));
                expr = expr.replace(/MIN\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi, (m, p1, p2) => Math.min(parseInt(p1), parseInt(p2)));
                expr = expr.replace(/(\d+)\s*\/\s*(\d+)/g, (m, p1, p2) => Math.max(parseInt(p1), parseInt(p2)));
            }
        }

        const dmgType = document.getElementById('inp-dmg-type').value;
        const cond = document.getElementById('inp-dmg-cond')?.value || 'normal';
        const mod = parseInt(document.getElementById('inp-dmg-mod').value) || 0;
        const targetZone = document.getElementById('inp-dmg-target-zone')?.value || 'Qualquer';

        let r1 = rollDiceExpr(expr);
        let r2 = rollDiceExpr(expr);
        let baseDano = r1;

        if(cond === 'vantagem') baseDano = Math.max(r1, r2);
        else if(cond === 'desvantagem') baseDano = Math.min(r1, r2);
        const isCrit = document.getElementById('inp-dmg-crit')?.checked;
        if (isCrit) baseDano *= 2;

        // --- AUTOMATED PERKS SYSTEM ---
        const attackBodyPart = document.getElementById('inp-dmg-bodypart')?.value || 'Geral';
        let atkBuffs = parsePerkBuffs(attackerChar, dmgType, true, attackBodyPart);

        let defChar = target.isMonster ? null : characters.find(c => c.id === target.refId);
        let defBuffs = parsePerkBuffs(defChar, dmgType, false, 'Geral');

        // Apply Attacker Buffs
        baseDano += atkBuffs.flat;
        let extraDiceTotal = 0;
        for(let i=0; i<atkBuffs.diceCount; i++) extraDiceTotal += Math.floor(Math.random() * atkBuffs.diceFaces) + 1;
        baseDano += extraDiceTotal;
        baseDano = Math.floor(baseDano * (1 + (atkBuffs.pct / 100)));

        let logNotes = [];
        if(atkBuffs.notes.length > 0) logNotes.push(`Buffs de Ataque: ${atkBuffs.notes.join(', ')}`);
        if(defBuffs.notes.length > 0) logNotes.push(`Defesas Especiais: ${defBuffs.notes.join(', ')}`);

        if (defChar && defChar.erogenousZones && defChar.erogenousZones.includes(targetZone) && ['LUST', 'LUST_MAG'].includes(dmgType)) {
            let eroBoost = Math.floor(baseDano * 0.20);
            baseDano += eroBoost;
            logNotes.push(`Ataque em Zona Erógena! (${targetZone}: +${eroBoost} Dano Lust)`);
        }

        let defesaTotal = defBuffs.flat;
        let raceTpl = "";
        let classTpl = "";

        if(!target.isMonster) {
            if(defChar) {
                const pMods = getCharModifiers(defChar, targetZone);
                if(['HP', 'HP_MAG', 'MAG', 'FOGO', 'GELO', 'ELETRICO', 'VENENO'].includes(dmgType)) defesaTotal += Math.floor(pMods.con * 1);
                if(['LUST', 'LUST_MAG'].includes(dmgType)) defesaTotal += Math.floor(pMods.von * 1);

                let eqDef = 0;
                if (dmgType === 'HP') eqDef = pMods.df_hp || 0;
                else if (dmgType === 'HP_MAG') eqDef = pMods.df_hpmag || 0;
                else if (['MAG', 'FOGO', 'GELO', 'ELETRICO', 'VENENO'].includes(dmgType)) eqDef = pMods.df_mag || 0;
                else if (dmgType === 'LUST') eqDef = pMods.df_lust || 0;
                else if (dmgType === 'LUST_MAG') eqDef = pMods.df_lustmag || 0;

                if (eqDef > 0) {
                    defesaTotal += eqDef;
                    logNotes.push(`Armadura/Acessórios (${eqDef})`);
                }

                if (defBuffs.pct !== 0) {
                    let block = Math.floor(baseDano * (Math.abs(defBuffs.pct) / 100));
                    if (defBuffs.pct < 0) {
                        defesaTotal += block;
                        logNotes.push(`Vantagens Defensivas (${Math.abs(defBuffs.pct)}%) bloquearam ${block}`);
                    } else {
                        defesaTotal -= block;
                        logNotes.push(`Vulnerabilidade (${defBuffs.pct}%) tomou +${block}`);
                    }
                }

                raceTpl = defChar.race || "";
                classTpl = defChar.class || "";
            }
        } else {
            const mObj = monsters.find(m => m.id === target.refId);
            if(mObj) {
                if(['HP', 'HP_MAG', 'MAG', 'FOGO', 'GELO', 'ELETRICO', 'VENENO'].includes(dmgType)) defesaTotal += Math.floor((mObj.con || 5) * 1);
                if(['LUST', 'LUST_MAG'].includes(dmgType)) defesaTotal = Math.floor((mObj.von || 5) * 1);

                if(mObj.modifiers && mObj.modifiers[dmgType]) {
                    const modData = mObj.modifiers[dmgType];
                    if(modData.def) {
                        defesaTotal += modData.def;
                        logNotes.push(`Defesa Extra: ${modData.def > 0 ? '+' : ''}${modData.def}`);
                    }
                    if(modData.red > 0) {
                        const percent = modData.red / 100;
                        const dmgReduced = Math.floor((baseDano + mod) * percent);
                        defesaTotal += dmgReduced;
                        logNotes.push(`Redução (-${modData.red}% Dano)`);
                    }
                    if(modData.vuln > 0) {
                        const percent = modData.vuln / 100;
                        const dmgExtra = Math.floor((baseDano + mod) * percent);
                        defesaTotal -= dmgExtra;
                        logNotes.push(`Vulnerabilidade (+${modData.vuln}% Dano)`);
                    }
                }
            }
        }

        let isAttackerDemon = false;
        if (attacker && attacker.isMonster) {
            const m = monsters.find(x => x.id === attacker.refId);
            if (m && m.type && (m.type.toLowerCase().includes('demônio') || m.type.toLowerCase().includes('demonio') || m.type.toLowerCase().includes('infernal'))) {
                isAttackerDemon = true;
            }
        }

        let humanoResilienciaAtiva = false;
        if (raceTpl === 'Humano') {
            if (defChar) {
                const tStats = getClassStats(classTpl);
                const maxHp = tStats.hp + (defChar.attr.con * 10);
                const maxSt = tStats.st + (defChar.attr.vig * 5);
                if (defChar.hp <= (maxHp * 0.5) || defChar.stamina <= (maxSt * 0.5)) {
                    humanoResilienciaAtiva = true;
                    if (['LUST', 'LUST_MAG'].includes(dmgType)) {
                        defesaTotal += 4;
                        logNotes.push("[Defesa do Alvo] Resiliência Humana Ativada (+4 Def. Lust)");
                    }
                }
            }
            if (['LUST', 'LUST_MAG'].includes(dmgType) && isAttackerDemon) {
                defesaTotal -= 3;
                if(defesaTotal < 0) defesaTotal = 0;
                logNotes.push("[Fraqueza do Alvo] Carne Ordinária (Humano: -3 Def. Lust vs Demônios)");
            }
        }

        if (raceTpl === 'Celestiais' && defChar) {
            const tStats = getClassStats(classTpl);
            const maxHp = tStats.hp + (defChar.attr.con * 10);
            const maxLust = tStats.lust;
            const currentHp = defChar.hp;
            const currentLust = defChar.lust;
            
            const isEnfraquecido = (currentHp <= (maxHp * 0.25)) || (currentLust >= (maxLust * 0.80));
            
            if (!isEnfraquecido && isAttackerDemon) {
                defesaTotal += 2;
                if (['LUST', 'LUST_MAG'].includes(dmgType)) defesaTotal += 4;
                logNotes.push("[Defesa do Alvo] Energia Celestial (+2 DF, +4 DLust vs Demônios)");
            } else if (isEnfraquecido && isAttackerDemon) {
                logNotes.push("[Defesa do Alvo] Sangue Enfraquecido (Energia Celestial anulada pelo cansaço)");
            }
        }

        if(classTpl === 'Bulwark') {
            defesaTotal += 3;
            logNotes.push("[Defesa do Alvo] Égide de Defesa (Bulwark: +3 Defesa Geral)");
            if(['HP', 'HP_MAG'].includes(dmgType)) {
                defesaTotal += 2;
                logNotes.push("[Defesa do Alvo] Vanguarda (Bulwark: +2 Redução Física)");
            }
        }

        if (isNaN(defesaTotal) || defesaTotal === null) defesaTotal = 0;
        
        let danoTotal = baseDano + mod - defesaTotal;
        if (isNaN(danoTotal) || danoTotal === null) danoTotal = 0;
        if(danoTotal < 0) danoTotal = 0;

        // --- DURABILITY DEGRADATION ---
        let itemsSaved = false;
        if (weaponToDegrade && weaponToDegrade.durability > 0) {
            weaponToDegrade.durability -= 1;
            logNotes.push(`Durabilidade da arma (${weaponToDegrade.name}) reduziu para ${weaponToDegrade.durability}/${weaponToDegrade.maxDurability}`);
            if (weaponToDegrade.durability <= 0) {
                logNotes.push(`⚠️ A arma (${weaponToDegrade.name}) quebrou!`);
            }
            window.saveToDB('global_weapons', weaponToDegrade, globalWeapons, 'bd_weapons');
            itemsSaved = true;
        }

        if (defChar && defChar.equipment && targetZone !== 'Qualquer' && ['HP', 'HP_MAG'].includes(dmgType)) {
            ['head', 'body', 'back', 'waist', 'feet', 'intimate'].forEach(slot => {
                let armorId = defChar.equipment[slot];
                if (armorId) {
                    let ar = globalArmors.find(a => a.id === armorId);
                    if (ar && ar.protectedZones && ar.protectedZones.includes(targetZone)) {
                        if (ar.durability > 0) {
                            ar.durability -= 1;
                            logNotes.push(`Durabilidade da armadura (${ar.name}) reduziu para ${ar.durability}/${ar.maxDurability}`);
                            if (ar.durability <= 0) {
                                logNotes.push(`⚠️ A armadura (${ar.name}) quebrou e precisa ser reparada!`);
                            }
                            window.saveToDB('global_armors', ar, globalArmors, 'bd_armors');
                            itemsSaved = true;
                        }
                    }
                }
            });
        }
        
        if(itemsSaved && window.renderCharacterModal && document.getElementById('modal-edit-char').open) {
            window.renderCharacterModal(defChar || attackerChar);
        }

        if (humanoResilienciaAtiva && ['LUST', 'LUST_MAG'].includes(dmgType)) {
            danoTotal = Math.floor(danoTotal * 0.85);
            logNotes.push("[Defesa do Alvo] Resiliência Humana Ativada (-15% Dano Lust Recebido)");
        }

        if(classTpl === 'Artífice' && dmgType === 'MAG') {
            danoTotal = Math.floor(danoTotal * 1.10);
            logNotes.push("[Fraqueza do Alvo] Descrente (Artífice: +10% Dano Recebido Mágico)");
        }

        if(raceTpl === 'Sexualizados') {
            if(['LUST', 'LUST_MAG'].includes(dmgType)) {
                danoTotal = Math.floor(danoTotal * 1.15);
                logNotes.push("[Fraqueza do Alvo] Carne Ordinária (Sexualizado: +15% Dano Lust)");
            } else {
                danoTotal = Math.floor(danoTotal * 1.10);
                logNotes.push("[Fraqueza do Alvo] Carne Ordinária (Sexualizado: +10% Dano Recebido)");
            }
        }

        if(['LUST', 'LUST_MAG'].includes(dmgType)) {
            adjustCombatStat(targetCid, 'lust', danoTotal);
            
            // Auto-conversão de Lust para Magia
            const targetChar = !target.isMonster ? characters.find(c => c.id === target.refId) : null;
            if(targetChar && targetChar.autoConvertLust && danoTotal >= 2) {
                const energyGain = Math.floor(danoTotal / 2);
                targetChar.energy = (targetChar.energy || 0) + energyGain;
                const tStats = getClassStats(targetChar.class);
                if(targetChar.energy > tStats.en) targetChar.energy = tStats.en;
                saveToDB('characters', targetChar, characters, 'bd_characters');
                logNotes.push(`Conversão Automática: +${energyGain} Magia gerada pelo golpe.`);
            }
        } else {
            if (defChar && raceTpl === 'Tiefling' && dmgType === 'HP') {
                if (defChar.hp - danoTotal <= 0 && (!defChar.activeConditionIds || !defChar.activeConditionIds.includes('hellblood_cd'))) {
                    danoTotal = defChar.hp - 1; 
                    if (danoTotal < 0) danoTotal = 0;
                    if (!defChar.activeConditionIds) defChar.activeConditionIds = [];
                    defChar.activeConditionIds.push('hellblood_cd');
                    saveToDB('characters', defChar, characters, 'bd_characters');
                    logNotes.push("[Habilidade Racial] Hellblood! Sangue ferve e o Tiefling se recusa a cair, ficando com 1 HP (Cooldown ativado).");
                }
            }
            adjustCombatStat(targetCid, 'hp', -danoTotal);
        }

        let baseStAttacker = parseInt(document.getElementById('inp-dmg-st-attacker').value) || 0;
        let baseStTarget = parseInt(document.getElementById('inp-dmg-st-target').value) || 0;
        
        let attackerStaminaCost = baseStAttacker;
        let targetStaminaCost = baseStTarget;
        
        if (attackerChar && attackerStaminaCost > 0) {
            const aMods = getCharModifiers(attackerChar);
            if (aMods.st_cost) attackerStaminaCost += aMods.st_cost;
        }
        
        if (defChar && targetStaminaCost > 0) {
            const dMods = getCharModifiers(defChar);
            if (dMods.st_cost) targetStaminaCost += dMods.st_cost;
        }

        if (attackerCid && attackerStaminaCost > 0) adjustCombatStat(attackerCid, 'stamina', -attackerStaminaCost);
        if (targetStaminaCost > 0) adjustCombatStat(targetCid, 'stamina', -targetStaminaCost);

        const logMsg = `Mestre aplicou ${danoTotal} de Dano [${dmgType}] em ${target.name}. (Dano Bruto: ${baseDano+mod} [Rolado: ${baseDano}, Mod: ${mod}] - Defesa: ${defesaTotal}). Notas: ${logNotes.join(', ')} | Stamina Gasta: Atacante -${attackerStaminaCost}, Alvo -${targetStaminaCost}`;

        if(!target.isMonster) {
            const pChar = characters.find(c => c.id === target.refId);
            if(pChar) {
                addLog(pChar, logMsg, 'info');
                saveToDB('characters', pChar, characters, 'bd_characters');
            }
        }

        document.getElementById('modal-apply-damage').close();
        
        // Force UI refresh just in case
        renderRPG();

        alert(`Resultado:\nDano Base Rolado: ${baseDano}\nModificador: ${mod}\nDefesa do Alvo: ${defesaTotal}\n\nDano Final Recebido: ${danoTotal} ${danoTotal === 0 ? '(NENHUM DANO APLICADO!)' : ''}\n\nNotas do Sistema: ${logNotes.join(', ') || 'Nenhuma'}`);

    } catch(err) {
        alert("CRITICAL ERROR: " + err.message + "\n" + err.stack);
        console.error(err);
    }
});

const btnDmgIncoming = document.getElementById('btn-dmg-incoming');
if (btnDmgIncoming) {
    btnDmgIncoming.addEventListener('click', () => {
        try {
            const targetCid = document.getElementById('inp-dmg-target').value;
            const target = combatState.combatants.find(c => c.cid === targetCid);
            if(!target) {
                alert("Alvo não encontrado!");
                return;
            }

            const attackerCid = document.getElementById('inp-dmg-attacker').value;
            let attacker = combatState.combatants.find(c => c.cid === attackerCid);
            if (!attacker) {
                attacker = {
                    cid: 'env_' + Date.now(),
                    name: 'Inimigo / Ameaça',
                    isMonster: true,
                    avatar: '',
                    stamina: 100
                };
            }

            let srcVal = document.getElementById('inp-dmg-source')?.value || 'custom';
            let diceC = parseInt(document.getElementById('inp-dmg-dice-c')?.value) || 1;
            let diceF = parseInt(document.getElementById('inp-dmg-dice-f')?.value) || 8;
            let expr = `${diceC}d${diceF}`;

            if (srcVal && srcVal.startsWith('weapon:')) {
                let wpId = srcVal.split(':')[1];
                let wp = globalWeapons.find(w => w.id === wpId);
                if (wp) expr = `${wp.diceCount}d${wp.diceFaces}`;
            }

            let rollDmg = rollDiceExpr(expr);
            if (isNaN(rollDmg) || rollDmg < 1) rollDmg = Math.floor(Math.random() * 8) + 4;
            const isCrit = document.getElementById('inp-dmg-crit')?.checked;
            if (isCrit) rollDmg *= 2;
            if (isNaN(rollDmg) || rollDmg < 1) rollDmg = Math.floor(Math.random() * 8) + 4;
            let mod = parseInt(document.getElementById('inp-dmg-mod').value) || 0;
            let finalHpDmg = Math.max(1, rollDmg + mod);
            let postureDmg = Math.max(2, Math.floor(finalHpDmg / 2) + 2);
            let hitRoll = Math.floor(Math.random() * 20) + 1 + (attacker.attr?.for || 2);

            const dmgType = document.getElementById('inp-dmg-type').value;

            document.getElementById('modal-apply-damage').close();
            appendCombatLog(`⚡ <strong>${escapeHTML(attacker.name)}</strong> preparou uma investida contra <strong>${escapeHTML(target.name)}</strong>! Aguardando reação...`, 'attack');
            window.triggerIncomingAttack(attacker, target, hitRoll, finalHpDmg, postureDmg, 'Ataque Declarado', dmgType);
        } catch(err) {
            alert("Erro ao disparar ataque iminente: " + err.message);
        }
    });
}

function populateDropdowns() {
    const raceSelect = document.getElementById('inp-race');
    if (raceSelect) {
        raceSelect.innerHTML = '<option value="">-- Nenhuma --</option>';
        if (typeof RACE_TEMPLATES !== 'undefined') {
            for (const race in RACE_TEMPLATES) {
                const opt = document.createElement('option');
                opt.value = race;
                opt.innerText = race;
                raceSelect.appendChild(opt);
            }
        }
    }

    const templateSelect = document.getElementById('inp-template');
    if (templateSelect) {
        templateSelect.innerHTML = '<option value="">+</option>';
        if (typeof CLASS_TEMPLATES !== 'undefined') {
            for (const cls in CLASS_TEMPLATES) {
                const opt = document.createElement('option');
                opt.value = cls;
                opt.innerText = cls;
                templateSelect.appendChild(opt);
            }
        }
    }
}

// Call initially
setTimeout(populateDropdowns, 100);

document.addEventListener('DOMContentLoaded', () => {
    if (window.currentTab === 'rpg') {
        document.getElementById('dashboard-container').classList.add('hidden');
        document.getElementById('no-char-selected').classList.add('hidden');
        document.getElementById('rpg-dashboard-container').classList.remove('hidden');
    } else {
        document.getElementById('rpg-dashboard-container').classList.add('hidden');
        renderDashboard();
    }
});

window.openEditItem = function(type, id) {
    const setVal = (elmId, val) => {
        const el = document.getElementById(elmId);
        if (el) el.value = val;
    };

    if (type === 'armor') {
        const ar = globalArmors.find(a => a.id === id);
        if (!ar || !canEdit(ar)) return alert("Sem permissão ou item não encontrado.");
        editingArmorId = ar.id;
        setVal('inp-g-armor-name', ar.name || '');
        setVal('inp-g-armor-desc', ar.desc || '');
        setVal('inp-g-armor-req', ar.req || '');
        setVal('inp-g-armor-durability', ar.durability || '');
        setVal('inp-g-armor-def-phys', ar.defPhys || '');
        setVal('inp-g-armor-def-lust', ar.defLust || '');
        setVal('inp-g-armor-attr-bonus', ar.attrBonus || '');
        setVal('inp-g-armor-agi-mod', ar.agiMod || '');
        setVal('inp-g-armor-stamina-cost', ar.staminaCost || '');
        setVal('inp-g-armor-exposure', ar.exposure || '');
        setVal('inp-g-armor-exposed-part', ar.exposedPart || '');
        setVal('inp-g-armor-special', ar.special || '');
        setVal('inp-g-armor-category', ar.category || ar.type || '');
        setVal('inp-g-armor-rarity', ar.rarity || 'Comum');
        setVal('inp-g-armor-base', ar.base || 'custom');
        setVal('inp-g-armor-slot', ar.slot || 'body');
        setVal('inp-g-armor-req-attr', ar.reqAttr || 'none');
        setVal('inp-g-armor-req-val', ar.reqVal || '');
        
        const m = ar.mods || {};
        setVal('inp-g-armor-df-hp', m.df_hp ?? m.df ?? 0);
        setVal('inp-g-armor-df-hpmag', m.df_hpmag ?? 0);
        setVal('inp-g-armor-df-mag', m.df_mag ?? 0);
        setVal('inp-g-armor-df-lust', m.df_lust ?? m.dlust ?? 0);
        setVal('inp-g-armor-df-lustmag', m.df_lustmag ?? 0);
        setVal('inp-g-armor-agi', m.agi ?? 0);
        setVal('inp-g-armor-sed', m.sed ?? 0);
        setVal('inp-g-armor-mis', m.mis ?? 0);
        setVal('inp-g-armor-st-cost', m.st_cost ?? 0);
        
        document.getElementById('modal-armor').showModal();
    } else if (type === 'weapon') {
        const wp = globalWeapons.find(w => w.id === id);
        if (!wp || !canEdit(wp)) return alert("Sem permissão ou item não encontrado.");
        window.editingWeaponId = wp.id;
        setVal('inp-w-name', wp.name || '');
        setVal('inp-w-desc', wp.desc || '');
        setVal('inp-w-category', wp.category || '');
        setVal('inp-w-dmg-type', wp.dmgType || 'HP');
        setVal('inp-w-dice-c', wp.diceCount || '');
        setVal('inp-w-dice-f', wp.diceFaces || '');
        setVal('inp-w-dmg-mod', wp.dmgMod || '');
        setVal('inp-w-st-cost', wp.stCost || '');
        setVal('inp-w-durability', wp.durability || '');
        setVal('inp-w-req-attr', wp.reqAttr || 'none');
        setVal('inp-w-req-val', wp.reqVal || '');
        setVal('inp-w-eff-type', wp.effectType || 'none');
        setVal('inp-w-eff-power', wp.effectPower || '');
        setVal('inp-w-eff-dur', wp.effectDuration || '');
        document.getElementById('modal-weapon').showModal();
    } else if (type === 'accessory') {
        const ac = globalAccessories.find(a => a.id === id);
        if (!ac || !canEdit(ac)) return alert("Sem permissão ou item não encontrado.");
        window.editingAccessoryId = ac.id;
        setVal('inp-acc-name', ac.name || '');
        setVal('inp-acc-desc', ac.desc || '');
        setVal('inp-acc-category', ac.category || '');
        setVal('inp-acc-req-attr', ac.reqAttr || 'none');
        setVal('inp-acc-req-val', ac.reqVal || '');
        
        const m = ac.mods || {};
        setVal('inp-acc-df-hp', m.df_hp || '');
        setVal('inp-acc-df-hpmag', m.df_hpmag || '');
        setVal('inp-acc-df-mag', m.df_mag || '');
        setVal('inp-acc-df-lust', m.df_lust || '');
        setVal('inp-acc-df-lustmag', m.df_lustmag || '');
        setVal('inp-acc-agi', m.agi || '');
        setVal('inp-acc-sed', m.sed || '');
        setVal('inp-acc-mis', m.mis || '');
        
        document.getElementById('modal-accessory').showModal();
    } else if (type === 'skill') {
        const sk = globalSkills.find(s => s.id === id);
        if (!sk || !canEdit(sk)) return alert("Sem permissão ou item não encontrado.");
        editingSkillId = sk.id;
        setVal('inp-g-skill-name', sk.name || '');
        setVal('inp-g-skill-bodypart', sk.bodyPart || 'Geral');
        setVal('inp-g-skill-type', sk.type || '');
        setVal('inp-g-skill-cost', sk.cost || '');
        setVal('inp-g-skill-test', sk.test || '');
        setVal('inp-g-skill-desc', sk.desc || '');
        setVal('inp-g-skill-cast-time', sk.castTime || '');
        setVal('inp-g-skill-cooldown', sk.cooldown || '');
        setVal('inp-g-skill-range', sk.range || '');
        setVal('inp-g-skill-effect', sk.effect || '');
        setVal('inp-g-skill-sec-effect', sk.secEffect || '');
        setVal('inp-g-skill-scaling', sk.scaling || '');
        setVal('inp-g-skill-penalty', sk.penalty || '');
        document.getElementById('modal-skill').showModal();
    }
};
