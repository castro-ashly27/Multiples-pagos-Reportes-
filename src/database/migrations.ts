import { db } from "./database";

export const runMigrations = async () => {
  (await db).execAsync(`

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      codigo TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP,
      metodo_pago TEXT,
      monto_pagado REAL,
      cambio REAL,
      estado TEXT DEFAULT "activo"
    );

    CREATE TABLE IF NOT EXISTS detalle_ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER,
      product_id INTEGER,
      cantidad INTEGER,
      precio REAL,
      FOREIGN KEY (venta_id) REFERENCES ventas(id),
      FOREIGN KEY (product_id) REFERENCES productos(id)
    );

    CREATE TABLE IF NOT EXISTS movimientos_inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      descripcion TEXT,
      tipo TEXT, 
      cantidad INTEGER,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP,
      venta_id INTEGER, 
      estado TEXT DEFAULT "activo", 
      FOREIGN KEY (product_id) REFERENCES productos(id)
    );
  `);
};
