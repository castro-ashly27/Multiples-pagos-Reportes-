import { Text, View, StyleSheet, TouchableOpacity, Image } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface Product {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  codigo: string;
  imagen?: string;
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
      {product.imagen ? (
        <Image source={{ uri: product.imagen }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <MaterialIcons name="image" size={24} color="#ccc" />
        </View>
      )}
      <View style={styles.info}>
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
  info: {
    flex: 1,
    marginLeft: 10,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: "row",
    gap: 20,
    alignItems: 'center',
  },
});
