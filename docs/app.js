// Lê os JSON de data/ e desenha o site. Texto de anúncio vem de terceiros:
// tudo entra por esc() ou textContent, e link só com https.
const CATEGORIAS = ["Console", "Controle", "Portátil", "Jogo", "Acessório", "Outro"];
const PRIORIDADE = { 3: "Alta", 2: "Média", 1: "Baixa" };
const SIMBOLO = { BRL: "R$", USD: "US$", EUR: "€", GBP: "£" };
const ABAS = ["painel", "lista", "anuncios", "alertas"];
const LEDS = { ok: "funcionando", falha: "com problema", sem_chave: "sem chave" };

// Para criar um tema: adicione aqui e escreva as regras em temas.css
const TEMA_PADRAO = "vitrine";
const TEMAS = { vitrine: "Vitrine 3D", radar: "Radar gamer", nox: "Nox", vidro: "Vidro 2026", mac: "Mac clássico", anos2000: "Portal anos 2000" };

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const preco = (v, m) => `${SIMBOLO[m] || esc(m)} ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dataHora = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
const url = (u) => (String(u).startsWith("https://") ? esc(u) : "");

// Ícones desenhados em linha, herdam a cor do texto
const TRACOS = {
  painel: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  lista: '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  anuncios: '<path d="M4 7h16l-1.5 12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM9 7a3 3 0 0 1 6 0"/>',
  alertas: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>',
  pausar: '<path d="M9 5v14M15 5v14"/>',
  ligar: '<path d="M7 5l12 7-12 7z"/>',
  remover: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  abrir: '<path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/>',
};
const ic = (n) => `<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRACOS[n]}</svg>`;

// Anel de progresso com valores reais
function anel(rotulo, valor, total, cor) {
  const c = 2 * Math.PI * 22;
  const fracao = total ? Math.min(valor / total, 1) : 0;
  return `<div class="anel"><svg viewBox="0 0 56 56" aria-hidden="true"><circle class="trilha" cx="28" cy="28" r="22" fill="none" stroke="${cor}" stroke-width="6"/>
    <circle cx="28" cy="28" r="22" fill="none" stroke="${cor}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c * fracao} ${c}" transform="rotate(-90 28 28)"/></svg>
    <div><span class="miudo">${rotulo}</span><b>${valor}<small> / ${total}</small></b></div></div>`;
}

// Radar de drops: cada ponto é um anúncio ativo. Mais perto do centro = mais barato na mesma moeda
function radar(ativos) {
  const porMoeda = {};
  ativos.forEach((a) => (porMoeda[a.moeda] ||= []).push(a.preco));
  Object.values(porMoeda).forEach((l) => l.sort((x, y) => x - y));
  const porId = Object.fromEntries(itens.map((i) => [i.id, i]));
  const pontos = ativos.slice(0, 30).map((a) => {
    const lista = porMoeda[a.moeda];
    const fracao = lista.length > 1 ? lista.indexOf(a.preco) / (lista.length - 1) : 0.3;
    let giro = 0;
    for (const c of a.id) giro = (giro * 31 + c.charCodeAt(0)) % 360;
    const raio = 12 + fracao * 32;
    const x = 50 + raio * Math.cos((giro * Math.PI) / 180);
    const y = 50 + raio * Math.sin((giro * Math.PI) / 180);
    const item = porId[a.item_id];
    const noTeto = item?.teto && a.moeda === "BRL" && a.preco <= item.teto;
    const rotulo = `${a.titulo}, ${preco(a.preco, a.moeda)}`;
    return url(a.link) ? `<a class="blip${noTeto ? " teto" : ""}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%" href="${url(a.link)}" target="_blank" rel="noopener" title="${esc(rotulo)}" aria-label="${esc(rotulo)}"></a>` : "";
  }).join("");
  return `<div class="radar-painel"><div class="radar"><div class="varredura"></div>${pontos}</div>
    <div class="radar-info"><strong>${ativos.length} ${ativos.length === 1 ? "drop no radar" : "drops no radar"}</strong>
    <p>Cada ponto é um anúncio ativo. Clique para abrir.</p><p>Mais perto do centro é mais barato na mesma moeda. Verde está dentro do seu teto.</p></div></div>`;
}

// Vitrine 3D: só carrega a biblioteca quando este tema está ativo
let vitrine = null, itemVitrine = null;

function etiquetasDe(item) {
  return anuncios.filter((a) => a.item_id === item.id && a.ativo && url(a.link)).sort((a, b) => a.preco - b.preco).slice(0, 6);
}

function desenharVitrine() {
  const caixa = $("vitrine");
  if (!caixa || !itens.length) return;
  itemVitrine = itens.find((i) => i.id === itemVitrine?.id) || [...itens].sort((a, b) => (b.prioridade || 2) - (a.prioridade || 2))[0];
  const lista = etiquetasDe(itemVitrine);
  caixa.querySelectorAll(".etiqueta").forEach((e) => e.remove());
  const els = lista.map((a) => {
    const el = document.createElement("a");
    el.className = "etiqueta";
    el.href = a.link;
    el.target = "_blank";
    el.rel = "noopener";
    el.title = a.titulo;
    el.innerHTML = `<b>${preco(a.preco, a.moeda)}</b><span>${esc(a.loja)}</span>`;
    caixa.appendChild(el);
    return el;
  });
  caixa.querySelector(".placa h2").textContent = itemVitrine.nome;
  caixa.querySelector(".placa p").textContent = lista.length
    ? `${lista.length} ${lista.length === 1 ? "anúncio ativo" : "anúncios ativos"}. Clique na etiqueta para abrir. Arraste para girar.`
    : "Nenhum anúncio ativo agora. Quando a busca achar, a etiqueta de preço aparece aqui. Arraste para girar.";
  const escolha = caixa.querySelector(".escolha");
  escolha.innerHTML = "";
  if (itens.length > 1) itens.forEach((i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = i.nome;
    b.setAttribute("aria-pressed", i.id === itemVitrine.id);
    b.onclick = () => { itemVitrine = i; desenharVitrine(); };
    escolha.appendChild(b);
  });
  vitrine?.trocar(itemVitrine.categoria, els);
}

async function ligarVitrine() {
  const ativo = document.documentElement.dataset.tema === "vitrine";
  if (!ativo) { vitrine?.pausar(true); return; }
  if (vitrine) { vitrine.pausar(false); desenharVitrine(); return; }
  const caixa = $("vitrine");
  if (!caixa) return;
  try {
    const { montar } = await import("./vitrine.js");
    vitrine = montar(caixa, caixa.querySelector("canvas"), { semSuporte: () => { throw new Error("webgl"); } });
    desenharVitrine();
  } catch {
    caixa.querySelector("canvas").remove();
    const aviso = document.createElement("div");
    aviso.className = "sem-suporte";
    aviso.textContent = "Não deu para abrir a vitrine 3D neste aparelho. Escolha outro tema na caixa Visual.";
    caixa.appendChild(aviso);
  }
}

let itens = [], anuncios = [], status = { lojas: {} };
let filtroItem = "todos", filtroSit = "ativos";

// Preenchido na publicação, para o site abrir pedidos no repositório certo
const REPOSITORIO = "Victor-Gabriel43/cacada-retro";
const repositorio = () => REPOSITORIO || null;

function pedir(titulo, pedido) {
  const repo = repositorio();
  if (!repo) { alert("Essa ação só funciona no site publicado."); return; }
  const corpo = "Pedido criado pela Caçada Retrô. Clique em Create para confirmar.\n\n```json\n" + JSON.stringify(pedido, null, 1) + "\n```";
  const destino = `https://github.com/${repo}/issues/new?title=${encodeURIComponent(titulo)}&body=${encodeURIComponent(corpo)}`;
  window.open(destino, "_blank", "noopener");
}

function teto(a, item) {
  if (!item || !item.teto) return "";
  if (a.moeda !== "BRL") return '<span class="tag ambar">outra moeda</span>';
  return a.preco <= item.teto ? '<span class="tag verde">dentro do teto</span>' : '<span class="tag ambar">acima do teto</span>';
}

function tabelaAnuncios(lista) {
  if (!lista.length) return '<div class="vazio">Nenhum anúncio aqui. Quando a varredura achar algo, aparece nesta tabela e chega no seu email.</div>';
  const porId = Object.fromEntries(itens.map((i) => [i.id, i]));
  const linhas = lista.map((a) => {
    const link = url(a.link);
    const titulo = link ? `<a href="${link}" target="_blank" rel="noopener">${esc(a.titulo)}</a>` : esc(a.titulo);
    const sit = a.ativo ? "" : ' <span class="tag cinza">encerrado</span>';
    const leilao = a.leilao ? ' <span class="tag cinza">leilão</span>' : "";
    return `<tr class="${a.ativo ? "" : "encerrado"}"><td class="preco">${preco(a.preco, a.moeda)}</td>
      <td>${titulo}${sit}${leilao} ${teto(a, porId[a.item_id])}</td>
      <td>${esc(a.estado || "—")}</td><td>${esc(a.local || "—")}</td><td>${esc(a.loja)}</td><td>${dataHora(a.visto_em)}</td></tr>`;
  }).join("");
  return `<div class="rolagem"><table><thead><tr><th>Preço</th><th>Anúncio</th><th>Estado</th><th>Local</th><th>Loja</th><th>Visto em</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
}

function desenharPainel() {
  const ativos = anuncios.filter((a) => a.ativo);
  const recentes = ativos.slice(0, 5);
  const lojas = Object.values(status.lojas || {});
  const barato = [...ativos].filter((a) => a.moeda === "BRL").sort((a, b) => a.preco - b.preco)[0] || [...ativos].sort((a, b) => a.preco - b.preco)[0];
  const destaque = barato && url(barato.link)
    ? `<div class="destaque"><span class="miudo">Mais barato agora</span><strong>${esc(barato.titulo)}</strong>
       <span class="valor">${preco(barato.preco, barato.moeda)}</span><span class="miudo">${esc(barato.loja)}${barato.local ? " · " + esc(barato.local) : ""}</span>
       <a class="botao" href="${url(barato.link)}" target="_blank" rel="noopener">${ic("abrir")}Ver anúncio</a></div>`
    : `<div class="destaque"><span class="miudo">Mais barato agora</span><strong>Nenhum anúncio ativo ainda</strong>
       <span class="miudo">Quando a varredura achar algo, o melhor preço aparece aqui.</span></div>`;
  $("painel").innerHTML = `<h1>Painel</h1><div class="vitrine" id="vitrine"><canvas aria-label="Modelo 3D do item. Arraste para girar."></canvas><div class="placa"><h2></h2><p></p></div><div class="escolha"></div></div>${radar(ativos)}
    <div class="resumo"><div><b>${itens.filter((i) => i.ativo !== false).length}</b>alertas ligados</div>
    <div><b>${ativos.length}</b>anúncios ativos</div><div><b>${anuncios.length}</b>anúncios já vistos</div></div>
    <div class="painel-duplo">
      <div class="aneis"><h2>Situação</h2>
        ${anel("Alertas ligados", itens.filter((i) => i.ativo !== false).length, itens.length, "var(--cor-a)")}
        ${anel("Lojas respondendo", lojas.filter((l) => l.estado === "ok").length, lojas.length, "var(--cor-b)")}
        ${anel("Anúncios ativos", ativos.length, anuncios.length, "var(--cor-c)")}
      </div>${destaque}
    </div>
    <h2>Últimos anúncios</h2>${tabelaAnuncios(recentes)}`;
}

function desenharLista() {
  const grupos = CATEGORIAS.map((c) => [c, itens.filter((i) => i.categoria === c)]).filter(([, l]) => l.length);
  const fichas = grupos.map(([cat, lista]) => `<h2>${esc(cat)}</h2>` + lista.map((i) => {
    const n = anuncios.filter((a) => a.item_id === i.id && a.ativo).length;
    const raridade = { 3: "Lendário", 2: "Raro", 1: "Comum" }[i.prioridade] || "Raro";
    const sigla = esc(i.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase());
    return `<article class="ficha" data-prio="${Number(i.prioridade) || 2}"><div class="cartucho" aria-hidden="true"><span>${sigla}</span></div><header><h3>${esc(i.nome)}</h3><span class="raridade">${raridade}</span>
      ${i.ativo === false ? '<span class="tag cinza">alerta pausado</span>' : '<span class="tag verde">alerta ligado</span>'}</header>
      <dl><dt>Prioridade</dt><dd>${PRIORIDADE[i.prioridade] || "Média"}</dd>
      <dt>Estado</dt><dd>${esc(i.estado)}</dd><dt>Região</dt><dd>${esc(i.regiao)}</dd>
      <dt>Teto</dt><dd>${i.teto ? preco(i.teto, "BRL") : "Sem teto"}</dd>
      <dt>Anúncios ativos</dt><dd>${n}</dd>
      <dt>Busca por</dt><dd>${esc((i.termos || []).join(" · "))}</dd>
      ${i.notas ? `<dt>Notas</dt><dd>${esc(i.notas)}</dd>` : ""}</dl>
      <div class="acoes"><button class="botao cinza" type="button" data-editar="${esc(i.id)}">${ic("editar")}Editar</button>
      <button class="botao cinza" type="button" data-pausar="${esc(i.id)}">${i.ativo === false ? ic("ligar") + "Ligar alerta" : ic("pausar") + "Pausar alerta"}</button>
      <button class="botao cinza perigo" type="button" data-remover="${esc(i.id)}">${ic("remover")}Remover</button></div></article>`;
  }).join("")).join("");
  $("lista").innerHTML = `<h1>Minha lista</h1>${fichas || '<div class="vazio">Sua lista está vazia. Use "Adicionar item" para começar.</div>'}`;
}

function desenharAnuncios() {
  const opcoes = [["todos", "Todos os itens"], ...itens.map((i) => [i.id, i.nome])]
    .map(([v, l]) => `<option value="${esc(v)}" ${v === filtroItem ? "selected" : ""}>${esc(l)}</option>`).join("");
  const lista = anuncios.filter((a) => (filtroItem === "todos" || a.item_id === filtroItem) && (filtroSit === "todos" || a.ativo));
  $("anuncios").innerHTML = `<h1>Anúncios</h1><div class="filtros">
    <label>Item<select id="filtroItem">${opcoes}</select></label>
    <label>Situação<select id="filtroSit"><option value="ativos" ${filtroSit === "ativos" ? "selected" : ""}>Só ativos</option>
    <option value="todos" ${filtroSit === "todos" ? "selected" : ""}>Incluir encerrados</option></select></label></div>
    ${tabelaAnuncios([...lista].sort((a, b) => a.preco - b.preco))}`;
  $("filtroItem").onchange = (e) => { filtroItem = e.target.value; desenharAnuncios(); };
  $("filtroSit").onchange = (e) => { filtroSit = e.target.value; desenharAnuncios(); };
}

function desenharAlertas() {
  const lojas = Object.values(status.lojas || {});
  const linhas = lojas.map((l) => `<tr><td>${esc(l.nome)}</td><td>${esc(LEDS[l.estado] || l.estado)}</td>
    <td>${l.estado === "falha" ? `${esc(l.erro)}, desde ${dataHora(l.desde)}` : "—"}</td></tr>`).join("");
  const itensLinhas = itens.map((i) => `<tr><td>${esc(i.nome)}</td><td>${i.ativo === false ? "Pausado" : "Ligado"}</td>
    <td>${i.teto ? preco(i.teto, "BRL") : "Sem teto"}</td></tr>`).join("");
  $("alertas").innerHTML = `<h1>Alertas</h1>
    <h2>Como funciona</h2><ol class="passos">
    <li>A cada 5 minutos o GitHub busca cada item ligado no eBay e no Mercado Livre.</li>
    <li>O filtro descarta o que não é o item, como capas e peças.</li>
    <li>Anúncio novo ou preço menor vira um email separado por categoria e item.</li>
    <li>Sem novidade, nenhum email é enviado.</li>
    <li>Se uma loja parar de responder por 1 hora, chega um aviso.</li></ol>
    <h2>Lojas</h2>${linhas ? `<div class="rolagem"><table><thead><tr><th>Loja</th><th>Situação</th><th>Detalhe</th></tr></thead><tbody>${linhas}</tbody></table></div>` : '<div class="vazio">A primeira varredura ainda não rodou.</div>'}
    <h2>Itens</h2><div class="rolagem"><table><thead><tr><th>Item</th><th>Alerta</th><th>Teto</th></tr></thead><tbody>${itensLinhas}</tbody></table></div>
    <p class="miudo">Ligue, pause ou edite cada alerta em Minha lista. Teto em R$ só é comparado com anúncios em R$.</p>`;
}

function desenharLateral() {
  const lojas = Object.values(status.lojas || {});
  $("leds").innerHTML = lojas.length
    ? lojas.map((l) => `<li><span class="led ${esc(l.estado)}"></span>${esc(l.nome)}: ${esc(LEDS[l.estado] || l.estado)}</li>`).join("")
    : '<li><span class="led"></span>Aguardando a primeira varredura</li>';
  $("ultima").textContent = status.ultima_varredura ? `Registro salvo em ${dataHora(status.ultima_varredura)}. A varredura roda a cada 5 min.` : "";
  $("contador").textContent = String(itens.length).padStart(4, "0");
  const ativos = anuncios.filter((a) => a.ativo).slice(0, 8);
  $("letreiro").textContent = ativos.length
    ? ativos.map((a) => `${a.titulo} por ${SIMBOLO[a.moeda] || a.moeda} ${a.preco}`).join("   ///   ")
    : "Varredura a cada 5 minutos   ///   Novidade vai direto para o seu email";
}

function mostrarAba() {
  const atual = ABAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "painel";
  ABAS.forEach((a) => { $(a).hidden = a !== atual; });
  document.querySelectorAll(".abas a").forEach((l) => {
    if (l.dataset.aba === atual) l.setAttribute("aria-current", "page"); else l.removeAttribute("aria-current");
  });
}

function iniciarTemas() {
  const seletor = $("seletorTema");
  seletor.innerHTML = Object.entries(TEMAS).map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
  const raiz = document.documentElement;
  if (!TEMAS[raiz.dataset.tema]) raiz.dataset.tema = TEMA_PADRAO;
  seletor.value = raiz.dataset.tema;
  seletor.onchange = () => {
    raiz.dataset.tema = seletor.value;
    ligarVitrine();
    try { localStorage.setItem("cacada-tema", seletor.value); } catch {}
  };
}

let editando = null;
function abrirForm(item) {
  editando = item || null;
  $("dlgTitulo").textContent = item ? "Editar item" : "Novo item";
  $("fNome").value = item?.nome || "";
  $("fCategoria").value = item?.categoria || "Console";
  $("fPrioridade").value = String(item?.prioridade || 2);
  $("fEstado").value = item?.estado || "Qualquer";
  $("fRegiao").value = item?.regiao || "Qualquer";
  $("fTeto").value = item?.teto || 0;
  $("fTermos").value = (item?.termos || []).join("\n");
  $("fExige").value = (item?.exige || []).join(", ");
  $("fExclui").value = (item?.exclui || []).join(", ");
  $("fNotas").value = item?.notas || "";
  $("dlg").showModal();
}
const separar = (t, sep) => t.split(sep).map((s) => s.trim()).filter(Boolean);

$("fCategoria").innerHTML = CATEGORIAS.map((c) => `<option>${c}</option>`).join("");
$("btnNovo").onclick = () => abrirForm();
$("btnCancelar").onclick = () => $("dlg").close();
$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const item = {
    nome: $("fNome").value.trim(), categoria: $("fCategoria").value, prioridade: Number($("fPrioridade").value),
    estado: $("fEstado").value, regiao: $("fRegiao").value, teto: Number($("fTeto").value) || 0,
    ativo: editando ? editando.ativo !== false : true,
    termos: separar($("fTermos").value, "\n"), exige: separar($("fExige").value, ","),
    exclui: separar($("fExclui").value, ","), notas: $("fNotas").value.trim(),
  };
  const pedido = editando ? { acao: "editar", id: editando.id, item } : { acao: "adicionar", item };
  pedir(`${editando ? "Editar" : "Adicionar"}: ${item.nome}`, pedido);
  $("dlg").close();
});

$("lista").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const id = b.dataset.editar || b.dataset.pausar || b.dataset.remover;
  const item = itens.find((i) => i.id === id);
  if (!item) return;
  if (b.dataset.editar) abrirForm(item);
  if (b.dataset.pausar) {
    const acao = item.ativo === false ? "retomar" : "pausar";
    pedir(`${acao === "pausar" ? "Pausar" : "Ligar"}: ${item.nome}`, { acao, id });
  }
  if (b.dataset.remover) pedir(`Remover: ${item.nome}`, { acao: "remover", id });
});
window.addEventListener("hashchange", mostrarAba);
iniciarTemas();
document.querySelectorAll(".abas a").forEach((a) => {
  a.innerHTML = `${ic(a.dataset.aba)}<span class="rotulo">${a.textContent}</span>`;
  a.title = a.textContent;
});
$("btnNovo").innerHTML = `${ic("mais")}Adicionar item`;

async function ler(nome) {
  const r = await fetch(`data/${nome}.json?t=${Date.now()}`);
  if (!r.ok) throw new Error(nome);
  return r.json();
}
(async () => {
  mostrarAba();
  try {
    [{ itens }, { anuncios }, status] = await Promise.all([ler("itens"), ler("anuncios"), ler("status")]);
  } catch {
    $("painel").innerHTML = '<h1>Painel</h1><div class="vazio">Não deu para carregar os dados. Recarregue a página.</div>';
    return;
  }
  desenharLateral(); desenharPainel(); desenharLista(); desenharAnuncios(); desenharAlertas(); ligarVitrine();
})();
