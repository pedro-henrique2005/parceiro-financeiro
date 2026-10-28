// ==============================================================================
// PARCEIRO FINANCEIRO - WIDGET AVANÇADO (ABAS, PESQUISA E RANKING TOP 10)
// ==============================================================================

(function() {
    // 1. REGRAS DE NEGÓCIO E LIMITES DE SEGURANÇA
    const REGRAS = { 
        bazin_minimo: 0.06,      // 6% exigido para Ações/FIIs
        liquidez_minima: 1000000,// Liquidez diária > R$ 1 Milhão
        pvp_minimo: 0.90,        // Evitar armadilhas de valor
        pvp_maximo: 1.05,        // Evitar fundos muito caros
        dy_minimo: 8.0           // Retorno mínimo desejado
    };

    // 2. LIMPEZA DE INSTÂNCIAS ANTERIORES
    const btnAntigo = document.getElementById('pf-widget-btn');
    const cardAntigo = document.getElementById('pf-card');
    if (btnAntigo) btnAntigo.remove();
    if (cardAntigo) cardAntigo.remove();

    // 3. INJEÇÃO DE ESTILOS CSS (Design e Abas)
    const estilo = document.createElement('style');
    estilo.innerHTML = `
        #pf-widget-btn {
            position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
            background-color: #27ae60; color: white; border-radius: 50%;
            display: flex; justify-content: center; align-items: center;
            font-size: 24px; font-weight: bold; cursor: grab; z-index: 999999;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3); user-select: none;
        }
        #pf-widget-btn:active { cursor: grabbing; }
        
        #pf-card {
            position: fixed; width: 420px;
            background-color: white; border-radius: 12px; padding: 0;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2); z-index: 999999;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; display: none;
            border-top: 5px solid #27ae60; overflow: hidden;
        }
        
        /* Sistema de Abas */
        .pf-tabs { display: flex; background: #f1f2f6; border-bottom: 1px solid #ddd; }
        .pf-tab-btn { flex: 1; padding: 12px; text-align: center; cursor: pointer; font-weight: bold; color: #7f8c8d; transition: 0.3s; }
        .pf-tab-btn.active { background: white; color: #27ae60; border-bottom: 3px solid #27ae60; }
        .pf-tab-btn:hover:not(.active) { background: #e0e0e0; }
        
        /* Conteúdo das Abas */
        .pf-tab-content { padding: 20px; display: none; max-height: 400px; overflow-y: auto; }
        .pf-tab-content.active { display: block; }
        
        /* Elementos Internos */
        .pf-fechar { position: absolute; top: 12px; right: 15px; cursor: pointer; font-weight: bold; color: #999; }
        .pf-input-group { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
        .pf-input-ticker { padding: 12px; border: 1px solid #ccc; border-radius: 6px; text-transform: uppercase; }
        .pf-btn-primario { padding: 12px; background-color: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .pf-btn-primario:hover { background-color: #219150; }
        
        /* Tabela de Ranking */
        .pf-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
        .pf-table th, .pf-table td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
        .pf-table th { background-color: #f9f9f9; }
        
        /* Status */
        .pf-status { font-weight: bold; padding: 10px; text-align: center; border-radius: 6px; margin-top: 15px; }
        .pf-aprovado { background-color: #d4edda; color: #155724; }
        .pf-reprovado { background-color: #f8d7da; color: #721c24; }
    `;
    document.head.appendChild(estilo);

    // 4. ESTRUTURA HTML DO WIDGET
    const btn = document.createElement('div');
    btn.id = 'pf-widget-btn';
    btn.innerHTML = '💰';
    document.body.appendChild(btn);

    const card = document.createElement('div');
    card.id = 'pf-card';
    card.innerHTML = `
        <span class="pf-fechar" onclick="document.getElementById('pf-card').style.display='none'">X</span>
        
        <!-- Menu de Abas -->
        <div class="pf-tabs">
            <div class="pf-tab-btn active" data-tab="tab-pesquisa">🔍 Pesquisa</div>
            <div class="pf-tab-btn" data-tab="tab-ranking">🏆 Top 10 FIIs</div>
        </div>

        <!-- ABA 1: Pesquisa Individual -->
        <div id="tab-pesquisa" class="pf-tab-content active">
            <h3 style="margin:0 0 10px 0; font-size:16px;">Análise de Ações e FIIs</h3>
            <div class="pf-input-group">
                <input type="text" class="pf-input-ticker" id="pf-input-ticker" placeholder="Ex: MXRF11 ou BBAS3">
                <button class="pf-btn-primario" id="pf-btn-buscar">Analisar Ativo</button>
            </div>
            <div id="pf-resultado-pesquisa" style="margin-top:15px;"></div>
        </div>

        <!-- ABA 2: Ranking Top 10 -->
        <div id="tab-ranking" class="pf-tab-content">
            <h3 style="margin:0 0 10px 0; font-size:16px;">Melhores Oportunidades</h3>
            <p style="font-size:12px; color:#666;">Filtro: Liq > R$ 1M | P/VP (0.90 a 1.05) | DY > 8%</p>
            <button class="pf-btn-primario" style="width:100%; padding:8px;" id="pf-btn-gerar-ranking">Gerar Ranking Agora</button>
            <div id="pf-resultado-ranking"></div>
        </div>
    `;
    document.body.appendChild(card);

    // 5. LÓGICA DE ARRASTAR (DRAG & DROP)
    let isDragging = false, startX, startY, initialX, initialY, moved = false;
    btn.addEventListener('mousedown', (e) => {
        isDragging = true; moved = false;
        startX = e.clientX; startY = e.clientY;
        const rect = btn.getBoundingClientRect();
        initialX = rect.left; initialY = rect.top;
        btn.style.left = `${initialX}px`; btn.style.top = `${initialY}px`;
        btn.style.right = 'auto'; btn.style.bottom = 'auto';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        moved = true;
        btn.style.left = `${initialX + (e.clientX - startX)}px`;
        btn.style.top = `${initialY + (e.clientY - startY)}px`;
    });
    document.addEventListener('mouseup', () => { isDragging = false; });

    // 6. LÓGICA DE ALTERNAR ABAS
    document.querySelectorAll('.pf-tab-btn').forEach(botao => {
        botao.addEventListener('click', () => {
            // Remove 'active' de todos
            document.querySelectorAll('.pf-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.pf-tab-content').forEach(c => c.classList.remove('active'));
            
            // Adiciona 'active' na aba clicada
            botao.classList.add('active');
            document.getElementById(botao.getAttribute('data-tab')).classList.add('active');
        });
    });

    // 7. MOTOR DE BUSCA (AÇÕES E FIIS)
    async function buscarAtivoIndividual(ticker) {
        let url = `https://investidor10.com.br/fiis/${ticker.toLowerCase()}/`;
        let resposta = await fetch(url);
        if (!resposta.ok) {
            url = `https://investidor10.com.br/acoes/${ticker.toLowerCase()}/`;
            resposta = await fetch(url);
        }
        if (!resposta.ok) return null;

        const doc = new DOMParser().parseFromString(await resposta.text(), 'text/html');
        let ativo = { ticker: ticker.toUpperCase(), preco: 0, dy: 0, pvp: 0 };

        doc.querySelectorAll('._card').forEach(caixa => {
            const titulo = caixa.querySelector('._card-header')?.innerText.trim().toUpperCase() || '';
            const valorEl = caixa.querySelector('._card-body');
            if (valorEl) {
                const valor = parseFloat(valorEl.innerText.replace('R$', '').replace('%', '').replaceAll('.', '').replace(',', '.').trim());
                if (!isNaN(valor)) {
                    if (titulo.includes('COTAÇÃO')) ativo.preco = valor;
                    if (titulo.includes('DY')) ativo.dy = valor;
                    if (titulo.includes('P/VP')) ativo.pvp = valor;
                }
            }
        });
        return ativo;
    }

    // 8. MOTOR DE RANKING (EXTRAIR TABELA DE FIIS)
    async function extrairRankingGeral() {
        try {
            const resposta = await fetch('https://investidor10.com.br/fiis/');
            if (!resposta.ok) throw new Error("Falha ao aceder à página de FIIs.");
            
            const doc = new DOMParser().parseFromString(await resposta.text(), 'text/html');
            const linhas = doc.querySelectorAll('#table-fiis tbody tr');
            let fundos = [];

            linhas.forEach(linha => {
                const colunas = linha.querySelectorAll('td');
                if (colunas.length >= 6) {
                    const ticker = colunas[0].innerText.trim();
                    const dy = parseFloat(colunas[2].innerText.replace('%', '').replace(',', '.').trim()) || 0;
                    const pvp = parseFloat(colunas[3].innerText.replace(',', '.').trim()) || 0;
                    const liquidez = parseFloat(colunas[5].innerText.replace('R$', '').replaceAll('.', '').replace(',', '.').trim()) || 0;
                    
                    fundos.push({ ticker, dy, pvp, liquidez });
                }
            });

            // Aplica os filtros rigorosos de segurança e rentabilidade
            const filtrados = fundos.filter(f => 
                f.liquidez >= REGRAS.liquidez_minima && 
                f.pvp >= REGRAS.pvp_minimo && 
                f.pvp <= REGRAS.pvp_maximo && 
                f.dy >= REGRAS.dy_minimo
            );

            // Ordena pelo maior Dividend Yield e pega os 10 primeiros
            filtrados.sort((a, b) => b.dy - a.dy);
            return filtrados.slice(0, 10);
        } catch (erro) {
            return null;
        }
    }

    // 9. EVENTOS DOS BOTÕES
    // Aba 1: Pesquisar
    document.getElementById('pf-btn-buscar').addEventListener('click', async () => {
        const input = document.getElementById('pf-input-ticker');
        const resultadoDiv = document.getElementById('pf-resultado-pesquisa');
        const ticker = input.value.trim();
        if (!ticker) return;

        resultadoDiv.innerHTML = `<p style="text-align:center;">⏳ Analisando ${ticker.toUpperCase()}...</p>`;
        
        let ativo = await buscarAtivoIndividual(ticker);
        if (!ativo || ativo.preco === 0) {
            resultadoDiv.innerHTML = `<p style="color:red; text-align:center;">❌ Ativo não encontrado.</p>`;
            return;
        }

        const dividendosReais = (ativo.dy / 100) * ativo.preco;
        const precoTetoBazin = dividendosReais / REGRAS.bazin_minimo;
        const aprovado = ativo.preco <= precoTetoBazin;

        resultadoDiv.innerHTML = `
            <hr style="border: 0.5px solid #eee; margin: 15px 0;">
            <div style="font-size:14px; line-height: 1.6;">
                <strong>Cotação Atual:</strong> R$ ${ativo.preco.toFixed(2)}<br>
                <strong>P/VP:</strong> ${ativo.pvp}<br>
                <strong>Yield (12m):</strong> ${ativo.dy.toFixed(2)}%<br>
                <strong>Preço Teto (Bazin):</strong> R$ ${precoTetoBazin.toFixed(2)}
            </div>
            <div class="pf-status ${aprovado ? 'pf-aprovado' : 'pf-reprovado'}">
                ${aprovado ? '🟢 APROVADO (Abaixo do Teto)' : '🔴 REPROVADO (Acima do Teto)'}
            </div>
        `;
        input.value = '';
    });

    // Permitir "Enter" na busca
    document.getElementById('pf-input-ticker').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('pf-btn-buscar').click();
    });

    // Aba 2: Gerar Ranking
    document.getElementById('pf-btn-gerar-ranking').addEventListener('click', async () => {
        const resultadoDiv = document.getElementById('pf-resultado-ranking');
        resultadoDiv.innerHTML = `<p style="text-align:center; margin-top:15px;">⏳ A varrer o mercado e a calcular o ranking...</p>`;
        
        const top10 = await extrairRankingGeral();
        
        if (!top10 || top10.length === 0) {
            resultadoDiv.innerHTML = `<p style="color:red; text-align:center; margin-top:15px;">❌ Não foi possível gerar o ranking ou nenhum fundo atendeu aos requisitos de segurança.</p>`;
            return;
        }

        let tabelaHTML = `
            <table class="pf-table">
                <thead><tr><th>Rank</th><th>FII</th><th>P/VP</th><th>DY (%)</th></tr></thead>
                <tbody>
        `;
        
        top10.forEach((fundo, index) => {
            let icone = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
            tabelaHTML += `
                <tr>
                    <td>${icone}</td>
                    <td><strong>${fundo.ticker}</strong></td>
                    <td>${fundo.pvp.toFixed(2)}</td>
                    <td style="color:#27ae60; font-weight:bold;">${fundo.dy.toFixed(2)}%</td>
                </tr>
            `;
        });
        
        tabelaHTML += `</tbody></table>`;
        resultadoDiv.innerHTML = tabelaHTML;
    });

    // 10. EXIBIR WIDGET AO CLICAR NO ÍCONE
    btn.addEventListener('click', () => {
        if (moved) return;
        const rect = btn.getBoundingClientRect();
        card.style.left = `${Math.max(10, rect.left - 360)}px`;
        card.style.top = `${Math.max(10, rect.top - 400)}px`;
        card.style.right = 'auto';
        card.style.bottom = 'auto';
        card.style.display = 'block';
    });

})();