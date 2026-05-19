import { db } from "../database";

export const SalePaymentRepository = {
  async create(
    venta_id: number,
    metodo: string,
    monto: number,
    referencia?: string
  ) {
    return (await db).runAsync(
      `INSERT INTO pagos_venta(venta_id, metodo, monto, referencia) VALUES (?,?,?,?)`,
      [venta_id, metodo, monto, referencia || null]
    );
  },

  async getByVentaId(ventaId: number) {
    const database = await db;
    return database.getAllAsync<any>(
      `SELECT * FROM pagos_venta WHERE venta_id = ?`,
      [ventaId]
    );
  },

  async getPaymentsSummary(ventaId: number) {
    const database = await db;
    return database.getAllAsync<any>(
      `SELECT metodo, SUM(monto) as total_monto FROM pagos_venta WHERE venta_id = ? GROUP BY metodo`,
      [ventaId]
    );
  },
};
