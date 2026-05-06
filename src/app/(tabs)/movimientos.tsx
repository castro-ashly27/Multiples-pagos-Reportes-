import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Button, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MovementRepository } from "../../database/repositories/movementRepository";
import MovementCard from "../../components/MovementCard";

interface Movement {
  id: number;
  codigo: string;
  nombre: string;
  tipo: "entrada" | "salida";
  descripcion: string;
  cantidad: number;
  fecha: string;
  estado: string;
}

export default function Movimientos() {
  const [data, setData] = useState<Movement[]>([]);

  const loadData = async () => {
    const movimientos = await MovementRepository.getAll();
    setData(movimientos as Movement[]);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleAnular = (id: number) => {
    Alert.alert(
      "Confirmar Anulación",
      "¿Estás seguro de que deseas anular este movimiento? Si es parte de una venta, la venta completa será anulada.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Anular",
          style: "destructive",
          onPress: async () => {
            try {
              await MovementRepository.cancel(id);
              Alert.alert("Éxito", "Movimiento anulado correctamente");
              loadData();
            } catch (error: any) {
              Alert.alert("Error", "No se pudo anular el movimiento: " + error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Movimientos</Text>
      <Button
        title="Nuevo Movimiento"
        onPress={() => router.push("/movimientos/crear")}
      />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <MovementCard item={item} onAnular={handleAnular} />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
});
