import { StyleSheet, Text, View, TouchableOpacity } from "react-native";

interface Movement {
  id: number;
  nombre: string;
  tipo: "entrada" | "salida";
  descripcion: string;
  cantidad: number;
  fecha: string;
  estado: string;
  venta_id?: number | null;
}

interface MovementCardProps {
  item: Movement;
  onAnular?: (id: number) => void;
}

export default function MovementCard({ item, onAnular }: MovementCardProps) {
  const isAnulado = item.estado === "anulado";

  return (
    <View style={[styles.card, isAnulado && { opacity: 0.5 }]}>
      <View style={styles.header}>
        <Text style={styles.name}>{item.nombre}</Text>
        
        <TouchableOpacity
          style={[styles.anularButton, isAnulado && { backgroundColor: "gray" }]}
          onPress={() => !isAnulado && onAnular?.(item.id)}
          disabled={isAnulado}
        >
          <Text style={{ color: "white", textAlign: "center", fontSize: 12 }}>
            {isAnulado ? "Anulado" : "Anular"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text>Tipo: {item.tipo}</Text>
      <Text>Descripcion: {item.descripcion}</Text>
      <Text>Cantidad: {item.cantidad.toString()}</Text>
      <Text>Fecha: {item.fecha}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  name: {
    fontWeight: "bold",
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  anularButton: {
    backgroundColor: "red",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
});
