import React, { useState, useCallback, useRef } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Image,
  Alert
} from "react-native";
import { ProductRepository } from "../database/repositories/productRepository";
import { CategoryRepository } from "../database/repositories/categoryRepository";
import { useCartStore } from "../store/cartStore";
import { useRouter, useFocusEffect } from "expo-router";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { BarcodeScanner } from "./BarcodeScanner";

export interface Product {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  codigo: string;
  categoria_id?: number;
  imagen?: string;
}

export default function ProductSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  // Generic Product state
  const [genericModal, setGenericModal] = useState(false);
  const [genericName, setGenericName] = useState("");
  const [genericPrice, setGenericPrice] = useState("");

  // Preview Modal state
  const [previewModal, setPreviewModal] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [previewQuantity, setPreviewQuantity] = useState(1);

  // Scanner state
  const [isScannerVisible, setIsScannerVisible] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const addGenericItem = useCartStore((state) => state.addGenericItem);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      // If there's an active query, we might want to refresh results but for now it's fine.
    }, [])
  );

  const loadCategories = async () => {
    const cats = await CategoryRepository.getAll();
    setCategories(cats);
  };

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    // We loop to add multiple if the store doesn't support a quantity param directly
    for(let i=0; i<quantity; i++) {
      addItem(product);
    }
    setQuery("");
    setResults([]);
    setSelectedCategory(null);
  };

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim()) {
      const matches = await ProductRepository.search(text.trim());
      const typedMatches = matches as Product[];
      setResults(typedMatches);
    } else {
      setResults([]);
    }
  };

  // Barcode scanner integration (usually hits enter rapidly)
  const handleBarcodeSubmit = async () => {
    if (!query.trim()) return;
    const product = await ProductRepository.getByBarcode(query.trim());
    if (product) {
      setResults([product as Product]);
    } else {
      Alert.alert("Producto no encontrado", "El Producto no existe");
      setResults([]);
    }
  };

  const filterByCategory = async (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    if (categoryId === null) {
      setResults([]);
      setQuery("");
    } else {
      const products = await ProductRepository.getByCategory(categoryId);
      setResults(products as Product[]);
      setQuery("");
    }
  };

  const handleAddGeneric = () => {
    if (!genericName.trim() || !genericPrice.trim()) return;
    const price = parseFloat(genericPrice);
    if (isNaN(price) || price <= 0) return;

    addGenericItem(genericName, price);
    setGenericModal(false);
    setGenericName("");
    setGenericPrice("");
  };

  const showPreview = (product: Product) => {
    setPreviewProduct(product);
    setPreviewQuantity(1);
    setPreviewModal(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topActions}>
        <TouchableOpacity style={styles.genericBtn} onPress={() => setGenericModal(true)}>
          <FontAwesome6 name="plus" size={14} color="#fff" />
          <Text style={styles.genericBtnText}>Producto Genérico</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push("/salesHistory")}
        >
          <FontAwesome6 name="rectangle-list" size={14} color="#555" />
          <Text style={styles.historyText}>Historial de Ventas</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <FontAwesome6 name="magnifying-glass" size={18} color="#666" style={{marginRight: 10}} />
        <TextInput
          style={styles.input}
          placeholder="Buscar producto o escanear..."
          value={query}
          onChangeText={handleSearch}
          onSubmitEditing={handleBarcodeSubmit}
          autoFocus={true} // Good for barcode scanners
        />
        <TouchableOpacity style={styles.scanIconBtn} onPress={() => setIsScannerVisible(true)}>
          <FontAwesome6 name="barcode" size={20} color="#007bff" />
        </TouchableOpacity>
      </View>

      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, nombre: 'Todos' }, ...categories]}
          keyExtractor={(item) => item.id?.toString() || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.categoryPill, selectedCategory === item.id && styles.categoryPillSelected]}
              onPress={() => filterByCategory(item.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === item.id && styles.categoryTextSelected]}>
                {item.nombre}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => showPreview(item)}
            >
              <View style={styles.itemContent}>
                <View style={{flex: 1}}>
                  <Text style={styles.itemCode}>{item.codigo}</Text>
                  <Text style={styles.itemName}>{item.nombre}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemPrice}>C${item.precio.toFixed(2)}</Text>
                  <Text style={styles.itemStock}>Stock: {item.stock}</Text>
                </View>
                <TouchableOpacity style={{marginLeft: 15, padding: 5}} onPress={() => showPreview(item)}>
                  <FontAwesome6 name="eye" size={20} color="#007bff" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          style={styles.list}
        />
      )}

      {/* Generic Product Modal */}
      <Modal visible={genericModal} transparent={true} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Producto Libre</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nombre del producto"
              value={genericName}
              onChangeText={setGenericName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Precio"
              value={genericPrice}
              onChangeText={setGenericPrice}
              keyboardType="numeric"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setGenericModal(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAddGeneric}>
                <Text style={styles.confirmBtnText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Preview Product Modal */}
      <Modal visible={previewModal} transparent={true} animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.previewCard}>
            <TouchableOpacity style={styles.closePreview} onPress={() => setPreviewModal(false)}>
              <FontAwesome6 name="xmark" size={20} color="#333" />
            </TouchableOpacity>
            {previewProduct?.imagen ? (
              <Image source={{ uri: previewProduct.imagen }} style={styles.previewImage} resizeMode="contain" />
            ) : (
              <View style={[styles.previewImage, styles.previewImagePlaceholder]}>
                <FontAwesome6 name="image" size={40} color="#ccc" />
              </View>
            )}
            <Text style={styles.previewName}>{previewProduct?.nombre}</Text>
            <Text style={styles.previewCode}>Código: {previewProduct?.codigo}</Text>
            <Text style={styles.previewPrice}>C${previewProduct?.precio?.toFixed(2)}</Text>
            <Text style={styles.previewStock}>Stock disponible: {previewProduct?.stock}</Text>
            
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                style={styles.qtyBtn} 
                onPress={() => setPreviewQuantity(Math.max(1, previewQuantity - 1))}
              >
                <FontAwesome6 name="minus" size={16} color="#333" />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{previewQuantity}</Text>
              <TouchableOpacity 
                style={styles.qtyBtn} 
                onPress={() => setPreviewQuantity(previewQuantity + 1)}
              >
                <FontAwesome6 name="plus" size={16} color="#333" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.previewAddBtn}
              onPress={() => {
                if (previewProduct) handleAddToCart(previewProduct, previewQuantity);
                setPreviewModal(false);
              }}
            >
              <Text style={styles.previewAddText}>Agregar al carrito</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BarcodeScanner 
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
        onScan={async (data) => {
          setIsScannerVisible(false);
          setQuery(data);
          const product = await ProductRepository.getByBarcode(data);
          if (product) {
            setResults([product as Product]);
            showPreview(product as Product);
          } else {
            Alert.alert("Producto no encontrado", "El Producto no existe");
            setResults([]);
          }
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  genericBtn: {
    flexDirection: "row",
    paddingHorizontal: 12,
    height: 35,
    backgroundColor: "#28a745",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  genericBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  historyButton: {
    flexDirection: "row",
    paddingHorizontal: 12,
    height: 35,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    gap: 8,
  },
  historyText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "600",
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#007bff",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  scanIconBtn: {
    padding: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  categoryContainer: {
    marginBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 20,
    marginRight: 8,
  },
  categoryPillSelected: {
    backgroundColor: '#007bff',
  },
  categoryText: {
    color: '#333',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  list: {
    maxHeight: 250,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#FFF",
    borderRadius: 8,
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemCode: {
    fontSize: 12,
    color: '#666',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
  },
  itemStock: {
    fontSize: 12,
    color: '#666',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelBtn: {
    padding: 12,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
    backgroundColor: '#f8d7da',
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#721c24',
    fontWeight: 'bold',
  },
  confirmBtn: {
    padding: 12,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  previewCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center',
    position: 'relative',
  },
  closePreview: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
    marginBottom: 15,
  },
  previewImagePlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewName: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  previewCode: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  previewPrice: {
    fontSize: 24,
    color: '#28a745',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  previewStock: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  previewAddBtn: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  previewAddText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    padding: 5,
  },
  qtyBtn: {
    backgroundColor: '#e0e0e0',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  }
});
