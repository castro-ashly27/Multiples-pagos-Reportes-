# Documentación Técnica: Historial y Anulación Espejo

Este documento explica paso a paso cómo se implementó el sistema de historial de ventas y la sincronización bidireccional (espejo) para las anulaciones en el POS.

## 1. Estructura de la Base de Datos
Para permitir el historial y la vinculación, se actualizaron las tablas en `migrations.ts`:

- **Tabla `ventas`**: Se añadió la columna `estado` (TEXT) con valor por defecto `'activo'`.
- **Tabla `movimientos_inventario`**: 
  - Se añadió `venta_id` (INTEGER) para saber qué movimiento pertenece a qué venta.
  - Se añadió `estado` (TEXT) para permitir la anulación visual del movimiento.

---

## 2. Historial de Ventas (`salesHistory.tsx`)
Se creó una nueva pantalla para listar las ventas realizadas:

1.  **Carga de Datos**: Se utiliza `SaleRepository.getAll()` para obtener las ventas.
2.  **Detalle de Productos**: Por cada venta, se hace una consulta adicional a `SaleDetailRepository.getByVentaId()` para obtener los nombres, cantidades y precios de los productos vendidos.
3.  **Interfaz Unificada**: La tarjeta de venta se diseñó para ser idéntica a la de movimientos, mostrando:
    - ID de Venta y botón de Anular en la cabecera.
    - Lista vertical de productos.
    - Total de la venta destacado.
    - Fecha de la transacción.

---

## 3. Lógica de Anulación Espejo (Bidireccional)
El objetivo es que al anular una venta se anule su inventario, y viceversa, sin caer en un bucle infinito.

### A. Desde la Venta (`SaleRepository.cancel`)
Cuando el usuario anula una venta desde el historial:
1.  **Marca la venta** como `'anulado'`.
2.  **Devuelve el Stock**: Recorre los productos de la venta y usa `ProductRepository.adjustStock` para sumar las cantidades de vuelta al inventario.
3.  **Llamada al Espejo**: Busca todos los registros en `movimientos_inventario` que tengan ese `venta_id` y llama a `MovementRepository.cancel(movimientoId)`.

### B. Desde el Inventario (`MovementRepository.cancel`)
Cuando se anula un movimiento manualmente o por cascada:
1.  **Verificación**: Si el movimiento ya está `'anulado'`, se detiene (esto evita el bucle infinito).
2.  **Marca el movimiento** como `'anulado'`.
3.  **Actualiza la Descripción**: Cambia la descripción a `"Anulación de venta #[id]"` para mayor claridad.
4.  **Llamada al Espejo**: Si el movimiento tiene un `venta_id`, llama a `SaleRepository.cancel(ventaId)`.

---

## 4. Solución a Dependencias Circulares
Como los repositorios de Ventas y Movimientos se necesitan entre sí, se utilizó `require` dentro de las funciones para evitar errores de importación circular en JavaScript/TypeScript:

```typescript
// Dentro de SaleRepository
const { MovementRepository } = require("./movementRepository");

// Dentro de MovementRepository
const { SaleRepository } = require("./saleRepository");
```

---

## 5. Resumen del Flujo de Usuario
1.  **Venta**: Se crea la venta y se guardan los movimientos con el `venta_id`.
2.  **Historial**: El usuario ve la venta y sus productos.
3.  **Anulación**: Al presionar "Anular", el sistema restaura el stock, tacha la venta en el historial y marca como anulados los movimientos en la pantalla de inventario de forma automática.
