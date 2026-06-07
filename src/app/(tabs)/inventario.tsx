import { Alert, Button, FlatList, StyleSheet, Text, View } from "react-native";
import { ProductRepository } from "../../database/repositories/productRepository";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useState } from "react";
import { ProductCard } from "../../components/ProductCard";
import { router, useFocusEffect } from "expo-router";
import { SalePaymentRepository } from "../../database/repositories/salePaymentRepository";

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  codigo: string;
}

export default function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([]);
  //const [impuesto, setImpuesto] = useState("0.15");

  const deleteProduct = async (id: number) => {
    Alert.alert(
      "Eliminar Producto",
      "¿Estás seguro de que deseas eliminar este producto?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await ProductRepository.delete(id);
            loadProductos();
          },
        },
      ]
    );
  };

  const loadProductos = async () => {
    const data = (await ProductRepository.getAll()) as Producto[];
    setProductos(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadProductos();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Inventario</Text>
      <Button
        title="Nuevo Producto"
        onPress={() => router.push("/productos/crear")}
      />
      <FlatList
        data={productos}
        keyExtractor={(item: Producto) => item.id.toString()}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onDelete={deleteProduct}
            onEdit={(id) => router.push(`/productos/editar?id=${id}`)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f4f4f4",
    flex: 1,
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
  },
});
