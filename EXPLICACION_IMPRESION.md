# Explicación del Flujo de Impresión y Modificación de Tamaños

Este documento explica los dos bloques de código principales encargados de la generación de tickets y PDFs, y sirve como guía para saber dónde hacer modificaciones si necesitas cambiar tamaños, diseños o agregar nueva información en el futuro.

---

## 1. Bloque de Interfaz y Control (`PaymentModal.tsx`)

Este bloque de código vive en el lado de la interfaz de usuario. Se encarga de recopilar la información final y gestionar lo que ocurre cuando el usuario presiona los botones de imprimir.

### `getSaleDataForPrint()`
Esta función "empaqueta" toda la información de la venta actual (ID de venta, total original, la lista de pagos parciales realizados, el cambio a devolver y la fecha). Devuelve un objeto con la estructura estricta de `PrintSaleData`. Esto asegura que el servicio de impresión reciba exactamente los datos que necesita y en el formato correcto.

### `handlePrintTicket()` y `handlePrintPDF()`
Son los eventos que se ejecutan al presionar los botones de imprimir ticket (formato térmico) e imprimir PDF (formato hoja A4/Carta). Ambos siguen exactamente el mismo flujo lógico:
1. **Validación:** Verifican que la venta exista (`idVentaGenerada`) y que no se esté ya procesando una impresión (`isPrinting`), evitando que el usuario genere múltiples documentos si toca el botón muchas veces seguidas.
2. **Obtención del HTML:** Llaman a los métodos síncronos del servicio (`getTicketHtml` o `getFullPageHtml`) para generar el diseño visual en código HTML.
3. **Guardado en Estado (Vista Previa):** Guardan este string HTML en el estado `previewHtml` para que el visor en pantalla pueda renderizarlo.
4. **Generación de Archivo Físico:** Ejecutan las funciones asíncronas (`printTicket` o `printFullPage`) que toman ese HTML y le dicen al sistema operativo que lo convierta en un archivo `.pdf` real en la memoria temporal del celular, devolviendo su ruta (`uri`).
5. **Despliegue del Visor:** Actualizan `showPreview` a `true` para abrir la ventana modal que le muestra el documento al usuario.

---

## 2. Bloque del Motor de Impresión (`PrintService.ts`)

Este archivo es el "cerebro" de la impresión. No le importa la interfaz de usuario; su único trabajo es tomar datos puros, inyectarlos en una plantilla visual (HTML/CSS) y usar la librería `expo-print` para generar el documento físico.

### Interfaces (`PrintSaleData`, `PrintItem`)
Definen las reglas de oro de cómo deben verse los datos que entran a este servicio. Gracias a esto, TypeScript te avisará de un error si intentas imprimir una venta a la que le falte la "fecha" o el "total".

### Generadores de HTML (`getTicketHtml`, `getFullPageHtml`)
Estas funciones retornan un gran bloque de texto que es puramente código HTML y CSS clásico de desarrollo web. 
- Utilizan `venta.pagos.map(...)` para generar filas dinámicas dependiendo de cuántos métodos de pago usó el cliente.
- Utilizan `items.map(...)` para iterar el carrito de compras e imprimir los productos uno por uno.

### Generadores de Archivo PDF (`printTicket`, `printFullPage`, `printSalesReport`)
Toman el texto HTML construido y utilizan `Print.printToFileAsync` de Expo. Es aquí donde ocurre la "magia" de conversión y donde se le dictan a la librería las reglas físicas del documento (como su ancho en píxeles/puntos).

---

## 3. ¿Dónde tocar si te piden modificar el tamaño o el diseño?

Si en el futuro te solicitan cambios, aquí tienes la guía exacta de qué líneas debes ir a alterar:

### Caso A: Cambiar el ancho del Ticket térmico (Ej: de 80mm a 58mm)
Las impresoras térmicas pequeñas usan papel de 58mm. Si debes adaptar el sistema a una de ellas, debes tocar dos lugares en el archivo `PrintService.ts`:

1. **El CSS del HTML (`getTicketHtml`):**
   Busca la etiqueta `<style>` y ajusta las dimensiones de la página y el cuerpo.
   ```css
   @page { size: 58mm 150mm; margin: 0; }
   html, body {
     width: 58mm; /* Antes era 80mm */
     height: 150mm; 
     margin: 0; padding: 0; overflow: hidden;
   }
   ```

2. **La configuración de exportación de Expo (`printTicket`):**
   Cambia el ancho que se le envía a la función `printToFileAsync`.
   ```typescript
   const { uri } = await Print.printToFileAsync({
     html,
     width: 164, // Cambiar 226 (que equivale a 80mm) por 164 (que equivale aprox. a 58mm)
     height: 425,
   });
   ```

### Caso B: El Ticket se corta hacia abajo (Falta altura)
Si el cliente compra muchos productos, un ticket con altura fija se cortará a la mitad. Para solucionar esto:
1. En `getTicketHtml`, busca `height: 150mm;` en el CSS y auméntalo (ej. `250mm`) o elimínalo completamente para probar si la impresora soporta altura dinámica.
2. En `printTicket`, aumenta la propiedad `height: 425` (ej. a `800`) para darle más lienzo vertical a la generación del PDF.

### Caso C: Hacer las letras más grandes o más pequeñas
Todo el estilo visual se maneja mediante CSS tradicional.
- Ve a `PrintService.ts`.
- Busca la función del formato que quieres alterar (`getTicketHtml` o `getFullPageHtml`).
- Dentro de la etiqueta `<style>`, localiza `body { font-size: 12px; }` y modifícalo a tu gusto (ej. `font-size: 14px;`).

### Caso D: Agregar un logo o datos nuevos (Ej: Nombre del Cajero)
1. Primero, agrega la propiedad en la interfaz: `export interface PrintSaleData { ... cajero: string; }`.
2. Ve a `PaymentModal.tsx` y actualiza la función `getSaleDataForPrint()` para que envíe el nombre del cajero: `cajero: "Juan Pérez"`.
3. Vuelve a `PrintService.ts` y en la parte de HTML donde quieras mostrarlo, inyecta la variable: `<div><b>Atendido por:</b> ${venta.cajero}</div>`.
4. Si es una imagen (Logo), simplemente agrega una etiqueta HTML nativa en el string: `<img src="URL_IMAGEN_O_BASE64" style="width: 100%;" />`.
