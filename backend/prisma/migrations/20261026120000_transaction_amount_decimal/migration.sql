-- AlterTable
-- Float (DOUBLE PRECISION) -> DECIMAL(12,2). O USING arredonda explicitamente para 2 casas,
-- preservando os valores existentes (ex.: 49.999999999 -> 50.00).
ALTER TABLE "assistent"."transaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2) USING ROUND("amount"::numeric, 2);
