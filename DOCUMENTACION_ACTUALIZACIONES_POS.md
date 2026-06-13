# Documentación de Actualizaciones del Sistema POS

En este documento se detallan todas las implementaciones y modificaciones realizadas para cumplir con los requerimientos del sistema de Punto de Venta (POS) y los reportes. Se desglosa cada funcionalidad junto con los archivos que intervinieron y ejemplos del código clave.

---

## 1. Configuración de la Empresa (Impuestos, Logo, Nombre y Dirección)

Se agregó la capacidad de gestionar los datos principales de la empresa (Nombre, Dirección, Logo) y una lógica global de impuestos, donde la empresa define si aplica o no impuestos, y el porcentaje general.

**Archivos Modificados:**
- `src/database/migrations.ts`
- `src/database/repositories/companyRepository.ts`
- `src/app/(tabs)/configuracion.tsx`
- `src/services/printService.ts`
- `src/components/PaymentModal.tsx`

**Código Clave (`src/database/migrations.ts`):**
```sql
CREATE TABLE IF NOT EXISTS empresa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  direccion TEXT,
  logo TEXT,
  aplica_impuesto INTEGER DEFAULT 0,
  porcentaje_impuesto REAL DEFAULT 0
);
```

**Código Clave (`src/app/(tabs)/configuracion.tsx`):**
```tsx
<View style={styles.switchRow}>
  <Text style={styles.label}>Aplicar Impuesto a las ventas</Text>
  <Switch value={aplicaImpuesto} onValueChange={setAplicaImpuesto} />
</View>

{aplicaImpuesto && (
  <View style={{ marginTop: 15 }}>
    <Text style={styles.label}>Porcentaje de Impuesto (%)</Text>
    <TextInput
      value={porcentajeImpuesto}
      onChangeText={setPorcentajeImpuesto}
      keyboardType="numeric"
    />
  </View>
)}
```

---

## 2. Agregar Categorías de Productos

Se implementó el Maestro de Categorías para poder agrupar y organizar los productos del inventario.

**Archivos Modificados:**
- `src/database/migrations.ts`
- `src/database/repositories/categoryRepository.ts`
- `src/app/(tabs)/configuracion.tsx` (Para el CRUD de categorías)
- `src/app/productos/crear.tsx` y `editar.tsx`

**Código Clave (`src/database/migrations.ts`):**
```sql
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL
);

ALTER TABLE productos ADD COLUMN categoria_id INTEGER REFERENCES categorias(id);
```

---

## 3. Agregar Imagen de Productos

Se añadió una columna en la tabla de productos para guardar la URL de la imagen representativa del producto.

**Archivos Modificados:**
- `src/database/migrations.ts`
- `src/database/repositories/productRepository.ts`
- `src/app/productos/crear.tsx` y `editar.tsx`

**Código Clave (`src/app/productos/crear.tsx`):**
```tsx
<Text style={styles.label}>URL de Imagen</Text>
<TextInput
  style={styles.textInput}
  placeholder="https://..."
  value={imagen}
  onChangeText={setImagen}
/>
```

---

## 4. Preview del Producto en el POS

En la pantalla principal de ventas (POS), al interactuar con un producto (o al mantenerlo presionado, dependiendo de la interacción definida), se puede visualizar una tarjeta/modal o vista previa que muestra la información detallada (precio, stock) junto con la imagen del producto.

**Archivos Modificados:**
- `src/app/(tabs)/pos.tsx`
- `src/components/ProductPreviewModal.tsx` (o integrado directo en el grid)

**Código Clave (`src/app/(tabs)/pos.tsx` o Modal):**
```tsx
<Modal visible={previewVisible} transparent={true}>
  <View style={styles.modalOverlay}>
    <View style={styles.previewCard}>
      <Image source={{ uri: selectedProduct.imagen }} style={styles.previewImage} />
      <Text style={styles.previewTitle}>{selectedProduct.nombre}</Text>
      <Text style={styles.previewPrice}>C${selectedProduct.precio}</Text>
      <Text style={styles.previewStock}>Stock disponible: {selectedProduct.stock}</Text>
    </View>
  </View>
</Modal>
```

---

## 5. Agregar Código de Barras para Escanear Producto

Se integró `expo-camera` para permitir escanear los productos tanto en el momento de crear/editar un producto como directamente en el POS para agregarlo al carrito de forma automática.

**Archivos Modificados:**
- `src/components/BarcodeScanner.tsx`
- `src/app/(tabs)/pos.tsx`
- `src/app/productos/crear.tsx` y `editar.tsx`

**Código Clave (`src/components/BarcodeScanner.tsx`):**
```tsx
<CameraView
  style={StyleSheet.absoluteFill}
  facing="back"
  onBarcodeScanned={handleBarcodeScanned}
  barcodeScannerSettings={{
    barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "code128"],
  }}
/>
```

---

## 6. Filtrar por Categoría de Productos en el POS

En la interfaz del POS, se añadió una barra deslizable horizontal (Pills) con las categorías creadas. Al tocar una, el listado inferior se filtra para mostrar únicamente los productos correspondientes.

**Archivos Modificados:**
- `src/app/(tabs)/pos.tsx`

**Código Clave (`src/app/(tabs)/pos.tsx`):**
```tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  <TouchableOpacity onPress={() => setSelectedCategory(null)}>
    <Text>Todos</Text>
  </TouchableOpacity>
  {categorias.map(cat => (
    <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat.id)}>
      <Text>{cat.nombre}</Text>
    </TouchableOpacity>
  ))}
</ScrollView>

// Lógica de filtrado:
const productosFiltrados = selectedCategory 
  ? productos.filter(p => p.categoria_id === selectedCategory)
  : productos;
```

---

## 7. Vender Productos no Registrados (Producto Genérico)

Se implementó la capacidad de realizar ventas rápidas de artículos que no existen en la base de datos de inventario. Esto se logró enviando un producto "ficticio" al carrito global con un ID negativo único y stock infinito.

**Archivos Modificados:**
- `src/store/cartStore.ts`
- `src/app/(tabs)/pos.tsx`

**Código Clave (`src/store/cartStore.ts`):**
```typescript
addGenericItem: (nombre: string, precio: number) => {
  const genericProduct: Product = {
    id: -Date.now(), // ID dinámico negativo para no colisionar con IDs reales
    nombre,
    precio,
    stock: 9999, // Stock infinito
    codigo: "GENERIC",
    aplica_impuesto: true // Por defecto es gravable
  };
  get().addItem(genericProduct, 1);
}
```

---

## 8. Selección del Cliente en el POS

Se incluyó un componente de búsqueda y selección de cliente en el carrito. Esto permite asignar a quién va dirigida la venta, imprimiendo su nombre en el ticket y relacionándolo en la base de datos (clave foránea `cliente_id` en la tabla `ventas`).

**Archivos Modificados:**
- `src/components/CustomerSelect.tsx`
- `src/store/cartStore.ts`
- `src/components/PaymentModal.tsx`

**Código Clave (`src/store/cartStore.ts` y `PaymentModal.tsx`):**
```typescript
// En cartStore.ts
setCustomer: (customer) => set({ selectedCustomer: customer }),

// En PaymentModal.tsx (al confirmar venta)
const resultSale = await SaleRepository.create(
  total, 
  cambio, 
  selectedCustomer?.id, // ID relacional del cliente
  impuestoMonto
);
```
