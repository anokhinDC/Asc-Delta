const modalsHtml = `
<!-- Modal Character Creation / Edit -->
    <!-- Modal Character Creation / Edit -->
    <dialog id="modal-character" class="e33-canvas rounded-2xl shadow-2xl p-0 w-full max-w-2xl border border-stone-800 text-[#ede3d2] overflow-hidden">
        <div class="p-4 border-b border-stone-800 e33-modal-header flex flex-col gap-3">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="text-stone-400 text-xs">◆</span>
                    <h2 class="text-sm font-cinzel font-bold tracking-[0.18em] text-[#ede3d2] uppercase" id="modal-title">Ficha do Expedicionário &bull; Expedição 33</h2>
                    <span class="text-stone-400 text-xs">◆</span>
                </div>
                <button type="button" class="text-stone-400 hover:text-white" onclick="document.getElementById('modal-character').close()"><span class="e33-key text-[10px]">Esc</span></button>
            </div>
            <div class="flex gap-2 border-b border-stone-800 pb-1">
                <button type="button" id="btn-tab-base" class="px-3 py-1.5 text-xs font-bold tracking-wider uppercase border-b-2 border-stone-400 text-[#ede3d2] transition" onclick="switchCharTab('base')">Atributos &amp; Base</button>
                <button type="button" id="btn-tab-perks" class="px-3 py-1.5 text-xs font-medium tracking-wider uppercase border-b-2 border-transparent text-stone-400 hover:text-[#ede3d2] transition" onclick="switchCharTab('perks')">Vantagens Táticas</button>
            </div>
        </div>
        <form method="dialog" id="form-character" class="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div id="char-tab-base" class="space-y-5">
                <div>
                    <label class="block text-xs font-bold text-stone-400 uppercase mb-1">URL da Imagem de Perfil (Opcional)</label>
                    <input type="url" id="inp-avatar" class="input-dark" placeholder="https://exemplo.com/imagem.png">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="col-span-2">
                        <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Nome do Expedicionário</label>
                        <input type="text" id="inp-name" required class="input-dark" placeholder="Ex: Gustave, Maelle, Sciel...">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Origem / Linhagem de Lumière</label>
                        <select id="inp-race" class="input-dark w-full">
                            <option value="">-- Nenhuma --</option>
                            <option value="Cidadão de Lumière">Cidadão de Lumière</option>
                            <option value="Veterano de Expedição">Veterano de Expedição</option>
                            <option value="Marcado pelo Chroma">Marcado pelo Chroma</option>
                            <option value="Mecatrônico de Lumière">Mecatrônico de Lumière</option>
                            <option value="Desperto do Monólito">Desperto do Monólito</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Papel / Classe na Expedição</label>
                        <div class="flex gap-2">
                            <input type="text" id="inp-class" required class="input-dark flex-1" placeholder="Ex: Engenheiro, Esgrimista...">
                            <select id="inp-template" class="input-dark w-10 px-1 text-center bg-[#1c1612] text-stone-400 border border-stone-800" title="Aplicar Papel Pré-definido">
                                <option value="">+</option>
                                <option value="Engenheiro da Expedição">Engenheiro da Expedição</option>
                                <option value="Esgrimista de Lumière">Esgrimista de Lumière</option>
                                <option value="Pintor Místico">Pintor Místico</option>
                                <option value="Atirador da Névoa">Atirador da Névoa</option>
                                <option value="Guardião do Monólito">Guardião do Monólito</option>
                                <option value="Vanguarda Berserk">Vanguarda Berserk</option>
                                <option value="Franco Golpeador">Franco Golpeador</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mt-2">
                    <div>
                        <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Foco de Combate</label>
                        <select id="inp-gender" class="input-dark w-full">
                            <option value="Vanguarda de Impacto">Vanguarda de Impacto</option>
                            <option value="Esgrima &amp; Aparo (Parry)">Esgrima &amp; Aparo (Parry)</option>
                            <option value="Canalização de Chroma">Canalização de Chroma</option>
                            <option value="Disparos de Precisão">Disparos de Precisão</option>
                            <option value="Guarda Inviolável">Guarda Inviolável</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Equipamento de Assinatura</label>
                        <input type="text" id="inp-orientation" class="input-dark w-full" placeholder="Ex: Prótese a Vapor, Florete de Lumière, Pincel Místico">
                    </div>
                </div>

                <!-- Hidden legacy containers to maintain backward compatibility -->
                <div id="inp-erogenous-zones" class="hidden"></div>
                <input type="hidden" id="inp-con" value="0">
                <input type="hidden" id="inp-vig" value="0">
                <input type="hidden" id="inp-von" value="0">
                <input type="hidden" id="inp-sed" value="0">
                <input type="hidden" id="inp-mis" value="0">

                <div>
                    <div class="flex justify-between items-end border-b border-stone-800 pb-1 mb-3">
                        <h3 class="text-[#ede3d2] text-sm uppercase tracking-wider font-bold">Atributos da Expedição</h3>
                        <div class="text-xs font-bold text-stone-400">Pontos Usados: <span id="points-counter" class="text-[#ede3d2]">0</span> / <span id="points-limit-display" class="text-stone-400">8</span></div>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 inp-attr-group">
                        <div class="bg-[#0e0e10] p-2.5 rounded-lg border border-red-950/40">
                            <label class="block text-[11px] font-bold text-rose-400 mb-1"><i class="fa-solid fa-fist-raised mr-1"></i> Força</label>
                            <p class="text-[9px] text-stone-400 mb-1">Dano Físico &amp; Ruptura</p>
                            <input type="number" id="inp-for" value="0" class="input-dark w-full text-center font-bold text-white" min="-5" max="10">
                        </div>
                        <div class="bg-[#0e0e10] p-2.5 rounded-lg border border-emerald-950/40">
                            <label class="block text-[11px] font-bold text-emerald-400 mb-1"><i class="fa-solid fa-person-running mr-1"></i> Agilidade</label>
                            <p class="text-[9px] text-stone-400 mb-1">Esquiva &amp; Iniciativa</p>
                            <input type="number" id="inp-agi" value="0" class="input-dark w-full text-center font-bold text-white" min="-5" max="10">
                        </div>
                        <div class="bg-[#0e0e10] p-2.5 rounded-lg border border-rose-950/40">
                            <label class="block text-[11px] font-bold text-rose-400 mb-1"><i class="fa-solid fa-heart mr-1"></i> Vitalidade</label>
                            <p class="text-[9px] text-stone-400 mb-1">HP Máx &amp; Postura</p>
                            <input type="number" id="inp-vit" value="0" class="input-dark w-full text-center font-bold text-white" min="-5" max="10">
                        </div>
                        <div class="bg-[#0e0e10] p-2.5 rounded-lg border border-cyan-950/40">
                            <label class="block text-[11px] font-bold text-cyan-400 mb-1"><i class="fa-solid fa-palette mr-1"></i> Chroma</label>
                            <p class="text-[9px] text-stone-400 mb-1">Poder de Pictos &amp; Tinta</p>
                            <input type="number" id="inp-chr" value="0" class="input-dark w-full text-center font-bold text-white" min="-5" max="10">
                        </div>
                        <div class="bg-[#0e0e10] p-2.5 rounded-lg border border-purple-950/40">
                            <label class="block text-[11px] font-bold text-purple-400 mb-1"><i class="fa-solid fa-eye mr-1"></i> Percepção</label>
                            <p class="text-[9px] text-stone-400 mb-1">Aparo (Parry) &amp; Pontos Fracos</p>
                            <input type="number" id="inp-per" value="0" class="input-dark w-full text-center font-bold text-white" min="-5" max="10">
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="text-[#ede3d2] text-sm uppercase tracking-wider font-bold border-b border-stone-800 pb-1 mb-3">Pictos Anexados</h3>
                    <div id="skills-select-list" class="space-y-2 mb-2">
                        <!-- Selects dinâmicos -->
                    </div>
                    <button type="button" id="btn-add-skill-slot" class="w-full border border-dashed border-stone-800 hover:border-stone-400 bg-[#121214] hover:bg-[#1c1c20] text-[#ede3d2] text-xs py-2 rounded transition font-medium ">
                        <i class="fa-solid fa-palette mr-1 text-stone-400"></i> Anexar Picto do Catálogo
                    </button>
                </div>
                
                <div class="mt-4">
                    <h3 class="text-[#ede3d2] text-sm uppercase tracking-wider font-bold border-b border-stone-800 pb-1 mb-3">Condições e Desvantagens</h3>
                    <div id="conditions-list" class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <!-- Checkboxes gerados por JS -->
                    </div>
                </div>

                <div class="mt-4">
                    <h3 class="text-[#ede3d2] text-sm uppercase tracking-wider font-bold border-b border-stone-800 pb-1 mb-3">Equipamento Anexado</h3>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <div><label class="block text-[10px] text-stone-400 uppercase">Cabeça</label><select id="inp-equip-head" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-stone-400 uppercase">Costas</label><select id="inp-equip-back" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-stone-400 uppercase">Corpo</label><select id="inp-equip-body" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-stone-400 uppercase">Cintura</label><select id="inp-equip-waist" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-stone-400 uppercase">Pés</label><select id="inp-equip-feet" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-stone-400 uppercase">Partes Íntimas</label><select id="inp-equip-intimate" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-stone-400 uppercase">Mão Principal</label><select id="inp-equip-hand_1" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-stone-400 uppercase">Mão Secundária</label><select id="inp-equip-hand_2" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-stone-400 uppercase">Anel 1</label><select id="inp-equip-ring_1" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-stone-400 uppercase">Anel 2</label><select id="inp-equip-ring_2" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-stone-400 uppercase">Charm</label><select id="inp-equip-charm" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                    </div>
                </div>

                <!-- Master Options -->
                <div id="master-options-panel" class="hidden mt-4 p-3 bg-rose-950/20 border border-rose-900/40 rounded">
                    <h4 class="text-xs font-bold text-rose-400 mb-2"><i class="fa-solid fa-crown"></i> Privilégio de Mestre</h4>
                    <label class="flex items-center gap-2 text-xs">
                        <input type="checkbox" id="inp-unlock-points" class="accent-rose-500">
                        <span>Desbloquear Limites (Ignora teto de atributos e Vantagens)</span>
                    </label>
                </div>
            </div> <!-- End Tab Base -->
            
            <div id="char-tab-perks" class="hidden space-y-4">
                <div class="text-xs text-stone-400 bg-[#0e0e10] border border-stone-800 p-3 rounded-xl mb-2">
                    <i class="fa-solid fa-circle-info text-stone-400 mr-1"></i> Cada ponto de Atributo base fornece <strong>2 Pontos de Vantagem (PV)</strong> para distribuir exclusivamente nas vantagens daquele atributo.
                </div>
                <div id="perks-container" class="space-y-3">
                    <!-- Gerado pelo JS -->
                </div>
            </div> <!-- End Tab Perks -->
        </form>
        <div class="p-4 border-t border-stone-800 flex justify-end gap-3 bg-[#0d0a08]">
            <button id="btn-modal-cancel" class="px-4 py-2 border border-stone-800 hover:border-stone-600 bg-[#121214] hover:bg-[#1c1c20] text-stone-300 text-xs uppercase font-bold tracking-wider rounded transition">Cancelar</button>
            <button id="btn-modal-save" class="px-5 py-2 border border-stone-600 bg-[#161619] hover:bg-[#222226] text-[#ede3d2] text-xs uppercase font-bold tracking-wider rounded transition shadow active:scale-95">Salvar Ficha</button>
        </div>
    </dialog>
    <!-- Modal Global Weapon -->
    <dialog id="modal-weapon" class="e33-canvas rounded-2xl shadow-2xl p-0 max-w-md w-full border border-stone-800 text-[#ede3d2] overflow-hidden">
        <div class="p-4 border-b border-stone-800 e33-modal-header flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-stone-400 text-xs">◆</span>
                <h2 class="text-sm font-cinzel font-bold tracking-[0.18em] text-[#ede3d2] uppercase">Forjar Arma &bull; Expedição 33</h2>
                <span class="text-stone-400 text-xs">◆</span>
            </div>
            <button type="button" class="text-stone-400 hover:text-white" onclick="document.getElementById('modal-weapon').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <form method="dialog" id="form-weapon" class="p-6 max-h-[70vh] overflow-y-auto space-y-4 custom-scrollbar">
            <div class="flex gap-2">
                <div class="flex-1">
                    <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Nome da Arma</label>
                    <input type="text" id="inp-w-name" class="input-dark w-full text-base " required>
                </div>
                <div class="w-1/3">
                    <label class="block text-xs text-stone-400 uppercase mb-1">Categoria</label>
                    <select id="inp-w-category" class="input-dark w-full text-sm">
                        <option value="Espada">Espada</option>
                        <option value="Machado">Machado</option>
                        <option value="Lança">Lança</option>
                        <option value="Adaga">Adaga</option>
                        <option value="Arco">Arco/Besta</option>
                        <option value="Fogo">Arma de Fogo</option>
                        <option value="Mágica">Arma Mágica</option>
                        <option value="Outro">Outro</option>
                    </select>
                </div>
            </div>
            <div class="flex gap-2">
                <div class="w-1/3">
                    <label class="block text-xs text-stone-400 uppercase mb-1">Durabilidade Máx.</label>
                    <input type="number" id="inp-w-durability" class="input-dark w-full text-sm" value="50">
                </div>
                <div class="w-1/3">
                    <label class="block text-xs text-stone-400 uppercase mb-1">Requisito (Atributo)</label>
                    <select id="inp-w-req-attr" class="input-dark w-full text-sm">
                        <option value="none">Nenhum</option>
                        <option value="for">Força (FOR)</option>
                        <option value="vig">Vigor (VIG)</option>
                        <option value="agi">Agilidade (AGI)</option>
                        <option value="con">Conhecimento (CON)</option>
                        <option value="von">Vontade (VON)</option>
                    </select>
                </div>
                <div class="w-1/3">
                    <label class="block text-xs text-stone-400 uppercase mb-1">Requisito (Valor)</label>
                    <input type="number" id="inp-w-req-val" class="input-dark w-full text-sm" value="0">
                </div>
            </div>
            
            <div class="mt-2 hidden">
                <input type="text" id="inp-w-rarity" class="hidden">
                <input type="text" id="inp-w-material" class="hidden">
                <input type="text" id="inp-w-req" class="hidden">
            </div>
            
            <div class="border-t border-stone-800 pt-4 mt-2">
                <h3 class="text-xs font-bold text-[#ede3d2] uppercase tracking-wider mb-2">Poder Ofensivo (Ataque)</h3>
                <div class="flex gap-2 items-end">
                    <div class="w-1/4">
                        <label class="block text-xs text-stone-400 uppercase mb-1">Dados</label>
                        <input type="number" id="inp-w-dice-c" class="input-dark w-full text-center" placeholder="Ex: 1" value="1">
                    </div>
                    <div class="text-stone-400 pb-2">d</div>
                    <div class="w-1/4">
                        <label class="block text-xs text-stone-400 uppercase mb-1">Faces</label>
                        <input type="number" id="inp-w-dice-f" class="input-dark w-full text-center" placeholder="Ex: 8" value="8">
                    </div>
                    <div class="text-stone-400 pb-2">+</div>
                    <div class="w-1/4">
                        <label class="block text-xs text-stone-400 uppercase mb-1">Fixo</label>
                        <input type="number" id="inp-w-dmg-mod" class="input-dark w-full text-center" placeholder="Ex: 2" value="0">
                    </div>
                </div>
                <div class="mt-2 flex gap-2">
                    <div class="flex-1">
                        <label class="block text-xs text-stone-400 uppercase mb-1">Tipo de Dano Padrão</label>
                        <select id="inp-w-dmg-type" class="input-dark w-full text-sm">
                            <option value="HP">Físico (Não-Mágico)</option>
                            <option value="HP_MAG">Físico (Mágico)</option>
                            <option value="MAG">Mágico Puro (HP)</option>
                            <option value="LUST">Lust (Não-Mágico)</option>
                            <option value="LUST_MAG">Lust (Mágico)</option>
                            <option value="FOGO">Fogo</option>
                            <option value="GELO">Gelo</option>
                            <option value="ELETRICO">Elétrico</option>
                            <option value="VENENO">Veneno</option>
                        </select>
                    </div>
                    <div class="w-1/3">
                        <label class="block text-xs text-stone-400 uppercase mb-1">Custo ST</label>
                        <input type="number" id="inp-w-st-cost" class="input-dark w-full text-sm" value="3">
                    </div>
                </div>
            </div>

            <div class="border-t border-stone-800 pt-4 mt-2">
                <h3 class="text-xs font-bold text-[#ede3d2] uppercase tracking-wider mb-2">Encantamento / Efeito ao Acertar</h3>
                <div class="flex flex-col gap-2">
                    <select id="inp-w-eff-type" class="input-dark w-full text-sm">
                        <option value="none">Nenhum Efeito</option>
                        <option value="sangramento">Sangramento</option>
                        <option value="envenenamento_fisico">Envenenamento (Físico)</option>
                        <option value="envenenamento_magico">Envenenamento (Mágico)</option>
                        <option value="envenenamento_lust">Veneno de Luxúria</option>
                        <option value="excitacao">Excitação Extrema</option>
                        <option value="atordoado">Atordoamento</option>
                    </select>
                    <div class="flex gap-2">
                        <div class="w-2/3">
                            <label class="block text-xs text-stone-400 uppercase mb-1">Potência (Ex: 1d4, 10%, 5)</label>
                            <input type="text" id="inp-w-eff-power" class="input-dark w-full text-sm">
                        </div>
                        <div class="w-1/3">
                            <label class="block text-xs text-stone-400 uppercase mb-1">Duração (Turnos)</label>
                            <input type="number" id="inp-w-eff-dur" class="input-dark w-full text-sm" value="0">
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-2">
                <label class="block text-xs text-stone-400 uppercase mb-1">Descrição / Narrativa</label>
                <textarea id="inp-w-desc" class="input-dark w-full h-16 text-sm"></textarea>
            </div>
        </form>
        <div class="p-4 border-t border-stone-800 flex justify-end gap-3 bg-[#0d0a08]">
            <button type="button" onclick="document.getElementById('modal-weapon').close()" class="px-4 py-2 border border-stone-800 hover:border-stone-600 bg-[#121214] hover:bg-[#1c1c20] text-stone-300 text-xs uppercase font-bold tracking-wider rounded transition">Cancelar</button>
            <button type="button" onclick="window.saveGlobalWeapon()" class="px-5 py-2 border border-stone-600 bg-[#161619] hover:bg-[#222226] text-[#ede3d2] text-xs uppercase font-bold tracking-wider rounded transition shadow active:scale-95">Salvar Arma</button>
        </div>
    </dialog>

    <!-- Modal Global Accessory -->
    <dialog id="modal-accessory" class="e33-canvas rounded-2xl shadow-2xl p-0 max-w-md w-full border border-stone-800 text-[#ede3d2] overflow-hidden">
        <div class="p-4 border-b border-stone-800 e33-modal-header flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-stone-400 text-xs">◆</span>
                <h2 class="text-sm font-cinzel font-bold tracking-[0.18em] text-[#ede3d2] uppercase">Forjar Relíquia &bull; Expedição 33</h2>
                <span class="text-stone-400 text-xs">◆</span>
            </div>
            <button type="button" class="text-stone-400 hover:text-white" onclick="document.getElementById('modal-accessory').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <form method="dialog" id="form-accessory" class="p-6 max-h-[70vh] overflow-y-auto space-y-4 custom-scrollbar">
            <div class="flex gap-2">
                <div class="flex-1">
                    <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Nome da Relíquia</label>
                    <input type="text" id="inp-acc-name" class="input-dark w-full text-base " required>
                </div>
                <div class="w-1/3">
                    <label class="block text-xs text-stone-400 uppercase mb-1">Categoria</label>
                    <select id="inp-acc-category" class="input-dark w-full text-sm">
                        <option value="Anel">Anel</option>
                        <option value="Colar">Colar / Charm</option>
                        <option value="Brinco">Brinco</option>
                        <option value="Outro">Outro</option>
                    </select>
                </div>
            </div>
            
            <div class="flex gap-2">
                <div class="w-1/2">
                    <label class="block text-[10px] text-stone-400 uppercase">Requisito (Atributo)</label>
                    <select id="inp-acc-req-attr" class="input-dark w-full">
                        <option value="none">Nenhum</option>
                        <option value="for">Força (FOR)</option>
                        <option value="vig">Vigor (VIG)</option>
                        <option value="agi">Agilidade (AGI)</option>
                        <option value="con">Conhecimento (CON)</option>
                        <option value="von">Vontade (VON)</option>
                    </select>
                </div>
                <div class="w-1/2">
                    <label class="block text-[10px] text-stone-400 uppercase">Requisito (Valor)</label>
                    <input type="number" id="inp-acc-req-val" class="input-dark w-full" value="0">
                </div>
            </div>
            
            <div class="flex gap-2 hidden">
                <input type="text" id="inp-acc-rarity" value="Comum">
                <input type="text" id="inp-acc-req">
            </div>
            
            <div class="border-t border-stone-800 pt-4 mt-2">
                <h3 class="text-xs font-bold text-[#ede3d2] uppercase tracking-wider mb-2">Bônus Passivos Ocultos</h3>
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1" title="Defesa contra HP">Def. Física (HP)</label>
                        <input type="number" id="inp-acc-df-hp" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-[10px] text-stone-400 uppercase mb-1" title="Defesa contra HP_MAG">Def. Físico-Mágica</label>
                        <input type="number" id="inp-acc-df-hpmag" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1" title="Defesa contra MAG">Def. Mágica Pura</label>
                        <input type="number" id="inp-acc-df-mag" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1" title="Defesa contra LUST">Def. Lust Geral</label>
                        <input type="number" id="inp-acc-df-lust" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1" title="Defesa contra LUST_MAG">Def. Lust Mágica</label>
                        <input type="number" id="inp-acc-df-lustmag" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1">Agilidade</label>
                        <input type="number" id="inp-acc-agi" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1">Sedução</label>
                        <input type="number" id="inp-acc-sed" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1">Misticismo</label>
                        <input type="number" id="inp-acc-mis" class="input-dark w-full text-center" value="0">
                    </div>
                </div>
            </div>

            <div class="border-t border-stone-800 pt-4 mt-2">
                <h3 class="text-xs font-bold text-[#ede3d2] uppercase tracking-wider mb-2">Aura / Encantamento Contínuo</h3>
                <div class="flex flex-col gap-2">
                    <select id="inp-acc-eff-type" class="input-dark w-full text-sm">
                        <option value="none">Nenhum</option>
                        <option value="imune_sangramento">Imune a Sangramento</option>
                        <option value="imune_veneno">Imune a Veneno</option>
                        <option value="imune_excitacao">Imune a Excitação</option>
                        <option value="regen_hp">Regeneração HP</option>
                        <option value="regen_st">Regeneração ST</option>
                        <option value="custom">Outro (Apenas Narrativo)</option>
                    </select>
                </div>
            </div>

            <div class="mt-2">
                <label class="block text-xs text-stone-400 uppercase mb-1">Descrição / Efeito Custom</label>
                <textarea id="inp-acc-desc" class="input-dark w-full h-16 text-sm"></textarea>
            </div>
        </form>
        <div class="p-4 border-t border-stone-800 flex justify-end gap-3 bg-[#0d0a08]">
            <button type="button" onclick="document.getElementById('modal-accessory').close()" class="px-4 py-2 border border-stone-800 hover:border-stone-600 bg-[#121214] hover:bg-[#1c1c20] text-stone-300 text-xs uppercase font-bold tracking-wider rounded transition">Cancelar</button>
            <button type="button" onclick="window.saveGlobalAccessory()" class="px-5 py-2 border border-stone-600 bg-[#161619] hover:bg-[#222226] text-[#ede3d2] text-xs uppercase font-bold tracking-wider rounded transition shadow active:scale-95">Salvar Acessório</button>
        </div>
    </dialog>

    <!-- Modal Global Armor -->
    <!-- Modal Global Armor -->
    <dialog id="modal-armor" class="e33-canvas rounded-2xl shadow-2xl p-0 max-w-md w-full border border-stone-800 text-[#ede3d2] overflow-hidden">
        <div class="p-4 border-b border-stone-800 e33-modal-header flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-stone-400 text-xs">◆</span>
                <h2 class="text-sm font-cinzel font-bold tracking-[0.18em] text-[#ede3d2] uppercase">Forjar Traje / Armadura &bull; Expedição 33</h2>
                <span class="text-stone-400 text-xs">◆</span>
            </div>
            <button type="button" class="text-stone-400 hover:text-white" onclick="document.getElementById('modal-armor').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <form method="dialog" id="form-armor" class="p-6 max-h-[70vh] overflow-y-auto space-y-4 custom-scrollbar">
            <!-- Dados Básicos -->
            <div class="flex gap-2">
                <div class="flex-1">
                    <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Nome do Traje</label>
                    <input type="text" id="inp-g-armor-name" required class="input-dark w-full text-base ">
                </div>
                <div class="w-1/3">
                    <label class="block text-xs text-stone-400 uppercase mb-1">Base Automática</label>
                    <select id="inp-g-armor-base" class="input-dark w-full text-sm">
                        <option value="none">Sem Base</option>
                        <option value="heavy">Pesada</option>
                        <option value="light">Leve</option>
                        <option value="seduction">Sedução</option>
                        <option value="mixed_hl">Híbrida: Pesada + Leve</option>
                        <option value="mixed_hs">Híbrida: Pesada + Sedução</option>
                        <option value="mixed_ls">Híbrida: Leve + Sedução</option>
                    </select>
                </div>
            </div>

            <div class="flex gap-2">
                <div class="w-1/4">
                    <label class="block text-[10px] text-stone-400 uppercase">Slot</label>
                    <select id="inp-g-armor-slot" class="input-dark w-full">
                        <option value="body">Corpo</option>
                        <option value="head">Cabeça</option>
                        <option value="back">Costas</option>
                        <option value="waist">Cintura</option>
                        <option value="feet">Pés</option>
                        <option value="intimate">Partes Íntimas</option>
                    </select>
                </div>
                <div class="w-1/4">
                    <label class="block text-[10px] text-stone-400 uppercase">Durabilidade Máx.</label>
                    <input type="number" id="inp-g-armor-durability" class="input-dark w-full" value="100">
                </div>
                <div class="w-1/4">
                    <label class="block text-[10px] text-stone-400 uppercase">Requisito (Atributo)</label>
                    <select id="inp-g-armor-req-attr" class="input-dark w-full">
                        <option value="none">Nenhum</option>
                        <option value="for">Força (FOR)</option>
                        <option value="vig">Vigor (VIG)</option>
                        <option value="agi">Agilidade (AGI)</option>
                        <option value="con">Conhecimento (CON)</option>
                        <option value="von">Vontade (VON)</option>
                    </select>
                </div>
                <div class="w-1/4">
                    <label class="block text-[10px] text-stone-400 uppercase">Requisito (Valor)</label>
                    <input type="number" id="inp-g-armor-req-val" class="input-dark w-full" value="0">
                </div>
            </div>
            
            <div class="border-t border-stone-800 pt-4 mt-2">
                <h3 class="text-xs font-bold text-[#ede3d2] uppercase tracking-wider mb-2">Bônus e Penalidades Mecânicas</h3>
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1" title="Defesa contra HP">Def. Física (HP)</label>
                        <input type="number" id="inp-g-armor-df-hp" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-[10px] text-stone-400 uppercase mb-1" title="Defesa contra HP_MAG">Def. Físico-Mágica</label>
                        <input type="number" id="inp-g-armor-df-hpmag" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1" title="Defesa contra MAG">Def. Mágica Pura</label>
                        <input type="number" id="inp-g-armor-df-mag" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1" title="Defesa contra LUST">Def. Lust Geral</label>
                        <input type="number" id="inp-g-armor-df-lust" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1" title="Defesa contra LUST_MAG">Def. Lust Mágica</label>
                        <input type="number" id="inp-g-armor-df-lustmag" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1">Agilidade</label>
                        <input type="number" id="inp-g-armor-agi" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1">Sedução</label>
                        <input type="number" id="inp-g-armor-sed" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-stone-400 uppercase mb-1">Misticismo</label>
                        <input type="number" id="inp-g-armor-mis" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-rose-400 uppercase mb-1" title="Custo de ST ao esquivar">Custo ST</label>
                        <input type="number" id="inp-g-armor-st-cost" class="input-dark w-full text-center" value="0">
                    </div>
                </div>
            </div>

            <div class="border-t border-stone-800 pt-4 mt-2">
                <label class="block text-[10px] text-stone-400 uppercase mb-1" title="Zonas onde a Defesa da Armadura se aplica">Zonas Protegidas (Defesa)</label>
                <div id="inp-g-armor-protected-zones" class="grid grid-cols-2 gap-1 text-xs text-stone-300">
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Cabeça" class="inp-armor-zone"> Cabeça</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Pescoço" class="inp-armor-zone"> Pescoço</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Tronco" class="inp-armor-zone"> Tronco</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Seios" class="inp-armor-zone"> Seios</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Braços" class="inp-armor-zone"> Braços</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Pernas" class="inp-armor-zone"> Pernas</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Bunda" class="inp-armor-zone"> Bunda</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Virilha" class="inp-armor-zone"> Virilha</label>
                </div>
            </div>
            
            <div class="mt-2 hidden">
                <!-- Keep ID for compatibility temporarily if needed -->
                <textarea id="inp-g-armor-desc" class="hidden"></textarea>
                <textarea id="inp-g-armor-special" class="hidden"></textarea>
                <input type="text" id="inp-g-armor-exposure" class="hidden">
            </div>
        </form>
        <div class="p-4 border-t border-stone-800 flex justify-end gap-3 bg-[#0d0a08]">
            <button type="button" onclick="document.getElementById('modal-armor').close()" class="px-4 py-2 border border-stone-800 hover:border-stone-600 bg-[#121214] hover:bg-[#1c1c20] text-stone-300 text-xs uppercase font-bold tracking-wider rounded transition">Cancelar</button>
            <button type="button" id="btn-save-g-armor" class="px-5 py-2 border border-stone-600 bg-[#161619] hover:bg-[#222226] text-[#ede3d2] text-xs uppercase font-bold tracking-wider rounded transition shadow active:scale-95">Salvar Armadura</button>
        </div>
    </dialog>

    <!-- Modal Global Picto -->
    <dialog id="modal-skill" class="e33-canvas rounded-2xl shadow-2xl p-0 max-w-md w-full border border-stone-800 text-[#ede3d2] overflow-hidden">
        <div class="p-4 border-b border-stone-800 e33-modal-header flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-stone-400 text-xs">◆</span>
                <h2 class="text-sm font-cinzel font-bold tracking-[0.18em] text-[#ede3d2] uppercase">Criar Picto &bull; Pintura Mística</h2>
                <span class="text-stone-400 text-xs">◆</span>
            </div>
            <button type="button" class="text-stone-400 hover:text-white" onclick="document.getElementById('modal-skill').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <form method="dialog" id="form-skill" class="p-6 max-h-[70vh] overflow-y-auto space-y-4 custom-scrollbar">
            <div>
                <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Nome do Picto</label>
                <input type="text" id="inp-g-skill-name" required class="input-dark mb-2 text-base " placeholder="Ex: Pincelada Ardente, Riposte de Tinta...">
                <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Categoria de Tinta</label>
                <select id="inp-g-skill-bodypart" class="input-dark w-full text-sm">
                    <option value="Geral">Chroma Geral (Arma / Pincel)</option>
                    <option value="Ataque">Ofensivo (Impacto / Ruptura)</option>
                    <option value="Suporte">Suporte / Cura / Restauração</option>
                    <option value="Reativo">Reativo / Aparar (Parry)</option>
                    <option value="Controle">Controle / Névoa / Paralisia</option>
                </select>
            </div>
            <div>
                <label class="block text-xs text-stone-400 mb-1">Descrição / Lenda do Picto</label>
                <textarea id="inp-g-skill-desc" class="input-dark min-h-[50px]" placeholder="Como a tinta é pincelada e manifestada no campo de batalha..."></textarea>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[10px] text-stone-400 uppercase">Tipo</label>
                    <input type="text" id="inp-g-skill-type" class="input-dark" placeholder="Ativa, Reativa, Passiva...">
                </div>
                <div>
                    <label class="block text-[10px] text-stone-400 uppercase">Custo de PA (Pontos de Ação)</label>
                    <input type="text" id="inp-g-skill-cost" class="input-dark" placeholder="Ex: 2 PA">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[10px] text-stone-400 uppercase">Tempo de Pincelada</label>
                    <input type="text" id="inp-g-skill-cast-time" class="input-dark" placeholder="Ex: 1 Ação">
                </div>
                <div>
                    <label class="block text-[10px] text-stone-400 uppercase">Recarga (Cooldown)</label>
                    <input type="text" id="inp-g-skill-cooldown" class="input-dark" placeholder="Ex: 2 Turnos">
                </div>
            </div>
            <div>
                <label class="block text-[10px] text-stone-400 uppercase">Alcance &amp; Alvo</label>
                <input type="text" id="inp-g-skill-range" class="input-dark" placeholder="Ex: Corpo-a-Corpo / 10 Metros">
            </div>

            <div class="border-t border-stone-800 pt-2 mt-2">
                <label class="block text-xs font-bold text-[#ede3d2] uppercase tracking-wider mb-1">Efeito de Tinta</label>
                <div class="space-y-2">
                    <textarea id="inp-g-skill-effect" required class="input-dark min-h-[50px]" placeholder="Efeito Principal (Ex: 2d8 Dano Chroma + 6 Dano de Postura)"></textarea>
                    <input type="text" id="inp-g-skill-sec-effect" class="input-dark text-sm" placeholder="Efeito Secundário / Condição (Ex: Corrupção por 2 turnos)">
                    <input type="text" id="inp-g-skill-scaling" class="input-dark text-sm" placeholder="Escalonamento (Ex: +Chroma no dano)">
                </div>
            </div>

            <div class="border-t border-stone-800 pt-2 mt-2">
                <label class="block text-xs font-bold text-rose-400 uppercase mb-1">Efeito Colateral (Opcional)</label>
                <textarea id="inp-g-skill-penalty" class="input-dark min-h-[50px]" placeholder="Recuo de Tinta ou custo de fôlego..."></textarea>
            </div>
        </form>
        <div class="p-4 border-t border-stone-800 flex justify-end gap-3 bg-[#0d0a08]">
            <button type="button" onclick="document.getElementById('modal-skill').close()" class="px-4 py-2 border border-stone-800 hover:border-stone-600 bg-[#121214] hover:bg-[#1c1c20] text-stone-300 text-xs uppercase font-bold tracking-wider rounded transition">Cancelar</button>
            <button type="button" id="btn-save-g-skill" class="px-5 py-2 border border-stone-600 bg-[#161619] hover:bg-[#222226] text-[#ede3d2] text-xs uppercase font-bold tracking-wider rounded transition shadow active:scale-95">Salvar Picto</button>
        </div>
    </dialog>

    <!-- Modal Login / Auth -->
    <!-- Modal Monster -->
    <dialog id="modal-monster" class="e33-canvas rounded-2xl shadow-2xl p-0 w-full max-w-xl border border-stone-800 text-[#ede3d2] overflow-hidden">
        <div class="p-4 border-b border-stone-800 e33-modal-header flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-stone-400 text-xs">◆</span>
                <h2 class="text-sm font-cinzel font-bold tracking-[0.18em] text-[#ede3d2] uppercase">Criatura / Nevii &bull; Expedição 33</h2>
                <span class="text-stone-400 text-xs">◆</span>
            </div>
            <button type="button" class="text-stone-400 hover:text-white" onclick="document.getElementById('modal-monster').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <form id="form-monster" class="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div class="flex gap-4">
                <div class="flex-1">
                    <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Nome do Nevii / Monstro</label>
                    <input type="text" id="inp-monster-name" required class="input-dark text-base ">
                </div>
                <div class="flex-1">
                    <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Tipo / Categoria</label>
                    <input type="text" id="inp-monster-type" class="input-dark" placeholder="Ex: Nevii da Névoa, Sentinela...">
                </div>
                <div class="flex-1">
                    <label class="block text-xs font-bold text-stone-400 uppercase mb-1">URL Imagem</label>
                    <input type="text" id="inp-monster-avatar" class="input-dark">
                </div>
            </div>
            <div class="p-2.5 bg-[#0e0e10] border border-sky-950/50 rounded-lg flex items-center justify-between">
                <label class="flex items-center gap-2 cursor-pointer text-xs text-sky-300 font-semibold">
                    <input type="checkbox" id="inp-monster-flying" class="accent-sky-500 rounded">
                    <span><i class="fa-solid fa-feather-pointed text-sky-400 mr-1"></i> Criatura Voadora</span>
                </label>
                <span class="text-[10px] text-stone-400">Esquiva com Vantagem (2d20) ao sofrer ataque</span>
            </div>
            <div class="grid grid-cols-4 gap-4">
                <div>
                    <label class="block text-xs font-bold text-rose-400 uppercase mb-1">HP Máx</label>
                    <input type="number" id="inp-monster-hp" required class="input-dark" value="50">
                </div>
                <div>
                    <label class="block text-xs font-bold text-sky-400 uppercase mb-1">Stamina</label>
                    <input type="number" id="inp-monster-st" required class="input-dark" value="50">
                </div>
                <div>
                    <label class="block text-xs font-bold text-purple-400 uppercase mb-1">Lust Máx</label>
                    <input type="number" id="inp-monster-lust" required class="input-dark" value="100">
                </div>
                <div>
                    <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Iniciativa Base</label>
                    <input type="number" id="inp-monster-ini" required class="input-dark" value="10">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Defesa Física Base (CON)</label>
                    <input type="number" id="inp-monster-con" required class="input-dark" value="5">
                </div>
                <div>
                    <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Defesa Mental Base (VON)</label>
                    <input type="number" id="inp-monster-von" required class="input-dark" value="5">
                </div>
            </div>
            
            <div class="border border-stone-800 rounded-xl p-4 bg-[#0e0e10]">
                <label class="block text-xs font-bold text-[#ede3d2] uppercase tracking-wider mb-2">Planilha de Defesas e Modificadores</label>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse" id="monster-modifiers-table">
                        <thead>
                            <tr class="border-b border-stone-800 text-[10px] text-stone-400 uppercase">
                                <th class="pb-2">Dano</th>
                                <th class="pb-2 px-1 text-center" title="Aumenta o dano que o monstro recebe (Ex: 100 = dobro de dano)">Fraqueza (%)</th>
                                <th class="pb-2 px-1 text-center" title="Corta o dano que o monstro recebe (Ex: 50 = metade do dano)">Resistência (%)</th>
                                <th class="pb-2 px-1 text-center" title="Soma ou subtrai diretamente na Defesa Base do monstro.">Redução Direta (Defesa +/-)</th>
                            </tr>
                        </thead>
                        <tbody class="text-xs">
                            <tr class="border-b border-stone-800/60" data-dmg="HP">
                                <td class="py-2 font-bold text-stone-300">Físico (Não-Mágico)</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-stone-800/60" data-dmg="HP_MAG">
                                <td class="py-2 font-bold text-purple-400">Físico (Mágico)</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-stone-800/60" data-dmg="LUST">
                                <td class="py-2 font-bold text-pink-300">Lust (Não-Mágico)</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-stone-800/60" data-dmg="LUST_MAG">
                                <td class="py-2 font-bold text-pink-500">Lust (Mágico)</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-stone-800/60" data-dmg="MAG">
                                <td class="py-2 font-bold text-purple-400">Mágico Puro (HP)</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-stone-800/60" data-dmg="FOGO">
                                <td class="py-2 font-bold text-red-400">🔥 Fogo</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-stone-800/60" data-dmg="GELO">
                                <td class="py-2 font-bold text-blue-300">❄️ Gelo</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-stone-800/60" data-dmg="ELETRICO">
                                <td class="py-2 font-bold text-yellow-400">⚡ Elétrico</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr data-dmg="VENENO">
                                <td class="py-2 font-bold text-emerald-500">☣️ Veneno</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Ataques e Pictos do Nevii (Texto Livre)</label>
                <textarea id="inp-monster-desc" rows="4" class="input-dark" placeholder="Descreva os padrões de ataque, ruptura de guarda e pictos deste Nevii..."></textarea>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-stone-800">
                <button type="button" class="px-4 py-2 border border-stone-800 hover:border-stone-600 bg-[#121214] hover:bg-[#1c1c20] text-stone-300 text-xs uppercase font-bold tracking-wider rounded transition" onclick="document.getElementById('modal-monster').close()">Cancelar</button>
                <button type="submit" class="px-5 py-2 border border-stone-600 bg-[#161619] hover:bg-[#222226] text-[#ede3d2] text-xs uppercase font-bold tracking-wider rounded transition shadow active:scale-95">Salvar Nevii / Monstro</button>
            </div>
        </form>
    </dialog>

    <!-- Modal Extended Actions -->
    <dialog id="modal-extended-actions" class="e33-canvas rounded-2xl shadow-2xl p-0 w-[800px] max-w-[90vw] border border-stone-800 text-[#ede3d2] overflow-hidden">
        <div class="p-4 border-b border-stone-800 flex justify-between items-center e33-modal-header">
            <div class="flex items-center gap-2">
                <span class="text-stone-400 text-xs">◆</span>
                <h2 class="font-cinzel text-sm font-bold tracking-[0.18em] text-[#ede3d2] uppercase">
                    Manual de Ações da Expedição 33: <span id="extended-actions-char-name" class="text-stone-400"></span>
                </h2>
                <span class="text-stone-400 text-xs">◆</span>
            </div>
            <button class="text-stone-400 hover:text-white" onclick="document.getElementById('modal-extended-actions').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <div class="p-6 max-h-[70vh] overflow-y-auto text-sm text-stone-300 custom-scrollbar">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="text-xs text-stone-400 uppercase border-b border-stone-800">
                            <th class="pb-2 font-bold w-1/4">Manobra / Picto</th>
                            <th class="pb-2 font-bold w-1/4">Efeito / Impacto</th>
                            <th class="pb-2 font-bold w-1/6">Custo (PA)</th>
                            <th class="pb-2 font-bold w-1/3">Teste &amp; Descrição</th>
                        </tr>
                    </thead>
                    <tbody id="extended-actions-table" class="divide-y divide-stone-800">
                        <!-- JS renders here -->
                    </tbody>
                </table>
            </div>
        </div>
        <div class="p-4 border-t border-stone-800 flex justify-end gap-3 bg-[#0d0a08]">
            <button type="button" onclick="document.getElementById('modal-extended-actions').close()" class="px-4 py-2 border border-stone-800 hover:border-stone-600 bg-[#121214] hover:bg-[#1c1c20] text-stone-300 text-xs uppercase font-bold tracking-wider rounded transition">Fechar</button>
        </div>
    </dialog>

    <!-- Modal Add Combatant -->
    <dialog id="modal-combat-add" class="e33-canvas rounded-2xl shadow-2xl p-0 w-full max-w-md border border-stone-800 text-[#ede3d2] overflow-hidden">
        <div class="p-4 border-b border-stone-800 e33-modal-header flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-stone-400 text-xs">◆</span>
                <h2 class="text-sm font-cinzel font-bold tracking-[0.18em] text-[#ede3d2] uppercase">
                    Adicionar Combatente &bull; Expedição 33
                </h2>
                <span class="text-stone-400 text-xs">◆</span>
            </div>
            <button class="text-stone-400 hover:text-white" onclick="document.getElementById('modal-combat-add').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <div class="p-6 space-y-4">
            <!-- Tabs or Mode Switch -->
            <div class="flex rounded border border-stone-800 overflow-hidden text-xs bg-[#0c0a08]">
                <button type="button" id="tab-combat-add-select" class="flex-1 py-2 font-bold bg-[#1e1713] text-[#ede3d2] border-r border-stone-800 transition" onclick="switchCombatAddMode('select')">
                    <i class="fa-solid fa-list mr-1 text-stone-400"></i> Selecionar / Modelo
                </button>
                <button type="button" id="tab-combat-add-custom" class="flex-1 py-2 font-bold bg-[#0c0a08] text-stone-400 hover:text-white transition" onclick="switchCombatAddMode('custom')">
                    <i class="fa-solid fa-plus-circle mr-1"></i> Criar Rápido
                </button>
            </div>

            <!-- Mode 1: Select from dropdown -->
            <div id="combat-add-mode-select" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-stone-300 uppercase mb-1">Combatente ou Modelo</label>
                    <select id="inp-combat-select" class="input-dark w-full text-sm">
                        <!-- Options injected via JS -->
                    </select>
                </div>
            </div>

            <!-- Mode 2: Quick custom creation -->
            <div id="combat-add-mode-custom" class="space-y-3 hidden">
                <div>
                    <label class="block text-xs font-bold text-stone-300 uppercase mb-1">Nome do Combatente</label>
                    <input type="text" id="inp-combat-custom-name" class="input-dark w-full text-sm" placeholder="Ex: Nevii das Sombras">
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-bold text-stone-300 uppercase mb-1">Tipo</label>
                        <select id="inp-combat-custom-type" class="input-dark w-full text-xs">
                            <option value="monster">Nevii / Criatura</option>
                            <option value="char">Expedicionário / Aliado</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-stone-300 uppercase mb-1">HP Máximo</label>
                        <input type="number" id="inp-combat-custom-hp" class="input-dark w-full text-xs" value="100">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-bold text-stone-300 uppercase mb-1">Postura Máxima</label>
                        <input type="number" id="inp-combat-custom-postura" class="input-dark w-full text-xs" value="80">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-stone-300 uppercase mb-1">PA / Fôlego</label>
                        <input type="number" id="inp-combat-custom-stamina" class="input-dark w-full text-xs" value="100">
                    </div>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-stone-300 uppercase mb-1">Iniciativa Rolada (Opcional - deixe vazio para rolar)</label>
                <input type="number" id="inp-combat-ini" class="input-dark w-full text-sm" placeholder="Rolar automático (d20 + AGI)">
            </div>

            <button id="btn-combat-confirm" class="w-full py-2.5 rounded font-bold text-xs uppercase tracking-widest border border-stone-400/50 bg-[#16120f] hover:bg-[#251e18] text-[#ede3d2] shadow-xl flex items-center justify-center gap-2 transition active:scale-95">
                <span class="e33-key text-[10px]">+</span> Adicionar à Ordem dos Turnos
            </button>
        </div>
    </dialog>

    <!-- Modal View Details -->
    <dialog id="modal-view" class="e33-canvas rounded-2xl shadow-2xl p-0 max-w-md w-full border border-stone-800 text-[#ede3d2] overflow-hidden">
        <div class="p-4 border-b border-stone-800 e33-modal-header flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-stone-400 text-xs">◆</span>
                <h2 id="modal-view-title" class="text-sm font-cinzel text-[#ede3d2] font-bold tracking-[0.18em] uppercase">Detalhes &bull; Expedição 33</h2>
                <span class="text-stone-400 text-xs">◆</span>
            </div>
            <button class="text-stone-400 hover:text-white" onclick="document.getElementById('modal-view').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <div id="modal-view-content" class="p-6 space-y-4 text-sm text-stone-300 custom-scrollbar">
            <!-- Injected via JS -->
        </div>
    </dialog>

    <!-- Modal Login / Auth -->
    <dialog id="modal-login" class="e33-canvas rounded-2xl shadow-2xl p-0 w-96 border border-stone-800 text-[#ede3d2] overflow-hidden">
        <div class="p-4 border-b border-stone-800 e33-modal-header flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-stone-400 text-xs">◆</span>
                <h2 class="text-sm font-cinzel text-[#ede3d2] font-bold tracking-[0.18em] uppercase">Autenticação &bull; Expedição 33</h2>
                <span class="text-stone-400 text-xs">◆</span>
            </div>
            <button class="text-stone-400 hover:text-white" onclick="document.getElementById('modal-login').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <form method="dialog" id="form-login" class="p-6 space-y-4">
            <div>
                <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Nome de Usuário</label>
                <input type="text" id="inp-username" required class="input-dark" placeholder="Ex: Expedicionario33">
            </div>
            <div>
                <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Senha</label>
                <input type="password" id="inp-password" required class="input-dark" placeholder="******">
            </div>
            <p class="text-xs text-stone-400 italic">O login é automático se a conta existir. Caso o usuário seja inédito, a conta será criada com essa senha.</p>
            <p class="text-xs text-rose-300 font-semibold p-2.5 border border-rose-900/40 bg-rose-950/20 rounded-lg">
                Aviso: Se esquecer a senha, não haverá como recuperar. Guarde-a com segurança!
            </p>
        </form>
        <div class="p-4 border-t border-stone-800 flex justify-end gap-3 bg-[#0d0a08]">
            <button id="btn-login-cancel" class="px-4 py-2 border border-stone-800 hover:border-stone-600 bg-[#121214] hover:bg-[#1c1c20] text-stone-300 text-xs uppercase font-bold tracking-wider rounded transition">Cancelar</button>
            <button id="btn-login-submit" class="px-5 py-2 border border-stone-600 bg-[#161619] hover:bg-[#222226] text-[#ede3d2] text-xs uppercase font-bold tracking-wider rounded transition shadow active:scale-95">Entrar / Registrar</button>
        </div>
    </dialog>

    <dialog id="modal-apply-damage" class="e33-canvas text-[#ede3d2] p-0 rounded-2xl shadow-2xl border border-stone-800 w-[490px] max-w-[95%] overflow-hidden">
        <div class="p-4 border-b border-stone-800 e33-modal-header flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-stone-400 text-xs">◆</span>
                <h2 class="text-sm font-cinzel text-[#ede3d2] font-bold tracking-[0.18em] uppercase">
                    Declarar Dano / Efeito de Combate
                </h2>
                <span class="text-stone-400 text-xs">◆</span>
            </div>
            <button class="text-stone-400 hover:text-white" onclick="document.getElementById('modal-apply-damage').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div class="text-xs text-stone-400 italic">
                Selecione os alvos para aplicar impacto de lâmina, dano de postura ou conjuração mística de Chroma.
            </div>
            
            <div>
                <label class="block text-xs font-bold text-stone-300 uppercase mb-1">Alvo(s)</label>
                <select id="inp-dmg-target" class="input-dark w-full text-sm" multiple size="3" title="Segure CTRL para selecionar múltiplos">
                    <!-- Populated by JS -->
                </select>
                <div class="text-[10px] text-stone-500 mt-1 font-mono">Segure CTRL para selecionar múltiplos alvos simultâneos.</div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-stone-300 uppercase mb-1">Atacante (Opcional)</label>
                    <select id="inp-dmg-attacker" class="input-dark w-full text-sm">
                        <option value="">Nenhum / Ambiente / Nevii</option>
                        <!-- Populated by JS -->
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-stone-300 uppercase mb-1">Tipo de Dano / Ação</label>
                    <select id="inp-dmg-type" class="input-dark w-full text-sm">
                        <option value="HP">Físico (Lâmina / Impacto no HP)</option>
                        <option value="POSTURA">Impacto na Postura (Break / Guarda)</option>
                        <option value="CHROMA">Chroma / Tinta Mística</option>
                        <option value="FOGO">Chama de Chroma</option>
                        <option value="GELO">Gelo de Chroma</option>
                        <option value="CORRUPCAO">Corrupção de Tinta</option>
                        <option value="CURA_HP">Cura Vital (HP)</option>
                        <option value="RESTAURA_POSTURA">Restaurar Postura (Reduz Barra)</option>
                        <option value="RECARGA_CHROMA">Recarregar Chroma (+Tinta)</option>
                    </select>
                </div>
            </div>

            <div class="border-t border-stone-800 pt-3">
                <label class="block text-xs font-bold text-stone-300 uppercase mb-1">Arma / Fonte do Dano</label>
                <select id="inp-dmg-source" class="input-dark w-full text-sm">
                    <option value="custom">Rolagem Manual (Personalizada)</option>
                    <!-- Weapons injected here based on attacker -->
                </select>
            </div>

            <div id="dmg-manual-dice" class="grid grid-cols-3 gap-2">
                <div>
                    <label class="block text-[10px] font-bold text-stone-400 uppercase mb-1">Qtd. Dados</label>
                    <input type="number" id="inp-dmg-dice-c" class="input-dark w-full text-center" placeholder="1" value="1">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-stone-400 uppercase mb-1">Faces (d)</label>
                    <input type="number" id="inp-dmg-dice-f" class="input-dark w-full text-center" placeholder="8" value="8">
                </div>
                <div class="flex items-end pb-1">
                    <label class="flex items-center gap-1.5 cursor-pointer text-xs text-stone-400 font-bold">
                        <input type="checkbox" id="inp-dmg-crit" class="accent-[#ede3d2]"> Crítico?
                    </label>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2 border-t border-stone-800 pt-3">
                <div>
                    <label class="block text-[10px] font-bold text-stone-400 uppercase mb-1">PA Gasto (Atacante)</label>
                    <input type="number" id="inp-dmg-st-attacker" class="input-dark w-full" placeholder="Ex: 1" value="0">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-stone-400 uppercase mb-1">PA Gasto (Defensor)</label>
                    <input type="number" id="inp-dmg-st-target" class="input-dark w-full" placeholder="Ex: 1" value="0">
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-stone-400 uppercase mb-1">Modificador Fixo (+Dano)</label>
                <input type="number" id="inp-dmg-mod" class="input-dark w-full" placeholder="+0" value="0">
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
                <button type="button" class="px-3 py-2 border border-stone-800 bg-[#0c0a08] hover:bg-stone-900 text-stone-400 hover:text-stone-200 text-xs rounded transition" onclick="document.getElementById('modal-apply-damage').close()">Cancelar</button>
                <button type="button" class="px-3.5 py-2 border border-stone-800 bg-[#16120f] hover:bg-[#251e18] text-[#ede3d2] rounded font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow" id="btn-dmg-incoming" title="Dispara a janela de reação (Esquivar ou Aparar) para o defensor"><i class="fa-solid fa-shield-virus text-stone-400"></i> Reação (Parry/Dodge)</button>
                <button type="button" class="px-4 py-2 border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-200 rounded font-bold text-xs shadow transition active:scale-95" id="btn-dmg-confirm">Aplicar Direto</button>
            </div>
        </div>
    </dialog>

    <!-- Modal Incoming Attack (Reaction: Parry or Dodge - Clair Obscur Style) -->
    <dialog id="modal-incoming-attack" class="e33-canvas text-[#ede3d2] p-0 rounded-2xl shadow-2xl border border-stone-800 w-[530px] max-w-[95%] overflow-hidden">
        <!-- Header -->
        <div class="p-4 e33-modal-header border-b border-stone-800 flex justify-between items-center">
            <div class="flex items-center gap-2.5">
                <span class="text-stone-400 text-xs">◆</span>
                <div>
                    <h2 class="text-sm md:text-base font-cinzel text-[#ede3d2] font-bold uppercase tracking-[0.18em]">
                        Ataque Iminente &bull; Reação da Expedição
                    </h2>
                    <p class="text-[11px] text-stone-400 italic">Escolha em tempo real como seu expedicionário reagirá ao confronto</p>
                </div>
            </div>
            <button class="text-stone-400 hover:text-white" onclick="closeIncomingAttackModal()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>

        <div class="p-5 space-y-4">
            <!-- Attack Info Card -->
            <div class="bg-[#0e0e10] border border-stone-800 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-inner">
                <div class="flex items-center gap-3">
                    <div id="inc-atk-avatar" class="w-12 h-12 rounded-full border border-stone-700 bg-[#0c0a08] flex items-center justify-center text-stone-400 font-bold text-lg overflow-hidden shadow">
                        <i class="fa-solid fa-ghost"></i>
                    </div>
                    <div>
                        <div class="text-[10px] text-stone-400 uppercase tracking-wider">Atacante</div>
                        <div id="inc-atk-name" class="font-bold text-[#ede3d2] text-sm">Nevii de Tinta</div>
                        <div id="inc-atk-action" class="text-xs text-stone-400 italic">Investida com Garras de Tinta</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-[10px] text-stone-400 uppercase tracking-wider">CD de Acerto Inimigo</div>
                    <div class="text-xl font-bold font-mono text-[#ede3d2] flex items-center justify-end gap-1">
                        <i class="fa-solid fa-crosshairs text-xs text-stone-400"></i>
                        <span id="inc-atk-roll">15</span>
                    </div>
                    <div class="text-[10px] text-stone-400 font-mono">Dano: <strong id="inc-atk-dmg" class="text-red-400 font-bold">12 HP</strong> &bull; <strong id="inc-atk-posture" class="text-stone-400 font-bold">+4 Postura</strong></div>
                </div>
            </div>

            <!-- Defender Info -->
            <div class="flex items-center justify-between text-xs bg-[#0c0a08] px-3.5 py-2 rounded-lg border border-stone-800">
                <div class="text-stone-300 ">Defensor: <strong id="inc-def-name" class="text-[#ede3d2] font-bold">Gustave</strong></div>
                <div class="text-stone-400 font-mono">Fôlego Atual: <strong id="inc-def-stamina" class="text-sky-300">100 PA</strong></div>
            </div>

            <!-- Action Selection Area -->
            <div id="inc-defense-actions" class="space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <!-- Option 1: Dodge (Minigame de Precisão com % Redução) -->
                    <button type="button" onclick="startQTE('dodge')" class="e33-brush-btn p-3.5 rounded-xl text-left transition-all flex flex-col justify-between active:scale-95 group">
                        <div class="flex justify-between items-center mb-1 w-full">
                            <span class="text-[#ede3d2] font-bold text-xs flex items-center gap-2 group-hover:text-white">
                                <span class="e33-key">Q</span>
                                <span>Desviar (Dodge)</span>
                            </span>
                            <span class="text-[9px] bg-sky-950/40 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Minigame %</span>
                        </div>
                        <p class="text-[11px] text-stone-400 italic leading-relaxed mb-2">
                            Minigame de tempo: a proximidade do clique no centro determina a <strong>% de dano reduzido</strong> (0% a 100%).
                        </p>
                        <div class="text-[9.5px] text-stone-400 font-mono flex justify-between border-t border-stone-800 pt-1.5 w-full">
                            <span class="text-sky-300 font-bold"><i class="fa-solid fa-gamepad mr-1"></i>Tempo / Reflexo</span>
                            <span class="text-sky-300 font-bold">Custo: 1 PA</span>
                        </div>
                    </button>

                    <!-- Option 2: Parry (Minigame de Alta Precisão - Exige 100%) -->
                    <button type="button" onclick="startQTE('parry')" class="e33-brush-btn p-3.5 rounded-xl text-left transition-all flex flex-col justify-between active:scale-95 group">
                        <div class="flex justify-between items-center mb-1 w-full">
                            <span class="text-[#ede3d2] font-bold text-xs flex items-center gap-2 group-hover:text-white">
                                <span class="e33-key">E</span>
                                <span>Aparar (Parry)</span>
                            </span>
                            <span class="text-[9px] bg-stone-900 text-stone-300 border border-stone-800 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Requer 100%</span>
                        </div>
                        <p class="text-[11px] text-stone-400 italic leading-relaxed mb-2">
                            Tempo milimétrico! <strong>SÓ FUNCIONA COM 100%</strong> de precisão. Anula dano e contra-ataca a Postura inimiga!
                        </p>
                        <div class="text-[9.5px] text-stone-400 font-mono flex justify-between border-t border-stone-800 pt-1.5 w-full">
                            <span class="text-stone-400 font-bold"><i class="fa-solid fa-shield-virus mr-1"></i>100% Perfeição</span>
                            <span class="text-stone-400 font-bold">Reação</span>
                        </div>
                    </button>
                </div>

                <!-- Alternative Options: Block / Accept -->
                <div class="grid grid-cols-2 gap-2 pt-1">
                    <button type="button" onclick="resolveIncomingDefense('block')" class="bg-[#0e0e10] hover:bg-stone-900 border border-stone-700 text-stone-300 py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition active:scale-95">
                        <span class="e33-key text-[9px]">F</span> Bloquear Firme (Absorção)
                    </button>
                    <button type="button" onclick="resolveIncomingDefense('take')" class="bg-[#0a0807] hover:bg-stone-900 text-stone-500 hover:text-stone-300 border border-stone-800 py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition active:scale-95">
                        <span class="e33-key text-[9px]"><i class="fa-solid fa-burst"></i></span> Receber Dano Direto
                    </button>
                </div>
            </div>

            <!-- Expedition 33 Rhythm Converging Reticle Arena -->
            <div id="inc-e33-rhythm-container" class="hidden space-y-3 bg-[#050505] p-4 rounded-xl border border-stone-800 shadow-2xl relative overflow-hidden">
                <!-- Rhythm Event Header -->
                <div class="flex items-center justify-between border-b border-stone-800 pb-2">
                    <div class="flex items-center gap-2">
                        <span id="rhythm-mode-key" class="e33-key text-xs font-bold">Q</span>
                        <div>
                            <div id="rhythm-event-title" class="text-xs font-cinzel font-bold text-[#ede3d2] uppercase tracking-wider">
                                Desvio de Tinta
                            </div>
                            <div id="rhythm-event-tempo" class="text-[10px] text-stone-500 font-mono">
                                Cadência: Moderato (950ms)
                            </div>
                        </div>
                    </div>
                    <span id="rhythm-mode-badge" class="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-bold bg-black border border-stone-700 text-stone-300">
                        Redução 0% a 100%
                    </span>
                </div>

                <!-- Canvas Arena for Converging Rings -->
                <div class="relative flex flex-col items-center justify-center">
                    <canvas id="e33-rhythm-canvas" width="460" height="230" class="w-full h-[230px] rounded-lg border border-stone-900 bg-[#040404] cursor-pointer" onclick="window.recordE33RhythmBeat()"></canvas>
                    
                    <!-- Multi-beat indicators -->
                    <div id="rhythm-beats-container" class="flex items-center justify-center gap-2 mt-2.5 text-xs font-mono text-stone-400">
                        <!-- Populated by JS -->
                    </div>
                </div>

                <!-- Big Action Button -->
                <button type="button" id="btn-e33-rhythm-trigger" onclick="window.recordE33RhythmBeat()" class="w-full py-3 bg-[#111111] hover:bg-[#181818] active:scale-[0.98] border border-stone-700 hover:border-stone-500 text-[#ede3d2] font-cinzel font-bold text-xs uppercase tracking-[0.2em] rounded-lg shadow-md flex items-center justify-center gap-2 cursor-pointer transition select-none">
                    <span class="e33-key text-[10px]">Espaço</span> REAGIR NA CONVERGÊNCIA
                </button>
            </div>

            <!-- Reaction Result Display Area (Hidden until rolled) -->
            <div id="inc-reaction-result" class="hidden bg-[#0c0a08] p-3 rounded-xl border border-stone-800 text-xs font-mono">
                <!-- Result populated by JS -->
            </div>
        </div>
    </dialog>

    <!-- Modal Combat Skills (Expedition 33 - Clair Obscur Style) -->
    <dialog id="modal-combat-skills" class="e33-canvas text-[#ede3d2] p-0 rounded-2xl shadow-2xl border border-stone-800 w-[560px] max-w-[95%] overflow-hidden">
        <div class="p-4 e33-modal-header border-b border-stone-800 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-stone-400 text-xs">◆</span>
                <div>
                    <h2 class="text-sm md:text-base font-cinzel text-[#ede3d2] font-bold uppercase tracking-[0.18em]">
                        Habilidades &amp; Pictos &bull; Expedição 33
                    </h2>
                    <p id="cskills-combatant-info" class="text-[11px] text-stone-400 italic">Selecione uma habilidade para usar seus Pontos de Ação (PA)</p>
                </div>
            </div>
            <button class="text-stone-400 hover:text-white text-sm" onclick="document.getElementById('modal-combat-skills').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <div class="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <!-- Resource Status of Caster -->
            <div class="flex items-center justify-between text-xs bg-[#0e0e10] px-3.5 py-2 rounded-xl border border-stone-800">
                <span class="text-stone-300 ">Conjurador: <strong id="cskills-caster-name" class="text-[#ede3d2] font-bold">Gustave</strong></span>
                <div class="flex items-center gap-3">
                    <span class="text-sky-300 font-mono"><i class="fa-solid fa-bolt mr-1"></i><strong id="cskills-caster-pa">2</strong> PA</span>
                </div>
            </div>

            <!-- Target Selection -->
            <div class="flex items-center justify-between gap-2 bg-[#0c0a08] p-2.5 rounded-lg border border-stone-800 text-xs">
                <label class="text-stone-400 uppercase font-bold text-[10px] shrink-0">Alvo do Golpe:</label>
                <select id="cskills-target-select" class="input-dark text-xs py-1 px-2 flex-1"></select>
            </div>

            <!-- Skills List Container -->
            <div id="cskills-list" class="space-y-2.5">
                <!-- Dynamically filled by JS -->
            </div>
        </div>
    </dialog>

    <!-- Modal Combat Items (Expedition 33 - Clair Obscur Style) -->
    <dialog id="modal-combat-items" class="e33-canvas text-[#ede3d2] p-0 rounded-2xl shadow-2xl border border-stone-800 w-[540px] max-w-[95%] overflow-hidden">
        <div class="p-4 e33-modal-header border-b border-stone-800 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-stone-400 text-xs">◆</span>
                <div>
                    <h2 class="text-sm md:text-base font-cinzel text-[#ede3d2] font-bold uppercase tracking-[0.18em]">
                        Bolsa de Suprimentos &bull; Expedição 33
                    </h2>
                    <p class="text-[11px] text-stone-400 italic">Consumíveis rápidos de campo</p>
                </div>
            </div>
            <button class="text-stone-400 hover:text-white text-sm" onclick="document.getElementById('modal-combat-items').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <div class="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <!-- Target Selection -->
            <div class="flex items-center justify-between gap-2 bg-[#0c0a08] p-2.5 rounded-lg border border-stone-800 text-xs">
                <label class="text-stone-400 uppercase font-bold text-[10px] shrink-0">Aplicar Item Em:</label>
                <select id="citems-target-select" class="input-dark text-xs py-1 px-2 flex-1"></select>
            </div>

            <!-- Items Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- Item 1: Tingimento de Cura -->
                <div class="bg-[#0e0e10] border border-stone-800 hover:border-stone-800 p-3.5 rounded-xl flex flex-col justify-between gap-2 shadow transition">
                    <div class="flex items-center justify-between">
                        <span class="text-[#ede3d2] font-bold text-xs flex items-center gap-1.5">
                            <i class="fa-solid fa-heart-pulse text-red-400"></i> Tingimento de Cura
                        </span>
                        <span class="text-[9px] bg-red-950/40 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded font-mono">+35 HP</span>
                    </div>
                    <p class="text-[11px] text-stone-400 italic leading-snug">Pigmento revitalizante da Expedição que restaura a integridade física.</p>
                    <button type="button" onclick="executeCombatItem('heal_hp')" class="w-full border border-stone-800 bg-[#16120f] hover:bg-[#251e18] text-[#ede3d2] py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition shadow active:scale-95">
                        <i class="fa-solid fa-hand-holding-medical text-stone-400"></i> Usar Tingimento
                    </button>
                </div>

                <!-- Item 2: Bálsamo de Guarda -->
                <div class="bg-[#0e0e10] border border-stone-800 hover:border-stone-800 p-3.5 rounded-xl flex flex-col justify-between gap-2 shadow transition">
                    <div class="flex items-center justify-between">
                        <span class="text-[#ede3d2] font-bold text-xs flex items-center gap-1.5">
                            <i class="fa-solid fa-shield-heart text-stone-400"></i> Bálsamo de Guarda
                        </span>
                        <span class="text-[9px] bg-purple-950/40 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-mono">-30 Postura</span>
                    </div>
                    <p class="text-[11px] text-stone-400 italic leading-snug">Alivia a pressão na guarda, removendo acúmulo de postura para evitar Stagger.</p>
                    <button type="button" onclick="executeCombatItem('heal_posture')" class="w-full border border-stone-800 bg-[#141416] hover:bg-[#202024] text-[#ede3d2] py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition shadow active:scale-95">
                        <i class="fa-solid fa-shield text-stone-400"></i> Restaurar Guarda
                    </button>
                </div>

                <!-- Item 3: Pó Restaurador -->
                <div class="bg-[#0e0e10] border border-stone-800 hover:border-stone-800 p-3.5 rounded-xl flex flex-col justify-between gap-2 shadow transition">
                    <div class="flex items-center justify-between">
                        <span class="text-[#ede3d2] font-bold text-xs flex items-center gap-1.5">
                            <i class="fa-solid fa-wand-magic-sparkles text-stone-300"></i> Pó Restaurador
                        </span>
                        <span class="text-[9px] bg-sky-950/40 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded font-mono">+1 PA</span>
                    </div>
                    <p class="text-[11px] text-stone-400 italic leading-snug">Mistura medicinal de ervas e sais que alivia aflições e concede foco imediato.</p>
                    <button type="button" onclick="executeCombatItem('heal_status')" class="w-full border border-stone-800 bg-[#141416] hover:bg-[#202024] text-[#ede3d2] py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition shadow active:scale-95">
                        <i class="fa-solid fa-wind text-sky-400"></i> Usar Pó
                    </button>
                </div>

                <!-- Item 4: Elixir de Fôlego -->
                <div class="bg-[#0e0e10] border border-stone-800 hover:border-stone-800 p-3.5 rounded-xl flex flex-col justify-between gap-2 shadow transition">
                    <div class="flex items-center justify-between">
                        <span class="text-[#ede3d2] font-bold text-xs flex items-center gap-1.5">
                            <i class="fa-solid fa-bolt text-sky-400"></i> Elixir de Fôlego
                        </span>
                        <span class="text-[9px] bg-sky-950/40 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded font-mono">+2 PA</span>
                    </div>
                    <p class="text-[11px] text-stone-400 italic leading-snug">Adrenalina pura que confere pontos de ação adicionais imediatos no combate.</p>
                    <button type="button" onclick="executeCombatItem('heal_pa')" class="w-full border border-stone-800 bg-[#141416] hover:bg-[#202024] text-[#ede3d2] py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition shadow active:scale-95">
                        <i class="fa-solid fa-bolt-lightning text-sky-400"></i> Tomar Elixir
                    </button>
                </div>
            </div>
        </div>
    </dialog>

    <!-- Modal View Perks -->
    <dialog id="modal-view-perks" class="e33-canvas border border-stone-800 rounded-2xl p-0 w-full max-w-md text-[#ede3d2] shadow-2xl overflow-hidden">
        <div class="p-4 border-b border-stone-800 flex justify-between items-center e33-modal-header">
            <div class="flex items-center gap-2">
                <span class="text-stone-400 text-xs">◆</span>
                <h2 id="modal-vp-title" class="text-sm font-cinzel text-[#ede3d2] font-bold tracking-[0.18em] uppercase">Vantagens &bull; Expedição 33</h2>
                <span class="text-stone-400 text-xs">◆</span>
            </div>
            <button type="button" class="text-stone-400 hover:text-white" onclick="document.getElementById('modal-view-perks').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <div class="p-5 overflow-y-auto max-h-[70vh] space-y-4 custom-scrollbar" id="modal-vp-content">
            <!-- Populated via JS -->
        </div>
    </dialog>

    <!-- Modal Confirm Delete (Expedition 33 Style) -->
    <dialog id="modal-confirm-delete" class="e33-canvas border border-red-900/40 rounded-2xl p-0 w-full max-w-sm text-[#ede3d2] shadow-2xl overflow-hidden">
        <div class="p-4 border-b border-stone-800 flex justify-between items-center e33-modal-header bg-[#0a0a0a]">
            <div class="flex items-center gap-2">
                <span class="text-red-400 text-xs">◆</span>
                <h2 id="confirm-delete-title" class="text-sm font-cinzel text-red-200 font-bold tracking-[0.18em] uppercase">Apagar Ficha</h2>
                <span class="text-red-400 text-xs">◆</span>
            </div>
            <button type="button" class="text-stone-400 hover:text-white" onclick="document.getElementById('modal-confirm-delete').close()"><span class="e33-key text-[10px]">Esc</span></button>
        </div>
        <div class="p-6 text-center space-y-4 bg-[#080808]">
            <div id="confirm-delete-icon" class="w-12 h-12 rounded-full border border-red-500/30 bg-red-950/20 text-red-400 flex items-center justify-center mx-auto text-xl">
                <i class="fa-solid fa-trash-can"></i>
            </div>
            <div>
                <h3 id="confirm-delete-heading" class="font-cinzel text-base font-bold text-[#ede3d2] mb-1">Confirmar Exclusão</h3>
                <p class="text-xs text-stone-400" id="confirm-delete-msg">Tem certeza que deseja apagar a ficha de <strong id="confirm-delete-name" class="text-white"></strong>?</p>
                <p id="confirm-delete-sub" class="text-[10px] text-stone-500 italic mt-1">O personagem será removido permanentemente da expedição.</p>
            </div>
            <div class="flex gap-2 pt-2">
                <button type="button" onclick="document.getElementById('modal-confirm-delete').close()" class="flex-1 py-2 border border-stone-800 hover:border-stone-600 bg-[#141416] hover:bg-[#202024] text-stone-300 text-xs font-bold uppercase rounded transition">
                    Cancelar
                </button>
                <button type="button" id="btn-confirm-delete-exec" class="flex-1 py-2 border border-red-800 hover:border-red-600 bg-[#250d0d] hover:bg-[#3d1414] text-red-200 text-xs font-bold uppercase rounded transition shadow active:scale-95">
                    Apagar
                </button>
            </div>
        </div>
    </dialog>

    <!-- Firebase SDK (Compat) -->
    `;
document.currentScript.insertAdjacentHTML('afterend', modalsHtml);
