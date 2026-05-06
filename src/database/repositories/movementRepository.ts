import { db } from "../database";
import { SaleRepository } from "./saleRepository";

export const MovementRepository = {
  async getAll() {
    const database = await db;
    return database.getAllAsync(
      `SELECT m.id, p.nombre, m.cantidad, m.descripcion, m.fecha, m.tipo, m.estado, m.venta_id 
 FROM movimientos_inventario m 
 JOIN productos p ON p.id = m.product_id 
 ORDER BY m.fecha DESC`
    );
  },
  // Nuevo: Crear movimiento vinculado a una venta
  async create(
    product_id: number,
    descripcion: string,
    tipo: string,
    cantidad: number,
    venta_id: number | null = null
  ) {
    (await db).runAsync(
      `INSERT INTO movimientos_inventario(product_id, descripcion, tipo, cantidad, venta_id) VALUES (?,?,?,?,?)`,
      [product_id, descripcion, tipo, cantidad, venta_id]
    );
  },

  // Nuevo: Lógica de anulación bidireccional
  async cancel(id: number) {
    const database = await db;
    const movement = await database.getFirstAsync<any>(
      "SELECT * FROM movimientos_inventario WHERE id = ?",
      [id]
    );

    if (!movement || movement.estado === "anulado") return;

    // 1. Marcar el movimiento como anulado y actualizar descripción si es de una venta (Nuevo)
    if (movement.venta_id) {
      await database.runAsync(
        "UPDATE movimientos_inventario SET estado = 'anulado', descripcion = ? WHERE id = ?",
        [`Anulación de venta #${movement.venta_id}`, id]
      );
      // 2. Anular la venta completa (bidireccional) - Nuevo
      const { SaleRepository } = require("./saleRepository");
      await SaleRepository.cancel(movement.venta_id);
    } else {
      await database.runAsync(
        "UPDATE movimientos_inventario SET estado = 'anulado' WHERE id = ?",
        [id]
      );
      // 3. Si es manual, revertir stock
      const stockAdjustment =
        movement.tipo === "entrada" ? -movement.cantidad : movement.cantidad;
      await database.runAsync(
        "UPDATE productos SET stock = stock + ? WHERE id = ?",
        [stockAdjustment, movement.product_id]
      );
    }
  },
};
