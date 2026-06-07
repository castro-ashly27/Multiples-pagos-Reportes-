import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { CustomerRepository } from '../database/repositories/customerRepository';
import { useCartStore } from '../store/cartStore';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

export default function CustomerSelect() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const selectedCustomer = useCartStore((state) => state.selectedCustomer);
  const setCustomer = useCartStore((state) => state.setCustomer);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length > 0) {
      const matches = await CustomerRepository.search(text.trim());
      setResults(matches);
      setIsSearching(true);
    } else {
      setResults([]);
      setIsSearching(false);
    }
  };

  const handleSelect = (customer: any) => {
    setCustomer(customer);
    setQuery('');
    setResults([]);
    setIsSearching(false);
  };

  const handleClear = () => {
    setCustomer(null);
  };

  const handleCreateCustomer = async () => {
    if (!query.trim()) return;
    try {
      const result = await CustomerRepository.create(query.trim(), '', '');
      handleSelect({ id: result.lastInsertRowId, nombre: query.trim() });
    } catch (e) {
      Alert.alert("Error", "No se pudo crear el cliente");
    }
  };

  return (
    <View style={styles.container}>
      {selectedCustomer ? (
        <View style={styles.selectedContainer}>
          <FontAwesome6 name="user-check" size={16} color="#28a745" />
          <Text style={styles.selectedText}>Cliente: {selectedCustomer.nombre}</Text>
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <FontAwesome6 name="xmark" size={16} color="#dc3545" />
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={styles.inputContainer}>
            <FontAwesome6 name="user" size={16} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Buscar Cliente (Opcional)"
              value={query}
              onChangeText={handleSearch}
            />
          </View>
          {isSearching && (
            <View style={styles.list}>
              {results.length > 0 ? (
                <FlatList
                  data={results}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
                      <Text style={styles.itemText}>{item.nombre}</Text>
                      {item.telefono && <Text style={styles.subText}>{item.telefono}</Text>}
                    </TouchableOpacity>
                  )}
                />
              ) : (
                <TouchableOpacity style={styles.createBtn} onPress={handleCreateCustomer}>
                  <FontAwesome6 name="plus" size={14} color="#007bff" />
                  <Text style={styles.createBtnText}>Crear cliente "{query}"</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    zIndex: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
  },
  list: {
    maxHeight: 150,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginTop: 5,
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    fontWeight: 'bold',
  },
  subText: {
    fontSize: 12,
    color: '#666',
  },
  createBtn: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createBtnText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  selectedText: {
    flex: 1,
    marginLeft: 10,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  clearBtn: {
    padding: 5,
  }
});
