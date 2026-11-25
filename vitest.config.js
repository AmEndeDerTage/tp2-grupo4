import { defineConfig } from "vitest/config";

/**
 * Configuración de Vitest.
 *  - include: solo los archivos *.test.js de tests/. Los tests no necesitan el servidor, la base ni un .env.
 *  - environment: se prueba código de Node, no de navegador.
 *  - restoreMocks: después de cada test se deshace todo vi.spyOn, así un espía puesto en un test no llega al siguiente.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    environment: "node",
    restoreMocks: true,
  },
});
