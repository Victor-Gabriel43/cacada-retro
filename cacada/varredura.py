"""Compara o que as lojas retornaram com o que já conhecemos."""

from datetime import datetime, timedelta, timezone

from .filtro import titulo_serve

SALVAR_STATUS_A_CADA = timedelta(hours=6)
AVISAR_FALHA_DEPOIS = timedelta(hours=1)


def agora():
    return datetime.now(timezone.utc)


def _iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _data(texto):
    return datetime.strptime(texto, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def coletar(itens, lojas):
    """Roda as buscas. Retorna (achados por id, {chave da loja: erro ou None})."""
    achados, erros = {}, {}
    for loja in lojas:
        erros[loja.chave] = None
        try:
            for item in itens:
                for termo in item["termos"]:
                    for anuncio in loja.buscar(termo):
                        if titulo_serve(item, anuncio["titulo"]):
                            achados[anuncio["id"]] = {**anuncio, "item_id": item["id"]}
        except Exception as e:  # uma loja com problema não derruba a outra
            erros[loja.chave] = str(e) or type(e).__name__
    return achados, erros


def comparar(anuncios, achados, erros, ja_avisados, momento):
    """Atualiza a lista de anúncios. Retorna (anuncios, novos, baixas).

    `novos` e `baixas` são o que vai para o email. Anúncio que já foi avisado
    entra na lista do site, mas não gera email de novo.
    """
    por_id = {a["id"]: dict(a) for a in anuncios}
    novos, baixas = [], []
    carimbo = _iso(momento)

    for id_, a in achados.items():
        antigo = por_id.get(id_)
        if antigo is None:
            registro = {**a, "visto_em": carimbo, "ativo": True}
            por_id[id_] = registro
            if id_ not in ja_avisados:
                novos.append(registro)
            continue
        queda = (not a.get("leilao") and a["moeda"] == antigo["moeda"]
                 and 0 < a["preco"] < antigo["preco"])
        if queda:
            baixas.append({**a, "preco_antes": antigo["preco"]})
        por_id[id_] = {**antigo, **a, "ativo": True}

    # Sumiu da busca de uma loja que respondeu bem: anúncio encerrado
    prefixos_ok = tuple(k + ":" for k, erro in erros.items() if erro is None)
    for id_, a in por_id.items():
        if id_ not in achados and prefixos_ok and id_.startswith(prefixos_ok):
            a["ativo"] = False

    lista = sorted(por_id.values(), key=lambda a: a["visto_em"], reverse=True)
    return lista, novos, baixas


def atualizar_status(status, lojas_todas, erros, momento):
    """Retorna (status, deve_salvar, lojas com falha para avisar por email)."""
    novo = {"ultima_varredura": status.get("ultima_varredura"),
            "lojas": dict(status.get("lojas") or {})}
    salvar = False
    avisar = []

    for chave, nome in lojas_todas.items():
        atual = novo["lojas"].get(chave) or {}
        if chave not in erros:
            registro = {"nome": nome, "estado": "sem_chave"}
        elif erros[chave] is None:
            registro = {"nome": nome, "estado": "ok"}
        else:
            desde = atual.get("desde") if atual.get("estado") == "falha" else _iso(momento)
            registro = {"nome": nome, "estado": "falha", "erro": erros[chave], "desde": desde,
                        "avisado": bool(atual.get("avisado"))}
            if not registro["avisado"] and momento - _data(desde) >= AVISAR_FALHA_DEPOIS:
                registro["avisado"] = True
                avisar.append(registro)
        if registro != atual:
            salvar = True
        novo["lojas"][chave] = registro

    ultima = status.get("ultima_varredura")
    if salvar or not ultima or momento - _data(ultima) >= SALVAR_STATUS_A_CADA:
        novo["ultima_varredura"] = _iso(momento)
        salvar = True
    return novo, salvar, avisar
