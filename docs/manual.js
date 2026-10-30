// Tema Manual: a página "Nomes das partes" de um manual de videogame.
// O item é desenhado em traço e cada linha aponta para um anúncio real, do mais barato ao mais caro.
// Sem anúncio, as linhas apontam para a ficha do que você procura.
const ESCALA = 130, CX = 620, CY = 300;
const px = (x, y) => [CX + x * ESCALA, CY - y * ESCALA];

// Pontos do desenho e a coluna de texto ligada a cada um, na ordem de preço
const SAIDAS = [
  { de: [-1.65, 0.28], lado: "e", y: 96 },
  { de: [1.65, 0.28], lado: "d", y: 96 },
  { de: [-0.82, -0.5], lado: "e", y: 300 },
  { de: [0.82, -0.5], lado: "d", y: 300 },
  { de: [-2.2, -1.25], lado: "e", y: 504 },
  { de: [2.2, -1.25], lado: "d", y: 504 },
];

const TRACO_CONTROLE = `
  <path class="casco" d="M-1.5 1L1.5 1C2 1 2.2 .6 2.35 0C2.55 -.8 2.6 -1.6 2.2 -1.75C1.85 -1.85 1.55 -1.2 1.2 -.75L-1.2 -.75C-1.55 -1.2 -1.85 -1.85 -2.2 -1.75C-2.6 -1.6 -2.55 -.8 -2.35 0C-2.2 .6 -2 1 -1.5 1Z"/>
  <path d="M-1.86 1.04C-1.7 1.28 -1.2 1.28 -1.05 1.02M1.86 1.04C1.7 1.28 1.2 1.28 1.05 1.02"/>
  <rect x="-.75" y=".2" width="1.5" height=".72" rx=".05"/><path d="M-.5 1.02L.5 1.02"/>
  <path d="M-1.75 .58h.2v-.2h.2v-.2h-.2v-.2h-.2v.2h-.2v.2h.2z" transform="translate(.0 -.0)"/>
  <circle cx="1.65" cy=".55" r=".125"/><circle cx="1.92" cy=".28" r=".125"/><circle cx="1.65" cy=".01" r=".125"/><circle cx="1.38" cy=".28" r=".125"/>
  <circle cx="-.82" cy="-.5" r=".36"/><circle cx="-.82" cy="-.5" r=".24"/>
  <circle cx=".82" cy="-.5" r=".36"/><circle cx=".82" cy="-.5" r=".24"/>
  <circle cx="-.98" cy=".62" r=".05"/><circle cx=".98" cy=".62" r=".05"/>`;

const TRACO_CONSOLE = `
  <path class="casco" d="M-2.3 .95L2.3 .95L2.5 -1.1L-2.5 -1.1Z"/>
  <path d="M-2.42 -.35L2.42 -.35M-1.2 .55L1.2 .55L1.2 .25L-1.2 .25Z"/>
  <circle cx="-1.75" cy="-.72" r=".16"/><circle cx="1.75" cy="-.72" r=".07"/><path d="M-.9 -.72L.9 -.72"/>`;

function saida(s, i) {
  const [ax, ay] = px(...s.de);
  const x = s.lado === "e" ? 318 : 922;
  return { ...s, i, ax, ay, x };
}

function rotulo(s, grande, linha1, linha2, link) {
  const tx = s.lado === "e" ? 24 : 1216;
  const ancora = s.lado === "e" ? "start" : "end";
  const corpo = `<text class="grande" x="${tx}" y="${s.y + 4}" text-anchor="${ancora}">${esc(grande)}</text>
    <text class="linha" x="${tx}" y="${s.y + 30}" text-anchor="${ancora}">${esc(linha1)}</text>
    ${linha2 ? `<text class="linha fraca" x="${tx}" y="${s.y + 50}" text-anchor="${ancora}">${esc(linha2)}</text>` : ""}`;
  return link ? `<a href="${link}" target="_blank" rel="noopener">${corpo}</a>` : corpo;
}

const curto = (t, n = 30) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);

function palco(item, lista) {
  const fatos = [
    [item.teto ? preco(item.teto, "BRL") : "Sem teto", "Preço máximo", "Nenhum limite definido"],
    [item.estado, "Estado aceito", ""],
    [item.regiao, "Região aceita", ""],
    [PRIORIDADE[item.prioridade] || "Média", "Prioridade", ""],
    ["5 min", "Intervalo da busca", "eBay e Mercado Livre"],
    ["Email", "Como você é avisado", "Só quando há novidade"],
  ];
  const usados = lista.length ? lista.slice(0, 6) : fatos;
  const saidas = usados.map((_, i) => saida(SAIDAS[i], i));
  const fios = saidas.map((s) => `<path class="fio" style="--i:${s.i}" d="M${s.x} ${s.y}L${s.lado === "e" ? s.x + 34 : s.x - 34} ${s.y}L${s.ax} ${s.ay}"/>`).join("");
  const pontos = saidas.map((s) => `<g class="ponto"><circle cx="${s.ax}" cy="${s.ay}" r="15"/><text x="${s.ax}" y="${s.ay + 5.5}" text-anchor="middle">${s.i + 1}</text></g>`).join("");
  const rotulos = saidas.map((s, i) => {
    if (!lista.length) return rotulo(s, usados[i][0], usados[i][1], usados[i][2]);
    const a = usados[i];
    const onde = [a.loja, a.local].filter(Boolean).join(", ");
    return rotulo(s, preco(a.preco, a.moeda), curto(a.titulo), curto(onde), url(a.link));
  }).join("");
  const desenho = item.categoria === "Controle" ? TRACO_CONTROLE : TRACO_CONSOLE;
  return `<svg class="palco" id="palco" viewBox="0 0 1240 620" role="img" aria-label="Desenho de ${esc(item.nome)} com linhas apontando para cada informação">
    <g class="desenho" transform="translate(${CX} ${CY}) scale(${ESCALA} ${-ESCALA})">${desenho}</g>
    <g class="fios">${fios}</g><g class="rotulos">${rotulos}</g>${pontos}</svg>`;
}

function legenda(item, lista) {
  if (lista.length) {
    return `<ol class="partes">${lista.map((a) => `<li><a href="${url(a.link)}" target="_blank" rel="noopener"><b>${preco(a.preco, a.moeda)}</b><span>${esc(a.titulo)}</span><small>${esc([a.loja, a.local, a.estado].filter(Boolean).join(", "))}</small></a></li>`).join("")}</ol>`;
  }
  const f = [
    [item.teto ? preco(item.teto, "BRL") : "Sem teto", "Preço máximo"], [item.estado, "Estado aceito"], [item.regiao, "Região aceita"],
    [PRIORIDADE[item.prioridade] || "Média", "Prioridade"], ["5 min", "Intervalo da busca"], ["Email", "Como você é avisado"],
  ];
  return `<ol class="partes so-celular">${f.map(([a, b]) => `<li><div><b>${esc(a)}</b><span>${esc(b)}</span></div></li>`).join("")}</ol>`;
}

let itemManual = null;

function manualPainel() {
  if (!itens.length) {
    $("painel").innerHTML = `<h1 class="nome">Sua lista está vazia</h1><p class="frase">Adicione o primeiro item para começar a busca.</p><button class="carimbo" type="button" id="mNovo">Adicionar item</button>`;
    $("mNovo").onclick = () => abrirForm();
    return;
  }
  itemManual = itens.find((i) => i.id === itemManual?.id) || [...itens].sort((a, b) => (b.prioridade || 2) - (a.prioridade || 2))[0];
  const item = itemManual;
  const lista = anuncios.filter((a) => a.item_id === item.id && a.ativo && url(a.link)).sort((a, b) => a.preco - b.preco);
  const lojas = Object.values(status.lojas || {});
  const falhas = lojas.filter((l) => l.estado === "falha").map((l) => l.nome);
  const frase = lista.length
    ? `${lista.length === 1 ? "Um anúncio ativo" : lista.length + " anúncios ativos"}, numerados do mais barato ao mais caro.`
    : "Nenhum anúncio ativo agora. Enquanto isso, as linhas mostram o que você definiu para este item.";
  const aviso = falhas.length ? `<p class="frase alerta">${esc(falhas.join(" e "))} não ${falhas.length > 1 ? "estão respondendo" : "está respondendo"}.</p>` : "";
  const trocar = itens.length > 1
    ? `<nav class="outros" aria-label="Outros itens">${itens.map((i) => `<button type="button" data-item="${esc(i.id)}" aria-pressed="${i.id === item.id}">${esc(i.nome)}</button>`).join("")}</nav>` : "";
  $("painel").innerHTML = `<h1 class="nome">${esc(item.nome)}</h1>${trocar}<p class="frase">${frase}</p>${aviso}
    ${palco(item, lista)}${legenda(item, lista)}`;
  document.querySelectorAll("[data-item]").forEach((b) => { b.onclick = () => { itemManual = itens.find((i) => i.id === b.dataset.item); manualPainel(); }; });
  ajustarPalco();
}

// Em tela estreita o desenho ocupa tudo e a legenda vai para baixo
function ajustarPalco() {
  const p = $("palco");
  if (p) p.setAttribute("viewBox", matchMedia("(max-width:860px)").matches ? "250 100 740 400" : "0 0 1240 620");
}
matchMedia("(max-width:860px)").addEventListener("change", ajustarPalco);

function manualLista() {
  const linhas = itens.map((i) => {
    const n = anuncios.filter((a) => a.item_id === i.id && a.ativo).length;
    const pausado = i.ativo === false;
    return `<article class="linha-item"><h2>${esc(i.nome)}</h2>
      <p>${esc(i.categoria)}, prioridade ${esc((PRIORIDADE[i.prioridade] || "Média").toLowerCase())}, ${i.teto ? "teto de " + preco(i.teto, "BRL") : "sem teto"}. ${n === 1 ? "Um anúncio ativo" : n + " anúncios ativos"}. ${pausado ? "Alerta pausado." : "Alerta ligado."}</p>
      <div class="acoes-m"><button type="button" data-editar="${esc(i.id)}">Editar</button>
      <button type="button" data-pausar="${esc(i.id)}">${pausado ? "Ligar alerta" : "Pausar alerta"}</button>
      <button type="button" data-remover="${esc(i.id)}">Remover</button></div></article>`;
  }).join("");
  $("lista").innerHTML = `<h1 class="nome pequeno">Minha lista</h1>${linhas || '<p class="frase">Nada na lista ainda.</p>'}
    <button class="carimbo" type="button" id="mNovo">Adicionar item</button>`;
  $("mNovo").onclick = () => abrirForm();
}
