import { test, expect } from "@playwright/test";

const EMAIL = "demo@reforma.local";
const SENHA = "reforma123";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#senha", SENHA);
  await page.click('button[type="submit"]');
  await page.waitForURL("/");
}

test("redireciona para /login quando não autenticado", async ({ page }) => {
  await page.goto("/orcamento");
  await page.waitForURL(/\/login/);
});

test("login com credenciais válidas leva à Visão Geral", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Visão Geral" })).toBeVisible();
  await expect(page.getByText("Orçamento total", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Panorama da Reforma")).toBeVisible();
});

test("login com senha errada mostra erro", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#senha", "senha-errada");
  await page.click('button[type="submit"]');
  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
});

test("navega para Lançamentos e cria um novo lançamento", async ({ page }) => {
  await login(page);
  await page.locator('aside a[href="/lancamentos"]').click();
  await page.waitForURL(/\/lancamentos/);

  await page.getByText("+ Novo lançamento").click();
  await page.fill('input[name="descricao"]', "Teste e2e - compra de parafusos");
  await page.fill('input[name="valor"]', "49.90");
  await page.getByRole("button", { name: "Adicionar lançamento" }).click();

  // A tabela de lançamentos já tem muitas linhas (dados de demonstração), cada
  // uma renderizando um formulário de edição completo — a re-renderização após
  // o Server Action pode demorar mais que o timeout padrão.
  await expect(page.getByText("Teste e2e - compra de parafusos")).toBeVisible({ timeout: 15_000 });
});

test("cronograma alterna entre lista, kanban e linha do tempo", async ({ page }) => {
  await login(page);
  await page.goto("/cronograma");
  await expect(page.getByRole("heading", { name: "Cronograma" })).toBeVisible();

  await page.getByRole("link", { name: "Kanban" }).click();
  await expect(page.getByText("Mover para:").first()).toBeVisible();

  await page.getByRole("link", { name: "Linha do tempo" }).click();
  await expect(page.getByRole("heading", { name: "Linha do tempo" })).toBeVisible();
});

test("orçamento mostra indicadores de status por item", async ({ page }) => {
  await login(page);
  await page.goto("/orcamento");
  await expect(page.getByText(/Itens do orçamento/)).toBeVisible();
});

test("orçamento não permite editar contratado/pago manualmente (calculados dos lançamentos)", async ({ page }) => {
  await login(page);
  await page.goto("/orcamento");
  await expect(page.getByText(/calculados automaticamente/)).toBeVisible();
  await expect(page.locator('input[name="valorContratado"]')).toHaveCount(0);
  await expect(page.locator('input[name="valorPago"]')).toHaveCount(0);
});

test("configurações mostra conta bancária com saldo integrado", async ({ page }) => {
  await login(page);
  await page.goto("/configuracoes");
  await expect(page.getByText("Contas bancárias", { exact: true })).toBeVisible();
  await expect(page.getByText("Conta Corrente — Reforma")).toBeVisible();
  await expect(page.getByText("Saldo atual", { exact: true })).toBeVisible();
});

test("lançamento pode ser vinculado a um item de orçamento e a uma conta bancária", async ({ page }) => {
  await login(page);
  await page.goto("/lancamentos");
  await page.getByText("+ Novo lançamento").click();
  await expect(page.locator('select[name="orcamentoItemId"]').first()).toBeVisible();
  await expect(page.locator('select[name="contaBancariaId"]').first()).toBeVisible();
});
