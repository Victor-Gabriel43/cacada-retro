"""Monta e envia os emails. Texto de anúncio vem de terceiros: sempre escapado."""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape

PRIORIDADE = {3: "Alta", 2: "Média", 1: "Baixa"}
ORDEM_CATEGORIAS = ["Console", "Controle", "Portátil", "Jogo", "Acessório", "Outro"]
SIMBOLOS = {"BRL": "R$", "USD": "US$", "EUR": "€", "GBP": "£"}

AZUL, CINZA, BORDA, VERDE, LARANJA = "#0b3d91", "#eef2f8", "#9fb3cf", "#1c7a3e", "#b35a00"


def preco(valor, moeda):
    txt = f"{valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{SIMBOLOS.get(moeda, moeda)} {txt}"


def link_seguro(url):
    return url if str(url).startswith("https://") else ""


def situacao_teto(anuncio, item):
    teto = item.get("teto") or 0
    if not teto:
        return "Sem teto", "#555555"
    if anuncio["moeda"] != "BRL":
        return "Outra moeda: compare com o teto", LARANJA
    if anuncio["preco"] <= teto:
        return "Dentro do teto", VERDE
    return "Acima do teto", LARANJA


def _agrupar(itens, novos, baixas):
    """[(categoria, [(item, novos, baixas), ...]), ...] na ordem de exibição."""
    grupos = {}
    for item in sorted(itens, key=lambda i: (-i.get("prioridade", 2), i["nome"])):
        n = sorted((a for a in novos if a["item_id"] == item["id"]), key=lambda a: a["preco"])
        b = sorted((a for a in baixas if a["item_id"] == item["id"]), key=lambda a: a["preco"])
        if n or b:
            grupos.setdefault(item.get("categoria", "Outro"), []).append((item, n, b))
    ordem = {c: i for i, c in enumerate(ORDEM_CATEGORIAS)}
    return sorted(grupos.items(), key=lambda g: ordem.get(g[0], 99))


def assunto(novos, baixas, itens):
    partes = []
    if novos:
        partes.append(f"{len(novos)} novo(s)")
    if baixas:
        partes.append(f"{len(baixas)} baixa(s) de preço")
    ids = {a["item_id"] for a in novos + baixas}
    nomes = [i["nome"] for i in itens if i["id"] in ids]
    alvo = nomes[0] if len(nomes) == 1 else f"{len(nomes)} itens"
    return f"[Caçada Retrô] {' e '.join(partes)}: {alvo}"


def _linha(a, item, baixa=False):
    tag, cor = situacao_teto(a, item)
    td = f'style="padding:8px;border-bottom:1px solid {BORDA};vertical-align:top;font-size:13px"'
    valor = f"<b>{escape(preco(a['preco'], a['moeda']))}</b>"
    if baixa:
        valor = f"<s>{escape(preco(a['preco_antes'], a['moeda']))}</s><br>" + valor
    if a.get("leilao"):
        valor += "<br>leilão"
    url = link_seguro(a["link"])
    titulo = escape(a["titulo"])
    titulo = f'<a href="{escape(url, quote=True)}" style="color:{AZUL}">{titulo}</a>' if url else titulo
    return (f'<tr><td {td}>{valor}</td><td {td}>{titulo}<br>'
            f'<span style="color:{cor};font-size:12px">{escape(tag)}</span></td>'
            f'<td {td}>{escape(a.get("estado") or "—")}</td>'
            f'<td {td}>{escape(a.get("local") or "—")}</td>'
            f'<td {td}>{escape(a["loja"])}</td></tr>')


def _tabela(titulo, linhas):
    th = f'style="padding:6px 8px;background:{CINZA};text-align:left;font-size:12px;border-bottom:2px solid {BORDA}"'
    cab = "".join(f"<th {th}>{c}</th>" for c in ("Preço", "Anúncio", "Estado", "Local", "Loja"))
    return (f'<p style="margin:14px 0 6px;font-weight:bold;font-size:14px">{escape(titulo)}</p>'
            f'<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">'
            f"<tr>{cab}</tr>{''.join(linhas)}</table>")


def html(itens, novos, baixas, site_url=""):
    blocos = []
    for categoria, entradas in _agrupar(itens, novos, baixas):
        blocos.append(f'<h2 style="font-size:16px;color:#fff;background:{AZUL};padding:6px 10px;'
                      f'margin:22px 0 0">{escape(categoria)}</h2>')
        for item, n, b in entradas:
            teto = "teto " + preco(item["teto"], "BRL") if item.get("teto") else "sem teto"
            ficha = (f'<b>Procurando:</b> estado {escape(item.get("estado", "Qualquer"))} · '
                     f'região {escape(item.get("regiao", "Qualquer"))} · {escape(teto)} · '
                     f'prioridade {PRIORIDADE.get(item.get("prioridade", 2), "Média")}')
            if item.get("notas"):
                ficha += f'<br><b>Notas:</b> {escape(item["notas"])}'
            corpo = (f'<h3 style="font-size:15px;margin:14px 0 4px">{escape(item["nome"])}</h3>'
                     f'<p style="margin:0;padding:8px;background:{CINZA};font-size:13px">{ficha}</p>')
            if n:
                corpo += _tabela(f"Anúncios novos ({len(n)}), do mais barato ao mais caro",
                                 [_linha(a, item) for a in n])
            if b:
                corpo += _tabela(f"Baixaram de preço ({len(b)})",
                                 [_linha(a, item, baixa=True) for a in b])
            blocos.append(corpo)
    rodape_site = (f'<a href="{escape(link_seguro(site_url), quote=True)}" style="color:{AZUL}">'
                   "Abrir a Caçada Retrô</a><br>") if link_seguro(site_url) else ""
    return (f'<div style="font-family:Verdana,Tahoma,Arial,sans-serif;color:#1c2430;max-width:720px;margin:auto">'
            f'<div style="background:{AZUL};color:#fff;padding:14px 16px;font-size:20px;font-weight:bold">Caçada Retrô</div>'
            f'<p style="margin:14px 0 0;font-size:14px"><b>Resumo:</b> {len(novos)} anúncio(s) novo(s) '
            f"e {len(baixas)} baixa(s) de preço.</p>{''.join(blocos)}"
            f'<p style="margin:24px 0 0;padding-top:10px;border-top:1px solid {BORDA};font-size:12px;color:#555">'
            f"{rodape_site}Confira o vendedor e o frete antes de comprar. "
            "Anúncios de fora do Brasil podem ter imposto de importação.</p></div>")


def texto(itens, novos, baixas, site_url=""):
    linhas = [f"Resumo: {len(novos)} anúncio(s) novo(s) e {len(baixas)} baixa(s) de preço.", ""]
    for categoria, entradas in _agrupar(itens, novos, baixas):
        linhas += [f"=== {categoria.upper()} ===", ""]
        for item, n, b in entradas:
            linhas += [item["nome"], "-" * len(item["nome"])]
            for rotulo, lista in (("NOVOS", n), ("BAIXARAM DE PREÇO", b)):
                if lista:
                    linhas.append(rotulo)
                for a in lista:
                    linhas += [f"{preco(a['preco'], a['moeda'])} | {a['loja']} | {a.get('estado') or '-'} | {a.get('local') or '-'}",
                               a["titulo"], link_seguro(a["link"]), ""]
    if site_url:
        linhas.append(f"Site: {site_url}")
    linhas.append("Confira o vendedor e o frete antes de comprar.")
    return "\n".join(linhas)


def aviso_falha(lojas, site_url=""):
    linhas = ["A busca automática está com problema nestas lojas:", ""]
    linhas += [f"- {l['nome']}: {l['erro']}, desde {l['desde']} (UTC)" for l in lojas]
    linhas += ["", "As outras lojas continuam funcionando. Este aviso só é enviado uma vez por problema."]
    if site_url:
        linhas += ["", f"Site: {site_url}"]
    return "\n".join(linhas)


def enviar(config, assunto_, corpo_texto, corpo_html=None):
    msg = MIMEMultipart("alternative")
    msg["Subject"], msg["From"], msg["To"] = assunto_, config["usuario"], config["destino"]
    msg.attach(MIMEText(corpo_texto, "plain", "utf-8"))
    if corpo_html:
        msg.attach(MIMEText(corpo_html, "html", "utf-8"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as s:
        s.login(config["usuario"], config["senha"])
        s.send_message(msg)
