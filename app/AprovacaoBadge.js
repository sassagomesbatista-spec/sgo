const CLASSES = {
  Pendente: 'badge-pendente',
  Aprovado: 'badge-aprovado',
  Reprovado: 'badge-reprovado',
};

export default function AprovacaoBadge({ status }) {
  return <span className={`badge ${CLASSES[status] || 'badge-pendente'}`}>{status}</span>;
}
