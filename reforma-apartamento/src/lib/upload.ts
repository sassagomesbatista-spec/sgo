import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * MVP: grava arquivos no disco local em public/uploads e retorna a URL pública.
 * Em produção isso deveria ser trocado por um bucket compatível com S3 —
 * a interface (recebe File, devolve URL) não muda, só a implementação.
 *
 * Em plataformas serverless (Vercel), o filesystem do app é somente leitura em
 * runtime, então a escrita falha (EROFS/EACCES). Nesse caso, degrada de forma
 * graciosa: loga um aviso e retorna null em vez de derrubar a ação inteira (o
 * registro é salvo sem o anexo, em vez de a operação inteira falhar com erro).
 */
export async function salvarArquivo(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });

    const extensao = path.extname(file.name) || "";
    const nomeArquivo = `${randomUUID()}${extensao}`;
    const destino = path.join(UPLOAD_DIR, nomeArquivo);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(destino, buffer);

    return `/uploads/${nomeArquivo}`;
  } catch (erro) {
    console.warn(
      "Não foi possível salvar o arquivo em disco (esperado em ambientes serverless " +
        "como a Vercel, onde não há storage persistente configurado):",
      erro
    );
    return null;
  }
}
