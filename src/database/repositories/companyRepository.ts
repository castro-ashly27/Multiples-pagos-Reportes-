import { db } from "../database";

export const CompanyRepository = {
  async get() {
    const database = await db;
    return database.getFirstAsync(`SELECT * FROM empresa LIMIT 1`);
  },

  async update(nombre: string, direccion: string, logo: string, aplica_impuesto: boolean, porcentaje_impuesto: number) {
    const database = await db;
    const id = 1; // Assuming single company setup
    const aplica_impuesto_int = aplica_impuesto ? 1 : 0;
    
    // Check if exists
    const existing = await database.getFirstAsync(`SELECT * FROM empresa WHERE id = ?`, [id]);
    if (existing) {
      return database.runAsync(
        `UPDATE empresa SET nombre = ?, direccion = ?, logo = ?, aplica_impuesto = ?, porcentaje_impuesto = ? WHERE id = ?`,
        [nombre, direccion, logo, aplica_impuesto_int, porcentaje_impuesto, id]
      );
    } else {
      return database.runAsync(
        `INSERT INTO empresa (nombre, direccion, logo, aplica_impuesto, porcentaje_impuesto) VALUES (?, ?, ?, ?, ?)`,
        [nombre, direccion, logo, aplica_impuesto_int, porcentaje_impuesto]
      );
    }
  }
};
