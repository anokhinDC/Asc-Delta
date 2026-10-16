const sidebarHtml = `

    <!-- Mobile Overlay -->
    <div id="sidebar-overlay" class="fixed inset-0 bg-black/80 z-40 hidden md:hidden" onclick="toggleSidebar()"></div>

    <!-- Sidebar: Character Manager -->
    <aside id="main-sidebar" class="fixed md:static inset-y-0 left-0 w-4/5 sm:w-1/2 md:w-80 h-full flex flex-col z-50 border-r border-stone-800 transform -translate-x-full md:translate-x-0 transition-transform duration-300 bg-[#080808] shadow-2xl md:shadow-none e33-canvas">
        <div class="p-4 border-b border-stone-800 text-center relative bg-[#0a0a0a]">
            <div class="flex items-center justify-center gap-2 mb-1">
                <span class="text-stone-500 text-xs">◆</span>
                <h1 class="text-xl font-cinzel text-[#ede3d2] font-bold tracking-[0.2em] uppercase">
                    Expedition 33
                </h1>
                <span class="text-stone-500 text-xs">◆</span>
            </div>
            <p class="text-[10px] text-stone-400 uppercase tracking-widest">A Pintora &bull; O Monólito</p>
            <div id="auth-panel" class="mt-4 flex flex-col gap-2">
                <button id="btn-show-login" class="btn-gold py-1.5 px-4 rounded text-xs uppercase tracking-wider font-bold w-full"><i class="fa-solid fa-user mr-1.5 text-stone-400"></i> Fazer Login</button>
                <div id="user-info" class="hidden text-xs text-stone-300">
                    Logado como: <span id="user-email" class="font-bold text-stone-200"></span>
                    <button id="btn-logout" class="ml-2 text-rose-400 hover:text-rose-300 underline font-sans text-[11px]">Sair</button>
                </div>
            </div>
        </div>
        
        <div class="flex flex-wrap border-b border-stone-800 text-xs text-center bg-[#070707] font-medium">
            <a href="index.html" id="tab-chars" class="block w-1/3 py-2.5 transition border-r border-b border-stone-800 ${window.currentTab === 'chars' ? 'bg-[#141416] text-[#ede3d2] font-bold border-b-2 border-b-stone-300' : 'text-stone-400 hover:text-[#ede3d2] hover:bg-[#101012]'}">
                <i class="fa-solid fa-user-shield mr-1 text-stone-400"></i> Expedição
            </a>
            <a href="monstros.html" id="tab-monsters" class="block w-1/3 py-2.5 transition border-r border-b border-stone-800 ${window.currentTab === 'monsters' ? 'bg-[#141416] text-[#ede3d2] font-bold border-b-2 border-b-stone-300' : 'text-stone-400 hover:text-[#ede3d2] hover:bg-[#101012]'}">
                <i class="fa-solid fa-skull mr-1 text-stone-400"></i> Nevii
            </a>
            <a href="habilidades.html" id="tab-skills" class="block w-1/3 py-2.5 transition border-b border-stone-800 ${window.currentTab === 'skills' ? 'bg-[#141416] text-[#ede3d2] font-bold border-b-2 border-b-stone-300' : 'text-stone-400 hover:text-[#ede3d2] hover:bg-[#101012]'}">
                <i class="fa-solid fa-palette mr-1 text-stone-400"></i> Pictos
            </a>
            <a href="armaduras.html" id="tab-armors" class="block w-1/3 py-2.5 transition border-r border-b border-stone-800 ${window.currentTab === 'armors' ? 'bg-[#141416] text-[#ede3d2] font-bold border-b-2 border-b-stone-300' : 'text-stone-400 hover:text-[#ede3d2] hover:bg-[#101012]'}">
                <i class="fa-solid fa-shield-halved mr-1 text-stone-400"></i> Trajes
            </a>
            <a href="armas.html" id="tab-weapons" class="block w-1/3 py-2.5 transition border-r border-b border-stone-800 ${window.currentTab === 'weapons' ? 'bg-[#141416] text-[#ede3d2] font-bold border-b-2 border-b-stone-300' : 'text-stone-400 hover:text-[#ede3d2] hover:bg-[#101012]'}">
                <i class="fa-solid fa-wand-magic-sparkles mr-1 text-stone-400"></i> Armas
            </a>
            <a href="acessorios.html" id="tab-accessories" class="block w-1/3 py-2.5 transition border-b border-stone-800 ${window.currentTab === 'accessories' ? 'bg-[#141416] text-[#ede3d2] font-bold border-b-2 border-b-stone-300' : 'text-stone-400 hover:text-[#ede3d2] hover:bg-[#101012]'}">
                <i class="fa-solid fa-ring mr-1 text-stone-400"></i> Relíquias
            </a>
            <a href="rpg.html" id="tab-rpg" class="block w-full py-3 transition font-bold uppercase tracking-widest border-t border-stone-800 ${window.currentTab === 'rpg' ? 'text-[#ede3d2] bg-[#1a1a1e] border-b-2 border-b-stone-300' : 'text-stone-400 bg-[#09090b] hover:text-[#ede3d2] hover:bg-[#121215]'}" title="Mesa de Combate Reativo">
                <i class="fa-solid fa-hourglass-half mr-1.5 text-sky-400"></i> Mesa da Expedição
            </a>
        </div>
        
        <div class="p-4 flex gap-2">
            <button id="btn-new-item" class="flex-1 py-2 rounded font-bold text-xs uppercase tracking-wider transition flex justify-center items-center ${window.currentTab === 'rpg' ? 'border border-stone-700 bg-[#161619] text-[#ede3d2] hover:bg-[#222226]' : 'btn-gold'}">
                <i class="fa-solid fa-plus mr-1"></i> ${window.currentTab === 'rpg' ? 'Novo Combatente' : 'Novo'}
            </button>
            <button id="btn-import-char" class="flex-1 border border-stone-800 bg-[#141416] hover:bg-[#1f1f24] text-stone-300 text-xs uppercase tracking-wider py-2 rounded transition flex justify-center items-center font-bold ${window.currentTab === 'rpg' ? 'hidden' : ''}">
                <i class="fa-solid fa-file-import mr-1 text-stone-400"></i> Importar
            </button>
            <input type="file" id="import-file" accept=".json" class="hidden">
        </div>

        <div id="sidebar-list" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar pb-10">
            <div class="text-center text-sm text-stone-500 italic mt-10">
                Carregando registros da expedição...
            </div>
        </div>
    </aside>
`;
document.currentScript.insertAdjacentHTML('afterend', sidebarHtml);
