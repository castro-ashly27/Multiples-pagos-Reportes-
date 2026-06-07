import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompanyRepository } from '../../database/repositories/companyRepository';
import { CategoryRepository } from '../../database/repositories/categoryRepository';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useFocusEffect } from 'expo-router';

export default function Configuracion() {
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [logo, setLogo] = useState('');
  const [aplicaImpuesto, setAplicaImpuesto] = useState(false);
  const [porcentajeImpuesto, setPorcentajeImpuesto] = useState('0');

  const [categorias, setCategorias] = useState<any[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadCompany();
      loadCategories();
    }, [])
  );

  const loadCompany = async () => {
    const data = await CompanyRepository.get() as any;
    if (data) {
      setNombre(data.nombre || '');
      setDireccion(data.direccion || '');
      setLogo(data.logo || '');
      setAplicaImpuesto(data.aplica_impuesto === 1);
      setPorcentajeImpuesto(data.porcentaje_impuesto?.toString() || '0');
    }
  };

  const loadCategories = async () => {
    const cats = await CategoryRepository.getAll();
    setCategorias(cats);
  };

  const handleSave = async () => {
    try {
      const porcentaje = parseFloat(porcentajeImpuesto);
      if (isNaN(porcentaje) || porcentaje < 0) {
        Alert.alert("Error", "El porcentaje de impuesto no es válido.");
        return;
      }
      
      await CompanyRepository.update(nombre, direccion, logo, aplicaImpuesto, porcentaje);
      Alert.alert("Éxito", "Configuración guardada exitosamente.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo guardar la configuración.");
    }
  };

  const handleAddCategory = async () => {
    if (!nuevaCategoria.trim()) return;
    try {
      await CategoryRepository.create(nuevaCategoria.trim());
      setNuevaCategoria('');
      loadCategories();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo crear la categoría");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await CategoryRepository.delete(id);
      loadCategories();
    } catch (e) {
      Alert.alert("Error", "No se pudo eliminar la categoría");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        >
          <Text style={styles.title}>Configuración del Sistema</Text>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Datos de Empresa</Text>
            <Text style={styles.label}>Nombre de la Empresa</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: Mi Tienda S.A."
            />

            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              value={direccion}
              onChangeText={setDireccion}
              placeholder="Dirección física"
            />

            <Text style={styles.label}>URL del Logo (Opcional)</Text>
            <TextInput
              style={styles.input}
              value={logo}
              onChangeText={setLogo}
              placeholder="https://..."
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Impuestos</Text>
            
            <View style={styles.switchRow}>
              <Text style={styles.label}>Aplicar Impuesto a las ventas</Text>
              <Switch
                value={aplicaImpuesto}
                onValueChange={setAplicaImpuesto}
              />
            </View>

            {aplicaImpuesto && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.label}>Porcentaje de Impuesto (%)</Text>
                <TextInput
                  style={styles.input}
                  value={porcentajeImpuesto}
                  onChangeText={setPorcentajeImpuesto}
                  keyboardType="numeric"
                  placeholder="Ej: 15"
                />
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <FontAwesome6 name="save" size={20} color="#fff" style={{marginRight: 10}} />
            <Text style={styles.saveText}>Guardar Configuración</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Maestro de Categorías</Text>
            <View style={styles.addCatRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 10 }]}
                value={nuevaCategoria}
                onChangeText={setNuevaCategoria}
                placeholder="Nueva Categoría"
              />
              <TouchableOpacity style={styles.addCatBtn} onPress={handleAddCategory}>
                <FontAwesome6 name="plus" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            {categorias.map(cat => (
              <View key={cat.id} style={styles.catItem}>
                <Text style={styles.catName}>{cat.nombre}</Text>
                <TouchableOpacity onPress={() => handleDeleteCategory(cat.id)}>
                  <FontAwesome6 name="trash-can" size={16} color="#dc3545" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#007bff',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fafafa',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  addCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  addCatBtn: {
    backgroundColor: '#007bff',
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  catName: {
    fontSize: 16,
    color: '#333',
  }
});
