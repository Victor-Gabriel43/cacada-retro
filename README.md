# Caçada Retrô

Site com a sua lista de caça (consoles, controles, jogos) e alerta por email.
A busca roda no GitHub e o site fica na Vercel. Tudo de graça, com o PC e o Claude desligados.

## Como as partes se encaixam

| Parte | Onde fica | O que faz |
|---|---|---|
| Site | `docs/` (Vercel) | Mostra lista, anúncios e situação dos alertas |
| Temas | `docs/temas.css`, `docs/tema-vidro.css`, `docs/tema-nox.css`, `docs/tema-radar.css`, `docs/tema-vitrine.css`, `docs/vitrine.js` | Os visuais que você troca no site |
| Lista de itens | `docs/data/itens.json` | O que você procura. É a fonte de tudo |
| Anúncios | `docs/data/anuncios.json` | Tudo que a busca já achou |
| Situação | `docs/data/status.json` | Se cada loja está respondendo |
| Busca | `buscar.py`, `cacada/`, `buscar.yml` | Roda a cada 5 min e manda o email |
| Edição | `gerenciar.py`, `gerenciar.yml` | Aplica o que você pede pelo site |
| Testes | `tests/`, `testes.yml` | Rodam a cada mudança no código |

**Atualização do site:** cada mudança em `docs/` faz a Vercel publicar de novo.

**Como o site edita a lista:** ele abre uma issue no GitHub com o pedido pronto
e você clica em Create. Assim nenhuma senha fica no site. Só issues abertas pelo
dono do repositório são aplicadas; as de outras pessoas são ignoradas.

## Trocar o visual

No site, use a caixa **Visual** na lateral. A escolha fica salva no seu navegador.

| Tema | Como é |
|---|---|
| Vitrine 3D (padrão) | Sala de exposição com o item em 3D que gira, e os anúncios como etiquetas de preço |
| Radar gamer | Radar de drops, estante de cartuchos, raridade por prioridade e botões de fliperama |
| Nox | Escuro grafite, trilho de ícones, cartões redondos, anéis e botão azul com brilho |
| Vidro 2026 | Painéis translúcidos, cantos redondos, abas em pílula e três bolinhas. Segue o modo claro ou escuro do aparelho |
| Portal anos 2000 | Fundo em azulejo, cabeçalho brilhante, letreiro e selos |
| Mac clássico | Janela arredondada, três bolinhas, listras finas e botões de gel |

Para criar outro tema:
1. Adicione o nome em `TEMAS`, no começo de `docs/app.js`.
2. Crie um arquivo CSS em `docs/`, ligue ele em `docs/index.html` e use `[data-tema="nome"]`.

## Como o email é organizado

1. Assunto com a contagem e o item.
2. Resumo de novos anúncios e baixas de preço.
3. Uma seção por categoria e, dentro dela, uma por item.
4. Em cada item: o que você procura e as tabelas de anúncios novos e de baixas de preço.

Sem novidade, nenhum email é enviado.

## Configuração

### 1. Chaves do eBay (grátis)
1. Crie conta em https://developer.ebay.com e abra **Application Keys**.
2. Em **Production**, crie um keyset.
3. Guarde o **App ID** e o **Cert ID**.

### 2. Chaves do Mercado Livre (grátis)
1. Entre em https://developers.mercadolivre.com.br e crie uma aplicação.
2. Use `https://github.com` como URL de redirecionamento.
3. Guarde o **Client ID** e o **Client Secret**.

A busca do Mercado Livre pode responder `403` mesmo com chave. Nesse caso chega
um aviso por email e o eBay continua normal.

### 3. Senha de app do Gmail
1. Ative a verificação em duas etapas na Conta Google.
2. Crie a senha em https://myaccount.google.com/apppasswords.
3. Guarde os 16 caracteres. Ela é diferente da senha do Gmail.

### 4. Secrets
Rode cada linha no terminal, dentro da pasta do projeto, e cole o valor quando pedir:

```bash
gh secret set EBAY_CLIENT_ID
gh secret set EBAY_CLIENT_SECRET
gh secret set ML_CLIENT_ID
gh secret set ML_CLIENT_SECRET
gh secret set GMAIL_USER
gh secret set GMAIL_APP_PASSWORD
```

`EMAIL_TO` é opcional, para receber em outro endereço.

### 5. Primeira rodada
Em **Actions > Varredura**, clique em **Run workflow**.

### 6. Link do site no email
Depois que o site estiver na Vercel, informe o endereço:

```bash
gh variable set SITE_URL --body "https://seu-site.vercel.app"
```

## Bom saber

- O repositório é público porque Actions é ilimitado só nesse caso. Lista e
  anúncios ficam visíveis para quem achar o site ou o repositório. Chaves e email ficam nos Secrets.
- Limite de 8 itens, com até 3 termos cada, para ficar dentro da cota diária do eBay.
- O GitHub pode atrasar a rodada de 5 minutos em horário de pico.
- O teto em R$ só é comparado com anúncios em R$. Anúncio em outra moeda vem
  marcado para você comparar.
- `docs/data/ja_avisados.json` guarda o que você já recebeu, para não repetir email.
- OLX e Enjoei não têm API aberta e ficam de fora desta busca.

## Rodar no PC

```bash
python -m unittest discover -s tests -t .
```

```bash
DRY_RUN=1 python buscar.py
```
