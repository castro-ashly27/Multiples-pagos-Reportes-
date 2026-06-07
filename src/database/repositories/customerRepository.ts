import { db } from "../database";

export const CustomerRepository = {
  async getAll() {
    const database = await db;
    return database.getAllAsync(`SELECT * FROM clientes`);
  },

  async search(term: string) {
    const database = await db;
    const like = `%${term}%`;
    return database.getAllAsync(
      `SELECT * FROM clientes WHERE nombre LIKE ? OR telefono LIKE ?`,
      [like, like]
    );
  },

  async create(nombre: string, telefono: string = "", direccion: string = "") {
    const database = await db;
    return database.runAsync(
      `INSERT INTO clientes (nombre, telefono, direccion) VALUES (?, ?, ?)`,
      [nombre, telefono, direccion]
    );
  }
};
