import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useCartStore } from "../store/cartStore";
import { MovementRepository } from "../database/repositories/movementRepository";
import { ProductRepository } from "../database/repositories/productRepository";
import PaymentModal from "./PaymentModal";
import { useEffect, useState } from "react";
import CustomButton from "./CustomButton";
import { SaleRepository } from "../database/repositories/saleRepository";
import { saleDetailRepository } from "../database/repositories/saleDetailRepository";
import { PrintService } from "../services/printService";

export default function ProcessSale() {
  const items = useCartStore((state) => state.items);
  const [showPayment, setShowPayment] = useState(false);

  return (
    <View>
      <CustomButton
        onPress={() => setShowPayment(true)}
        disabled={items.length === 0}
        title="Procesar Venta"
        iconName="cart-arrow-down"
      />
      <PaymentModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  processSaleButton: {
    alignSelf: "center",
    backgroundColor: "green",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  processSaleButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  processSaleButtonDisabled: {
    backgroundColor: "gray",
  },
});
