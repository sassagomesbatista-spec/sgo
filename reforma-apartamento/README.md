# Painel da Reforma — Gerenciador de Reforma de Apartamento

Aplicação web para controlar orçamento, lançamentos financeiros, cronograma, fornecedores,
cotações, contratos e documentos de uma reforma de apartamento. Interface em português do
Brasil, moeda BRL, fuso horário `America/Sao_Paulo`.

## Resumo da solução

MVP funcional (não apenas telas estáticas): todos os formulários, filtros e cálculos listados
abaixo leem e escrevem no banco de dados via Prisma. A arquitetura é single-project/single-user
hoje, mas o modelo de dados já modela projeto↔usuário como uma relação N:N (`ProjetoUsuario`),
então adicionar colaboradores no futuro não exige migração de schema.

### Stack

- **Next.js 16** (App Router, Server Components + Server Actions) — o `AGENTS.md` do projeto
  avisa que esta versão tem mudanças que quebram convenções anteriores (`middleware.ts` virou
  `proxy.ts`, o Prisma 7 mudou a config de datasource); o código já reflete isso (por isso o
  Prisma foi fixado na v6, mais estável e documentada).
- **TypeScript**, **Tailwind CSS v4**.
- **Prisma + PostgreSQL**. Todo valor monetário é um `Int` em **centavos**, nunca `Float` —
  evita erro de ponto flutuante independente do banco, e os campos `*Centavos` poderiam virar
  `Decimal(14,2)` sem mudar a lógica de negócio (que já trata tudo como inteiro). O projeto
  começou em SQLite durante o desenvolvimento inicial e migrou para Postgres (necessário para
  rodar em ambientes serverless como a Vercel, onde não há disco persistente).
- **Autenticação própria** com cookie de sessão HTTP-only assinado (JWT via `jose`) + `bcryptjs`
  para hash de senha. NextAuth v5 (beta) foi avaliado e descartado para o MVP por risco de
  incompatibilidade com o Next.js 16 ainda em preview; a interface de `lib/auth.ts` é pequena o
  suficiente para trocar por NextAuth depois, se necessário.
- **Recharts** para os gráficos do dashboard.
- **Armazenamento de arquivos**: MVP grava em `public/uploads/` no disco local e salva só a URL
  no banco (`lib/upload.ts`). A interface (`salvarArquivo(file) -> url`) foi desenhada para ser
  trocada por um bucket S3 sem alterar quem a chama.
- **Vitest** para testes unitários das regras financeiras (`src/lib/calculos.ts`) e utilitários
  (`csv.ts`, `money.ts`). **Playwright** para o fluxo principal end-to-end.

## O que está implementado vs. fora do escopo do MVP

Implementado com CRUD completo e persistência real: Visão Geral (dashboard), Orçamento,
Lançamentos (com parcelamento, importação/exportação CSV, upload de comprovante), Cronograma
(lista/kanban/linha do tempo, dependências entre tarefas, cálculo de atraso), Ambientes,
Categorias, Fornecedores (com páginas de detalhe), Cotações (comparação lado a lado), Compras e
Contratos, Documentos (com upload), Relatórios (12 exportações em CSV), Configurações.

Deliberadamente fora deste MVP (a especificação original pedia um produto do porte de
Houzz Pro/Buildertrend inteiro — o que segue é o que ficou de fora para viabilizar uma primeira
entrega funcional):

- **Visualizador 3D de plantas/modelos** (GLB/IFC/DWG etc.) e a área "Imóvel e Projeto" com
  marcadores sobre plantas. Documentos aceitam qualquer arquivo hoje, mas sem visualização
  especializada nem versionamento formal (só um campo `versao` incremental manual).
- **Motor de simulação de cenários** com recálculo automático de cronograma/fluxo de caixa a
  partir de "e se". O modelo `Cenario` existe e vem populado no seed (otimista/provável/
  pessimista), mas a simulação interativa (arrastar um atraso e ver o impacto recalculado em
  tempo real) não foi implementada.
- **Exportação em PDF** dos relatórios (só CSV por enquanto).
- **Edição em massa** de lançamentos e **conciliação bancária** automática.
- **Recálculo automático em cascata** de tarefas dependentes quando uma tarefa atrasa (o campo
  `TarefaDependencia` existe e a UI mostra quem depende de quem, mas o recálculo de datas
  propagado ainda é manual).
- Upload real para S3 (hoje é disco local — troca de implementação, não de contrato).
  **Atenção ao rodar na Vercel**: o filesystem do app é somente leitura em runtime serverless,
  então uploads de comprovantes/documentos não persistem entre requisições — o registro é salvo
  normalmente, só o anexo não fica guardado. Funciona sem essa limitação quando rodado localmente
  ou em qualquer servidor Node.js tradicional com disco (ex: Docker, VPS).

## Modelo de dados

Ver `prisma/schema.prisma` (comentado). Entidades principais: `Projeto`, `User` +
`ProjetoUsuario` (junção N:N para multiusuário futuro), `Ambiente`, `Categoria`, `Fornecedor`,
`OrcamentoItem`, `Lancamento`, `Tarefa` + `TarefaDependencia`, `Cotacao`, `Contrato`,
`Documento`, `Cenario`.

Convenções:

- Todo campo monetário termina em `Centavos` e é `Int`.
- Exclusão de registros financeiros (`Lancamento`, `OrcamentoItem`, `Ambiente`, `Categoria`,
  `Fornecedor`, `Tarefa`, `Cotacao`, `Contrato`, `Documento`) é lógica via `deletedAt`, nunca
  `DELETE` físico.
- `createdAt`/`updatedAt` em todas as tabelas relevantes para trilha de alterações básica.

## Regras financeiras (centralizadas em `src/lib/calculos.ts`)

Funções puras, testadas em `src/lib/calculos.test.ts`:

- **Saldo atual** = entradas pagas − saídas pagas.
- **Saldo comprometido** = saldo atual − despesas contratadas ainda não pagas.
- **Saldo projetado** = total de entradas previstas − todas as despesas previstas (ambos
  ignorando lançamentos cancelados).
- **Variação do orçamento** = valor realizado (pago) − valor orçado (estimado).
- **% do orçamento utilizado** = valor pago ÷ orçamento total.
- **% financeiro comprometido** = valor contratado ÷ orçamento total.
- **Atraso da tarefa** = data atual − data planejada de término, somente quando a tarefa ainda
  não estiver concluída/cancelada (negativo = adiantada).
- **Progresso físico** = média do % de conclusão das tarefas, ponderada pelo custo previsto de
  cada uma.

Os valores previstos, aprovados, contratados e pagos nunca são somados entre si nas telas —
cada um é uma coluna separada, como pedido na especificação.

## Estrutura de pastas

```
prisma/
  schema.prisma       modelo de dados completo (comentado)
  seed.ts             dados fictícios de demonstração
src/
  lib/                regras de negócio, auth, upload, csv, prisma client (sem UI)
  components/
    ui/               primitivos (Card, Badge, form fields, confirmação de exclusão)
    charts/           wrappers Recharts
  app/
    login/            página de login (fora do grupo autenticado)
    (app)/             grupo de rotas autenticadas — layout com sidebar
      page.tsx          Visão Geral
      orcamento/ lancamentos/ cronograma/ ambientes/ categorias/
      fornecedores/ cotacoes/ contratos/ documentos/ relatorios/ configuracoes/
    api/
      lancamentos/export/    CSV de lançamentos
      relatorios/[tipo]/     12 relatórios em CSV
e2e/                   testes Playwright (fluxo de login + páginas principais)
```

## Instalação e execução local

Pré-requisitos: Node.js 20+ e um PostgreSQL rodando (local, Docker, ou um banco gerenciado
gratuito como [Neon](https://neon.tech) — nesse caso, use a connection string dele em
`DATABASE_URL`).

```bash
npm install
cp .env.example .env       # ajuste DATABASE_URL e NEXTAUTH_SECRET
npx prisma migrate dev     # cria as tabelas no Postgres e aplica as migrations
npm run db:seed            # popula dados fictícios de demonstração (idempotente)
npm run dev                # http://localhost:3000
```

Login de demonstração criado pelo seed: `demo@reforma.local` / `reforma123`.

### Comandos de teste

```bash
npm test           # testes unitários (Vitest) — regras financeiras, CSV, formatação
npm run test:e2e   # testes end-to-end (Playwright) — requer o app rodando/buildável
```

### Deploy (Railway)

O projeto já vem com `railway.json` configurado (build/start commands), então basta:

1. No Railway, **New Project → Deploy from GitHub repo** → selecione `sgo`, branch
   `claude/apartment-renovation-expense-manager-pifo2i`.
2. Em Settings do serviço criado, defina **Root Directory** = `reforma-apartamento`.
3. No mesmo projeto Railway, clique **+ New → Database → Add PostgreSQL** (fica no mesmo
   projeto, ao lado do serviço da aplicação).
4. No serviço da aplicação, vá em **Variables** e adicione:
   - `DATABASE_URL` → clique em "Add Reference" e aponte para `Postgres.DATABASE_URL` (o
     Railway conecta os dois serviços automaticamente, sem copiar/colar string de conexão).
   - `NEXTAUTH_SECRET` → qualquer string aleatória longa.
5. Deploy (acontece automático após conectar). O build já roda `prisma migrate deploy` e o seed
   idempotente (só popula dados de demonstração se o banco estiver vazio — nunca apaga dados
   reais em deploys seguintes).
6. Em Settings → Networking, gere um domínio público (`Generate Domain`) para conseguir acessar
   pelo navegador.

**Sobre uploads de arquivo**: assim como em qualquer plataforma serverless/containers efêmeros,
o Railway não garante disco persistente entre deploys por padrão — comprovantes/documentos
enviados podem não sobreviver a um redeploy. Se isso importar, o próximo passo é configurar um
[Volume do Railway](https://docs.railway.com/reference/volumes) apontando para `public/uploads`,
ou trocar `lib/upload.ts` por um bucket S3-compatible.

### Docker

Não incluído neste MVP. Como o projeto já roda sobre Postgres, um `docker-compose.yml` com
Postgres + a própria aplicação é um próximo passo direto — não exige trocar nada no schema.

## Decisões técnicas relevantes

1. **Centavos em vez de Decimal**: ver seção "Stack" acima.
2. **Sessão própria em vez de NextAuth**: reduz superfície de risco rodando sobre um Next.js 16
   ainda em preview (breaking changes confirmados em `node_modules/next/dist/docs`, como a
   migração de `middleware` para `proxy`).
3. **Single-project por usuário, mas schema multiusuário**: evita construir um seletor de
   projetos que não tem uso real hoje, sem fechar a porta para múltiplos colaboradores depois
   (`getProjetoAtual()` em `src/lib/projeto.ts` é o único lugar que precisaria mudar).
4. **Upload local em vez de S3**: interface pequena (`salvarArquivo`) pensada para ser trocada
   sem tocar nas páginas que a usam.
