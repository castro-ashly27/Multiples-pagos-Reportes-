import { Alert, Button, StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Switch, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InputField from "../../components/InputFiles";
import { useState, useEffect } from "react";
import { ProductRepository } from "../../database/repositories/productRepository";
import { CategoryRepository } from "../../database/repositories/categoryRepository";
import { router } from "expo-router";
import { BarcodeScanner } from "../../components/BarcodeScanner";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ImageCapture } from "../../components/ImageCapture";

export default function CrearProducto() {
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [imagen, setImagen] = useState("");
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [aplicaImpuesto, setAplicaImpuesto] = useState(true);
  
  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);

  useEffect(() => {
    CategoryRepository.getAll().then(setCategorias);
  }, []);

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
      const isUnique = await ProductRepository.isCodeUnique(codigo);
      if (!isUnique) {
        Alert.alert("Error", "El codigo del producto ya existe.");
        return;
      }

      await ProductRepository.create(
        nombre,
        Number(precio),
        Number(stock),
        codigo,
        categoriaId || undefined,
        imagen || undefined,
        aplicaImpuesto
      );
      Alert.alert("Éxito", "Producto creado exitosamente.");
    } catch (error) {
      Alert.alert("Error", "No se pudo crear el producto.");
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Nuevo Producto</Text>
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
        
        <Text style={styles.label}>Imagen del Producto</Text>
        <View style={styles.imageContainer}>
          {imagen ? (
            <Image source={{ uri: imagen }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="image" size={40} color="#ccc" />
            </View>
          )}
          <TouchableOpacity style={styles.cameraBtn} onPress={() => setIsCameraVisible(true)}>
            <MaterialCommunityIcons name="camera" size={24} color="#fff" />
            <Text style={styles.cameraBtnText}>Tomar Foto</Text>
          </TouchableOpacity>
        </View>

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

      <ImageCapture
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={(uri) => {
          setImagen(uri);
          setIsCameraVisible(false);
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
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
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 15,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBtn: {
    flexDirection: 'row',
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  cameraBtnText: {
    color: '#fff',
    fontWeight: 'bold',
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
