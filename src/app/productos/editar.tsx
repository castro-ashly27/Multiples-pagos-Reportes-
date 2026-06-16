import { Alert, Button, StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InputField from "../../components/InputFiles";
import { useEffect, useState } from "react";
import { ProductRepository } from "../../database/repositories/productRepository";
import { CategoryRepository } from "../../database/repositories/categoryRepository";
import { router, useLocalSearchParams } from "expo-router";
import { BarcodeScanner } from "../../components/BarcodeScanner";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  codigo: string;
  categoria_id?: number;
  imagen?: string;
  aplica_impuesto?: number | boolean;
}

export default function EditarProducto() {
  const { id } = useLocalSearchParams();
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [imagen, setImagen] = useState("");
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [aplicaImpuesto, setAplicaImpuesto] = useState(true);
  
  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);

  const validar = () => {
    if (!nombre.trim()) {
      Alert.alert("Error", "El nombre es obligatorio.");
      return false;
    }
    if (!precio.trim() || isNaN(Number(precio)) || Number(precio) <= 0) {
      Alert.alert("Error", "El precio debe ser un número mayor que 0.");
      return false;
    }
    if (!stock.trim() || isNaN(Number(stock)) || Number(stock) < 0) {
      Alert.alert(
        "Error",
        "El stock debe ser un número mayor que o igual a 0."
      );
      return false;
    }
    if (!codigo.trim()) {
      Alert.alert("Error", "El codigo es obligatorio.");
      return false;
    }
    return true;
  };

  const guardar = async () => {
    if (!validar()) return;
    try {
      const isUnique = await ProductRepository.isCodeUnique(codigo, Number(id));
      if (!isUnique) {
        Alert.alert("Error", "El codigo del producto ya existe.");
        return;
      }

      await ProductRepository.update(
        Number(id),
        nombre,
        Number(precio),
        Number(stock),
        codigo,
        categoriaId || undefined,
        imagen || undefined,
        aplicaImpuesto
      );
      Alert.alert("Éxito", "Producto actualizado exitosamente.");
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el producto.");
    }
    router.back();
  };

  useEffect(() => {
    const loadProducto = async () => {
      const cats = await CategoryRepository.getAll();
      setCategorias(cats);

      if (id) {
        const producto = (await ProductRepository.getById(
          Number(id)
        )) as Producto;

        if (producto) {
          setNombre(producto.nombre);
          setPrecio(producto.precio.toString());
          setCodigo(producto.codigo || "");
          setStock(producto.stock.toString());
          setImagen(producto.imagen || "");
          setCategoriaId(producto.categoria_id || null);
          setAplicaImpuesto(producto.aplica_impuesto !== undefined ? Boolean(producto.aplica_impuesto) : true);
        }
      }
    };
    loadProducto();
  }, [id]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 10, marginRight: 15, backgroundColor: '#f0f0f0', borderRadius: 25 }}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: "bold" }}>Editar Producto</Text>
        </View>
        <InputField
          placeholder="Nombre"
          value={nombre}
          onChangeText={setNombre}
        />
        <View style={styles.codigoContainer}>
          <View style={{flex: 1}}>
            <InputField
              placeholder="Código"
              value={codigo}
              onChangeText={setCodigo}
            />
          </View>
          <TouchableOpacity style={styles.scanBtn} onPress={() => setIsScannerVisible(true)}>
            <MaterialCommunityIcons name="barcode-scan" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <InputField
          placeholder="Precio"
          value={precio}
          onChangeText={setPrecio}
        />
        <InputField placeholder="Stock" value={stock} onChangeText={setStock} />
        
        <Text style={styles.label}>URL de Imagen</Text>
        <TextInput
          style={styles.textInput}
          placeholder="https://..."
          value={imagen}
          onChangeText={setImagen}
        />

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Aplica Impuesto</Text>
          <Switch value={aplicaImpuesto} onValueChange={setAplicaImpuesto} />
        </View>

        <Text style={styles.label}>Categoría</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catContainer}>
          <TouchableOpacity
            style={[styles.catPill, categoriaId === null && styles.catPillSelected]}
            onPress={() => setCategoriaId(null)}
          >
            <Text style={[styles.catText, categoriaId === null && styles.catTextSelected]}>Ninguna</Text>
          </TouchableOpacity>
          {categorias.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catPill, categoriaId === cat.id && styles.catPillSelected]}
              onPress={() => setCategoriaId(cat.id)}
            >
              <Text style={[styles.catText, categoriaId === cat.id && styles.catTextSelected]}>{cat.nombre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{marginTop: 20}}>
          <Button title="Guardar" onPress={guardar} />
        </View>
      </ScrollView>

      <BarcodeScanner 
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
        onScan={(data) => {
          setCodigo(data);
          setIsScannerVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    color: '#333'
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  catContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  catPill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 20,
    marginRight: 8,
  },
  catPillSelected: {
    backgroundColor: '#007bff',
  },
  catText: {
    color: '#333',
    fontWeight: '500',
  },
  catTextSelected: {
    color: '#fff',
  },
  codigoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanBtn: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  }
});
