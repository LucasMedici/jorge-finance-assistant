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
    servers: [
      { url: "http://localhost:3065" }
    ],
  },
  apis: ["./src/routes/*.ts"], // <-- arquivos onde ficam suas rotas
};

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi };
