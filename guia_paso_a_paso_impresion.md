# Guía Paso a Paso: Flujo de Impresión en MBPos

Esta guía explica detalladamente la comunicación entre el **PaymentModal** y el **PrintService** para la generación de tickets.

---

### 1. Preparación en el `PaymentModal.tsx`

Antes de imprimir, el modal captura los datos finales de la venta para asegurar que la información sea precisa.

*   **Paso A: Captura de datos finales**: Cuando la venta es exitosa (`handleConfirm`), guardamos en estados locales el método de pago real usado (`metodoFinal`), cuánto pagó el cliente (`pagoFinal`) y su cambio (`cambioFinal`).
*   **Paso B: El Activador (`handlePrint`)**: Este es el puente que conecta la interfaz con el servicio de impresión.
    ```typescript
    const handlePrint = async () => {
      if (!idVentaGenerada || isPrinting) return; // Evita duplicados
      setIsPrinting(true); // Bloquea el botón
      
      await PrintService.printTicket({
        id: idVentaGenerada,
        total: total,
        metodoPago: metodoFinal,
        montoPagado: pagoFinal,
        cambio: cambioFinal,
        fecha: new Date().toLocaleString(),
      }, items); // 'items' son los productos del carrito
      
      setIsPrinting(false); // Libera el botón
    };
    ```

---

### 2. Ejecución en el `PrintService.ts`

El `PrintService` es el motor encargado de transformar los datos en un documento físico.

*   **Paso C: El "Molde" (HTML)**: El servicio recibe el objeto con los datos y los inserta en una plantilla HTML. Utiliza funciones como `.map()` para generar automáticamente las filas de la tabla de productos basándose en lo que hay en el carrito.
*   **Paso D: La Lógica Condicional**: El HTML es inteligente. Detecta el método de pago:
    - Si es **Efectivo**: Añade las líneas de "Efectivo Recibido" y "Cambio".
    - Si es **Tarjeta/Transferencia**: Añade una línea que especifica el método de pago.
*   **Paso E: El Renderizado Físico**: Se utiliza la librería `expo-print` para generar el PDF:
    - Toma el HTML.
    - Aplica las medidas exactas (80mm x 150mm).
    - Crea el archivo `.pdf` en la memoria temporal.
*   **Paso F: El Menú de Impresión**: Se entrega el archivo al sistema operativo mediante `expo-sharing`, abriendo el menú nativo para seleccionar la impresora o compartir el archivo.

---

### Resumen del Flujo
1.  **Modal**: Recopila datos -> Llama al Servicio.
2.  **Servicio**: Recibe datos -> Crea HTML -> Convierte a PDF.
3.  **Sistema**: Recibe PDF -> Abre ventana de impresión.

Esta arquitectura mantiene el código organizado, separando la interfaz de usuario de la lógica de generación de documentos.
