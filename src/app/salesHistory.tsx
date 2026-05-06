import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { SaleRepository } from "../database/repositories/saleRepository";
import { SaleDetailRepository } from "../database/repositories/saleDetailRepository";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

/**
 * Nueva Pantalla: Historial de Ventas
 * Permite visualizar las ventas pasadas y realizar la anulación de las mismas.
 */
export default function SalesHistory() {
  const router = useRouter(); // Nuevo: Para volver atrás
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carga las ventas desde el repositorio
  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await SaleRepository.getAll();

      // Cargar detalles para cada venta
      const salesWithDetails = await Promise.all(
        data.map(async (sale: any) => {
          const details = await SaleDetailRepository.getByVentaId(sale.id);
          return { ...sale, details };
        })
      );

      setSales(salesWithDetails);
    } catch (error) {
      console.error("Error loading sales", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Maneja la lógica de confirmación y ejecución de la anulación
  const handleAnular = (id: number) => {
    Alert.alert(
      "Confirmar Anulación",
      `¿Estás seguro de que deseas anular la venta #${id}? Esta acción no se puede deshacer y restaurará el stock de los productos.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Anular",
          style: "destructive",
          onPress: async () => {
            try {
              await SaleRepository.cancel(id);
              Alert.alert("Éxito", "Venta anulada correctamente");
              loadSales();
            } catch (error: any) {
              Alert.alert("Error", "No se pudo anular la venta: " + error.message);
            }
          },
        },
      ]
    );
  };

  const renderSale = ({ item }: { item: any }) => {
    const isAnulada = item.estado === "anulado";
    return (
      <View style={[styles.saleCard, isAnulada && { opacity: 0.5 }]}>
        {/* 1. Número de la venta (Cabecera) */}
        <View style={styles.header}>
          <Text style={styles.saleId}>Venta #{item.id}</Text>
          <TouchableOpacity
            style={[styles.anularButton, isAnulada && { backgroundColor: "gray" }]}
            onPress={() => !isAnulada && handleAnular(item.id)}
            disabled={isAnulada}
          >
            <Text style={{ color: "white", textAlign: "center", fontSize: 12 }}>
              {isAnulada ? "Anulado" : "Anular"}
            </Text>
          </TouchableOpacity>
        </View>

        {/*2,3,4,5.  Producto, Cantidad y Precio, Fecha  */}
        <View style={styles.productsList}>
          {item.details?.map((detail: any, index: number) => (
            <View key={index} style={{ marginBottom: 6 }}>
              <Text style={{ fontWeight: "bold", fontSize: 15 }}>Producto: {detail.nombre}</Text>
              <Text>Fecha Venta: {new Date(item.fecha).toLocaleString()}</Text>
              <Text>Cantidad: {detail.cantidad}</Text>
              <Text>Precio: C${detail.precio}</Text>

            </View>
          ))}
        </View>


        {/* 6. Total */}
        <Text style={{ fontWeight: "bold", color: "#0ab546", fontSize: 17, marginTop: 4 }}>
          Total: C${item.total?.toFixed(2)}
        </Text>


      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.customHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <FontAwesome6 name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.customHeaderTitle}>Historial de Ventas</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0ab546" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSale}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="receipt" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No hay ventas registradas</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  customHeaderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  listContent: {
    padding: 16,
  },
  saleCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  saleId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  anularButton: {
    backgroundColor: "red",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  productsList: {
    marginTop: 4,
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 120,
  },
  emptyText: {
    fontSize: 18,
    color: "#adb5bd",
    marginTop: 20,
    fontWeight: '600'
  },
});
