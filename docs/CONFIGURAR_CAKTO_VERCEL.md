# Configurar Cakto e Vercel para cadastro pós-pagamento

Este guia explica como configurar a integração Cakto (pagamento) + Vercel (variáveis de ambiente) para que, após o pagamento na landing/checkout, o usuário consiga criar a conta e ser vinculado como **admin** da empresa com o plano ativo.

---

## 1. Onde obter as credenciais da Cakto (tela que você mostrou)

A tela **Cakto API** > **Chaves de API** (`https://app.cakto.com.br/dashboard/cakto-api`) é onde você **obtém** as credenciais. Não é onde você configura o Vercel.

- **Cliente ID** → será usado como `CAKTO_CLIENT_ID` no Vercel.
- **Cliente Segredo** → será usado como `CAKTO_CLIENT_SECRET` no Vercel.  
  ⚠️ O **Cliente Segredo** só é exibido no momento da criação da chave. Se você não tiver mais o valor, crie uma nova chave em **"Criar Chave API"** e guarde o segredo.

**Escopos necessários na chave de API:**  
A chave deve ter pelo menos os escopos **`read`** e **`orders`** (leitura de pedidos), para o backend validar se o pagamento foi aprovado.

---

## 2. Configurar variáveis no Vercel

1. Acesse o projeto no [Vercel](https://vercel.com) → **Settings** → **Environment Variables**.
2. Adicione as variáveis abaixo (produção e/ou preview, conforme quiser):

| Nome | Valor | Observação |
|------|--------|------------|
| `CAKTO_CLIENT_ID` | *(valor do campo **Cliente ID** da Cakto)* | Ex.: `KJZMYw83Rk4VdrZ7...` |
| `CAKTO_CLIENT_SECRET` | *(valor do campo **Cliente Segredo** da Cakto)* | Secreto; não expor no frontend. |

Não é necessário configurar `CAKTO_API_URL`: o código usa a URL base fixa `https://api.cakto.com.br`.

Depois de salvar, faça um **redeploy** do projeto para as variáveis passarem a valer.

---

## 3. Redirect após o pagamento (landing / checkout)

Para que o sistema **valide** o pagamento antes de criar a empresa e o admin, a URL para onde o usuário é redirecionado após pagar na Cakto deve incluir o **ID do pedido** (order id da Cakto), que o backend usa como `transaction_id`.

- **URL esperada do app:**  
  `https://construtivoobra.vercel.app/cadastro?plan_id=obra-1&quantidade_obras=1&transaction_id={ID_DO_PEDIDO_CAKTO}`

- O **ID do pedido** na Cakto é um **UUID** (ex.: `10bb51bb-03be-473c-b4c5-3490765c4096`).  
  O frontend também aceita o mesmo valor nos parâmetros `order_id` ou `payment_id` além de `transaction_id`.

**Onde configurar na Cakto:**

- No **checkout** ou no **produto/oferta** da Cakto, procure a configuração de **URL de sucesso** / **Redirect após pagamento** / **Success URL**.
- Defina essa URL como a do seu app de cadastro, incluindo os query params:
  - `plan_id=obra-1` (ou o `plan_id` do seu plano)
  - `quantidade_obras=1` (ou 2, 3, 4, 5, 10, 15)
  - `transaction_id={ID_DO_PEDIDO}` — se a Cakto permitir variáveis na URL (ex.: `{{order_id}}` ou similar), use-as aqui.

Se a Cakto não documentar como enviar o ID do pedido na URL de redirect, consulte a [documentação da Cakto](https://docs.cakto.com.br) ou o suporte para saber o nome do parâmetro e como preenchê-lo.

---

## 4. Fluxo resumido

1. Usuário escolhe o plano na landing e é enviado ao checkout Cakto.
2. Usuário paga; Cakto redireciona para a URL configurada (ex.: `/cadastro?plan_id=...&quantidade_obras=...&transaction_id=...`).
3. Usuário preenche o formulário de **Criar conta** e envia.
4. O backend chama a API Cakto (OAuth2 + GET pedido) para validar o `transaction_id` (status `paid` ou `authorized`).
5. Se válido: cria empresa, associa o usuário como **admin** e cria a assinatura do plano.

---

## 5. Referências

- [Cakto API – Introdução](https://docs.cakto.com.br/introduction)
- [Cakto API – Autenticação (OAuth2)](https://docs.cakto.com.br/authentication)
- [Cakto API – Obter Pedido](https://docs.cakto.com.br/api-reference/orders/retrieve)
