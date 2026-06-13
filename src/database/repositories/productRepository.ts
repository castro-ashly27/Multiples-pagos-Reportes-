import { db } from "../database";

export const ProductRepository = {
  async getAll() {
    const database = await db;
    return database.getAllAsync(`SELECT * FROM productos`);
  },

  async getById(id: number) {
    const database = await db;
    return database.getFirstAsync(`SELECT * FROM productos WHERE id = ?`, [id]);
  },

  async getByCategory(categoria_id: number) {
    const database = await db;
    return database.getAllAsync(`SELECT * FROM productos WHERE categoria_id = ?`, [categoria_id]);
  },

  async search(term: string) {
    const database = await db;
    const like = `%${term}%`;
    return database.getAllAsync(
      `SELECT * FROM productos WHERE nombre LIKE ? OR codigo LIKE ?`,
      [like, like]
    );
  },

  async getByBarcode(codigo: string) {
    const database = await db;
    return database.getFirstAsync(`SELECT * FROM productos WHERE codigo = ?`, [codigo]);
  },

  async create(nombre: string, precio: number, stock: number, codigo: string, categoria_id?: number, imagen?: string, aplica_impuesto: boolean = true) {
    const database = await db;
    return database.runAsync(
      `INSERT INTO productos (nombre, precio, stock, codigo, categoria_id, imagen, aplica_impuesto) VALUES(?, ?, ?, ?, ?, ?, ?)`,
      [nombre, precio, stock, codigo, categoria_id || null, imagen || null, aplica_impuesto ? 1 : 0]
    );
  },

  async adjustStock(id: number, cantidad: number) {
    (await db).runAsync(
      `UPDATE productos SET stock = stock + ? 
      WHERE id=?`,
      [cantidad, id]
    );
  },

  async update(
    id: number,
    nombre: string,
    precio: number,
    stock: number,
    codigo: string,
    categoria_id?: number,
    imagen?: string,
    aplica_impuesto: boolean = true
  ) {
    const database = await db;
    await database.runAsync(
      `UPDATE productos SET nombre = ?, precio = ?, stock = ?, codigo = ?, categoria_id = ?, imagen = ?, aplica_impuesto = ? WHERE id = ?`,
      [nombre, precio, stock, codigo, categoria_id || null, imagen || null, aplica_impuesto ? 1 : 0, id]
    );
  },

  async delete(id: number) {
    const database = await db;
    await database.runAsync(`DELETE FROM productos WHERE id=?`, [id]);
  },

  async isCodeUnique(codigo: string, excludeId?: number) {
    const database = await db;
    const query = excludeId
      ? "SELECT COUNT(*) as count FROM productos WHERE codigo = ? AND id != ?"
      : "SELECT COUNT(*) as count FROM productos WHERE codigo = ?";

    const params = excludeId ? [codigo, excludeId] : [codigo];
    const result = await database.getFirstAsync(query, params);
    return (result as any).count === 0;
  },
};
