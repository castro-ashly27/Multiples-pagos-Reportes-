import { StyleSheet, View } from "react-native";
import ProductSearch from "../../components/ProductSearch";
import CustomerSelect from "../../components/CustomerSelect";
import { SafeAreaView } from "react-native-safe-area-context";
import Cart from "../../components/cart";
import ProcessSale from "../../components/ProcessSale";

export default function Pos() {
  return (
    <SafeAreaView style={styles.container}>
      <ProductSearch />
      <View style={{ zIndex: 10 }}>
        <CustomerSelect />
      </View>
      <View style={{ flex: 1, zIndex: 1 }}>
        <Cart />
      </View>
      <ProcessSale />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
