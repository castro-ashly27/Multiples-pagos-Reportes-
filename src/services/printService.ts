import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

export interface PrintSaleData {
  id: number;
  total: number;
  metodoPago: string;
  montoPagado?: number;
  cambio?: number;
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
  printTicket: async (venta: PrintSaleData, items: PrintItem[]) => {
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            * {
              box-sizing: border-box;
            }
            @page {
              size: 80mm 150mm;
              margin: 0;
            }
            html, body {
              width: 80mm;
              height: 150mm;
              margin: 0;
              padding: 0;
              overflow: hidden;
            }
            body {
              font-family: 'Courier', monospace;
              padding: 10px;
              font-size: 12px;
              color: #000;
            }
            .center {
              text-align: center;
            }
            .header {
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 5px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th {
              text-align: left;
              border-bottom: 1px dashed #000;
            }
            .total-section {
              margin-top: 10px;
              text-align: right;
            }
            .footer {
              margin-top: 20px;
              font-size: 10px;
            }
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
                  <td style="text-align: right;">$${(
              item.quantity * item.product.precio
            ).toFixed(2)}</td>
                </tr>
              `
        )
        .join("")}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <div class="total-section">
            <div style="font-size: 16px;"><b>TOTAL: $${venta.total.toFixed(
              2
            )}</b></div>
            ${
              venta.metodoPago.toLowerCase() === "efectivo"
                ? `
              <div><b>EFECTIVO:</b> $${(venta.montoPagado || 0).toFixed(2)}</div>
              <div><b>CAMBIO:</b> $${(venta.cambio || 0).toFixed(2)}</div>
            `
                : `<div><b>MÉTODO:</b> ${venta.metodoPago.toUpperCase()}</div>`
            }
          </div>
          
          <div class="divider"></div>
          <div class="center footer">
            ¡Gracias por su compra!
          </div>
          <div style="height: 30px;"></div>
        </body>
      </html>
    `;

    try {
      // Dimensiones especificadas: 80mm (226 pts) 
      const { uri } = await Print.printToFileAsync({
        html,
        width: 226,
        height: 425,
      });

      if (uri) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Imprimir / Compartir Ticket",
          UTI: "com.adobe.pdf",
        });
      }
    } catch (error) {
      console.error("Error al generar el ticket:", error);
      throw error;
    }
  },
};
