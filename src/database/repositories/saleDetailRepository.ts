import { db } from "../database";

export const saleDetailRepository = {
  async create(
    venta_id: number,
    product_id: number,
    cantidad: number,
    precio: number
  ) {
    (await db).runAsync(
      `INSERT INTO detalle_ventas(venta_id,product_id, cantidad, precio) VALUES (?,?,?,?)`,
      [venta_id, product_id, cantidad, precio]
    );
  },

  // Nuevo: Obtener detalles de una venta específica con el nombre del producto
  async getByVentaId(ventaId: number) {
    const database = await db;
    return database.getAllAsync<any>(
      `SELECT dv.*, p.nombre 
       FROM detalle_ventas dv 
       JOIN productos p ON p.id = dv.product_id 
       WHERE dv.venta_id = ?`,
      [ventaId]
    );
  },
};

export const SaleDetailRepository = saleDetailRepository;
