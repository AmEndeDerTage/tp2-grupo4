import { Model, DataTypes } from "sequelize";
import { sequelize } from "../../connection/index.js";

/**
 * Modelo de la tabla intermedia `activo_etiquetas`: una fila por cada par vinculado («este activo tiene esta etiqueta»).
 * Hace falta porque la relación es N:N: ni `activos` puede guardar una sola etiquetaId (KO tiene varias) ni `etiquetas`
 * una sola activoId (dividendos está en varios activos). Una N:N es, en el fondo, dos 1:N contra esta tabla.
 *
 * A diferencia de Loans en el ejemplo de la materia, es un VÍNCULO PURO: sin datos ni historia propios, el par existe o no.
 * Por eso la clave primaria es el par (activoId, etiquetaId): la base impide el mismo vínculo dos veces
 * (integridad en la base, además del chequeo del caso de uso). Y por eso no tiene DAO propio: el vínculo se maneja
 * como «las etiquetas del activo», desde los DAOs de Activos. Las claves foráneas las define la asociación (models/index.js).
 */
class ActivoEtiquetaModel extends Model {}

ActivoEtiquetaModel.init(
  {
    activoId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    etiquetaId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
  },
  {
    sequelize,
    modelName: "ActivoEtiqueta",
    tableName: "activo_etiquetas",
    timestamps: false,
  }
);

export default ActivoEtiquetaModel;
