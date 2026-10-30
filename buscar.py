"""Uma varredura: busca nas lojas, atualiza os dados e manda email se houver novidade.

Variáveis de ambiente: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, ML_CLIENT_ID,
ML_CLIENT_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_TO (opcional),
SITE_URL (opcional), DRY_RUN=1 (mostra o email sem enviar e não salva nada).
"""

import json
import os
import sys
from pathlib import Path

from cacada import lojas as L
from cacada import mensagem, varredura

DADOS = Path(__file__).parent / "docs" / "data"
LOJAS = {"ebay": "eBay", "ml": "Mercado Livre"}


def ler(nome):
    return json.loads((DADOS / nome).read_text("utf-8"))


def gravar(nome, conteudo):
    (DADOS / nome).write_text(json.dumps(conteudo, ensure_ascii=False, indent=1) + "\n", "utf-8")


def abrir_lojas():
    """Retorna (lojas conectadas, erros de conexão). Loja sem chave fica de fora."""
    abertas, erros = [], {}
    for chave, classe, prefixo in (("ebay", L.Ebay, "EBAY"), ("ml", L.MercadoLivre, "ML")):
        cid, sec = os.environ.get(f"{prefixo}_CLIENT_ID"), os.environ.get(f"{prefixo}_CLIENT_SECRET")
        if not cid or not sec:
            continue
        try:
            abertas.append(classe(cid, sec))
        except L.ErroDeLoja as e:
            erros[chave] = str(e)
    return abertas, erros


def config_email():
    usuario = os.environ.get("GMAIL_USER", "")
    return {"usuario": usuario,
            "senha": os.environ.get("GMAIL_APP_PASSWORD", "").replace(" ", ""),
            "destino": os.environ.get("EMAIL_TO") or usuario}


def main():
    dry = bool(os.environ.get("DRY_RUN"))
    site = os.environ.get("SITE_URL", "")
    momento = varredura.agora()
    itens = [i for i in ler("itens.json")["itens"] if i.get("ativo", True)]
    dados = ler("anuncios.json")
    ja_avisados = set(ler("ja_avisados.json"))

    abertas, erros_conexao = abrir_lojas()
    achados, erros = varredura.coletar(itens, abertas)
    erros.update(erros_conexao)

    anuncios, novos, baixas = varredura.comparar(dados["anuncios"], achados, erros, ja_avisados, momento)
    status, salvar_status, avisar = varredura.atualizar_status(ler("status.json"), LOJAS, erros, momento)

    print(f"Lojas: { {k: (v or 'ok') for k, v in erros.items()} } | achados: {len(achados)} | "
          f"novos: {len(novos)} | baixas: {len(baixas)}")

    cfg = config_email()
    if novos or baixas:
        assunto = mensagem.assunto(novos, baixas, itens)
        corpo_txt = mensagem.texto(itens, novos, baixas, site)
        corpo_html = mensagem.html(itens, novos, baixas, site)
        if dry:
            print(assunto + "\n\n" + corpo_txt)
        else:
            # Se o envio falhar, nada é salvo e a próxima varredura tenta de novo
            mensagem.enviar(cfg, assunto, corpo_txt, corpo_html)
            print("Email enviado.")
    if avisar and not dry:
        mensagem.enviar(cfg, "[Caçada Retrô] Problema na busca automática",
                        mensagem.aviso_falha(avisar, site))

    if dry:
        return
    if anuncios != dados["anuncios"]:
        gravar("anuncios.json", {"anuncios": anuncios})
        gravar("ja_avisados.json", sorted(ja_avisados | {a["id"] for a in anuncios}))
    if salvar_status:
        gravar("status.json", status)

    if erros and all(erros.values()):
        print("Todas as lojas configuradas falharam.")
        sys.exit(1)


if __name__ == "__main__":
    main()
