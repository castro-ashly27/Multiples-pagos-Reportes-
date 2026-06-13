import { db } from "./database";

export const runMigrations = async () => {
  const database = await db;
  await database.execAsync(`

    --DROP TABLE empresa


    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      codigo TEXT,
      categoria_id INTEGER,
      imagen TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT,
      direccion TEXT
    );

    CREATE TABLE IF NOT EXISTS empresa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      direccion TEXT,
      logo TEXT,
      aplica_impuesto INTEGER DEFAULT 0,
      porcentaje_impuesto REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP,
      metodo_pago TEXT,
      monto_pagado REAL,
      cambio REAL,
      estado TEXT DEFAULT "activo",
      cliente_id INTEGER,
      impuesto_aplicado REAL DEFAULT 0,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
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

    CREATE TABLE IF NOT EXISTS pagos_venta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      metodo TEXT NOT NULL,
      monto REAL NOT NULL,
      referencia TEXT,
      FOREIGN KEY (venta_id) REFERENCES ventas(id)
    );
  `);

  // Insertar empresa por defecto si no existe
  try {
    const database = await db;
    const empresa = await database.getFirstAsync("SELECT COUNT(*) as count FROM empresa");
    if ((empresa as any).count === 0) {
      await database.runAsync("INSERT INTO empresa (nombre, direccion, logo, aplica_impuesto, porcentaje_impuesto) VALUES ('Mi Empresa', 'Dirección por defecto', '', 0, 0)");
    }
  } catch (e) {
    console.error(e);
  }

  // Intentar agregar nuevas columnas a tablas existentes en caso de que ya estén creadas
  const columnasProductos = [
    "ALTER TABLE productos ADD COLUMN categoria_id INTEGER REFERENCES categorias(id)",
    "ALTER TABLE productos ADD COLUMN imagen TEXT"
  ];
  for (let col of columnasProductos) {
    try { await (await db).runAsync(col); } catch (e) {}
  }

  const columnasVentas = [
    "ALTER TABLE ventas ADD COLUMN cliente_id INTEGER REFERENCES clientes(id)",
    "ALTER TABLE ventas ADD COLUMN impuesto_aplicado REAL DEFAULT 0"
  ];
  for (let col of columnasVentas) {
    try { await (await db).runAsync(col); } catch (e) {}
  }


  // Intentar agregar columnas (ignorar errores si ya existen)
  try {
    await database.runAsync(
      `ALTER TABLE ventas ADD COLUMN estado TEXT DEFAULT 'activo'`
    );
  } catch (e) {
    // La columna ya existe, ignorar
  }

  try {
    await database.runAsync(
      `ALTER TABLE movimientos_inventario ADD COLUMN venta_id INTEGER`
    );
  } catch (e) {
    // La columna ya existe, ignorar
  }

  try {
    await database.runAsync(
      `ALTER TABLE movimientos_inventario ADD COLUMN estado TEXT DEFAULT 'activo'`
    );
  } catch (e) {
    // La columna ya existe, ignorar
  }

  // Agregar aplica_impuesto a productos
  try {
    await database.runAsync(
      `ALTER TABLE productos ADD COLUMN aplica_impuesto INTEGER DEFAULT 1`
    );
  } catch (e) {
    // La columna ya existe, ignorar
  }
};
