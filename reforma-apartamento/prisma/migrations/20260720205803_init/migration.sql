-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProjetoUsuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projetoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'owner',
    CONSTRAINT "ProjetoUsuario_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjetoUsuario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Projeto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "orcamentoTotalCentavos" INTEGER NOT NULL,
    "reservaContingenciaPercent" REAL NOT NULL DEFAULT 10,
    "dataInicioPrevista" DATETIME NOT NULL,
    "dataTerminoPrevista" DATETIME NOT NULL,
    "dataTerminoRevisada" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Ambiente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projetoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "orcamentoCentavos" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ambiente_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projetoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "orcamentoCentavos" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Categoria_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projetoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "empresa" TEXT,
    "documento" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "dadosBancarios" TEXT,
    "pix" TEXT,
    "contatoPrincipal" TEXT,
    "especialidade" TEXT,
    "avaliacao" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "observacoes" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Fornecedor_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrcamentoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projetoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoriaId" TEXT,
    "ambienteId" TEXT,
    "etapaId" TEXT,
    "valorEstimadoCentavos" INTEGER NOT NULL DEFAULT 0,
    "valorAprovadoCentavos" INTEGER NOT NULL DEFAULT 0,
    "valorContratadoCentavos" INTEGER NOT NULL DEFAULT 0,
    "valorPagoCentavos" INTEGER NOT NULL DEFAULT 0,
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "observacoes" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrcamentoItem_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrcamentoItem_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrcamentoItem_ambienteId_fkey" FOREIGN KEY ("ambienteId") REFERENCES "Ambiente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrcamentoItem_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "Tarefa" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lancamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projetoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "dataLancamento" DATETIME NOT NULL,
    "dataCompetencia" DATETIME,
    "dataVencimento" DATETIME,
    "dataPagamento" DATETIME,
    "status" TEXT NOT NULL,
    "categoriaId" TEXT,
    "ambienteId" TEXT,
    "etapaId" TEXT,
    "fornecedorId" TEXT,
    "formaPagamento" TEXT,
    "contaOrigemDestino" TEXT,
    "numeroParcelas" INTEGER DEFAULT 1,
    "parcelaAtual" INTEGER DEFAULT 1,
    "grupoParcelaId" TEXT,
    "recorrencia" TEXT,
    "observacoes" TEXT,
    "tags" TEXT,
    "notaFiscal" TEXT,
    "comprovanteUrl" TEXT,
    "contratoId" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lancamento_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_ambienteId_fkey" FOREIGN KEY ("ambienteId") REFERENCES "Ambiente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "Tarefa" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tarefa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projetoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "ambienteId" TEXT,
    "categoriaId" TEXT,
    "responsavel" TEXT,
    "fornecedorId" TEXT,
    "dataInicioPlanejada" DATETIME NOT NULL,
    "dataTerminoPlanejada" DATETIME NOT NULL,
    "dataInicioReal" DATETIME,
    "dataTerminoReal" DATETIME,
    "percentualConcluido" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'nao_iniciado',
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "custoPrevistoCentavos" INTEGER NOT NULL DEFAULT 0,
    "custoRealizadoCentavos" INTEGER NOT NULL DEFAULT 0,
    "ehMarco" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tarefa_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_ambienteId_fkey" FOREIGN KEY ("ambienteId") REFERENCES "Ambiente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TarefaDependencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tarefaId" TEXT NOT NULL,
    "dependeDeId" TEXT NOT NULL,
    CONSTRAINT "TarefaDependencia_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TarefaDependencia_dependeDeId_fkey" FOREIGN KEY ("dependeDeId") REFERENCES "Tarefa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cotacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projetoId" TEXT NOT NULL,
    "itemDescricao" TEXT NOT NULL,
    "fornecedorId" TEXT,
    "valorCentavos" INTEGER NOT NULL,
    "prazoDias" INTEGER,
    "formaPagamento" TEXT,
    "validade" DATETIME,
    "garantia" TEXT,
    "freteCentavos" INTEGER DEFAULT 0,
    "instalacaoCentavos" INTEGER DEFAULT 0,
    "impostosCentavos" INTEGER DEFAULT 0,
    "observacoes" TEXT,
    "arquivoUrl" TEXT,
    "statusSelecao" TEXT NOT NULL DEFAULT 'em_analise',
    "melhorPreco" BOOLEAN NOT NULL DEFAULT false,
    "melhorPrazo" BOOLEAN NOT NULL DEFAULT false,
    "melhorCustoBeneficio" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cotacao_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Cotacao_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projetoId" TEXT NOT NULL,
    "fornecedorId" TEXT,
    "escopo" TEXT NOT NULL,
    "valorTotalCentavos" INTEGER NOT NULL,
    "dataInicio" DATETIME,
    "dataFim" DATETIME,
    "formaPagamento" TEXT,
    "parcelasJson" TEXT,
    "reajustes" TEXT,
    "multas" TEXT,
    "prazo" TEXT,
    "garantia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contrato_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contrato_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projetoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "responsavel" TEXT,
    "ambienteId" TEXT,
    "etapaId" TEXT,
    "fornecedorId" TEXT,
    "contratoId" TEXT,
    "statusAprovacao" TEXT NOT NULL DEFAULT 'pendente',
    "tags" TEXT,
    "dataValidade" DATETIME,
    "arquivoAnteriorId" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Documento_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Documento_ambienteId_fkey" FOREIGN KEY ("ambienteId") REFERENCES "Ambiente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "Tarefa" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Documento_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projetoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "ajustePrazoDias" INTEGER NOT NULL DEFAULT 0,
    "ajusteCustoPercent" REAL NOT NULL DEFAULT 0,
    "usaReservaPercent" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cenario_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProjetoUsuario_projetoId_userId_key" ON "ProjetoUsuario"("projetoId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TarefaDependencia_tarefaId_dependeDeId_key" ON "TarefaDependencia"("tarefaId", "dependeDeId");
