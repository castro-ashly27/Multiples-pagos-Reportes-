import { db } from "../database";

export const CategoryRepository = {
  async getAll() {
    const database = await db;
    return database.getAllAsync(`SELECT * FROM categorias`);
  },

  async create(nombre: string) {
    const database = await db;
    return database.runAsync(`INSERT INTO categorias (nombre) VALUES (?)`, [nombre]);
  },

  async update(id: number, nombre: string) {
    const database = await db;
    return database.runAsync(`UPDATE categorias SET nombre = ? WHERE id = ?`, [nombre, id]);
  },

  async delete(id: number) {
    const database = await db;
    return database.runAsync(`DELETE FROM categorias WHERE id = ?`, [id]);
  }
};
