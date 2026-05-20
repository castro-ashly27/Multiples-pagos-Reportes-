# Documentación de Nuevas Funcionalidades: POS y Reportes

Este documento explica a detalle la implementación técnica de las nuevas características de la aplicación: el soporte para Múltiples Métodos de Pago, el Filtrado de Reportes por Rango de Fechas y el ciclo de vida de la pantalla de reportes mediante useFocusEffect.

## 1. Múltiples Métodos de Pago
Para permitir que una misma venta se pague con diferentes métodos (ej. una parte en efectivo y otra con tarjeta), fue necesario evolucionar la base de datos de una relación "1 a 1" a una relación "1 a Muchos".

### Cambios en la Base de Datos (migrations.ts)
Se eliminó la dependencia exclusiva de la columna metodo_pago en la tabla ventas y se introdujo una nueva tabla dedicada llamada pagos_venta.

```sql
CREATE TABLE IF NOT EXISTS pagos_venta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  metodo TEXT NOT NULL,
  monto REAL NOT NULL,
  referencia TEXT,
  FOREIGN KEY (venta_id) REFERENCES ventas(id)
);
```

> [!NOTE]
> La clave foránea venta_id es el vínculo que permite asociar múltiples registros de esta tabla a una sola transacción en la tabla principal de ventas.

### Lógica de Datos (salePaymentRepository.ts & saleRepository.ts)
- **Nuevo Repositorio (salePaymentRepository.ts):** Se encarga exclusivamente de las operaciones CRUD de los pagos. Las funciones clave son create (para registrar el pago) y getPaymentsSummary (para agrupar y sumar pagos de una misma venta).
- **Adaptación de Reportes (SaleRepository.getReportSummary):** El sistema ahora debe calcular los totales uniendo la información. Se utiliza una consulta SQL con JOIN para relacionar ventas y pagos_venta, sumando el dinero que entró por cada método.

> [!TIP]
> Retrocompatibilidad (Legacy): En getReportSummary notarás que el sistema aún busca información en la vieja columna metodo_pago de la tabla ventas. Esto garantiza que los reportes generados antes de esta actualización sigan calculándose correctamente.

### Lógica de Interfaz y Ajuste de Montos (PaymentModal.tsx)
En el lado visual, cuando un usuario está cobrando y agrega un método de pago, el monto "faltante" (o pendiente) y el "cambio" se ajustan de manera automática y en tiempo real. Esto ocurre en el archivo PaymentModal.tsx mediante las siguientes variables calculadas (derivadas):

```typescript
const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
const pendiente = Math.max(0, total - totalPagado);
const cambio = Math.max(0, totalPagado - total);
```
**¿Cómo funciona?**

- **totalPagado:** Suma todos los montos de la lista de pagos que se van agregando (ej. si agregaste C$100 en Efectivo y C$50 en Tarjeta, el totalPagado es C$150). Se usa un .reduce() de JavaScript para iterar el arreglo de pagos.
- **pendiente:** Toma el total original de la venta y le resta el totalPagado. La función Math.max(0, ...) asegura que si el cliente ya pagó de más, el pendiente no muestre números negativos, sino simplemente 0.
- **cambio:** Hace la operación inversa. Si el totalPagado supera el total original de la venta, muestra cuánto dinero hay que devolver.

Cada vez que el usuario presiona el botón "Agregar" (que ejecuta la función handleAgregarPago), el nuevo pago se empuja al arreglo de estado pagos. Dado que en React los cambios de estado fuerzan una re-renderización, estas tres variables se recalculan al instante y la interfaz se actualiza para mostrar el nuevo monto que falta por pagar.

## 2. Reportes entre Días (Rango de Fechas)
La funcionalidad para visualizar datos entre fechas personalizadas ("Desde" y "Hasta") reside en cómo interactúa SQLite con los formatos de fecha a través del SaleRepository.

Las funciones getByDateRange y getReportSummary reciben los parámetros startDate y endDate. La clave técnica es el uso de la función nativa date() de SQLite:

```sql
WHERE date(fecha) >= date(?) AND date(fecha) <= date(?)
```

> [!IMPORTANT]
> Al envolver la columna fecha con date(), SQLite ignora las horas, minutos y segundos (HH:MM:SS). Esto permite que el operador >= (mayor o igual) y <= (menor o igual) comparen únicamente los días puros (ej. "2024-05-01"), asegurando que todas las transacciones dentro de ese rango de días se incluyan.

### Lógica detrás del Resumen de Ventas (getReportSummary)
El corazón de la pestaña de reportes es esta función. En lugar de traer miles de ventas individuales y sumarlas en la aplicación (lo cual sería lento y consumiría mucha memoria), le delega el trabajo pesado a la base de datos dividiéndolo en 3 bloques principales:

#### 1. Consulta de Estadísticas Generales (stats)

```sql
SELECT COUNT(*) as totalVentas, SUM(total) as totalMonto, 
SUM(CASE WHEN estado = 'anulado' THEN 1 ELSE 0 END) as anuladas
```
Aquí la base de datos cuenta de una sola vez cuántas ventas hubo en ese rango de días, suma el gran total de dinero ingresado, y utiliza un CASE WHEN (un condicional de SQL) para contar exactamente cuántas de esas ventas están marcadas como "anuladas".

#### 2. Consulta de Nuevos Pagos (pagos)

```sql
SELECT pv.metodo, SUM(pv.monto) as total
FROM pagos_venta pv JOIN ventas v ON pv.venta_id = v.id
```
Esta consulta junta la tabla ventas con pagos_venta usando JOIN. Suma todo el dinero ingresado y lo agrupa por método de pago (GROUP BY pv.metodo), descartando las ventas anuladas. Esto es lo que permite que el reporte separe cuánto entró en "efectivo", "tarjeta", etc.

#### 3. Soporte Legacy (Ventas Antiguas)

```sql
SELECT metodo_pago as metodo, SUM(monto_pagado) as total ...
```
Esta consulta hace lo mismo pero apuntando a las columnas viejas (metodo_pago y monto_pagado). Si no estuviera este bloque, las ventas que hiciste antes de instalar esta actualización aparecerían en $0 en tus reportes.

#### 4. Unificación en Javascript

```typescript
const methodTotals: Record<string, number> = {};
for (const p of pagos) { ... }
for (const p of pagosLegacy) { ... }
```
Finalmente, el código de TypeScript crea un objeto vacío methodTotals. Recorre los resultados de los pagos nuevos y los pagos antiguos, sumando y mezclando ambos mundos en un solo lugar. Si había C$50 en efectivo de una venta vieja y C$100 en efectivo de una nueva, el objeto resultará en { efectivo: 150 }.

## 3. Entendiendo useFocusEffect
El siguiente bloque de código en reportes.tsx maneja la "Experiencia de Usuario" (UX) para garantizar que los datos siempre estén frescos al ver la pantalla.

```typescript
useFocusEffect(
  useCallback(() => {
    if (rango === "custom") {
      if (desde && hasta) cargarReporte(desde, hasta);
    } else {
      handleRangoChange(rango);
    }
  }, [rango, desde, hasta])
);
```
**¿Qué hace paso a paso?**
- **useFocusEffect:** Es un hook de navegación provisto por Expo Router (o React Navigation). Ejecuta la función interna cada vez que la pantalla gana foco (es decir, cuando el usuario navega hacia ella).
- **useCallback:** Memoriza la función para optimizar rendimiento. React solo reconstruirá esta función si cambian las dependencias especificadas en el arreglo [rango, desde, hasta].

**Lógica Interna:**
- `if (rango === "custom")`: Si el usuario dejó configurado un filtro manual de fechas, el sistema valida que exista un "desde" y un "hasta". Si es así, auto-ejecuta cargarReporte(desde, hasta).
- `else { handleRangoChange(rango) }`: Si el usuario tiene un rango rápido ("hoy", "semana", "mes"), invoca la función para que recalcule dinámicamente las fechas exactas respecto a la fecha y hora de ese momento y luego actualice la lista.

> [!NOTE]
> Gracias a este bloque, si el usuario navega a la pestaña de ventas, realiza una compra, y vuelve a la pestaña de reportes, la nueva venta aparecerá inmediatamente sin necesidad de pulsar un botón de recarga.

## 4. Guía: Cómo agregar el filtro "3 Días"
Si deseas añadir un nuevo botón para visualizar rápidamente las ventas de los últimos 3 días, realiza las siguientes modificaciones en src/app/(tabs)/reportes.tsx:

### Paso 1: Actualizar el Estado (Línea ~20)
Añade "3dias" a los tipos permitidos de tu estado rango.

```diff
- const [rango, setRango] = useState<"hoy" | "semana" | "mes" | "custom">("hoy");
+ const [rango, setRango] = useState<"hoy" | "3dias" | "semana" | "mes" | "custom">("hoy");
```

### Paso 2: Actualizar la Lógica de Fechas en handleRangoChange (Línea ~50)
Añade una condición para restarle 3 días a la fecha actual si se selecciona este nuevo rango.

```diff
if (nuevoRango === "hoy") {
    d = formatDate(hoy);
+ } else if (nuevoRango === "3dias") {
+   const tresDiasAtras = new Date();
+   tresDiasAtras.setDate(hoy.getDate() - 3);
+   d = formatDate(tresDiasAtras);
  } else if (nuevoRango === "semana") {
```

### Paso 3: Agregar el Botón en la Interfaz (Línea ~114)
En la sección donde se renderizan los botones de rangos (styles.rangoButtons), inserta el nuevo componente TouchableOpacity.

```tsx
<TouchableOpacity
  style={[styles.rangoBtn, rango === "3dias" && styles.rangoBtnActive]}
  onPress={() => setRango("3dias")}
>
  <Text
    style={[
      styles.rangoText,
      rango === "3dias" && styles.rangoTextActive,
    ]}
  >
    3 Días
  </Text>
</TouchableOpacity>
```

> [!TIP]
> Puedes colocar este bloque justo debajo del botón de "Hoy" y encima del botón de "7 Días" para mantener un orden cronológico lógico en la interfaz de usuario.
