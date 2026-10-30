"""Aplica um pedido vindo do site: adicionar, editar, pausar ou remover um item.

O site abre uma issue no GitHub com um bloco JSON. O workflow só chama este
script quando quem abriu a issue é o dono do repositório. Mesmo assim, tudo é
validado: campos fora da lista são descartados.
"""

import json
import os
import re
import sys
import unicodedata
from pathlib import Path

ARQUIVO = Path(__file__).parent / "docs" / "data" / "itens.json"
CATEGORIAS = {"Console", "Controle", "Portátil", "Jogo", "Acessório", "Outro"}
ESTADOS = {"Qualquer", "Loose", "CIB", "Lacrado"}
REGIOES = {"Qualquer", "NTSC-U", "NTSC-J", "PAL", "Brasil"}
MAX_ITENS = 8  # limite para não estourar a cota diária das APIs


class PedidoInvalido(Exception):
    pass


def extrair_pedido(corpo):
    m = re.search(r"```json\s*(\{.*?\})\s*```", corpo or "", re.S)
    if not m:
        raise PedidoInvalido("Não achei o bloco de dados na issue.")
    try:
        return json.loads(m.group(1))
    except ValueError:
        raise PedidoInvalido("O bloco de dados não é um JSON válido.") from None


def _texto(valor, limite):
    return str(valor or "").strip()[:limite]


def _lista(valor, limite_itens, limite_texto):
    if not isinstance(valor, list):
        return []
    return [t for t in (_texto(v, limite_texto) for v in valor[:limite_itens]) if t]


def slug(nome):
    s = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60] or "item"


def validar_item(d):
    if not isinstance(d, dict):
        raise PedidoInvalido("Dados do item ausentes.")
    nome = _texto(d.get("nome"), 120)
    if not nome:
        raise PedidoInvalido("O item precisa de um nome.")
    categoria = d.get("categoria")
    if categoria not in CATEGORIAS:
        raise PedidoInvalido(f"Categoria inválida: {_texto(categoria, 30)}")
    try:
        teto = max(0, float(d.get("teto") or 0))
        prioridade = int(d.get("prioridade") or 2)
    except (TypeError, ValueError):
        raise PedidoInvalido("Teto ou prioridade não é um número.") from None
    return {
        "nome": nome,
        "categoria": categoria,
        "prioridade": prioridade if prioridade in (1, 2, 3) else 2,
        "estado": d.get("estado") if d.get("estado") in ESTADOS else "Qualquer",
        "regiao": d.get("regiao") if d.get("regiao") in REGIOES else "Qualquer",
        "teto": teto,
        "ativo": d.get("ativo") is not False,
        "notas": _texto(d.get("notas"), 400),
        "termos": _lista(d.get("termos"), 3, 80) or [nome],
        "exige": _lista(d.get("exige"), 8, 80),
        "exclui": _lista(d.get("exclui"), 40, 40),
    }


def aplicar(itens, pedido):
    """Retorna (nova lista, mensagem para a issue)."""
    acao = pedido.get("acao")
    if acao == "adicionar":
        if len(itens) >= MAX_ITENS:
            raise PedidoInvalido(f"A lista chegou ao limite de {MAX_ITENS} itens.")
        novo = validar_item(pedido.get("item"))
        base = slug(novo["nome"])
        ids = {i["id"] for i in itens}
        id_, n = base, 2
        while id_ in ids:
            id_, n = f"{base}-{n}", n + 1
        return itens + [{"id": id_, **novo}], f"Adicionado: {novo['nome']}"

    id_ = pedido.get("id")
    atual = next((i for i in itens if i["id"] == id_), None)
    if atual is None:
        raise PedidoInvalido("Esse item não está mais na lista.")
    if acao == "remover":
        return [i for i in itens if i["id"] != id_], f"Removido: {atual['nome']}"
    if acao == "editar":
        novo = validar_item(pedido.get("item"))
        return [{"id": id_, **novo} if i["id"] == id_ else i for i in itens], f"Atualizado: {novo['nome']}"
    if acao in ("pausar", "retomar"):
        ativo = acao == "retomar"
        rotulo = "Alerta ligado" if ativo else "Alerta pausado"
        return [{**i, "ativo": ativo} if i["id"] == id_ else i for i in itens], f"{rotulo}: {atual['nome']}"
    raise PedidoInvalido("Ação desconhecida.")


def main():
    try:
        dados = json.loads(ARQUIVO.read_text("utf-8"))
        itens, msg = aplicar(dados["itens"], extrair_pedido(os.environ.get("ISSUE_BODY")))
        ARQUIVO.write_text(json.dumps({"itens": itens}, ensure_ascii=False, indent=1) + "\n", "utf-8")
    except PedidoInvalido as e:
        msg = f"Não foi possível aplicar: {e}"
    saida = os.environ.get("RESULTADO", "resultado.txt")
    Path(saida).write_text(msg, "utf-8")
    print(msg)


if __name__ == "__main__":
    sys.exit(main())
