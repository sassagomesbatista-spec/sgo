"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarMoeda } from "@/lib/money";

export function FluxoCaixaChart({
  dados,
}: {
  dados: { mes: string; entradas: number; saidas: number }[];
}) {
  const dadosReais = dados.map((d) => ({
    mes: d.mes,
    Entradas: d.entradas / 100,
    Saídas: d.saidas / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={dadosReais} margin={{ left: 8, right: 16 }}>
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
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Entradas" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Saídas" fill="var(--accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
