-- AlterTable
ALTER TABLE "Lancamento" ADD COLUMN     "contaBancariaId" TEXT,
ADD COLUMN     "orcamentoItemId" TEXT;

-- AlterTable
ALTER TABLE "OrcamentoItem" DROP COLUMN "valorContratadoCentavos",
DROP COLUMN "valorPagoCentavos";

-- CreateTable
CREATE TABLE "ContaBancaria" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "saldoInicialCentavos" INTEGER NOT NULL DEFAULT 0,
    "dataSaldoInicial" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContaBancaria_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_orcamentoItemId_fkey" FOREIGN KEY ("orcamentoItemId") REFERENCES "OrcamentoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_contaBancariaId_fkey" FOREIGN KEY ("contaBancariaId") REFERENCES "ContaBancaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaBancaria" ADD CONSTRAINT "ContaBancaria_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

