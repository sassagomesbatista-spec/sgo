// Todo valor financeiro trafega como Int em centavos — nunca float.
// Estas funções são o único lugar que converte centavos <-> reais/exibição.

export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

export function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100);
}

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarMoeda(centavos: number): string {
  return formatter.format(centavosParaReais(centavos));
}

export function formatarData(data: Date | string | null | undefined): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(d);
}

export function formatarPercentual(fracao: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(
    fracao
  );
}
