# SGO / Painel Criativo — contexto do projeto

Site estático (sem build), hospedado via GitHub Pages a partir da branch `gh-pages`
(mirror da `main`/branch de trabalho, copiado manualmente arquivo por arquivo).

## Domínio

- Domínio da Samanta: `samantafashionoffice.com.br`, registrado e com DNS gerenciado na Locaweb.
- Subdomínio do app de painéis (dashboard.html / quadro-app.html / quadro-referencias.html):
  `painel.samantafashionoffice.com.br` — CNAME apontando para `sassagomesbatista-spec.github.io`.
  Configurado via arquivo `CNAME` na branch `gh-pages` (não existe no branch de trabalho,
  só é escrito diretamente lá junto com o mirror de deploy).
- NÃO mexer nos outros registros de DNS já existentes nesse domínio (`.` raiz, `www` — apontam
  pra outro site dela; `smtp`/`ftp` — outros serviços).
- `index.html` na `gh-pages` é uma cópia de `painel-revisao-mix.html` (ferramenta de aprovação
  ligada ao Asana) — é o que abre na raiz do domínio. Não sobrescrever sem confirmar com ela,
  já que pode estar em uso por outras pessoas.
- Status do CNAME (verificado em 2026-07-28): o arquivo `CNAME` foi removido de novo do
  `gh-pages` ("domínio novo ainda não resolve, estava quebrando o link github.io") — ou seja,
  `painel.samantafashionoffice.com.br` pode não estar respondendo agora. Enquanto isso, o
  endereço que sempre funciona é `https://sassagomesbatista-spec.github.io/sgo/` (+ nome do
  arquivo). Conferir se o arquivo `CNAME` existe em `gh-pages` antes de assumir que o domínio
  próprio está ativo.

## Apps neste repositório

- `dashboard.html` — lista de painéis (multi-cliente), cria painel novo, importa Excel.
  Acesso: `painel.samantafashionoffice.com.br/dashboard.html`
- `quadro-app.html` — editor de painel individual, parametrizado por `?board=<id>` (Firestore).
  Acesso: `painel.samantafashionoffice.com.br/quadro-app.html?board=<id>` (link gerado a partir
  do dashboard, não se acessa direto sem o `?board=`).
- `quadro-referencias.html` — painel original/fixo do cliente SGO (SS26/27, FW27, FW26
  hardcoded). Era o único painel antes do app multi-cliente existir.
  Acesso: `painel.samantafashionoffice.com.br/quadro-referencias.html`
- `painel-revisao-mix.html` — ferramenta separada de aprovação de mix ligada ao Asana,
  não relacionada aos painéis de referência/modelagem.
  Acesso: raiz do domínio, `samantafashionoffice.com.br` (é o `index.html` da `gh-pages`).
- `apps.html` — índice de TODOS os aplicativos da Samanta, não só os deste repositório
  (inclui os de outros repositórios GitHub e os que ainda não foram publicados). Acesso:
  `painel.samantafashionoffice.com.br/apps.html`. É a página que ela deve favoritar pra
  sempre achar tudo — atualizar sempre que um app novo for criado em qualquer lugar,
  publicado, tirado do ar, ou mudar de status.
- `moodboard-studio.html` — ferramenta de moodboard (cartela de cores, relatórios,
  cronograma, exportação em PDF/imagem, OCR de peças). Antes só existia localmente no
  computador dela (`C:\Users\escri\.claude\moodboard-studio.html`), trazido pra cá em
  2026-07-28 sem alterar nenhuma linha de lógica, só relocando. Já usa Firestore próprio
  (projeto `moodboard-studio-38418`, não é o mesmo `painel-referencias-sgo` do resto do
  repositório) pra salvar moodboards/marcas/usuários — os dados dela já estavam na nuvem,
  só a página é que estava presa localmente. Acesso:
  `painel.samantafashionoffice.com.br/moodboard-studio.html`. Pendências levantadas por ela
  mas ainda não tratadas (aguardando ela listar o que quer mudar): revisar as regras de
  segurança do Firestore desse projeto (ela pediu explicitamente "um aplicativo seguro").

Este arquivo (`CLAUDE.md`) fica na raiz do repositório, no branch de trabalho (não existe na
`gh-pages`, que só tem os `.html` publicados). É sempre o primeiro lugar a olhar/atualizar
quando um app novo for criado ou um existente mudar de comportamento.

## Outros aplicativos da Samanta (fora deste repositório)

Além dos apps acima, a Samanta tem mais aplicativos espalhados em outros repositórios
GitHub (conta `sassagomesbatista-spec`) e em 2 branches deste mesmo repositório que nunca
foram mescladas à branch de trabalho. Lista completa e sempre atualizada: `apps.html`
(seção anterior). Resumo rápido pra contexto de chat:

- `erp-comissao` — ERP Fashion Office (comissões, catálogo de serviços). Railway.
- `whatsapp-atendimento` — painel de atendimento multi-atendente pelo WhatsApp (Baileys). Railway.
- `financas-app` — controle financeiro. Railway. (backups em `financas-app-backups`)
- `preconsumo-app` — cálculo de pré-consumo de tecido. Publicação parada, aguardando
  decisão dela sobre upgrade de plano no Railway. (backups em `preconsumo-backups`)
- `fitness-crm1` — CRM Fashion Office. Railway. (`fitness-crm` é repo antigo, vazio, ignorar)
- `cronograma-fashion` — cronograma geral, Firebase + Cloudflare. Domínio pretendido:
  `cronograma.samantafashionoffice.com.br`.
- Branch `claude/apartment-renovation-expense-manager-pifo2i` (neste repo, `sgo`) — app
  Next.js de reforma de apartamento (`reforma-apartamento/`), uso pessoal, nunca mesclado
  nem publicado.
- Branch `claude/simple-clean-design-tvzkd0` (neste repo, `sgo`) — app "Pilotagem"
  (controle de peças/preços de pilotagem), nunca mesclado, só rodava localmente.
- `moodboard-studio.html` — existe só no computador local dela (Windows,
  `C:\Users\escri\.claude\moodboard-studio.html`), nunca foi enviado a nenhum repositório.
  Precisa do conteúdo dela pra ser recriado como app publicado.

## Firebase

Projeto `painel-referencias-sgo` (Firestore + Auth email/senha). Config do client já embutida
nos arquivos HTML (não é segredo, protegida por regras do Firestore). Login de teste:
`sassagomes.batista@gmail.com` / `sassagomes1`.

## Convenções importantes

- Toda escrita no Firestore é granular/diff-based (nunca sobrescreve o documento inteiro a
  partir do estado local completo) — ver `fsSync*` functions.
- Bootstrap ao carregar sempre faz merge seguro entre local e nuvem (nunca "nuvem vence tudo"),
  pra nunca repetir a perda de dados que já aconteceu uma vez.
- Deploy: commitar na branch de trabalho, dar push, depois espelhar pra `gh-pages` via
  `git worktree add` num diretório temporário, copiar os `.html` atualizados, commitar e dar
  push nesse worktree, depois `git worktree remove`.
