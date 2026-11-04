import { Model, DataTypes } from "sequelize";
import { sequelize } from "../../connection/index.js";

/**
 * Modelo de la tabla `activos`: describe sus columnas para que el ORM la cree y genere las consultas.
 * La validación de forma (rangos, enumeraciones, regex del ticker) la hace Zod antes de llegar acá;
 * el modelo fija lo que la base tiene que garantizar por sí misma: tipos, NOT NULL y UNIQUE.
 */
class ActivoModel extends Model {}

ActivoModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ticker: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true, // Última barrera de la regla 2 (ver ActivosSequelizeDao)
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mercado: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // FLOAT y no DECIMAL: SQLite no tiene tipo decimal y guardaría lo mismo. Así vuelve un number, igual que en memoria.
    ratio: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    nivel: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    topeCedears: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize, // La conexión a la que pertenece el modelo
    modelName: "Activo",
    tableName: "activos",
    timestamps: false, // Sin columnas createdAt / updatedAt
  }
);

export default ActivoModel;
