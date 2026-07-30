export function paraCsv(colunas: string[], linhas: (string | number)[][]): string {
  const escapar = (valor: string | number) => {
    const s = String(valor ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const cabecalho = colunas.map(escapar).join(",");
  const corpo = linhas.map((linha) => linha.map(escapar).join(",")).join("\n");
  return `${cabecalho}\n${corpo}`;
}

/** Parser CSV simples com suporte a campos entre aspas. Não cobre todos os casos de RFC 4180 exóticos. */
export function parseCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroAspas = false;

  const texto2 = texto.replace(/\r\n/g, "\n");
  for (let i = 0; i < texto2.length; i++) {
    const char = texto2[i];
    if (dentroAspas) {
      if (char === '"') {
        if (texto2[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroAspas = false;
        }
      } else {
        campo += char;
      }
    } else if (char === '"') {
      dentroAspas = true;
    } else if (char === ",") {
      linha.push(campo);
      campo = "";
    } else if (char === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += char;
    }
  }
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}
