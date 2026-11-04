import { Sequelize } from "sequelize";

// Conexión a SQLite: la base es un archivo en la raíz del proyecto (no se versiona: *.sqlite está en .gitignore).
// Crear esta instancia no abre el archivo: se abre recién con la primera consulta, así que en modo memoria no aparece.
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
  logging: false, // Cambiar a console.log para ver las consultas SQL que genera el ORM
});

export default sequelize;
