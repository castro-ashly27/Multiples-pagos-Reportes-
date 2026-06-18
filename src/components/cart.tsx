import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { useCartStore } from "../store/cartStore";
import AntDesign from "@expo/vector-icons/AntDesign";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Cart() {
  // const { items, total } = useCartStore();
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.product.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            {item.product.imagen ? (
              <Image source={{ uri: item.product.imagen }} style={styles.itemImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <AntDesign name="picture" size={24} color="#ccc" />
              </View>
            )}
            <View style={styles.itemContent}>
              <View>
                <Text style={styles.name}>{item.product.nombre}</Text>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.priceText}>
                  C$ {item.product.precio.toFixed(2)} x {item.quantity} = C${" "}
                  {(item.product.precio * item.quantity).toFixed(2)}
                </Text>
              <View style={styles.controls}>
                <TouchableOpacity
                  onPress={() =>
                    updateQuantity(item.product.id, item.quantity - 1)
                  }
                >
                  <AntDesign name="minus" size={20} color="red" />
                </TouchableOpacity>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <TouchableOpacity
                  onPress={() =>
                    updateQuantity(item.product.id, item.quantity + 1)
                  }
                >
                  <AntDesign name="plus" size={20} color="green" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginLeft: 10 }}
                  onPress={() => removeItem(item.product.id)}
                >
                  <AntDesign name="delete" size={20} color="red" />
                </TouchableOpacity>
              </View>
              </View>
            </View>
          </View>
        )}
      />
      <Text style={styles.total}>Total: C$ {total.toFixed(2)}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  item: {
    padding: 10,
    backgroundColor: "#f9f9f9",
    marginBottom: 5,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },
  imagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemContent: {
    flex: 1,
  },
  itemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  priceText: {
    flex: 1,
    fontSize: 12,
  },
  name: {
    fontWeight: "bold",
    fontSize: 16,
  },
  quantity: {
    fontSize: 16,
    marginHorizontal: 10,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
  },
  total: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 10,
  },
});
