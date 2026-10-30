import json
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

import gerenciar
from cacada import filtro, lojas, mensagem, varredura

RAIZ = Path(__file__).parent.parent
ITEM = json.loads((RAIZ / "docs/data/itens.json").read_text("utf-8"))["itens"][0]
T0 = datetime(2026, 10, 30, 12, 0, tzinfo=timezone.utc)


def anuncio(id_="ebay:1", preco=100.0, moeda="USD", titulo="DualShock 4 500 Million", **extra):
    return {"id": id_, "loja": "eBay", "titulo": titulo, "preco": preco, "moeda": moeda, "estado": "Used",
            "local": "US", "link": "https://www.ebay.com/itm/1", "leilao": False, "item_id": ITEM["id"], **extra}


class TestFiltro(unittest.TestCase):
    def test_aceita_controle(self):
        for t in ("Sony DualShock 4 500 Million Limited Edition Controller",
                  "Controle Ps4 Edição 500 Milhões Translúcido", "PS4 DS4 500M Million"):
            self.assertTrue(filtro.titulo_serve(ITEM, t), t)

    def test_recusa_outros(self):
        for t in ("Skin adesivo controle ps4 500 million", "Replacement shell DualShock 4 500 million",
                  "Controle PS4 Dualshock azul", "PS4 Pro 500 Million Console 2TB", "Controle 5000 million"):
            self.assertFalse(filtro.titulo_serve(ITEM, t), t)


class TestEbay(unittest.TestCase):
    def test_id_igual_ao_da_url(self):
        a = lojas.Ebay._anuncio({"itemId": "v1|307233499885|0", "title": "x", "price": {"value": "10.5", "currency": "EUR"},
                                 "buyingOptions": ["AUCTION"]})
        self.assertEqual((a["id"], a["preco"], a["moeda"], a["leilao"]), ("ebay:307233499885", 10.5, "EUR", True))


class FalsaLoja:
    chave, nome = "ebay", "eBay"

    def __init__(self, resultado=None, erro=None):
        self.resultado, self.erro = resultado or [], erro

    def buscar(self, termo):
        if self.erro:
            raise lojas.ErroDeLoja(self.erro)
        return self.resultado


class TestVarredura(unittest.TestCase):
    def test_coleta_filtra_e_isola_erro(self):
        ok = FalsaLoja([anuncio(), anuncio("ebay:2", titulo="Capa para controle 500 million")])
        ruim = FalsaLoja(erro="HTTP 403")
        ruim.chave = "ml"
        achados, erros = varredura.coletar([ITEM], [ok, ruim])
        self.assertEqual(list(achados), ["ebay:1"])
        self.assertEqual(erros, {"ebay": None, "ml": "HTTP 403"})

    def test_novo_so_uma_vez(self):
        a = anuncio()
        lista, novos, _ = varredura.comparar([], {a["id"]: a}, {"ebay": None}, set(), T0)
        self.assertEqual(len(novos), 1)
        _, novos, _ = varredura.comparar(lista, {a["id"]: a}, {"ebay": None}, set(), T0)
        self.assertEqual(novos, [])

    def test_ja_avisado_entra_no_site_sem_email(self):
        a = anuncio()
        lista, novos, _ = varredura.comparar([], {a["id"]: a}, {"ebay": None}, {"ebay:1"}, T0)
        self.assertEqual((len(lista), novos), (1, []))

    def test_baixa_de_preco(self):
        a = anuncio(preco=100.0)
        lista, _, _ = varredura.comparar([], {a["id"]: a}, {"ebay": None}, set(), T0)
        b = anuncio(preco=80.0)
        _, _, baixas = varredura.comparar(lista, {b["id"]: b}, {"ebay": None}, set(), T0)
        self.assertEqual(baixas[0]["preco_antes"], 100.0)

    def test_sumiu_so_encerra_se_loja_respondeu(self):
        a = anuncio()
        lista, _, _ = varredura.comparar([], {a["id"]: a}, {"ebay": None}, set(), T0)
        fora, _, _ = varredura.comparar(lista, {}, {"ebay": "HTTP 500"}, set(), T0)
        self.assertTrue(fora[0]["ativo"])
        fora, _, _ = varredura.comparar(lista, {}, {"ebay": None}, set(), T0)
        self.assertFalse(fora[0]["ativo"])


class TestStatus(unittest.TestCase):
    NOMES = {"ebay": "eBay"}

    def test_falha_avisa_uma_vez_depois_de_uma_hora(self):
        s, salvar, avisar = varredura.atualizar_status({}, self.NOMES, {"ebay": "HTTP 403"}, T0)
        self.assertTrue(salvar)
        self.assertEqual(avisar, [])
        s, _, avisar = varredura.atualizar_status(s, self.NOMES, {"ebay": "HTTP 403"}, T0 + timedelta(hours=1))
        self.assertEqual(len(avisar), 1)
        s, _, avisar = varredura.atualizar_status(s, self.NOMES, {"ebay": "HTTP 403"}, T0 + timedelta(hours=2))
        self.assertEqual(avisar, [])

    def test_sem_mudanca_nao_salva_a_cada_rodada(self):
        s, _, _ = varredura.atualizar_status({}, self.NOMES, {"ebay": None}, T0)
        _, salvar, _ = varredura.atualizar_status(s, self.NOMES, {"ebay": None}, T0 + timedelta(minutes=5))
        self.assertFalse(salvar)
        _, salvar, _ = varredura.atualizar_status(s, self.NOMES, {"ebay": None}, T0 + timedelta(hours=6))
        self.assertTrue(salvar)


class TestEmail(unittest.TestCase):
    def test_escapa_texto_de_anuncio(self):
        a = anuncio(titulo='<script>x</script>', link="javascript:alert(1)")
        h = mensagem.html([ITEM], [a], [])
        self.assertNotIn("<script>", h)
        self.assertNotIn("javascript:", h)

    def test_separa_por_categoria_e_item(self):
        a = anuncio()
        h = mensagem.html([ITEM], [a], [anuncio("ebay:2", preco=5.0, preco_antes=9.0)])
        for parte in ("Controle", ITEM["nome"], "Anúncios novos (1)", "Baixaram de preço (1)"):
            self.assertIn(parte, h)

    def test_teto(self):
        item = {**ITEM, "teto": 500}
        self.assertEqual(mensagem.situacao_teto(anuncio(preco=400, moeda="BRL"), item)[0], "Dentro do teto")
        self.assertEqual(mensagem.situacao_teto(anuncio(preco=600, moeda="BRL"), item)[0], "Acima do teto")
        self.assertIn("Outra moeda", mensagem.situacao_teto(anuncio(moeda="USD"), item)[0])


class TestGerenciar(unittest.TestCase):
    NOVO = {"nome": "Game Boy Color", "categoria": "Portátil", "teto": "450", "campo_estranho": "x"}

    def test_adicionar_valida_e_descarta_campos(self):
        itens, _ = gerenciar.aplicar([], {"acao": "adicionar", "item": self.NOVO})
        self.assertEqual(itens[0]["id"], "game-boy-color")
        self.assertEqual(itens[0]["teto"], 450)
        self.assertEqual(itens[0]["termos"], ["Game Boy Color"])
        self.assertNotIn("campo_estranho", itens[0])

    def test_pausar_e_remover(self):
        itens, _ = gerenciar.aplicar([], {"acao": "adicionar", "item": self.NOVO})
        id_ = itens[0]["id"]
        itens, _ = gerenciar.aplicar(itens, {"acao": "pausar", "id": id_})
        self.assertFalse(itens[0]["ativo"])
        itens, _ = gerenciar.aplicar(itens, {"acao": "remover", "id": id_})
        self.assertEqual(itens, [])

    def test_recusa_invalido(self):
        for pedido in ({"acao": "adicionar", "item": {"nome": "", "categoria": "Console"}},
                       {"acao": "adicionar", "item": {"nome": "X", "categoria": "Hack"}},
                       {"acao": "remover", "id": "nao-existe"}, {"acao": "apagar-tudo"}):
            with self.assertRaises(gerenciar.PedidoInvalido):
                gerenciar.aplicar([], pedido)

    def test_extrai_json_da_issue(self):
        self.assertEqual(gerenciar.extrair_pedido('oi\n```json\n{"acao":"remover","id":"a"}\n```'),
                         {"acao": "remover", "id": "a"})


if __name__ == "__main__":
    unittest.main()
