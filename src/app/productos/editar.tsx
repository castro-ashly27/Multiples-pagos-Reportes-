import { Alert, Button, StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InputField from "../../components/InputFiles";
import { useEffect, useState } from "react";
import { ProductRepository } from "../../database/repositories/productRepository";
import { CategoryRepository } from "../../database/repositories/categoryRepository";
import { router, useLocalSearchParams } from "expo-router";

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  codigo: string;
  categoria_id?: number;
  imagen?: string;
}

export default function EditarProducto() {
  const { id } = useLocalSearchParams();
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [imagen, setImagen] = useState("");
  
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
        imagen || undefined
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
        }
      }
    };
    loadProducto();
  }, [id]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Editar Producto</Text>
        <InputField
          placeholder="Nombre"
          value={nombre}
          onChangeText={setNombre}
        />
        <InputField
          placeholder="Código"
          value={codigo}
          onChangeText={setCodigo}
        />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: '#333'
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
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
  }
});
