import { db } from "../database";

export const SaleRepository = {
  async create(total: number, cambio: number = 0, cliente_id?: number, impuesto_aplicado: number = 0) {
    return (await db).runAsync(
      `INSERT INTO ventas (total, cambio, cliente_id, impuesto_aplicado) VALUES(?, ?, ?, ?)`,
      [total, cambio, cliente_id || null, impuesto_aplicado]
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

  async getByDateRange(startDate: string, endDate: string) {
    const database = await db;
    return database.getAllAsync<any>(
      `SELECT * FROM ventas WHERE date(fecha) >= date(?) AND date(fecha) <= date(?) ORDER BY fecha DESC`,
      [startDate, endDate]
    );
  },

  async getReportSummary(startDate: string, endDate: string) {
    const database = await db;
    
    const stats = await database.getFirstAsync<any>(
      `SELECT COUNT(*) as totalVentas, SUM(total) as totalMonto, 
       SUM(CASE WHEN estado = 'anulado' THEN 1 ELSE 0 END) as anuladas 
       FROM ventas 
       WHERE date(fecha) >= date(?) AND date(fecha) <= date(?)`,
      [startDate, endDate]
    );

    const pagos = await database.getAllAsync<any>(
      `SELECT pv.metodo, SUM(pv.monto) as total
       FROM pagos_venta pv
       JOIN ventas v ON pv.venta_id = v.id
       WHERE date(v.fecha) >= date(?) AND date(v.fecha) <= date(?) AND v.estado != 'anulado'
       GROUP BY pv.metodo`,
      [startDate, endDate]
    );

    const pagosLegacy = await database.getAllAsync<any>(
      `SELECT metodo_pago as metodo, SUM(monto_pagado) as total
       FROM ventas
       WHERE date(fecha) >= date(?) AND date(fecha) <= date(?) AND estado != 'anulado' AND metodo_pago IS NOT NULL
       GROUP BY metodo_pago`,
      [startDate, endDate]
    );

    const methodTotals: Record<string, number> = {};
    for (const p of pagos) {
      methodTotals[p.metodo] = (methodTotals[p.metodo] || 0) + p.total;
    }
    for (const p of pagosLegacy) {
      if (p.metodo) {
         methodTotals[p.metodo] = (methodTotals[p.metodo] || 0) + p.total;
      }
    }

    return {
      stats: stats || { totalVentas: 0, totalMonto: 0, anuladas: 0 },
      methodTotals
    };
  },
};
