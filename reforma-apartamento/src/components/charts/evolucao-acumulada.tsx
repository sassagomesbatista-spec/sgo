"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarMoeda } from "@/lib/money";

export function EvolucaoAcumuladaChart({
  dados,
  orcamentoTotalCentavos,
}: {
  dados: { mes: string; acumulado: number }[];
  orcamentoTotalCentavos: number;
}) {
  const dadosReais = dados.map((d) => ({
    mes: d.mes,
    "Gasto acumulado": d.acumulado / 100,
    Orçamento: orcamentoTotalCentavos / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={dadosReais} margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={11} />
        <YAxis
          tickFormatter={(v: number) => formatarMoeda(v * 100)}
          stroke="var(--muted-foreground)"
          fontSize={11}
          width={90}
        />
        <Tooltip
          formatter={(v) => formatarMoeda(Number(v) * 100)}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line type="monotone" dataKey="Gasto acumulado" stroke="var(--accent)" strokeWidth={2} dot={false} />
        <Line
          type="monotone"
          dataKey="Orçamento"
          stroke="var(--secondary)"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
