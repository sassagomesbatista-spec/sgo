'use client';

export default function PrintButton() {
  return (
    <button className="btn no-print" type="button" onClick={() => window.print()}>
      Imprimir / Exportar PDF
    </button>
  );
}
