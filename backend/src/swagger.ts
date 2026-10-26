import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Finance Assistent API",
      version: "1.0.0",
      description: "API do seu assistente financeiro, Jorge.",
    },
    // URL relativa: o "Try it out" usa o mesmo host/porta em que a doc foi aberta.
    servers: [
      { url: "/" }
    ],
  },
  apis: ["./src/routes/*.ts"], // <-- arquivos onde ficam suas rotas
};

/** `/api-docs` fica disponível fora de produção, ou em produção só com API_DOCS_ENABLED=true. */
export function isApiDocsEnabled(env: Record<string, string | undefined> = process.env) {
  return env.NODE_ENV !== "production" || env.API_DOCS_ENABLED === "true";
}

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi };
