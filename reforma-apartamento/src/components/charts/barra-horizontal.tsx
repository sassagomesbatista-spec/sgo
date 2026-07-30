"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarMoeda } from "@/lib/money";

export function BarraHorizontal({ dados }: { dados: { nome: string; valor: number }[] }) {
  const dadosReais = dados.map((d) => ({ nome: d.nome, valor: d.valor / 100 }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, dadosReais.length * 34)}>
      <BarChart data={dadosReais} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatarMoeda(v * 100)}
          stroke="var(--muted-foreground)"
          fontSize={11}
        />
        <YAxis
          type="category"
          dataKey="nome"
          width={140}
          stroke="var(--muted-foreground)"
          fontSize={12}
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
        <Bar dataKey="valor" fill="var(--accent)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
