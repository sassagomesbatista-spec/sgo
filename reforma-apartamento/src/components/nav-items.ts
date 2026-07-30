import {
  LayoutDashboard,
  Wallet,
  Receipt,
  CalendarRange,
  Home,
  Tags,
  Users,
  ClipboardList,
  ShoppingCart,
  FolderOpen,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/orcamento", label: "Orçamento", icon: Wallet },
  { href: "/lancamentos", label: "Lançamentos", icon: Receipt },
  { href: "/cronograma", label: "Cronograma", icon: CalendarRange },
  { href: "/ambientes", label: "Ambientes", icon: Home },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/fornecedores", label: "Fornecedores", icon: Users },
  { href: "/cotacoes", label: "Cotações e Propostas", icon: ClipboardList },
  { href: "/contratos", label: "Compras e Contratos", icon: ShoppingCart },
  { href: "/documentos", label: "Documentos", icon: FolderOpen },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];
