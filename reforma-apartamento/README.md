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
- **Prisma + SQLite** para o MVP local. Todo valor monetário é um `Int` em **centavos**, nunca
  `Float` — decisão tomada porque o conector SQLite do Prisma não suporta o tipo `Decimal`
  (disponível só em postgresql/mysql/sqlserver/cockroachdb). Migrar para Postgres é trocar o
  `provider` do datasource; os campos `*Centavos` continuam funcionando ou podem virar
  `Decimal(14,2)` sem mudar a lógica de negócio (que já trata tudo como inteiro).
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

Pré-requisitos: Node.js 20+.

```bash
npm install
cp .env.example .env      # ajuste NEXTAUTH_SECRET
npx prisma migrate dev    # cria o banco SQLite e aplica as migrations
npm run db:seed           # popula dados fictícios de demonstração
npm run dev               # http://localhost:3000
```

Login de demonstração criado pelo seed: `demo@reforma.local` / `reforma123`.

### Comandos de teste

```bash
npm test           # testes unitários (Vitest) — regras financeiras, CSV, formatação
npm run test:e2e   # testes end-to-end (Playwright) — requer o app rodando/buildável
```

### Docker

Não incluído neste MVP (SQLite local não exige container). Para produção com Postgres, o
próximo passo natural é um `docker-compose.yml` com Postgres + a própria aplicação — a troca de
`DATABASE_URL` e do `provider` em `schema.prisma` é o único ajuste necessário no código.

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
