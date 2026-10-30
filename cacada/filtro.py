"""Decide se o título de um anúncio corresponde a um item da lista."""

import re
import unicodedata


def normalizar(texto):
    sem_acento = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in sem_acento if not unicodedata.combining(c)).lower()


def _tem(palavra, titulo):
    return re.search(r"\b" + re.escape(normalizar(palavra).strip()) + r"\b", titulo) is not None


def titulo_serve(item, titulo):
    """Cada entrada de `exige` precisa aparecer; "a|b" aceita qualquer uma das duas.
    Nenhuma entrada de `exclui` pode aparecer."""
    t = normalizar(titulo)
    for grupo in item.get("exige", []):
        if not any(_tem(p, t) for p in grupo.split("|") if p.strip()):
            return False
    return not any(_tem(p, t) for p in item.get("exclui", []) if p.strip())
