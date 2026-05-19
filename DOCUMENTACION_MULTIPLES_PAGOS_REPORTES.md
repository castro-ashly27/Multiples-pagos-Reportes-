# Documentación Técnica: Reportes, Pagos Múltiples y Formatos de Impresión

Este documento detalla la implementación de tres grandes módulos dentro del sistema MBPos: la capacidad de procesar una venta con múltiples métodos de pago, el sistema avanzado de reportes filtrados por fechas y la integración de diferentes formatos de impresión (Ticket y PDF).

---

## 1. Actualización de la Base de Datos (Esquema y Migraciones)

Para soportar múltiples pagos en una sola venta (por ejemplo, mitad en efectivo y mitad en tarjeta), la estructura original de la tabla `ventas` era insuficiente, ya que solo admitía un método.

### Nueva Tabla: `pagos_venta`

Se creó una nueva tabla para manejar una relación de "uno a muchos" (una venta puede tener varios pagos).

- `venta_id`: Clave foránea vinculada a la venta.
- `metodo`: Tipo de pago (`efectivo`, `tarjeta`, `transferencia`).
- `monto`: Cantidad abonada con ese método.

### Retrocompatibilidad y Migraciones Seguras

En el archivo `migrations.ts` se implementó un mecanismo de `ALTER TABLE` encapsulado en bloques `try...catch`. Esto asegura que si la aplicación se actualiza en el dispositivo de un usuario existente:

1. Sus datos no se borran.
2. Las columnas nuevas (como `estado` en `ventas` o `venta_id` en `movimientos_inventario`) se agregan a las tablas preexistentes automáticamente sin causar errores si ya existían.

---

## 2. Lógica de Pagos Múltiples (`PaymentModal.tsx`)

El flujo de cobro fue rediseñado para permitir pagos acumulativos:

1. **Estado Local:** El modal utiliza un arreglo `pagos` para mantener un historial temporal de los montos abonados antes de procesar la venta.
2. **Cálculo en Tiempo Real:**
   - `pendiente`: Se calcula restando la sumatoria de pagos del total de la venta.
   - `cambio`: Se calcula si la sumatoria de pagos excede el total.
3. **Flujo de Usuario:** El usuario selecciona un método, ingresa el monto parcial y presiona "Agregar". Solo cuando el `pendiente` llega a cero (o es negativo, generando cambio), se habilita el botón "Procesar Venta".
4. **Registro en BD:** Al confirmar, la venta se guarda con su total, y luego se hace una iteración que guarda cada elemento del arreglo `pagos` en la nueva tabla `pagos_venta` usando `SalePaymentRepository`.

---

## 3. Selector de Formatos de Impresión (`printService.ts`)

Una vez procesada la venta, la pantalla de éxito ofrece dos opciones de impresión/exportación, ambas adaptadas para mostrar el desglose de los múltiples pagos.

- **Ticket (80mm):** Formato clásico adaptado para impresoras térmicas. Tiene dimensiones ajustadas (`width: 226` puntos que equivalen a 80mm).
- **Página PDF (Carta):** Formato de factura completa (A4/Carta) con un diseño más limpio, encabezados de negocio y tabla de productos amplia. Ideal para compartir por WhatsApp o Correo.

Ambos formatos iteran sobre el arreglo de pagos para mostrar explícitamente cuánto se pagó con efectivo, cuánto con tarjeta, etc.

---

## 4. Módulo de Reportes de Ventas (`reportes.tsx`)

Se implementó una pestaña de reportes completa con información financiera analítica:

1. **Filtros Dinámicos:** Botones para filtrar rápidamente por "Hoy", "7 Días", "Mes" y un filtro "Custom" (fechas desde/hasta).
2. **Ciclo de Vida (Actualización Automática):** Se sustituyó `useEffect` por `useFocusEffect` de Expo Router. Esto asegura que cada vez que el usuario navega a la pestaña de reportes, la base de datos se consulta de nuevo, mostrando las ventas más recientes al instante sin necesidad de recargar la aplicación.
3. **Resumen y Desglose:** Se crearon consultas SQL nativas (`getReportSummary` en `saleRepository.ts`) que suman los totales y agrupan los ingresos según la tabla `pagos_venta`.
4. **Exportación de Reporte:** El botón superior permite generar un PDF resumen con la tabla de datos y los totales de ese rango de fechas seleccionado.

---

## 5. Continuidad Operativa (Legacy Data)

Uno de los logros más importantes de esta implementación es la **preservación de los datos históricos**.
Las funciones del repositorio (`getReportSummary` y el listado de `salesHistory.tsx`) están programadas para buscar pagos en la nueva tabla `pagos_venta`, pero si no encuentran registros (porque la venta fue hecha en una versión antigua de la app), buscarán en las columnas viejas `metodo_pago` y `monto_pagado` de la tabla `ventas`.

Gracias a esto, el historial de los clientes antiguos sigue renderizándose a la perfección.

---

## 6. Implementación Técnica del Modal de Vista Previa (`PreviewModal.tsx`)

Para ofrecer una experiencia de previsualización inmediata y robusta antes de proceder a la impresión física o digital, se diseñó e integró un flujo de renderizado de documentos compatible al 100% en todas las plataformas (iOS, Android y Web).

### A. Decisiones de Arquitectura e Ingeniería

#### 1. Solución al Crash por Apilamiento de Modales en Android (Absolute Fullscreen Overlay)
* **El Problema:** El sistema operativo Android (a través de React Native) no permite de forma estable apilar dos componentes `<Modal>` nativos simultáneamente. Al abrir la vista previa encima del modal de pago, el segundo modal se ocultaba por debajo, bloqueaba la interacción del usuario o causaba un crash completo de la aplicación.
* **La Solución:** Se eliminó el `<Modal>` nativo en `PreviewModal.tsx`. En su lugar, se estructuró como un **contenedor de posicionamiento absoluto** a pantalla completa:
  ```typescript
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: "#f8f9fa",
  }
  ```
  Este contenedor se monta de forma interna al final del Layout principal de `PaymentModal.tsx`. Al activarse `showPreview`, el componente se despliega instantáneamente al frente de todo el árbol visual de forma nativa y segura.

#### 2. Bypass de Limitación de Archivos PDF en Android WebView (Renderizado mediante HTML Crudo)
* **El Problema:** El motor WebView de Android (basado en Chromium) no cuenta con soporte nativo para abrir archivos PDF locales (`file://...`) de forma directa, mostrando comúnmente recuadros en blanco.
* **La Solución:** En lugar de renderizar el archivo físico `.pdf`, se extrajo la lógica de compilación de HTML en `PrintService`. La vista previa recibe este contenido HTML en crudo (`htmlContent`) y lo renderiza de manera instantánea utilizando el visor web nativo de cada plataforma:
  * **En Web:** Se utiliza un elemento native `<iframe>` con el atributo `srcDoc={htmlContent}`.
  * **En Móvil (iOS/Android):** Se utiliza el componente `<WebView>` de `react-native-webview` cargando el HTML a través de su propiedad de origen: `source={{ html: htmlContent }}`.
  * Esto permite renderizar tipografías monoespaciadas (`Courier`), bordes punteados, colores y tablas estilizadas en menos de 100 milisegundos con total fidelidad visual.

#### 3. Flujo Silencioso de Generación de PDF
* Se reescribieron los métodos de `PrintService` para operar en dos etapas independientes:
  1. **Generación Síncrona de HTML:** Genera el string para pintarse en la previsualización interactiva.
  2. **Compilación Silenciosa de PDF:** Utiliza `Print.printToFileAsync` para crear un archivo físico en caché y retornar su ruta (`pdfUri`) sin activar el diálogo nativo del sistema de manera inmediata.
  3. **Disparador Controlado:** El diálogo nativo de impresión/compartir (`Sharing.shareAsync(pdfUri)`) solo se activa bajo demanda cuando el usuario presiona explícitamente el botón primario de pie de página **"Imprimir / Guardar"**.

---

### B. Coordinación de Archivos y Cambios de Código

La funcionalidad se implementó mediante la sincronización de tres archivos principales:

```
[MBPos App]
  ├── src/services/printService.ts   <-- (Genera HTML y PDF silencioso)
  │
  ├── src/components/PaymentModal.tsx <-- (Orquesta los estados y monta el visor)
  │
  └── src/components/PreviewModal.tsx <-- (Renderiza HTML crudo y ejecuta Sharing)
```

#### 1. Cambios en `src/services/printService.ts`
* Se separó el diseño HTML en métodos públicos síncronos: `getTicketHtml` y `getFullPageHtml`.
* Se refactorizaron `printTicket` y `printFullPage` para ser funciones silenciosas que devuelven la `uri` del archivo en disco.
```typescript
// Ejemplo de ticket físico generado en caché silenciosamente
const { uri } = await Print.printToFileAsync({
  html,
  width: 226, // Equivalente a formato térmico de 80mm
  height: 425,
});
return uri;
```

#### 2. Cambios en `src/components/PaymentModal.tsx`
* **Integración de Estados:** Se agregaron variables de estado para almacenar la ruta del PDF, el HTML compilado y la bandera de visibilidad de la previsualización.
* **Control del Botón de Retroceso:** La flecha de retroceso superior del modal de pagos se oculta condicionalmente mientras el visor está activo para evitar toques fantasmas:
  ```tsx
  {!showPreview && (
    <Pressable style={styles.backButton} onPress={...}>
      <FontAwesome6 name="arrow-left" ... />
    </Pressable>
  )}
  ```
* **Montaje del Overlay:** Se inyectó el componente `<PreviewModal>` al final de su jerarquía visual principal para permitir el apilamiento absoluto sobre Android.
  ```tsx
  <PreviewModal
    visible={showPreview}
    pdfUri={pdfUri}
    htmlContent={previewHtml}
    onClose={() => setShowPreview(false)}
  />
  ```

#### 3. Estructura del Componente `src/components/PreviewModal.tsx`
* **Barra de Navegación Única:** Incluye un botón **"<- Volver"** en la parte superior izquierda que limpia el estado y cierra la vista previa regresando limpiamente al flujo de éxito de la venta para poder seleccionar otros formatos.
* **Pie de Página Optimizado:** Se expandió el botón primario **"Imprimir / Guardar"** al 100% de su ancho, eliminando botones redundantes de cierre en la parte inferior para concentrar toda la atención del usuario en la acción principal.
* **Carga Segura:** Implementa un `ActivityIndicator` nativo para visualizar estados de carga de renderizado del documento Web.

