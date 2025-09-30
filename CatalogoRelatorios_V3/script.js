let categoriasData = [];
let relatoriosProcessados = [];
let categoriaAtiva = null;
let tipoAtual = "essenciais";
let filtroNome = "";
let filtroCampos = "";
let filtroParametros = "";
let statusAtivo = "todos";
let campoOrdenacao = "nome";
let ordemCrescente = true;
const cache = new Map();
let carrinho = [];

function atualizarCarrinho() {
  document.getElementById("cart-count").textContent = carrinho.length;
}

window.adicionarAoCarrinho = (nome, preco) => {
  carrinho.push({ nome, preco });
  atualizarCarrinho();
  alert(`"${nome}" adicionado ao carrinho!`);
}

function toggleCartButtons() {
  const cartContainer = document.getElementById("cart-buttons-container");
  if (tipoAtual === "apoio") {
    cartContainer.style.display = 'flex';  // Mostra sempre em apoio
  } else {
    cartContainer.style.display = 'none';
  }
}

function normalizeText(text) {
  if (!text) return [];
  if (Array.isArray(text)) return text.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof text === "string") return text.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
  return [];
}

async function carregarRelatorios() {
  const arquivo = tipoAtual === "essenciais" ? "data/relatorios.json" : "data/relatorios_apoio.json";
  try {
    if (cache.has(arquivo)) {
      categoriasData = cache.get(arquivo);
    } else {
      const response = await fetch(`${arquivo}?v=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      categoriasData = await response.json();
      cache.set(arquivo, categoriasData);
    }
    processarRelatorios();
    renderizarCategorias();
    if (categoriasData.length > 0) {
      selecionarCategoria(categoriasData.sort((a, b) => a.sistema.localeCompare(b.sistema, 'pt-BR'))[0].sistema);
    } else {
      renderRelatorios();
    }
    
    const priceHeader = document.getElementById('price-header');
    const sortPriceOption = document.querySelector('option[value="preco"]');
    
    if (tipoAtual === "apoio") { 
      priceHeader.style.display = 'table-cell'; 
      sortPriceOption.style.display = 'block'; 
    } else { 
      priceHeader.style.display = 'none'; 
      sortPriceOption.style.display = 'none'; 
      if(campoOrdenacao === 'preco') campoOrdenacao = 'nome';
    }
    
    toggleCartButtons();
  } catch (error) {
    console.error("Falha ao carregar relatórios:", error);
    document.getElementById("relatorios-tbody").innerHTML = `<tr><td colspan="7" class="no-results">Erro ao carregar dados. Tente novamente mais tarde.</td></tr>`;
  }
}

function processarRelatorios() {
  relatoriosProcessados = [];
  categoriasData.forEach(categoria => {
    if (categoria.relatorios) {
      categoria.relatorios.forEach(relatorio => {
        relatoriosProcessados.push({
          sistema: categoria.sistema,
          nome: relatorio.nome,
          arquivo: relatorio.arquivo,
          campos: normalizeText(relatorio.campos),
          parametros: normalizeText(relatorio.parametros),
          status: relatorio.status || null,
          preco: relatorio.preco || null
        });
      });
    }
  });
}

function renderizarCategorias() {
  const lista = document.getElementById("categorias-list");
  lista.innerHTML = "";
  categoriasData.sort((a, b) => a.sistema.localeCompare(b.sistema, 'pt-BR')).forEach(categoria => {
    const item = document.createElement("li");
    item.className = "category-item";
    const link = document.createElement("a");
    link.className = "category-link";
    link.href = "#";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      selecionarCategoria(categoria.sistema);
      const sidebar = document.getElementById('sidebar');
      if (window.innerWidth <= 1024) {
          sidebar.classList.remove('open');
      }
    });
    const nomeSpan = document.createElement("span");
    nomeSpan.textContent = categoria.sistema;
    const contadorSpan = document.createElement("span");
    contadorSpan.className = "category-count";
    contadorSpan.textContent = `(${categoria.relatorios ? categoria.relatorios.length : 0})`;
    link.appendChild(nomeSpan);
    link.appendChild(contadorSpan);
    item.appendChild(link);
    lista.appendChild(item);
  });
  const totalRelatorios = categoriasData.reduce((acc, cat) => acc + (cat.relatorios?.length || 0), 0);
  document.getElementById("total-relatorios").textContent = `(${totalRelatorios})`;
}

function selecionarCategoria(nomeCategoria) {
  categoriaAtiva = nomeCategoria;
  document.querySelectorAll(".category-link").forEach(link => {
    link.classList.toggle("active", link.firstChild.textContent === nomeCategoria);
  });
  renderRelatorios();
}

function filtrarRelatorios() {
  let relatoriosFiltrados = relatoriosProcessados.slice();
  
  if (categoriaAtiva) {
    relatoriosFiltrados = relatoriosFiltrados.filter(r => r.sistema === categoriaAtiva);
  }
  
  if (filtroNome) {
    const f = filtroNome.toLowerCase();
    relatoriosFiltrados = relatoriosFiltrados.filter(r => 
      String(r.nome || '').toLowerCase().includes(f)
    );
  }
  
  if (filtroCampos) {
    const termos = filtroCampos.toLowerCase().split(/[, ]+/).map(t => t.trim()).filter(Boolean);
    relatoriosFiltrados = relatoriosFiltrados.filter(r => {
      const camposText = (r.campos || []).join(' ').toLowerCase();
      return termos.every(term => camposText.includes(term));
    });
  }
  
  if (filtroParametros) {
    const termos = filtroParametros.toLowerCase().split(/[, ]+/).map(t => t.trim()).filter(Boolean);
    relatoriosFiltrados = relatoriosFiltrados.filter(r => {
      const parametrosText = (r.parametros || []).join(' ').toLowerCase();
      return termos.every(term => parametrosText.includes(term));
    });
  }
  
  if (statusAtivo !== "todos") {
    relatoriosFiltrados = relatoriosFiltrados.filter(r => r.status === statusAtivo);
  }
  
  return relatoriosFiltrados;
}

function ordenarRelatorios(relatorios) {
  return relatorios.sort((a, b) => {
    let valorA, valorB;
    switch (campoOrdenacao) {
      case 'nome': valorA = a.nome?.toLowerCase() || ''; valorB = b.nome?.toLowerCase() || ''; break;
      case 'status': valorA = a.status || 'zzz'; valorB = b.status || 'zzz'; break;
      case 'campos': valorA = a.campos?.length || 0; valorB = b.campos?.length || 0; break;
      case 'preco': valorA = a.preco || 0; valorB = b.preco || 0; break;
      default: valorA = a.nome?.toLowerCase() || ''; valorB = b.nome?.toLowerCase() || '';
    }
    if (valorA < valorB) return ordemCrescente ? -1 : 1;
    if (valorA > valorB) return ordemCrescente ? 1 : -1;
    return 0;
  });
}

function renderRelatorios() {
  const tbody = document.getElementById("relatorios-tbody");
  const resultsInfo = document.getElementById("results-info");
  let relatoriosFiltrados = ordenarRelatorios(filtrarRelatorios());
  
  tbody.innerHTML = "";
  
  if (relatoriosFiltrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="no-results">Nenhum relatório encontrado.</td></tr>';
    resultsInfo.textContent = "";
    return;
  }
  
  resultsInfo.textContent = `Exibindo ${relatoriosFiltrados.length} relatório(s)`;
  
  relatoriosFiltrados.forEach(r => {
    const camposTags = (r.campos || []).map(campo => `<span class="field-tag">${campo}</span>`).join(' ');
    const parametrosTags = (r.parametros || []).map(param => `<span class="param-tag">${param}</span>`).join(' ');
    const statusHtml = r.status ? `<span class="status-badge status-${r.status}">${r.status}</span>` : '';
    const precoHtml = tipoAtual === "apoio" ? `<td data-label="Preço" class="price-cell">${r.preco ? `R$ ${Number(r.preco).toFixed(2)}` : 'Consultar'}</td>` : '';
    
    const cartButtonHtml = tipoAtual === "apoio" ? 
      `<button onclick="adicionarAoCarrinho('${r.nome.replace(/'/g, "\\'")}', ${r.preco})" class="view-btn cart-add-btn">
        <i data-lucide="plus" class="w-4 h-4"></i> Carrinho
      </button>` : '';

    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Sistema" class="col-sistema"><strong>${r.sistema}</strong></td>
      <td data-label="Nome" class="report-name">${r.nome}</td>
      <td data-label="Campos">${camposTags || 'N/A'}</td>
      <td data-label="Parâmetros" class="col-parametros">${parametrosTags || '<span class="text-gray-400">Nenhum</span>'}</td>
      <td data-label="Status">${statusHtml}</td>
      ${precoHtml}
      <td data-label="Ação">
        <div class="action-buttons">
          <a href="pdfs/${r.arquivo}" target="_blank" class="view-btn" title="Visualizar PDF">
            <i data-lucide="eye" class="w-4 h-4"></i> Visualizar
          </a>
          ${cartButtonHtml}
        </div>
      </td>`;
    tbody.appendChild(row);
  });
  lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  carregarRelatorios();
  
  document.getElementById("hamburger-menu").addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.getElementById("filtro-nome").addEventListener("input", e => { filtroNome = e.target.value; renderRelatorios(); });
  document.getElementById("filtro-campos").addEventListener("input", e => { filtroCampos = e.target.value; renderRelatorios(); });
  document.getElementById("filtro-parametros").addEventListener("input", e => { filtroParametros = e.target.value; renderRelatorios(); });
  
  document.getElementById("tipo-relatorio").addEventListener("change", e => {
    tipoAtual = e.target.value;
    carrinho = [];
    atualizarCarrinho();
    carregarRelatorios();
  });
  
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      statusAtivo = btn.dataset.status;
      renderRelatorios();
    });
  });
  
  document.getElementById("sort-field").addEventListener("change", e => { campoOrdenacao = e.target.value; renderRelatorios(); });
  
  document.getElementById("sort-order").addEventListener("click", () => {
    ordemCrescente = !ordemCrescente;
    const btn = document.getElementById("sort-order");
    btn.innerHTML = ordemCrescente 
      ? `<i data-lucide="arrow-up" class="w-4 h-4"></i><span>A-Z</span>` 
      : `<i data-lucide="arrow-down" class="w-4 h-4"></i><span>Z-A</span>`;
    lucide.createIcons();
    renderRelatorios();
  });

  document.getElementById("cart-button").addEventListener("click", () => {
    if (carrinho.length === 0) {
      alert("Seu carrinho está vazio!");
      return;
    }
    const lista = carrinho.map(r => `- ${r.nome} (R$ ${Number(r.preco).toFixed(2)})`).join("%0A");
    const total = carrinho.reduce((acc, r) => acc + (r.preco || 0), 0);
    const msg = `Olá, gostaria de solicitar os seguintes relatórios:%0A%0A${lista}%0A%0ATotal: R$ ${total.toFixed(2)}`;
    const numero = "555195042414"; // Substituir pelo número de contato
    const url = `https://wa.me/${numero}?text=${msg}`;
    window.open(url, "_blank");
  });

  document.getElementById("clear-cart").addEventListener("click", () => {
    if (carrinho.length > 0 && confirm("Deseja realmente limpar o carrinho?")) {
      carrinho = [];
      atualizarCarrinho();
    }
  });
  
  document.querySelector('.status-btn[data-status="todos"]').classList.add('active');
  atualizarCarrinho();
});