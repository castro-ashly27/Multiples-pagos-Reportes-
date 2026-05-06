import { PaymentMethod } from "../../store/cartStore";
import { db } from "../database";

export const SaleRepository = {
  async create(total: number, payment: PaymentMethod) {
    return (await db).runAsync(
      `INSERT INTO ventas (total, metodo_pago, monto_pagado, cambio) VALUES(?, ?, ?, ?)`,
      [total, payment.tipo, payment.monto, payment.cambio || 0]
    );
  },
  // Nuevo: Obtener todas las ventas para el historial
  async getAll() {
    const database = await db;
    return database.getAllAsync<any>(`SELECT * FROM ventas ORDER BY fecha DESC`);
  },

  // Nuevo: Lógica de anulación sincronizada con movimientos
  async cancel(ventaId: number) {
    const database = await db;
    
    // 1. Evitar bucles verificando si ya está anulada
    const sale = await database.getFirstAsync<any>(
      "SELECT estado FROM ventas WHERE id = ?",
      [ventaId]
    );
    if (!sale || sale.estado === "anulado") return;

    // 2. Anular la venta
    await database.runAsync(
      "UPDATE ventas SET estado = 'anulado' WHERE id = ?",
      [ventaId]
    );

    // 3. Devolver stock usando ProductRepository
    const { ProductRepository } = require("./productRepository");
    const details = await database.getAllAsync<any>(
      "SELECT * FROM detalle_ventas WHERE venta_id = ?",
      [ventaId]
    );
    for (const item of details) {
      await ProductRepository.adjustStock(item.product_id, item.cantidad);
    }

    // 4. Anular movimientos asociados
    const { MovementRepository } = require("./movementRepository");
    const movements = await database.getAllAsync<any>(
      "SELECT id FROM movimientos_inventario WHERE venta_id = ?",
      [ventaId]
    );
    for (const m of movements) {
      await MovementRepository.cancel(m.id);
    }
  },
};
