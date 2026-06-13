import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface Product {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  codigo: string;
  aplica_impuesto?: number | boolean;
}

interface ProductCardProps {
  product: Product;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
}

export const ProductCard = ({
  product,
  onDelete,
  onEdit,
}: ProductCardProps) => {
  return (
    <View style={styles.card}>
      <View style={{ marginLeft: 10 }}>
        <Text style={styles.name}>{product.nombre}</Text>
        <Text> codigo: {product.codigo}</Text>
        <Text> precio: C${product.precio}</Text>
        <Text> stock: {product.stock}</Text>
        <Text> ID: {product.id}</Text>
        {product.aplica_impuesto ? (
          <Text style={{color: 'green', fontSize: 12}}>+ Impuesto</Text>
        ) : (
          <Text style={{color: 'gray', fontSize: 12}}>Exento</Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onEdit(product.id)}>
          <MaterialIcons name="edit" size={24} color="blue" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(product.id)}>
          <MaterialIcons name="delete" size={24} color="red" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 20,
  },
});
