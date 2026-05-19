import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export interface PrintSaleData {
  id: number;
  total: number;
  pagos: { tipo: string; monto: number; referencia?: string }[];
  cambio: number;
  fecha: string;
}

export interface PrintItem {
  product: {
    nombre: string;
    precio: number;
  };
  quantity: number;
}

export const PrintService = {
  // Generar HTML del Ticket (para la vista previa interna y para la generación de archivo)
  getTicketHtml: (venta: PrintSaleData, items: PrintItem[]): string => {
    const pagosHtml = venta.pagos
      .map(
        (p) =>
          `<div><b>${p.tipo.toUpperCase()}:</b> C$${p.monto.toFixed(2)}</div>`
      )
      .join("");

    const totalPagado = venta.pagos.reduce((sum, p) => sum + p.monto, 0);

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            * { box-sizing: border-box; }
            @page { size: 80mm 150mm; margin: 0; }
            html, body {
              width: 80mm; height: 150mm; margin: 0; padding: 0; overflow: hidden;
            }
            body { font-family: 'Courier', monospace; padding: 10px; font-size: 12px; color: #000; }
            .center { text-align: center; }
            .header { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; border-bottom: 1px dashed #000; }
            .total-section { margin-top: 10px; text-align: right; }
            .footer { margin-top: 20px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="center header">MBPos</div>
          <div class="center">Ticket de Venta</div>
          <div class="divider"></div>
          <div><b>ID Venta:</b> #${venta.id}</div>
          <div><b>Fecha:</b> ${venta.fecha}</div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Cant</th>
                <th style="width: 55%">Producto</th>
                <th style="width: 30%; text-align: right;">Subt</th>
              </tr>
            </thead>
            <tbody>
              ${items
        .map(
          (item) => `
                <tr>
                  <td>${item.quantity}</td>
                  <td>${item.product.nombre}</td>
                  <td style="text-align: right;">C$${(item.quantity * item.product.precio).toFixed(2)}</td>
                </tr>
              `
        )
        .join("")}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="total-section">
            <div style="font-size: 16px;"><b>TOTAL: C$${venta.total.toFixed(2)}</b></div>
            <div class="divider"></div>
            ${pagosHtml}
            <div><b>TOTAL PAGADO:</b> C$${totalPagado.toFixed(2)}</div>
            ${venta.cambio > 0 ? `<div><b>CAMBIO:</b> C$${venta.cambio.toFixed(2)}</div>` : ""}
          </div>
          <div class="divider"></div>
          <div class="center footer">¡Gracias por su compra!</div>
          <div style="height: 30px;"></div>
        </body>
      </html>
    `;
  },

  // Ticket formato 80mm
  printTicket: async (venta: PrintSaleData, items: PrintItem[]) => {
    const html = PrintService.getTicketHtml(venta, items);

    try {
      const { uri } = await Print.printToFileAsync({
        html,
        width: 226, // 80mm
        height: 425,
      });

      return uri;
    } catch (error) {
      console.error("Error al generar el ticket:", error);
      throw error;
    }
  },

  // Generar HTML del formato Carta (para la vista previa interna y para la generación de archivo)
  getFullPageHtml: (venta: PrintSaleData, items: PrintItem[]): string => {
    const pagosHtml = venta.pagos
      .map(
        (p) =>
          `<tr><td>${p.tipo.toUpperCase()}</td><td style="text-align:right;">C$${p.monto.toFixed(2)}</td></tr>`
      )
      .join("");

    const totalPagado = venta.pagos.reduce((sum, p) => sum + p.monto, 0);

    return `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; }
            .header h1 { margin: 0; font-size: 32px; color: #007bff; }
            .header p { margin: 5px 0; color: #777; }
            .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .details div { font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f8f9fa; text-align: left; padding: 12px; border-bottom: 2px solid #ddd; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .totals { width: 300px; float: right; margin-bottom: 30px; }
            .totals table th { background: transparent; border: none; padding: 5px; }
            .totals table td { border: none; padding: 5px; font-weight: bold; }
            .totals table .grand-total td { font-size: 18px; color: #28a745; border-top: 2px solid #ddd; padding-top: 10px; }
            .footer { clear: both; text-align: center; margin-top: 50px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>MBPos</h1>
            <p>Factura de Venta</p>
          </div>
          <div class="details">
            <div>
              <b>Factura #:</b> ${venta.id}<br/>
              <b>Fecha:</b> ${venta.fecha}
            </div>
            <div style="text-align: right;">
              <b>Cliente:</b> Público en General
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio Unitario</th>
                <th>Cantidad</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items
        .map(
          (item) => `
                <tr>
                  <td>${item.product.nombre}</td>
                  <td>C$${item.product.precio.toFixed(2)}</td>
                  <td>${item.quantity}</td>
                  <td style="text-align: right;">C$${(item.quantity * item.product.precio).toFixed(2)}</td>
                </tr>
              `
        )
        .join("")}
            </tbody>
          </table>
          
          <div class="totals">
            <table>
              <tr class="grand-total">
                <td>TOTAL:</td>
                <td style="text-align: right;">C$${venta.total.toFixed(2)}</td>
              </tr>
              <tr><td colspan="2"><hr/></td></tr>
              ${pagosHtml}
              <tr>
                <td>TOTAL PAGADO:</td>
                <td style="text-align: right;">C$${totalPagado.toFixed(2)}</td>
              </tr>
              ${venta.cambio > 0
        ? `
              <tr>
                <td>CAMBIO:</td>
                <td style="text-align: right; color: #dc3545;">C$${venta.cambio.toFixed(2)}</td>
              </tr>`
        : ""
      }
            </table>
          </div>
          
          <div class="footer">
            <p>Este documento es una representación impresa de la venta.</p>
            <p>¡Gracias por su preferencia!</p>
          </div>
        </body>
      </html>
    `;
  },

  // Página PDF (Carta)
  printFullPage: async (venta: PrintSaleData, items: PrintItem[]) => {
    const html = PrintService.getFullPageHtml(venta, items);

    try {
      const { uri } = await Print.printToFileAsync({ html });
      return uri;
    } catch (error) {
      console.error("Error al generar PDF:", error);
      throw error;
    }
  },

  // Reporte de Ventas
  printSalesReport: async (
    ventas: any[],
    resumen: any,
    rango: { desde: string; hasta: string }
  ) => {
    const metodosHtml = Object.entries(resumen.methodTotals)
      .map(
        ([metodo, total]: any) =>
          `<tr><td>${metodo.toUpperCase()}</td><td style="text-align:right;">C$${total.toFixed(2)}</td></tr>`
      )
      .join("");

    const ventasHtml = ventas
      .map(
        (v) => `
      <tr style="${v.estado === "anulado" ? "color: red; text-decoration: line-through;" : ""}">
        <td>#${v.id}</td>
        <td>${new Date(v.fecha).toLocaleString()}</td>
        <td>${v.estado}</td>
        <td style="text-align:right;">C$${v.total.toFixed(2)}</td>
      </tr>
    `
      )
      .join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { text-align: center; color: #0ab546; }
            .header-info { text-align: center; margin-bottom: 30px; color: #555; }
            .summary-cards { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 15px; }
            .card { background: #f8f9fa; padding: 15px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #ddd; }
            .card h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
            .card p { margin: 0; font-size: 20px; font-weight: bold; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
            th { background-color: #eee; text-align: left; padding: 10px; border: 1px solid #ccc; }
            td { padding: 10px; border: 1px solid #ccc; }
            .two-cols { display: flex; gap: 30px; }
            .col { flex: 1; }
          </style>
        </head>
        <body>
          <h1>Reporte de Ventas</h1>
          <div class="header-info">
            <p>Período: <b>${rango.desde}</b> al <b>${rango.hasta}</b></p>
          </div>
          
          <div class="summary-cards">
            <div class="card">
              <h3>Ingreso Total</h3>
              <p style="color: #0ab546;">C$${resumen.stats.totalMonto?.toFixed(2) || "0.00"}</p>
            </div>
            <div class="card">
              <h3>Total Ventas</h3>
              <p>${resumen.stats.totalVentas}</p>
            </div>
            <div class="card">
              <h3>Anuladas</h3>
              <p style="color: #dc3545;">${resumen.stats.anuladas}</p>
            </div>
          </div>

          <div class="two-cols">
            <div class="col" style="flex: 0.4;">
              <h3>Ingresos por Método</h3>
              <table>
                <thead>
                  <tr><th>Método</th><th style="text-align:right;">Monto</th></tr>
                </thead>
                <tbody>
                  ${metodosHtml || '<tr><td colspan="2" style="text-align:center;">Sin datos</td></tr>'}
                </tbody>
              </table>
            </div>
            
            <div class="col">
              <h3>Detalle de Ventas</h3>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th style="text-align:right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${ventasHtml || '<tr><td colspan="4" style="text-align:center;">No hay ventas en este período</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (uri) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Compartir Reporte",
          UTI: "com.adobe.pdf",
        });
      }
    } catch (error) {
      console.error("Error al generar reporte PDF:", error);
      throw error;
    }
  },
};
