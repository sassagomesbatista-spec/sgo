import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function reais(v: number) {
  return Math.round(v * 100);
}

function addDias(base: Date, dias: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

async function main() {
  console.log("Limpando banco...");
  await prisma.documento.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.cotacao.deleteMany();
  await prisma.lancamento.deleteMany();
  await prisma.orcamentoItem.deleteMany();
  await prisma.tarefaDependencia.deleteMany();
  await prisma.tarefa.deleteMany();
  await prisma.fornecedor.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.ambiente.deleteMany();
  await prisma.cenario.deleteMany();
  await prisma.projetoUsuario.deleteMany();
  await prisma.projeto.deleteMany();
  await prisma.user.deleteMany();

  console.log("Criando usuário demo...");
  const passwordHash = await bcrypt.hash("reforma123", 10);
  const user = await prisma.user.create({
    data: {
      name: "Samanta",
      email: "demo@reforma.local",
      passwordHash,
      role: "owner",
    },
  });

  const hoje = new Date();
  const inicioObra = addDias(hoje, -120); // obra começou há 4 meses
  const terminoPrevisto = addDias(inicioObra, 240); // ~8 meses de obra

  console.log("Criando projeto...");
  const projeto = await prisma.projeto.create({
    data: {
      nome: "Reforma Apartamento — Samanta",
      orcamentoTotalCentavos: reais(500_000),
      reservaContingenciaPercent: 12,
      dataInicioPrevista: inicioObra,
      dataTerminoPrevista: terminoPrevisto,
      dataTerminoRevisada: addDias(terminoPrevisto, 18),
      usuarios: { create: { userId: user.id, papel: "owner" } },
    },
  });

  console.log("Criando ambientes...");
  const nomesAmbientes = [
    "Sala de estar",
    "Sala de jantar",
    "Cozinha",
    "Quarto principal",
    "Quarto adicional",
    "Banheiro social",
    "Suíte",
    "Lavabo",
    "Home office",
    "Varanda",
    "Lavanderia",
    "Hall",
    "Circulação",
    "Área técnica",
    "Apartamento inteiro",
  ];
  const ambientes: Awaited<ReturnType<typeof prisma.ambiente.create>>[] = [];
  for (let i = 0; i < nomesAmbientes.length; i++) {
    ambientes.push(
      await prisma.ambiente.create({
        data: { projetoId: projeto.id, nome: nomesAmbientes[i], ordem: i },
      })
    );
  }
  const amb = (nome: string) => ambientes.find((a) => a.nome === nome)!;

  console.log("Criando categorias...");
  const categoriasPorGrupo: Record<string, string[]> = {
    "Projeto e documentação": [
      "Arquiteta",
      "Designer de interiores",
      "Engenheiro",
      "Projetos complementares",
      "Levantamento",
      "Condomínio (taxas de obra)",
      "Licenças",
      "ART/RRT",
      "Taxas",
    ],
    "Obra civil": [
      "Demolição",
      "Alvenaria",
      "Drywall",
      "Contrapiso",
      "Impermeabilização",
      "Revestimentos (execução)",
      "Pintura",
      "Gesso",
      "Forro",
      "Esquadrias",
    ],
    Instalações: [
      "Elétrica",
      "Iluminação",
      "Hidráulica",
      "Gás",
      "Ar-condicionado",
      "Automação",
      "Internet",
      "Segurança",
    ],
    Acabamentos: [
      "Pisos",
      "Revestimentos (material)",
      "Pedras",
      "Metais",
      "Louças",
      "Ferragens",
      "Rodapés",
      "Portas",
      "Vidros",
      "Espelhos",
    ],
    "Móveis e decoração": [
      "Marcenaria",
      "Móveis soltos",
      "Tapetes",
      "Cortinas",
      "Persianas",
      "Objetos decorativos",
      "Obras de arte",
      "Plantas",
      "Roupa de cama e banho",
    ],
    Equipamentos: [
      "Eletrodomésticos",
      "Eletrônicos",
      "Áudio e vídeo",
      "Equipamentos de cozinha",
      "Fechaduras",
      "Automação residencial",
    ],
    "Operação e logística": [
      "Frete",
      "Montagem",
      "Armazenamento",
      "Caçamba",
      "Limpeza",
      "Proteção de elevador",
      "Mudança",
      "Alimentação da equipe",
      "Estacionamento",
    ],
    "Despesas gerais do apartamento": [
      "Condomínio",
      "IPTU",
      "Água",
      "Energia",
      "Gás (consumo)",
      "Internet (assinatura)",
      "Seguro",
      "Manutenção",
      "Limpeza (recorrente)",
      "Pequenos reparos",
    ],
    "Reserva e imprevistos": [
      "Contingência",
      "Retrabalho",
      "Perda de material",
      "Aumento de preço",
      "Danos",
      "Despesas emergenciais",
    ],
  };
  const categorias: Awaited<ReturnType<typeof prisma.categoria.create>>[] = [];
  for (const [grupo, nomes] of Object.entries(categoriasPorGrupo)) {
    for (const nome of nomes) {
      categorias.push(await prisma.categoria.create({ data: { projetoId: projeto.id, nome, grupo } }));
    }
  }
  const cat = (nome: string) => categorias.find((c) => c.nome === nome)!;

  console.log("Criando fornecedores...");
  const fornecedoresData = [
    { nome: "Ateliê Fernandes Arquitetura", tipo: "empresa", especialidade: "Arquitetura", avaliacao: 5 },
    { nome: "João Marcenaria Fina", tipo: "empresa", especialidade: "Marcenaria", avaliacao: 5 },
    { nome: "Elétrica Sul Instalações", tipo: "empresa", especialidade: "Elétrica", avaliacao: 4 },
    { nome: "Hidro Prime Serviços", tipo: "empresa", especialidade: "Hidráulica", avaliacao: 4 },
    { nome: "Construtora Bravo Reformas", tipo: "empresa", especialidade: "Obra civil", avaliacao: 4 },
    { nome: "Pisos & Pedras Almeida", tipo: "empresa", especialidade: "Acabamentos", avaliacao: 5 },
    { nome: "Studio Cortinas & Cia", tipo: "empresa", especialidade: "Decoração", avaliacao: 4 },
    { nome: "Refrigera Clima Ar", tipo: "empresa", especialidade: "Ar-condicionado", avaliacao: 3 },
    { nome: "Casa Eletro Distribuidora", tipo: "empresa", especialidade: "Eletrodomésticos", avaliacao: 4 },
    { nome: "Transportes Mudar Bem", tipo: "empresa", especialidade: "Logística", avaliacao: 3 },
    { nome: "Pintor Renato Souza", tipo: "pessoa física", especialidade: "Pintura", avaliacao: 5 },
  ];
  const fornecedores: Awaited<ReturnType<typeof prisma.fornecedor.create>>[] = [];
  for (const f of fornecedoresData) {
    fornecedores.push(
      await prisma.fornecedor.create({
        data: {
          projetoId: projeto.id,
          nome: f.nome,
          tipo: f.tipo,
          especialidade: f.especialidade,
          avaliacao: f.avaliacao,
          status: "ativo",
          email: `${f.nome.toLowerCase().split(" ")[0]}@fornecedor.exemplo`,
          telefone: "(11) 90000-0000",
          pix: `${f.nome.toLowerCase().replace(/\s+/g, ".")}@pix.exemplo`,
        },
      })
    );
  }
  const forn = (nome: string) => fornecedores.find((f) => f.nome === nome)!;

  console.log("Criando tarefas do cronograma...");
  type TarefaSeed = {
    titulo: string;
    ambiente?: string;
    categoria?: string;
    fornecedor?: string;
    inicio: number;
    duracao: number;
    status: string;
    percentual: number;
    custoPrevisto: number;
    custoRealizado: number;
    marco?: boolean;
  };
  const tarefasSeed: TarefaSeed[] = [
    { titulo: "Levantamento e medição", categoria: "Levantamento", inicio: 0, duracao: 5, status: "concluido", percentual: 100, custoPrevisto: 2000, custoRealizado: 2000 },
    { titulo: "Projeto arquitetônico aprovado", categoria: "Arquiteta", fornecedor: "Ateliê Fernandes Arquitetura", inicio: 5, duracao: 20, status: "concluido", percentual: 100, custoPrevisto: 25000, custoRealizado: 25000, marco: true },
    { titulo: "Demolição", ambiente: "Apartamento inteiro", categoria: "Demolição", fornecedor: "Construtora Bravo Reformas", inicio: 26, duracao: 8, status: "concluido", percentual: 100, custoPrevisto: 8000, custoRealizado: 8600 },
    { titulo: "Elétrica — infraestrutura", ambiente: "Apartamento inteiro", categoria: "Elétrica", fornecedor: "Elétrica Sul Instalações", inicio: 35, duracao: 15, status: "concluido", percentual: 100, custoPrevisto: 32000, custoRealizado: 33500 },
    { titulo: "Hidráulica — infraestrutura", ambiente: "Apartamento inteiro", categoria: "Hidráulica", fornecedor: "Hidro Prime Serviços", inicio: 35, duracao: 15, status: "concluido", percentual: 100, custoPrevisto: 28000, custoRealizado: 27500 },
    { titulo: "Alvenaria e fechamentos", ambiente: "Apartamento inteiro", categoria: "Alvenaria", fornecedor: "Construtora Bravo Reformas", inicio: 50, duracao: 20, status: "concluido", percentual: 100, custoPrevisto: 18000, custoRealizado: 19200 },
    { titulo: "Contrapiso", ambiente: "Apartamento inteiro", categoria: "Contrapiso", fornecedor: "Construtora Bravo Reformas", inicio: 70, duracao: 10, status: "concluido", percentual: 100, custoPrevisto: 9000, custoRealizado: 9000 },
    { titulo: "Impermeabilização áreas molhadas", ambiente: "Banheiro social", categoria: "Impermeabilização", fornecedor: "Hidro Prime Serviços", inicio: 80, duracao: 6, status: "concluido", percentual: 100, custoPrevisto: 4500, custoRealizado: 4500 },
    { titulo: "Revestimento cozinha", ambiente: "Cozinha", categoria: "Revestimentos (execução)", fornecedor: "Pisos & Pedras Almeida", inicio: 86, duracao: 12, status: "concluido", percentual: 100, custoPrevisto: 15000, custoRealizado: 16800 },
    { titulo: "Piso sala de estar", ambiente: "Sala de estar", categoria: "Pisos", fornecedor: "Pisos & Pedras Almeida", inicio: 98, duracao: 10, status: "em_andamento", percentual: 70, custoPrevisto: 22000, custoRealizado: 15000 },
    { titulo: "Piso quarto principal", ambiente: "Quarto principal", categoria: "Pisos", fornecedor: "Pisos & Pedras Almeida", inicio: 98, duracao: 8, status: "em_andamento", percentual: 60, custoPrevisto: 12000, custoRealizado: 7000 },
    { titulo: "Pintura geral", ambiente: "Apartamento inteiro", categoria: "Pintura", fornecedor: "Pintor Renato Souza", inicio: 108, duracao: 15, status: "atrasado", percentual: 30, custoPrevisto: 14000, custoRealizado: 5000 },
    { titulo: "Instalação de forro e gesso", ambiente: "Sala de estar", categoria: "Forro", fornecedor: "Construtora Bravo Reformas", inicio: 108, duracao: 10, status: "aguardando_material", percentual: 0, custoPrevisto: 7000, custoRealizado: 0 },
    { titulo: "Medição para marcenaria executiva", ambiente: "Cozinha", categoria: "Marcenaria", fornecedor: "João Marcenaria Fina", inicio: 118, duracao: 3, status: "em_andamento", percentual: 50, custoPrevisto: 1500, custoRealizado: 0 },
    { titulo: "Fabricação marcenaria cozinha", ambiente: "Cozinha", categoria: "Marcenaria", fornecedor: "João Marcenaria Fina", inicio: 121, duracao: 30, status: "nao_iniciado", percentual: 0, custoPrevisto: 45000, custoRealizado: 0 },
    { titulo: "Instalação marcenaria cozinha", ambiente: "Cozinha", categoria: "Marcenaria", fornecedor: "João Marcenaria Fina", inicio: 151, duracao: 5, status: "nao_iniciado", percentual: 0, custoPrevisto: 6000, custoRealizado: 0 },
    { titulo: "Instalação ar-condicionado", ambiente: "Apartamento inteiro", categoria: "Ar-condicionado", fornecedor: "Refrigera Clima Ar", inicio: 130, duracao: 5, status: "aguardando_fornecedor", percentual: 0, custoPrevisto: 18000, custoRealizado: 0 },
    { titulo: "Instalação de louças e metais", ambiente: "Banheiro social", categoria: "Louças", fornecedor: "Hidro Prime Serviços", inicio: 135, duracao: 4, status: "nao_iniciado", percentual: 0, custoPrevisto: 9500, custoRealizado: 0 },
    { titulo: "Entrega de eletrodomésticos", ambiente: "Cozinha", categoria: "Eletrodomésticos", fornecedor: "Casa Eletro Distribuidora", inicio: 156, duracao: 2, status: "nao_iniciado", percentual: 0, custoPrevisto: 32000, custoRealizado: 0 },
    { titulo: "Cortinas e persianas", ambiente: "Apartamento inteiro", categoria: "Cortinas", fornecedor: "Studio Cortinas & Cia", inicio: 160, duracao: 5, status: "nao_iniciado", percentual: 0, custoPrevisto: 11000, custoRealizado: 0 },
    { titulo: "Móveis soltos e decoração final", ambiente: "Apartamento inteiro", categoria: "Móveis soltos", fornecedor: "Studio Cortinas & Cia", inicio: 165, duracao: 10, status: "nao_iniciado", percentual: 0, custoPrevisto: 38000, custoRealizado: 0 },
    { titulo: "Limpeza pós-obra e mudança", ambiente: "Apartamento inteiro", categoria: "Mudança", fornecedor: "Transportes Mudar Bem", inicio: 178, duracao: 4, status: "nao_iniciado", percentual: 0, custoPrevisto: 6000, custoRealizado: 0 },
    { titulo: "Entrega final da reforma", ambiente: "Apartamento inteiro", inicio: 182, duracao: 1, status: "nao_iniciado", percentual: 0, custoPrevisto: 0, custoRealizado: 0, marco: true },
  ];

  const tarefas: Record<string, Awaited<ReturnType<typeof prisma.tarefa.create>>> = {};
  for (const t of tarefasSeed) {
    const dataInicioPlanejada = addDias(inicioObra, t.inicio);
    const dataTerminoPlanejada = addDias(dataInicioPlanejada, t.duracao);
    const concluida = t.status === "concluido";
    tarefas[t.titulo] = await prisma.tarefa.create({
      data: {
        projetoId: projeto.id,
        titulo: t.titulo,
        ambienteId: t.ambiente ? amb(t.ambiente).id : undefined,
        categoriaId: t.categoria ? cat(t.categoria).id : undefined,
        fornecedorId: t.fornecedor ? forn(t.fornecedor).id : undefined,
        responsavel: t.fornecedor ?? "Samanta",
        dataInicioPlanejada,
        dataTerminoPlanejada,
        dataInicioReal: t.percentual > 0 ? dataInicioPlanejada : null,
        dataTerminoReal: concluida ? dataTerminoPlanejada : null,
        percentualConcluido: t.percentual,
        status: t.status,
        custoPrevistoCentavos: reais(t.custoPrevisto),
        custoRealizadoCentavos: reais(t.custoRealizado),
        ehMarco: !!t.marco,
      },
    });
  }

  const dependencias: [string, string][] = [
    ["Projeto arquitetônico aprovado", "Levantamento e medição"],
    ["Demolição", "Projeto arquitetônico aprovado"],
    ["Elétrica — infraestrutura", "Demolição"],
    ["Hidráulica — infraestrutura", "Demolição"],
    ["Alvenaria e fechamentos", "Elétrica — infraestrutura"],
    ["Alvenaria e fechamentos", "Hidráulica — infraestrutura"],
    ["Contrapiso", "Alvenaria e fechamentos"],
    ["Impermeabilização áreas molhadas", "Contrapiso"],
    ["Revestimento cozinha", "Impermeabilização áreas molhadas"],
    ["Piso sala de estar", "Revestimento cozinha"],
    ["Piso quarto principal", "Revestimento cozinha"],
    ["Pintura geral", "Piso sala de estar"],
    ["Instalação de forro e gesso", "Pintura geral"],
    ["Medição para marcenaria executiva", "Piso sala de estar"],
    ["Fabricação marcenaria cozinha", "Medição para marcenaria executiva"],
    ["Instalação marcenaria cozinha", "Fabricação marcenaria cozinha"],
    ["Instalação de louças e metais", "Pintura geral"],
    ["Entrega de eletrodomésticos", "Instalação marcenaria cozinha"],
    ["Cortinas e persianas", "Pintura geral"],
    ["Móveis soltos e decoração final", "Instalação marcenaria cozinha"],
    ["Limpeza pós-obra e mudança", "Móveis soltos e decoração final"],
    ["Entrega final da reforma", "Limpeza pós-obra e mudança"],
  ];
  for (const [dependente, precedente] of dependencias) {
    await prisma.tarefaDependencia.create({
      data: { tarefaId: tarefas[dependente].id, dependeDeId: tarefas[precedente].id },
    });
  }

  console.log("Criando itens de orçamento...");
  const orcamentoItensSeed = [
    { nome: "Honorários arquiteta", categoria: "Arquiteta", ambiente: "Apartamento inteiro", estimado: 25000, aprovado: 25000, contratado: 25000, pago: 25000 },
    { nome: "Demolição geral", categoria: "Demolição", ambiente: "Apartamento inteiro", estimado: 8000, aprovado: 8000, contratado: 8000, pago: 8600 },
    { nome: "Elétrica completa", categoria: "Elétrica", ambiente: "Apartamento inteiro", estimado: 32000, aprovado: 32000, contratado: 33500, pago: 33500 },
    { nome: "Hidráulica completa", categoria: "Hidráulica", ambiente: "Apartamento inteiro", estimado: 28000, aprovado: 28000, contratado: 27500, pago: 27500 },
    { nome: "Alvenaria e drywall", categoria: "Alvenaria", ambiente: "Apartamento inteiro", estimado: 18000, aprovado: 18000, contratado: 19200, pago: 19200 },
    { nome: "Revestimento cozinha", categoria: "Revestimentos (execução)", ambiente: "Cozinha", estimado: 15000, aprovado: 15000, contratado: 16800, pago: 16800 },
    { nome: "Piso porcelanato sala", categoria: "Pisos", ambiente: "Sala de estar", estimado: 22000, aprovado: 22000, contratado: 22000, pago: 15000 },
    { nome: "Piso quarto principal", categoria: "Pisos", ambiente: "Quarto principal", estimado: 12000, aprovado: 12000, contratado: 12000, pago: 7000 },
    { nome: "Pintura geral apartamento", categoria: "Pintura", ambiente: "Apartamento inteiro", estimado: 14000, aprovado: 14000, contratado: 14000, pago: 5000 },
    { nome: "Marcenaria cozinha planejada", categoria: "Marcenaria", ambiente: "Cozinha", estimado: 45000, aprovado: 52000, contratado: 52500, pago: 0 },
    { nome: "Marcenaria home office", categoria: "Marcenaria", ambiente: "Home office", estimado: 18000, aprovado: 0, contratado: 0, pago: 0 },
    { nome: "Ar-condicionado 4 ambientes", categoria: "Ar-condicionado", ambiente: "Apartamento inteiro", estimado: 18000, aprovado: 18000, contratado: 18000, pago: 0 },
    { nome: "Louças e metais banheiro social", categoria: "Louças", ambiente: "Banheiro social", estimado: 9500, aprovado: 9500, contratado: 9500, pago: 0 },
    { nome: "Louças e metais suíte", categoria: "Louças", ambiente: "Suíte", estimado: 12000, aprovado: 0, contratado: 0, pago: 0 },
    { nome: "Eletrodomésticos cozinha", categoria: "Eletrodomésticos", ambiente: "Cozinha", estimado: 32000, aprovado: 32000, contratado: 32000, pago: 0 },
    { nome: "Cortinas e persianas", categoria: "Cortinas", ambiente: "Apartamento inteiro", estimado: 11000, aprovado: 11000, contratado: 0, pago: 0 },
    { nome: "Móveis soltos sala e quartos", categoria: "Móveis soltos", ambiente: "Apartamento inteiro", estimado: 38000, aprovado: 0, contratado: 0, pago: 0 },
    { nome: "Tapetes", categoria: "Tapetes", ambiente: "Sala de estar", estimado: 6000, aprovado: 0, contratado: 0, pago: 0 },
    { nome: "Frete e montagem geral", categoria: "Frete", ambiente: "Apartamento inteiro", estimado: 5000, aprovado: 5000, contratado: 0, pago: 0 },
    { nome: "Caçamba e limpeza de obra", categoria: "Caçamba", ambiente: "Apartamento inteiro", estimado: 3500, aprovado: 3500, contratado: 3500, pago: 3500 },
    { nome: "Projeto de iluminação", categoria: "Designer de interiores", ambiente: "Apartamento inteiro", estimado: 8000, aprovado: 8000, contratado: 8000, pago: 8000 },
    { nome: "Reserva de contingência", categoria: "Contingência", ambiente: "Apartamento inteiro", estimado: 60000, aprovado: 0, contratado: 0, pago: 0 },
  ];
  for (const it of orcamentoItensSeed) {
    await prisma.orcamentoItem.create({
      data: {
        projetoId: projeto.id,
        nome: it.nome,
        categoriaId: cat(it.categoria).id,
        ambienteId: amb(it.ambiente).id,
        valorEstimadoCentavos: reais(it.estimado),
        valorAprovadoCentavos: reais(it.aprovado),
        valorContratadoCentavos: reais(it.contratado),
        valorPagoCentavos: reais(it.pago),
        prioridade: it.estimado > 20000 ? "alta" : "media",
      },
    });
  }

  console.log("Criando lançamentos financeiros...");
  type LancSeed = {
    tipo: "entrada" | "saida";
    descricao: string;
    valor: number;
    diasOffset: number;
    status: string;
    categoria?: string;
    ambiente?: string;
    fornecedor?: string;
    parcelas?: number;
    formaPagamento?: string;
  };
  const lancamentosSeed: LancSeed[] = [
    { tipo: "entrada", descricao: "Aporte inicial da reforma", valor: 300000, diasOffset: -125, status: "pago", formaPagamento: "transferência" },
    { tipo: "entrada", descricao: "Segundo aporte", valor: 150000, diasOffset: -60, status: "pago", formaPagamento: "transferência" },
    { tipo: "entrada", descricao: "Terceiro aporte (reserva)", valor: 50000, diasOffset: -10, status: "pago", formaPagamento: "transferência" },
    { tipo: "saida", descricao: "Honorários arquiteta — parcela única", valor: 25000, diasOffset: -118, status: "pago", categoria: "Arquiteta", ambiente: "Apartamento inteiro", fornecedor: "Ateliê Fernandes Arquitetura" },
    { tipo: "saida", descricao: "Demolição geral", valor: 8600, diasOffset: -95, status: "pago", categoria: "Demolição", ambiente: "Apartamento inteiro", fornecedor: "Construtora Bravo Reformas" },
    { tipo: "saida", descricao: "Elétrica — material", valor: 15000, diasOffset: -85, status: "pago", categoria: "Elétrica", ambiente: "Apartamento inteiro", fornecedor: "Elétrica Sul Instalações" },
    { tipo: "saida", descricao: "Elétrica — mão de obra", valor: 18500, diasOffset: -80, status: "pago", categoria: "Elétrica", ambiente: "Apartamento inteiro", fornecedor: "Elétrica Sul Instalações" },
    { tipo: "saida", descricao: "Hidráulica — material e mão de obra", valor: 27500, diasOffset: -80, status: "pago", categoria: "Hidráulica", ambiente: "Apartamento inteiro", fornecedor: "Hidro Prime Serviços" },
    { tipo: "saida", descricao: "Alvenaria e drywall", valor: 19200, diasOffset: -60, status: "pago", categoria: "Alvenaria", ambiente: "Apartamento inteiro", fornecedor: "Construtora Bravo Reformas" },
    { tipo: "saida", descricao: "Contrapiso", valor: 9000, diasOffset: -45, status: "pago", categoria: "Contrapiso", ambiente: "Apartamento inteiro", fornecedor: "Construtora Bravo Reformas" },
    { tipo: "saida", descricao: "Impermeabilização banheiro social", valor: 4500, diasOffset: -38, status: "pago", categoria: "Impermeabilização", ambiente: "Banheiro social", fornecedor: "Hidro Prime Serviços" },
    { tipo: "saida", descricao: "Revestimento cozinha — material", valor: 9800, diasOffset: -32, status: "pago", categoria: "Revestimentos (execução)", ambiente: "Cozinha", fornecedor: "Pisos & Pedras Almeida" },
    { tipo: "saida", descricao: "Revestimento cozinha — mão de obra", valor: 7000, diasOffset: -28, status: "pago", categoria: "Revestimentos (execução)", ambiente: "Cozinha", fornecedor: "Pisos & Pedras Almeida" },
    { tipo: "saida", descricao: "Piso porcelanato sala — sinal", valor: 15000, diasOffset: -20, status: "pago", categoria: "Pisos", ambiente: "Sala de estar", fornecedor: "Pisos & Pedras Almeida" },
    { tipo: "saida", descricao: "Piso porcelanato sala — saldo", valor: 7000, diasOffset: 10, status: "aguardando_pagamento", categoria: "Pisos", ambiente: "Sala de estar", fornecedor: "Pisos & Pedras Almeida" },
    { tipo: "saida", descricao: "Piso quarto principal — sinal", valor: 7000, diasOffset: -18, status: "pago", categoria: "Pisos", ambiente: "Quarto principal", fornecedor: "Pisos & Pedras Almeida" },
    { tipo: "saida", descricao: "Piso quarto principal — saldo", valor: 5000, diasOffset: 12, status: "aguardando_pagamento", categoria: "Pisos", ambiente: "Quarto principal", fornecedor: "Pisos & Pedras Almeida" },
    { tipo: "saida", descricao: "Pintura geral — sinal", valor: 5000, diasOffset: -8, status: "pago", categoria: "Pintura", ambiente: "Apartamento inteiro", fornecedor: "Pintor Renato Souza" },
    { tipo: "saida", descricao: "Pintura geral — 2ª medição", valor: 4500, diasOffset: 5, status: "vencido", categoria: "Pintura", ambiente: "Apartamento inteiro", fornecedor: "Pintor Renato Souza" },
    { tipo: "saida", descricao: "Ar-condicionado — sinal 30%", valor: 5400, diasOffset: -5, status: "pago", categoria: "Ar-condicionado", ambiente: "Apartamento inteiro", fornecedor: "Refrigera Clima Ar" },
    { tipo: "saida", descricao: "Ar-condicionado — saldo na instalação", valor: 12600, diasOffset: 25, status: "aguardando_pagamento", categoria: "Ar-condicionado", ambiente: "Apartamento inteiro", fornecedor: "Refrigera Clima Ar" },
    { tipo: "saida", descricao: "Louças e metais banheiro social", valor: 9500, diasOffset: 15, status: "contratado", categoria: "Louças", ambiente: "Banheiro social", fornecedor: "Hidro Prime Serviços" },
    { tipo: "saida", descricao: "Eletrodomésticos cozinha — pedido", valor: 32000, diasOffset: 30, status: "aprovado", categoria: "Eletrodomésticos", ambiente: "Cozinha", fornecedor: "Casa Eletro Distribuidora" },
    { tipo: "saida", descricao: "Cortinas e persianas — orçamento", valor: 11000, diasOffset: 45, status: "em_cotacao", categoria: "Cortinas", ambiente: "Apartamento inteiro", fornecedor: "Studio Cortinas & Cia" },
    { tipo: "saida", descricao: "Caçamba de entulho", valor: 1200, diasOffset: -100, status: "pago", categoria: "Caçamba", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Segunda caçamba de entulho", valor: 1200, diasOffset: -55, status: "pago", categoria: "Caçamba", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Limpeza pós-etapa civil", valor: 1100, diasOffset: -40, status: "pago", categoria: "Limpeza", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Projeto de iluminação", valor: 8000, diasOffset: -110, status: "pago", categoria: "Designer de interiores", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Condomínio (taxa extra obra)", valor: 1500, diasOffset: -100, status: "pago", categoria: "Condomínio (taxas de obra)", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Condomínio mensal", valor: 950, diasOffset: -90, status: "pago", categoria: "Condomínio", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Condomínio mensal", valor: 950, diasOffset: -60, status: "pago", categoria: "Condomínio", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Condomínio mensal", valor: 950, diasOffset: -30, status: "pago", categoria: "Condomínio", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Condomínio mensal", valor: 950, diasOffset: 1, status: "aguardando_pagamento", categoria: "Condomínio", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "IPTU parcela", valor: 620, diasOffset: -70, status: "pago", categoria: "IPTU", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "IPTU parcela", valor: 620, diasOffset: 3, status: "vencido", categoria: "IPTU", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Energia elétrica", valor: 310, diasOffset: -20, status: "pago", categoria: "Energia", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Água e esgoto", valor: 180, diasOffset: -20, status: "pago", categoria: "Água", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Retrabalho pintura (imprevisto)", valor: 1800, diasOffset: -6, status: "pago", categoria: "Retrabalho", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Reposição de material danificado", valor: 950, diasOffset: -3, status: "pago", categoria: "Danos", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Internet — assinatura mensal", valor: 120, diasOffset: -90, status: "pago", categoria: "Internet (assinatura)", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Internet — assinatura mensal", valor: 120, diasOffset: -60, status: "pago", categoria: "Internet (assinatura)", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Internet — assinatura mensal", valor: 120, diasOffset: -30, status: "pago", categoria: "Internet (assinatura)", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Seguro residencial anual", valor: 890, diasOffset: -100, status: "pago", categoria: "Seguro", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Pequeno reparo — vazamento hall", valor: 350, diasOffset: -50, status: "pago", categoria: "Pequenos reparos", ambiente: "Hall" },
    { tipo: "saida", descricao: "Rodapés apartamento inteiro", valor: 4200, diasOffset: 8, status: "aprovado", categoria: "Rodapés", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Portas internas — pedido", valor: 9800, diasOffset: 20, status: "em_cotacao", categoria: "Portas", ambiente: "Apartamento inteiro" },
    { tipo: "saida", descricao: "Ferragens e puxadores", valor: 2100, diasOffset: 22, status: "aguardando_aprovacao", categoria: "Ferragens", ambiente: "Cozinha" },
  ];

  // Marcenaria cozinha parcelada em 5x
  const totalMarcenaria = 52500;
  const parcelaMarcenaria = totalMarcenaria / 5;
  const grupoParcelaMarcenaria = "marcenaria-cozinha";
  for (let i = 1; i <= 5; i++) {
    lancamentosSeed.push({
      tipo: "saida",
      descricao: `Marcenaria cozinha — parcela ${i}/5`,
      valor: parcelaMarcenaria,
      diasOffset: -5 + i * 20,
      status: i === 1 ? "pago" : i === 2 ? "vencido" : "aguardando_pagamento",
      categoria: "Marcenaria",
      ambiente: "Cozinha",
      fornecedor: "João Marcenaria Fina",
      parcelas: 5,
    });
  }

  for (const l of lancamentosSeed) {
    const data = addDias(hoje, l.diasOffset);
    await prisma.lancamento.create({
      data: {
        projetoId: projeto.id,
        tipo: l.tipo,
        descricao: l.descricao,
        valorCentavos: reais(l.valor),
        dataLancamento: data,
        dataVencimento: data,
        dataPagamento: l.status === "pago" || l.status === "pago_parcialmente" ? data : null,
        status: l.status,
        categoriaId: l.categoria ? cat(l.categoria).id : undefined,
        ambienteId: l.ambiente ? amb(l.ambiente).id : undefined,
        fornecedorId: l.fornecedor ? forn(l.fornecedor).id : undefined,
        formaPagamento: l.formaPagamento ?? "transferência",
        numeroParcelas: l.parcelas ?? 1,
        parcelaAtual: l.parcelas ? Number(l.descricao.match(/(\d+)\/\d+/)?.[1] ?? 1) : 1,
        grupoParcelaId: l.parcelas ? grupoParcelaMarcenaria : undefined,
      },
    });
  }
  console.log(`Criados ${lancamentosSeed.length} lançamentos.`);

  console.log("Criando cotações concorrentes...");
  await prisma.cotacao.createMany({
    data: [
      {
        projetoId: projeto.id,
        itemDescricao: "Ar-condicionado 4 ambientes — instalação",
        fornecedorId: forn("Refrigera Clima Ar").id,
        valorCentavos: reais(18000),
        prazoDias: 10,
        formaPagamento: "30% sinal + saldo na entrega",
        garantia: "12 meses",
        statusSelecao: "aprovada",
        melhorCustoBeneficio: true,
      },
      {
        projetoId: projeto.id,
        itemDescricao: "Ar-condicionado 4 ambientes — instalação",
        fornecedorId: forn("Casa Eletro Distribuidora").id,
        valorCentavos: reais(16500),
        prazoDias: 20,
        formaPagamento: "à vista",
        garantia: "6 meses",
        statusSelecao: "descartada",
        melhorPreco: true,
      },
      {
        projetoId: projeto.id,
        itemDescricao: "Marcenaria cozinha planejada",
        fornecedorId: forn("João Marcenaria Fina").id,
        valorCentavos: reais(52500),
        prazoDias: 35,
        formaPagamento: "5x",
        garantia: "24 meses",
        statusSelecao: "aprovada",
        melhorCustoBeneficio: true,
        melhorPrazo: true,
      },
    ],
  });

  console.log("Criando contratos...");
  await prisma.contrato.create({
    data: {
      projetoId: projeto.id,
      fornecedorId: forn("João Marcenaria Fina").id,
      escopo: "Fornecimento e instalação de marcenaria planejada da cozinha",
      valorTotalCentavos: reais(52500),
      dataInicio: addDias(hoje, -5),
      dataFim: addDias(hoje, 40),
      formaPagamento: "5x mensais",
      prazo: "35 dias úteis após medição",
      garantia: "24 meses contra defeitos de fabricação",
      status: "ativo",
    },
  });
  await prisma.contrato.create({
    data: {
      projetoId: projeto.id,
      fornecedorId: forn("Construtora Bravo Reformas").id,
      escopo: "Serviços de obra civil (demolição, alvenaria, contrapiso)",
      valorTotalCentavos: reais(35200),
      dataInicio: addDias(inicioObra, 26),
      dataFim: addDias(inicioObra, 90),
      formaPagamento: "medições quinzenais",
      status: "concluido",
    },
  });

  console.log("Criando documentos...");
  await prisma.documento.createMany({
    data: [
      { projetoId: projeto.id, nome: "Planta baixa aprovada v3", tipo: "planta", url: "/uploads/demo/planta-baixa-v3.pdf", versao: 3, statusAprovacao: "aprovado" },
      { projetoId: projeto.id, nome: "Contrato marcenaria cozinha", tipo: "contrato", url: "/uploads/demo/contrato-marcenaria.pdf", fornecedorId: forn("João Marcenaria Fina").id, statusAprovacao: "aprovado" },
      { projetoId: projeto.id, nome: "Nota fiscal elétrica", tipo: "nota_fiscal", url: "/uploads/demo/nf-eletrica.pdf", fornecedorId: forn("Elétrica Sul Instalações").id, statusAprovacao: "aprovado" },
      { projetoId: projeto.id, nome: "Projeto de iluminação", tipo: "projeto", url: "/uploads/demo/projeto-iluminacao.pdf", statusAprovacao: "aprovado" },
      { projetoId: projeto.id, nome: "Foto antes — cozinha", tipo: "foto", url: "/uploads/demo/foto-cozinha-antes.jpg", ambienteId: amb("Cozinha").id },
    ],
  });

  console.log("Criando cenários de projeção...");
  await prisma.cenario.createMany({
    data: [
      { projetoId: projeto.id, nome: "Otimista", tipo: "otimista", descricao: "Sem novos atrasos, fornecedores cumprem prazo.", ajustePrazoDias: -10, ajusteCustoPercent: -2, usaReservaPercent: 0 },
      { projetoId: projeto.id, nome: "Provável", tipo: "provavel", descricao: "Mantém o atraso atual da pintura.", ajustePrazoDias: 18, ajusteCustoPercent: 4, usaReservaPercent: 30 },
      { projetoId: projeto.id, nome: "Pessimista", tipo: "pessimista", descricao: "Atraso adicional de fornecedor + reajuste de material.", ajustePrazoDias: 45, ajusteCustoPercent: 12, usaReservaPercent: 80 },
    ],
  });

  console.log("Seed concluído.");
  console.log(`Login demo: demo@reforma.local / reforma123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
