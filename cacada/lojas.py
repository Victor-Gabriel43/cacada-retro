"""Acesso às APIs oficiais do eBay e do Mercado Livre."""

import base64
import json
import urllib.error
import urllib.parse
import urllib.request

TIMEOUT = 20


class ErroDeLoja(Exception):
    """Falha ao falar com a loja. A mensagem nunca contém chaves."""


def _json(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise ErroDeLoja(f"HTTP {e.code}") from None
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        raise ErroDeLoja(type(e).__name__) from None


class Ebay:
    nome = "eBay"
    chave = "ebay"

    def __init__(self, client_id, client_secret):
        auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        self.token = _json(
            "https://api.ebay.com/identity/v1/oauth2/token",
            data=urllib.parse.urlencode({
                "grant_type": "client_credentials",
                "scope": "https://api.ebay.com/oauth/api_scope",
            }).encode(),
            headers={"Authorization": f"Basic {auth}",
                     "Content-Type": "application/x-www-form-urlencoded"},
        )["access_token"]

    def buscar(self, termo):
        url = "https://api.ebay.com/buy/browse/v1/item_summary/search?" + urllib.parse.urlencode(
            {"q": termo, "limit": 100, "filter": "deliveryCountry:BR"})
        res = _json(url, headers={"Authorization": f"Bearer {self.token}",
                                  "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"})
        return [self._anuncio(i) for i in res.get("itemSummaries", [])]

    @staticmethod
    def _anuncio(it):
        preco = it.get("price") or it.get("currentBidPrice") or {}
        local = it.get("itemLocation") or {}
        # itemId vem como "v1|123456|0"; o número é o mesmo da URL do anúncio
        partes = it["itemId"].split("|")
        numero = partes[1] if len(partes) > 1 else it["itemId"]
        return {
            "id": "ebay:" + numero,
            "loja": "eBay",
            "titulo": it.get("title", ""),
            "preco": float(preco.get("value") or 0),
            "moeda": preco.get("currency", "USD"),
            "estado": it.get("condition", ""),
            "local": ", ".join(x for x in (local.get("city"), local.get("country")) if x),
            "link": it.get("itemWebUrl", ""),
            "leilao": "AUCTION" in (it.get("buyingOptions") or []),
        }


class MercadoLivre:
    nome = "Mercado Livre"
    chave = "ml"

    def __init__(self, client_id, client_secret):
        self.token = _json(
            "https://api.mercadolibre.com/oauth/token",
            data=urllib.parse.urlencode({
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            }).encode(),
            headers={"Content-Type": "application/x-www-form-urlencoded",
                     "Accept": "application/json"},
        )["access_token"]

    def buscar(self, termo):
        url = "https://api.mercadolibre.com/sites/MLB/search?" + urllib.parse.urlencode(
            {"q": termo, "limit": 50})
        res = _json(url, headers={"Authorization": f"Bearer {self.token}"})
        return [self._anuncio(i) for i in res.get("results", [])]

    @staticmethod
    def _anuncio(it):
        end = it.get("address") or {}
        return {
            "id": "ml:" + it["id"],
            "loja": "Mercado Livre",
            "titulo": it.get("title", ""),
            "preco": float(it.get("price") or 0),
            "moeda": it.get("currency_id", "BRL"),
            "estado": {"new": "Novo", "used": "Usado"}.get(it.get("condition"), ""),
            "local": ", ".join(x for x in (end.get("city_name"), end.get("state_name")) if x),
            "link": it.get("permalink", ""),
            "leilao": False,
        }
