-- CreateIndex
-- O messageId é gerado no celular (Date.now()), então a unicidade é por usuário (phone).
-- As linhas existentes têm messageId NULL, e NULL não conflita em índice único no Postgres.
CREATE UNIQUE INDEX "transaction_phone_messageId_key" ON "assistent"."transaction"("phone", "messageId");
