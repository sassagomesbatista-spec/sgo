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

Este arquivo (`CLAUDE.md`) fica na raiz do repositório, no branch de trabalho (não existe na
`gh-pages`, que só tem os `.html` publicados). É sempre o primeiro lugar a olhar/atualizar
quando um app novo for criado ou um existente mudar de comportamento.

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
