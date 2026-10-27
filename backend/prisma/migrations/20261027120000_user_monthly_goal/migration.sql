-- AlterTable
-- Meta mensal de gastos do usuário. Coluna opcional (NULL = sem meta) e sem default: os usuários existentes
-- ficam sem meta e o código antigo, que não conhece a coluna, continua funcionando durante o deploy.
ALTER TABLE "assistent"."user" ADD COLUMN "monthlyGoal" DECIMAL(12,2);
