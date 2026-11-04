/**
 * Datos iniciales de ejemplo (inventados), compartidos por los DAOs de memoria y de Sequelize.
 * Viven en un solo lugar para que los dos modos de persistencia arranquen exactamente con lo mismo.
 */

// Un activo con posición (L3), uno listo para comprar (L2) y uno en seguimiento (L1)
const SEMILLA_ACTIVOS = [
  { id: 1, ticker: "KO", nombre: "Coca-Cola", mercado: "NYSE", ratio: 5, nivel: "L3", cantidad: 40, topeCedears: 100 },
  { id: 2, ticker: "AAPL", nombre: "Apple", mercado: "NASDAQ", ratio: 20, nivel: "L2", cantidad: 0, topeCedears: 30 },
  { id: 3, ticker: "GGAL", nombre: "Grupo Financiero Galicia", mercado: "BYMA", ratio: 1, nivel: "L1", cantidad: 0, topeCedears: 50 },
];

// La orden 2 ya está ejecutada (es la compra que explica los 40 KO en cartera):
// sirve para probar que una orden ejecutada no se modifica ni se borra, antes de que exista el endpoint de ejecución.
const SEMILLA_ORDENES = [
  { id: 1, activoId: 1, sentido: "venta", cantidad: 10, precioLimite: 70, validaHasta: "2026-11-30", estado: "viva", motivo: "Toma parcial de ganancia" },
  { id: 2, activoId: 1, sentido: "compra", cantidad: 40, precioLimite: 55, validaHasta: "2026-10-20", estado: "ejecutada", motivo: "Armado de la posición" },
  { id: 3, activoId: 2, sentido: "compra", cantidad: 10, precioLimite: 12.5, validaHasta: "2026-11-27", estado: "viva", motivo: null },
];

export { SEMILLA_ACTIVOS, SEMILLA_ORDENES };
