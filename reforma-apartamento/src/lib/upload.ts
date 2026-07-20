import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * MVP: grava arquivos no disco local em public/uploads e retorna a URL pública.
 * Em produção isso deveria ser trocado por um bucket compatível com S3 —
 * a interface (recebe File, devolve URL) não muda, só a implementação.
 */
export async function salvarArquivo(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;

  await mkdir(UPLOAD_DIR, { recursive: true });

  const extensao = path.extname(file.name) || "";
  const nomeArquivo = `${randomUUID()}${extensao}`;
  const destino = path.join(UPLOAD_DIR, nomeArquivo);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(destino, buffer);

  return `/uploads/${nomeArquivo}`;
}
