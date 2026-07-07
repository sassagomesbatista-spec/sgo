# Pilotagem

App simples para controlar as peças enviadas para pilotagem.

## Como rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`. O banco de dados (`pilotagem.db`) é criado
automaticamente na primeira execução, já com a tabela de preços inicial.

## Logins padrão

| Usuário | Senha | Perfil |
|---|---|---|
| admin | admin123 | Administradora (vê valores, preços e relatórios) |
| assistente | assist123 | Assistente (lança peças, nunca vê valores em R$) |

Troque as duas senhas na tela **Conta** assim que possível.

## Telas

- **Lançar Peça** — formulário de lançamento (todos os perfis).
- **Lançamentos** — peças do mês corrente, com edição (valor só aparece pra admin).
- **Pilotistas** — cadastro de pilotistas (admin).
- **Preços** — regra de preços por tipo de peça e nível (admin).
- **Relatório Mensal** — filtro por mês/pilotista, totais e impressão (admin).
- **Painel** — resumo do mês atual (admin).
