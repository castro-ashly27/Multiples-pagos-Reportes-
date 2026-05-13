import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCartStore } from "../store/cartStore";
import CustomButton from "./CustomButton";
import { useState } from "react";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { PrintService } from "../services/printService";
import { SaleRepository } from "../database/repositories/saleRepository";
import { saleDetailRepository } from "../database/repositories/saleDetailRepository";
import { MovementRepository } from "../database/repositories/movementRepository";
import { ProductRepository } from "../database/repositories/productRepository";

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PaymentModal({ visible, onClose }: PaymentModalProps) {
  const total = useCartStore((state) => state.total);
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  // Estados de control
  const [ventaExitosa, setVentaExitosa] = useState(false);
  const [idVentaGenerada, setIdVentaGenerada] = useState<number | null>(null);
  const [metodoFinal, setMetodoFinal] = useState("");
  const [pagoFinal, setPagoFinal] = useState(0);
  const [cambioFinal, setCambioFinal] = useState(0);

  const [method, setMethod] = useState<
    "efectivo" | "tarjeta" | "transferencia" | null
  >(null);
  const [amount, setAmount] = useState("");
  const [change, setChange] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleConfirm = async () => {
    if (items.length === 0) {
      alert("No hay productos en el carrito");
      return;
    }
    if (!method) {
      alert("Seleccione un método de pago");
      return;
    }
    let paid: number;
    if (amount.trim() === "") {
      paid = total;
    } else {
      paid = parseFloat(amount);
    }

    if (paid < total) {
      alert("Monto insuficiente");
      return;
    }

    const currentChange = method === "efectivo" ? paid - total : 0;

    try {
      // Proceso de venta interno
      const resultSale = await SaleRepository.create(total, {
        tipo: method,
        monto: paid,
        cambio: currentChange,
      });

      for (const item of items) {
        await MovementRepository.create(
          item.product.id,
          "Venta POS",
          "salida",
          item.quantity,
          resultSale.lastInsertRowId
        );
        await ProductRepository.adjustStock(item.product.id, -item.quantity);
        await saleDetailRepository.create(
          resultSale.lastInsertRowId,
          item.product.id,
          item.quantity,
          item.product.precio
        );
      }

      // Guardar datos para el ticket y cambiar estado
      setMetodoFinal(method);
      setPagoFinal(paid);
      setCambioFinal(currentChange);
      setIdVentaGenerada(resultSale.lastInsertRowId);
      setVentaExitosa(true);
    } catch (error) {
      console.error("Error en la venta:", error);
      alert("No se pudo procesar la venta");
    }
  };

  const handlePrint = async () => {
    if (!idVentaGenerada || isPrinting) return;
    setIsPrinting(true);
    try {
      await PrintService.printTicket(
        {
          id: idVentaGenerada,
          total: total,
          metodoPago: metodoFinal,
          montoPagado: pagoFinal,
          cambio: cambioFinal,
          fecha: new Date().toLocaleString(),
        },
        items
      );
    } catch (error) {
      console.error("Error al imprimir:", error);
      alert("Error al imprimir el ticket");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleFinalizar = () => {
    clearCart();
    setVentaExitosa(false);
    setIdVentaGenerada(null);
    setMethod(null);
    setAmount("");
    setChange(0);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.mainContainer}>
        <Pressable
          style={styles.backButton}
          onPress={() => (ventaExitosa ? handleFinalizar() : onClose())}
        >
          <FontAwesome6 name="arrow-left" size={24} color="black" />
        </Pressable>

        <View style={styles.content}>
          {ventaExitosa ? (
            <View style={styles.successCard}>
              <View style={styles.checkCircle}>
                <FontAwesome6 name="check" size={50} color="#28a745" />
              </View>
              <Text style={styles.successTitle}>¡Venta Procesada!</Text>
              <Text style={styles.ticketText}>Ticket #{idVentaGenerada}</Text>

              <View style={styles.buttonContainer}>
                <CustomButton
                  title="Imprimir Ticket"
                  onPress={handlePrint}
                  iconName="print"
                  style={styles.printButton}
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
              <Text style={styles.amountText}>C${total.toFixed(2)}</Text>
              <Text style={styles.methodLabel}>Métodos de pago</Text>
              <View style={styles.methodsRow}>
                <CustomButton
                  title="Efectivo"
                  onPress={() => setMethod("efectivo")}
                  iconName="money-bill"
                  isSelected={method === "efectivo"}
                />
                <CustomButton
                  title="Tarjeta"
                  onPress={() => setMethod("tarjeta")}
                  iconName="credit-card"
                  isSelected={method === "tarjeta"}
                />
                <CustomButton
                  title="Transferencia"
                  onPress={() => {
                    setMethod("transferencia");
                    setAmount(total.toString());
                  }}
                  iconName="money-bill-transfer"
                  isSelected={method === "transferencia"}
                />
              </View>

              {method === "efectivo" && (
                <TextInput
                  placeholder="Monto pagado"
                  value={amount}
                  onChangeText={(text) => {
                    setAmount(text);
                    setChange(Number(text) - total);
                  }}
                  keyboardType="numeric"
                  style={styles.input}
                />
              )}

              {method === "efectivo" && (
                <Text style={[styles.changeText, change < 0 && { color: "red" }]}>
                  {change < 0 ? `Pendiente: C$${Math.abs(change)}` : `Cambio: C$${change}`}
                </Text>
              )}

              <View style={{ marginTop: 15 }}>
                <CustomButton
                  title="Procesar Venta"
                  onPress={handleConfirm}
                />
              </View>
            </View>
          )}
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
    backgroundColor: "#28a745",
    height: 60,
  },
  finishButton: {
    backgroundColor: "#007bff",
    height: 60,
  },
  paymentSelection: {
    gap: 15,
  },
  amountText: {
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  methodLabel: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  methodsRow: {
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 15,
    borderRadius: 10,
    fontSize: 18,
    backgroundColor: "#fafafa",
  },
  changeText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
});
