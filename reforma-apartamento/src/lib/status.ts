export const LANCAMENTO_STATUS: Record<string, string> = {
  previsto: "Previsto",
  em_cotacao: "Em cotação",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  contratado: "Contratado",
  aguardando_pagamento: "Aguardando pagamento",
  pago_parcialmente: "Pago parcialmente",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
};

export const LANCAMENTO_STATUS_COLOR: Record<string, "neutral" | "warning" | "success" | "danger" | "info"> = {
  previsto: "neutral",
  em_cotacao: "info",
  aguardando_aprovacao: "warning",
  aprovado: "info",
  contratado: "info",
  aguardando_pagamento: "warning",
  pago_parcialmente: "warning",
  pago: "success",
  vencido: "danger",
  cancelado: "neutral",
  reembolsado: "neutral",
};

export const TAREFA_STATUS: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  aguardando_decisao: "Aguardando decisão",
  aguardando_material: "Aguardando material",
  aguardando_fornecedor: "Aguardando fornecedor",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  atrasado: "Atrasado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const TAREFA_STATUS_COLOR: Record<string, "neutral" | "warning" | "success" | "danger" | "info"> = {
  nao_iniciado: "neutral",
  aguardando_decisao: "warning",
  aguardando_material: "warning",
  aguardando_fornecedor: "warning",
  em_andamento: "info",
  pausado: "neutral",
  atrasado: "danger",
  concluido: "success",
  cancelado: "neutral",
};

export const PRIORIDADE_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};
