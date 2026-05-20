import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  Alert,
  Platform,
} from "react-native";
import { useCartStore } from "../store/cartStore";
import CustomButton from "./CustomButton";
import { useState } from "react";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { PrintService, PrintSaleData } from "../services/printService";
import { SaleRepository } from "../database/repositories/saleRepository";
import { saleDetailRepository } from "../database/repositories/saleDetailRepository";
import { MovementRepository } from "../database/repositories/movementRepository";
import { ProductRepository } from "../database/repositories/productRepository";
import { SalePaymentRepository } from "../database/repositories/salePaymentRepository";
import { WebView } from "react-native-webview";
import PreviewModal from "./PreviewModal";

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
}

interface PaymentEntry {
  tipo: "efectivo" | "tarjeta" | "transferencia";
  monto: number;
}

export default function PaymentModal({ visible, onClose }: PaymentModalProps) {
  const total = useCartStore((state) => state.total);
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  // Estados de control general
  const [ventaExitosa, setVentaExitosa] = useState(false);
  const [idVentaGenerada, setIdVentaGenerada] = useState<number | null>(null);

  // Estados de vista previa
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Estado de múltiples pagos
  const [pagos, setPagos] = useState<PaymentEntry[]>([]);
  const [method, setMethod] = useState<
    "efectivo" | "tarjeta" | "transferencia" | null
  >(null);
  const [amountInput, setAmountInput] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
  const pendiente = Math.max(0, total - totalPagado);
  const cambio = Math.max(0, totalPagado - total);

  // Función para agregar un pago parcial o total
  const handleAgregarPago = () => {
    if (!method) {
      Alert.alert("Error", "Seleccione un método de pago");
      return;
    }
    const monto = parseFloat(amountInput);
    if (isNaN(monto) || monto <= 0) {
      Alert.alert("Error", "Ingrese un monto válido");
      return;
    }

    // Validación de exceso de pago al usar múltiples métodos o métodos que no son solo efectivo
    const isOnlyEfectivo = pagos.length === 0 && method === "efectivo";
    if (!isOnlyEfectivo && monto > pendiente) {
      Alert.alert(
        "Error",
        `El monto no puede exceder el saldo pendiente (C$${pendiente.toFixed(2)}) al usar múltiples métodos de pago o un método diferente a efectivo.`
      );
      return;
    }

    // Agregar el pago a la lista
    setPagos([...pagos, { tipo: method, monto }]);

    // Resetear selección actual (el botón seguirá iluminado si está en la lista de pagos)
    setMethod(null);
    setAmountInput("");
  };

  const handleEliminarPago = (index: number) => {
    setPagos(pagos.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (items.length === 0) {
      Alert.alert("Error", "No hay productos en el carrito");
      return;
    }
    if (totalPagado < total) {
      Alert.alert("Error", "El monto pagado no cubre el total de la venta");
      return;
    }

    try {
      // 1. Crear venta (con el cambio si hubo)
      const resultSale = await SaleRepository.create(total, cambio);
      const ventaId = resultSale.lastInsertRowId;

      // 2. Registrar los pagos múltiples
      for (const pago of pagos) {
        await SalePaymentRepository.create(ventaId, pago.tipo, pago.monto);
      }

      // 3. Registrar movimientos e inventario
      for (const item of items) {
        await MovementRepository.create(
          item.product.id,
          "Venta POS",
          "salida",
          item.quantity,
          ventaId
        );
        await ProductRepository.adjustStock(item.product.id, -item.quantity);
        await saleDetailRepository.create(
          ventaId,
          item.product.id,
          item.quantity,
          item.product.precio
        );
      }

      setIdVentaGenerada(ventaId);
      setVentaExitosa(true);
    } catch (error) {
      console.error("Error en la venta:", error);
      Alert.alert("Error", "No se pudo procesar la venta");
    }
  };

  const getSaleDataForPrint = (): PrintSaleData => ({
    id: idVentaGenerada!,
    total: total,
    pagos: pagos,
    cambio: cambio,
    fecha: new Date().toLocaleString(),
  });

  const handlePrintTicket = async () => {
    if (!idVentaGenerada || isPrinting) return;
    setIsPrinting(true);
    try {
      const html = PrintService.getTicketHtml(getSaleDataForPrint(), items);
      setPreviewHtml(html);
      const uri = await PrintService.printTicket(getSaleDataForPrint(), items);
      setPdfUri(uri);
      setShowPreview(true);
    } catch (error) {
      console.error("Error al generar ticket:", error);
      Alert.alert("Error", "Error al generar la vista previa del ticket");
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintPDF = async () => {
    if (!idVentaGenerada || isPrinting) return;
    setIsPrinting(true);
    try {
      const html = PrintService.getFullPageHtml(getSaleDataForPrint(), items);
      setPreviewHtml(html);
      const uri = await PrintService.printFullPage(getSaleDataForPrint(), items);
      setPdfUri(uri);
      setShowPreview(true);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      Alert.alert("Error", "Error al generar la vista previa del PDF");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleFinalizar = () => {
    clearCart();
    setVentaExitosa(false);
    setIdVentaGenerada(null);
    setPagos([]);
    setMethod(null);
    setAmountInput("");
    setPdfUri(null);
    setPreviewHtml(null);
    setShowPreview(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.mainContainer}>
        {!showPreview && (
          <Pressable
            style={styles.backButton}
            onPress={() => (ventaExitosa ? handleFinalizar() : onClose())}
          >
            <FontAwesome6 name="arrow-left" size={24} color="black" />
          </Pressable>
        )}

        <View style={styles.content}>
          {ventaExitosa ? (
            <View style={styles.successCard}>
              <View style={styles.checkCircle}>
                <FontAwesome6 name="check" size={50} color="#28a745" />
              </View>
              <Text style={styles.successTitle}>¡Venta Procesada!</Text>
              <Text style={styles.ticketText}>Venta #{idVentaGenerada}</Text>

              <View style={styles.buttonContainer}>
                <CustomButton
                  title="Ticket"
                  onPress={handlePrintTicket}
                  iconName="receipt"
                  style={styles.printButton}
                  direction="row"
                  iconSize={18}
                  disabled={isPrinting}
                />
                <CustomButton
                  title="Página PDF (Carta)"
                  onPress={handlePrintPDF}
                  iconName="file-pdf"
                  style={styles.pdfButton}
                  direction="row"
                  iconSize={18}
                  disabled={isPrinting}
                />
                <CustomButton
                  title="Nueva Venta"
                  onPress={handleFinalizar}
                  iconName="cart-plus"
                  style={styles.finishButton}
                  direction="row"
                  iconSize={18}
                />
              </View>
            </View>
          ) : (
            <View style={styles.paymentSelection}>
              <Text style={styles.amountText}>Total: C${total.toFixed(2)}</Text>
              {pendiente > 0 && (
                <Text style={styles.pendienteText}>
                  Falta: C${pendiente.toFixed(2)}
                </Text>
              )}
              {cambio > 0 && (
                <Text style={styles.cambioText}>
                  Cambio: C${cambio.toFixed(2)}
                </Text>
              )}

              <Text style={styles.methodLabel}>Métodos de pago</Text>

              {/* Pagos Realizados */}
              {pagos.length > 0 && (
                <View style={styles.pagosList}>
                  {pagos.map((p, index) => (
                    <View key={index} style={styles.pagoItem}>
                      <Text style={styles.pagoItemText}>
                        {p.tipo.toUpperCase()} - C${p.monto.toFixed(2)}
                      </Text>
                      <Pressable onPress={() => handleEliminarPago(index)}>
                        <FontAwesome6 name="trash-can" size={18} color="red" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Controles para agregar nuevo pago si falta monto */}
              {pendiente > 0 && (
                <>
                  <View style={styles.methodsRow}>
                    <CustomButton
                      title="Efectivo"
                      onPress={() => {
                        setMethod("efectivo");
                        setAmountInput(pendiente.toString());
                      }}
                      iconName="money-bill"
                      isSelected={method === "efectivo" || pagos.some((p) => p.tipo === "efectivo")}
                      style={styles.methodBtn}
                    />
                    <CustomButton
                      title="Tarjeta"
                      onPress={() => {
                        setMethod("tarjeta");
                        setAmountInput(pendiente.toString());
                      }}
                      iconName="credit-card"
                      isSelected={method === "tarjeta" || pagos.some((p) => p.tipo === "tarjeta")}
                      style={styles.methodBtn}
                    />
                    <CustomButton
                      title="Transferencia"
                      onPress={() => {
                        setMethod("transferencia");
                        setAmountInput(pendiente.toString());
                      }}
                      iconName="money-bill-transfer"
                      isSelected={method === "transferencia" || pagos.some((p) => p.tipo === "transferencia")}
                      style={styles.methodBtn}
                    />
                  </View>

                  {method && (
                    <View style={styles.addPagoRow}>
                      <TextInput
                        placeholder="Monto"
                        value={amountInput}
                        onChangeText={setAmountInput}
                        keyboardType="numeric"
                        style={styles.input}
                      />
                      <Pressable
                        style={styles.addBtn}
                        onPress={handleAgregarPago}
                      >
                        <FontAwesome6 name="plus" size={18} color="white" />
                        <Text
                          style={{
                            color: "white",
                            fontWeight: "bold",
                            marginLeft: 8,
                          }}
                        >
                          Agregar
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}

              <View style={{ marginTop: 25 }}>
                <CustomButton
                  title="Procesar Venta"
                  onPress={handleConfirm}
                  disabled={pendiente > 0}
                  style={
                    pendiente > 0 ? { backgroundColor: "#ccc" } : undefined
                  }
                />
              </View>
            </View>
          )}
          <PreviewModal
            visible={showPreview}
            pdfUri={pdfUri}
            htmlContent={previewHtml}
            onClose={() => setShowPreview(false)}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 20,
    marginTop: 10,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  successCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  checkCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: "#28a745",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  ticketText: {
    fontSize: 20,
    color: "#777",
    marginBottom: 30,
  },
  buttonContainer: {
    width: "100%",
    gap: 15,
  },
  printButton: {
    backgroundColor: "#17a2b8",
    padding: 15,
  },
  pdfButton: {
    backgroundColor: "#28a745",
    padding: 15,
  },
  finishButton: {
    backgroundColor: "#007bff",
    padding: 15,
  },
  paymentSelection: {
    gap: 15,
  },
  amountText: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  pendienteText: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#dc3545",
  },
  cambioText: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#28a745",
  },
  methodLabel: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 5,
  },
  methodsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  methodBtn: {
    flex: 1,
    padding: 10,
  },
  pagosList: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 10,
  },
  pagoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#eee",
  },
  pagoItemText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  addPagoRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  input: {
    flex: 2,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    fontSize: 18,
    backgroundColor: "#fafafa",
  },
  addBtn: {
    flex: 1,
    backgroundColor: "#ffc107",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  previewContainer: {
    width: "100%",
    height: 220,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 15,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  webViewStyle: {
    flex: 1,
    width: "100%",
  },
});
