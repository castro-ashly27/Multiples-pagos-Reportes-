# Documentación Técnica - Mejoras del Sistema POS

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Req 1: Configuración de Empresa](#req-1-configuración-de-empresa)
3. [Req 2: Gestión de Productos y Categorías](#req-2-gestión-de-productos-y-categorías)
4. [Req 3: Mejoras en el Módulo POS](#req-3-mejoras-en-el-módulo-pos)
5. [Resumen de Archivos](#resumen-de-archivos)

---

## Arquitectura General

El sistema usa **Expo (React Native)** con las siguientes tecnologías:
- **Base de datos:** `expo-sqlite` (SQLite local)
- **Estado global:** `Zustand` (store del carrito)
- **Impresión/PDF:** `expo-print` + `expo-sharing`
- **Navegación:** `expo-router` (tabs + rutas dinámicas)

### Patrón de diseño
Cada entidad sigue el patrón **Repository**:
```
Base de datos (SQLite)
  └── migrations.ts          → Crea las tablas
  └── repositories/
       ├── companyRepository.ts
       ├── categoryRepository.ts
       ├── customerRepository.ts
       └── productRepository.ts  → Consultas SQL encapsuladas
```

Los componentes de UI consumen los repositorios directamente (sin capa de servicios intermedia), y el estado compartido del carrito se maneja con Zustand.

---

## Req 1: Configuración de Empresa

### 1.1 Migración de Base de Datos

**Archivo:** `src/database/migrations.ts`

Se crearon dos tablas nuevas y un registro por defecto:

```sql
-- Tabla de empresa (configuración global)
CREATE TABLE IF NOT EXISTS empresa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  direccion TEXT,
  logo TEXT,
  aplica_impuesto INTEGER DEFAULT 0,   -- Booleano (0/1)
  porcentaje_impuesto REAL DEFAULT 0   -- Ej: 15.0
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  telefono TEXT,
  direccion TEXT
);
```

Además, se inserta un **registro por defecto** si la tabla está vacía:

```typescript
// Insertar empresa por defecto si no existe
const empresa = await database.getFirstAsync(
  "SELECT COUNT(*) as count FROM empresa"
);
if ((empresa as any).count === 0) {
  await database.runAsync(
    "INSERT INTO empresa (nombre, direccion, logo, aplica_impuesto, porcentaje_impuesto) VALUES ('Mi Empresa', 'Dirección por defecto', '', 0, 0)"
  );
}
```

También se añadieron columnas a `ventas` para vincular el cliente y el impuesto:

```sql
ALTER TABLE ventas ADD COLUMN cliente_id INTEGER REFERENCES clientes(id);
ALTER TABLE ventas ADD COLUMN impuesto_aplicado REAL DEFAULT 0;
```

### 1.2 Repositorio de Empresa

**Archivo creado:** `src/database/repositories/companyRepository.ts`

```typescript
import { db } from "../database";

export const CompanyRepository = {
  async get() {
    const database = await db;
    return database.getFirstAsync(`SELECT * FROM empresa LIMIT 1`);
  },

  async update(
    nombre: string, direccion: string, logo: string,
    aplica_impuesto: boolean, porcentaje_impuesto: number
  ) {
    const database = await db;
    const id = 1;
    const aplica_impuesto_int = aplica_impuesto ? 1 : 0;

    const existing = await database.getFirstAsync(
      `SELECT * FROM empresa WHERE id = ?`, [id]
    );
    if (existing) {
      return database.runAsync(
        `UPDATE empresa SET nombre=?, direccion=?, logo=?,
         aplica_impuesto=?, porcentaje_impuesto=? WHERE id=?`,
        [nombre, direccion, logo, aplica_impuesto_int, porcentaje_impuesto, id]
      );
    } else {
      return database.runAsync(
        `INSERT INTO empresa (nombre, direccion, logo, aplica_impuesto,
         porcentaje_impuesto) VALUES (?, ?, ?, ?, ?)`,
        [nombre, direccion, logo, aplica_impuesto_int, porcentaje_impuesto]
      );
    }
  }
};
```

**Decisión de diseño:** Se asume un solo registro de empresa (`id = 1`). El método `update` hace un *upsert* manual (verifica si existe antes de insertar o actualizar).

### 1.3 Pantalla de Configuración

**Archivo creado:** `src/app/(tabs)/configuracion.tsx`

Esta pantalla tiene 3 secciones en tarjetas separadas:

1. **Datos de Empresa:** Nombre, Dirección, URL del Logo
2. **Impuestos:** Switch (Aplica Impuesto Sí/No) + Porcentaje condicional
3. **Maestro de Categorías:** Crear/Eliminar categorías

Aspectos técnicos clave:
- `useFocusEffect` refresca los datos cada vez que se navega a la pestaña
- `KeyboardAvoidingView` + `ScrollView` con `paddingBottom: 120` resuelve que el teclado tape los inputs
- `keyboardShouldPersistTaps="handled"` permite tocar botones sin que el teclado se cierre

### 1.4 Tab de Navegación

**Archivo modificado:** `src/app/(tabs)/_layout.tsx`

Se añadió la pestaña "Configuración" al layout de tabs:

```tsx
<Tabs.Screen
  name="configuracion"
  options={{
    title: "Configuración",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="settings" size={size} color={color} />
    ),
  }}
/>
```

### 1.5 Impuestos en el PaymentModal

**Archivo modificado:** `src/components/PaymentModal.tsx`

Al abrir el modal de pago, se consulta la configuración de la empresa:

```typescript
const [empresa, setEmpresa] = useState<any>(null);

useEffect(() => {
  if (visible) {
    CompanyRepository.get().then(setEmpresa);
  }
}, [visible]);

// Cálculo dinámico de impuestos
const impuestoMonto = empresa?.aplica_impuesto
  ? subTotal * (empresa.porcentaje_impuesto / 100)
  : 0;
const total = subTotal + impuestoMonto;
```

Al crear la venta se pasa `impuestoMonto` a la BD:

```typescript
const resultSale = await SaleRepository.create(
  total, cambio, selectedCustomer?.id, impuestoMonto
);
```

### 1.6 Empresa e Impuestos en Tickets/PDF

**Archivo modificado:** `src/services/printService.ts`

Se expandió la interfaz `PrintSaleData`:

```typescript
export interface PrintSaleData {
  id: number;
  total: number;
  pagos: { tipo: string; monto: number; referencia?: string }[];
  cambio: number;
  fecha: string;
  subTotal?: number;        // NUEVO
  impuestoMonto?: number;   // NUEVO
  empresa?: any;            // NUEVO
  clienteNombre?: string;   // NUEVO
}
```

En `getTicketHtml()` y `getFullPageHtml()` se reemplazó el texto fijo "MBPos" por el nombre dinámico de la empresa, se añadió la dirección, el desglose de subtotal/impuesto, y el nombre del cliente.

En `printSalesReport()` se añadió el parámetro `empresa?` para mostrar el nombre de la empresa en la cabecera del reporte PDF.

---

## Req 2: Gestión de Productos y Categorías

### 2.1 Tabla de Categorías

**En la migración** (`migrations.ts`):

```sql
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL
);
```

### 2.2 Repositorio de Categorías

**Archivo creado:** `src/database/repositories/categoryRepository.ts`

```typescript
import { db } from "../database";

export const CategoryRepository = {
  async getAll() {
    const database = await db;
    return database.getAllAsync(`SELECT * FROM categorias`);
  },
  async create(nombre: string) {
    const database = await db;
    return database.runAsync(
      `INSERT INTO categorias (nombre) VALUES (?)`, [nombre]
    );
  },
  async update(id: number, nombre: string) {
    const database = await db;
    return database.runAsync(
      `UPDATE categorias SET nombre = ? WHERE id = ?`, [nombre, id]
    );
  },
  async delete(id: number) {
    const database = await db;
    return database.runAsync(`DELETE FROM categorias WHERE id = ?`, [id]);
  }
};
```

### 2.3 Columnas nuevas en Productos

**En la migración**, la tabla `productos` ahora incluye:

```sql
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  precio REAL NOT NULL,
  stock INTEGER DEFAULT 0,
  codigo TEXT,               -- Código de barras (string)
  categoria_id INTEGER,      -- FK a categorias
  imagen TEXT,               -- URL de imagen
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);
```

Para bases de datos existentes, se ejecutan `ALTER TABLE` dentro de try/catch:

```typescript
const columnasProductos = [
  "ALTER TABLE productos ADD COLUMN categoria_id INTEGER REFERENCES categorias(id)",
  "ALTER TABLE productos ADD COLUMN imagen TEXT"
];
for (let col of columnasProductos) {
  try { await (await db).runAsync(col); } catch (e) {}
}
```

### 2.4 Repositorio de Productos ampliado

**Archivo modificado:** `src/database/repositories/productRepository.ts`

Métodos nuevos añadidos:

```typescript
// Buscar productos por categoría
async getByCategory(categoria_id: number) {
  const database = await db;
  return database.getAllAsync(
    `SELECT * FROM productos WHERE categoria_id = ?`, [categoria_id]
  );
},

// Buscar por código de barras exacto
async getByBarcode(codigo: string) {
  const database = await db;
  return database.getFirstAsync(
    `SELECT * FROM productos WHERE codigo = ?`, [codigo]
  );
},
```

Los métodos `create()` y `update()` se ampliaron para aceptar `categoria_id` e `imagen`:

```typescript
async create(nombre, precio, stock, codigo, categoria_id?, imagen?) {
  // ...
  `INSERT INTO productos (nombre, precio, stock, codigo, categoria_id, imagen)
   VALUES(?, ?, ?, ?, ?, ?)`,
  [nombre, precio, stock, codigo, categoria_id || null, imagen || null]
},
```

### 2.5 Formularios de Crear/Editar Producto

**Archivos modificados:**
- `src/app/productos/crear.tsx`
- `src/app/productos/editar.tsx`

Ambos formularios ahora incluyen:
- **Campo de URL de imagen** (`TextInput` simple)
- **Selector de categoría** (barra horizontal de "pills" con scroll)

```tsx
<Text style={styles.label}>URL de Imagen</Text>
<TextInput
  style={styles.textInput}
  placeholder="https://..."
  value={imagen}
  onChangeText={setImagen}
/>

<Text style={styles.label}>Categoría</Text>
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  <TouchableOpacity
    style={[styles.catPill, categoriaId === null && styles.catPillSelected]}
    onPress={() => setCategoriaId(null)}
  >
    <Text>Ninguna</Text>
  </TouchableOpacity>
  {categorias.map(cat => (
    <TouchableOpacity
      key={cat.id}
      style={[styles.catPill, categoriaId === cat.id && styles.catPillSelected]}
      onPress={() => setCategoriaId(cat.id)}
    >
      <Text>{cat.nombre}</Text>
    </TouchableOpacity>
  ))}
</ScrollView>
```

---

## Req 3: Mejoras en el Módulo POS

Todas estas mejoras se implementaron en `src/components/ProductSearch.tsx`.

### 3.1 Filtro por Categoría

Se añadió una **barra horizontal de categorías** (pills) debajo del buscador:

```tsx
<FlatList
  horizontal
  data={[{ id: null, nombre: 'Todos' }, ...categories]}
  renderItem={({ item }) => (
    <TouchableOpacity
      style={[styles.categoryPill,
        selectedCategory === item.id && styles.categoryPillSelected]}
      onPress={() => filterByCategory(item.id)}
    >
      <Text>{item.nombre}</Text>
    </TouchableOpacity>
  )}
/>
```

La función `filterByCategory` consulta `ProductRepository.getByCategory()`:

```typescript
const filterByCategory = async (categoryId: number | null) => {
  setSelectedCategory(categoryId);
  if (categoryId === null) {
    setResults([]);
    setQuery("");
  } else {
    const products = await ProductRepository.getByCategory(categoryId);
    setResults(products as Product[]);
  }
};
```

### 3.2 Preview de Producto

Se creó un **Modal de Vista Previa** que se activa con `onLongPress` o con un icono de ojo:

```tsx
{/* Cada item del listado */}
<TouchableOpacity
  onPress={() => handleAddToCart(item)}
  onLongPress={() => showPreview(item)}
>
  {/* ... info del producto ... */}
  <TouchableOpacity onPress={() => showPreview(item)}>
    <FontAwesome6 name="eye" size={20} color="#007bff" />
  </TouchableOpacity>
</TouchableOpacity>

{/* Modal de preview */}
<Modal visible={previewModal} transparent animationType="slide">
  <View style={styles.modalBg}>
    <View style={styles.previewCard}>
      {previewProduct?.imagen ? (
        <Image source={{ uri: previewProduct.imagen }}
               style={styles.previewImage} resizeMode="contain" />
      ) : (
        <View style={[styles.previewImage, styles.previewImagePlaceholder]}>
          <FontAwesome6 name="image" size={40} color="#ccc" />
        </View>
      )}
      <Text>{previewProduct?.nombre}</Text>
      <Text>Código: {previewProduct?.codigo}</Text>
      <Text>C${previewProduct?.precio?.toFixed(2)}</Text>
      <Text>Stock: {previewProduct?.stock}</Text>
      <TouchableOpacity onPress={() => {
        if (previewProduct) handleAddToCart(previewProduct);
        setPreviewModal(false);
      }}>
        <Text>Agregar al carrito</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```

### 3.3 Escáner de Código de Barras

Se implementaron dos mecanismos:

**a) Detección automática mientras se escribe:**

```typescript
const handleSearch = async (text: string) => {
  setQuery(text);
  if (text.trim()) {
    const matches = await ProductRepository.search(text.trim());
    const typedMatches = matches as Product[];
    setResults(typedMatches);

    // Si hay coincidencia exacta con un código → agregar automáticamente
    if (typedMatches.length === 1 && typedMatches[0].codigo === text.trim()) {
      handleAddToCart(typedMatches[0]);
    }
  }
};
```

**b) Búsqueda exacta al presionar Enter (onSubmitEditing):**

```typescript
const handleBarcodeSubmit = async () => {
  if (!query.trim()) return;
  const product = await ProductRepository.getByBarcode(query.trim());
  if (product) {
    handleAddToCart(product as Product);
  }
};
```

El input tiene `autoFocus={true}` para que los escáneres Bluetooth/USB escriban directamente.

### 3.4 Producto Genérico (No Registrado)

**Botón en la UI** que abre un modal para digitar nombre y precio:

```tsx
<TouchableOpacity onPress={() => setGenericModal(true)}>
  <FontAwesome6 name="plus" size={14} color="#fff" />
  <Text>Producto Genérico</Text>
</TouchableOpacity>
```

**Modal con inputs de nombre y precio:**

```typescript
const handleAddGeneric = () => {
  if (!genericName.trim() || !genericPrice.trim()) return;
  const price = parseFloat(genericPrice);
  if (isNaN(price) || price <= 0) return;

  addGenericItem(genericName, price);
  setGenericModal(false);
  setGenericName("");
  setGenericPrice("");
};
```

**En el Store (Zustand)** se generan IDs negativos para diferenciarlos de productos reales:

```typescript
// src/store/cartStore.ts
addGenericItem: (nombre, precio) => {
  const { addItem } = get();
  const genericProduct: Product = {
    id: -Date.now(),      // ID negativo único
    nombre,
    precio,
    stock: 9999,
    codigo: "GENERIC"
  };
  addItem(genericProduct, 1);
},
```

En el `PaymentModal`, los productos genéricos (id < 0) no descuentan stock:

```typescript
if (item.product.id >= 0) {
  await ProductRepository.adjustStock(item.product.id, -item.quantity);
}
```

### 3.5 Selección de Cliente

**Archivo creado:** `src/components/CustomerSelect.tsx`

**Repositorio creado:** `src/database/repositories/customerRepository.ts`

```typescript
export const CustomerRepository = {
  async getAll() { /* SELECT * FROM clientes */ },
  async search(term: string) {
    // Busca por nombre O teléfono con LIKE
  },
  async create(nombre, telefono = "", direccion = "") {
    // INSERT INTO clientes
  }
};
```

El componente `CustomerSelect` ofrece:
- **Buscador** con resultados en dropdown flotante
- **Creación al vuelo**: Si no hay resultados, muestra botón "Crear cliente X"
- **Indicador visual**: Cuando hay cliente seleccionado, muestra una barra verde

```tsx
{selectedCustomer ? (
  <View style={styles.selectedContainer}>
    <FontAwesome6 name="user-check" size={16} color="#28a745" />
    <Text>Cliente: {selectedCustomer.nombre}</Text>
    <TouchableOpacity onPress={handleClear}>
      <FontAwesome6 name="xmark" size={16} color="#dc3545" />
    </TouchableOpacity>
  </View>
) : (
  <TextInput placeholder="Buscar Cliente (Opcional)" ... />
)}
```

**En el Store**, se añadió estado para el cliente:

```typescript
// cartStore.ts
selectedCustomer: null,
setCustomer: (customer) => set({ selectedCustomer: customer }),
clearCart: () => set({ items: [], total: 0, selectedCustomer: null }),
```

---

## Resumen de Archivos

### Archivos CREADOS (nuevos)

| Archivo | Propósito |
|---|---|
| `src/database/repositories/companyRepository.ts` | CRUD de configuración de empresa |
| `src/database/repositories/categoryRepository.ts` | CRUD de categorías de productos |
| `src/database/repositories/customerRepository.ts` | Búsqueda y creación de clientes |
| `src/app/(tabs)/configuracion.tsx` | Pantalla de configuración (empresa + impuestos + categorías) |
| `src/components/CustomerSelect.tsx` | Componente de selección de cliente en el POS |

### Archivos MODIFICADOS

| Archivo | Cambios realizados |
|---|---|
| `src/database/migrations.ts` | Tablas `empresa`, `categorias`, `clientes`; columnas `categoria_id`, `imagen` en productos; columnas `cliente_id`, `impuesto_aplicado` en ventas |
| `src/database/repositories/productRepository.ts` | Métodos `getByCategory()`, `getByBarcode()`; parámetros `categoria_id` e `imagen` en `create()` y `update()` |
| `src/store/cartStore.ts` | Estado `selectedCustomer`, acción `setCustomer`, acción `addGenericItem` con IDs negativos |
| `src/components/ProductSearch.tsx` | Barra de categorías, barra de búsqueda con icono de barcode, modal de preview, modal de producto genérico, botón de ojo, `useFocusEffect` |
| `src/components/PaymentModal.tsx` | Carga de empresa, cálculo de impuestos dinámico, paso de `subTotal`/`impuestoMonto`/`empresa`/`clienteNombre` al servicio de impresión |
| `src/services/printService.ts` | Interfaz `PrintSaleData` expandida; nombre de empresa, dirección, desglose de impuestos y nombre de cliente en tickets y facturas; parámetro `empresa` en `printSalesReport` |
| `src/app/(tabs)/_layout.tsx` | Tab "Configuración" añadido |
| `src/app/(tabs)/reportes.tsx` | Import de `CompanyRepository`, paso de empresa a `printSalesReport` |
| `src/app/productos/crear.tsx` | Campo de imagen URL + selector de categoría |
| `src/app/productos/editar.tsx` | Campo de imagen URL + selector de categoría |

---

## Diagrama de Flujo de una Venta

```
1. Usuario abre POS
2. (Opcional) Selecciona cliente → CustomerSelect → cartStore.setCustomer()
3. Busca productos por texto/código/categoría → ProductSearch
4. Agrega al carrito → cartStore.addItem()
5. (Opcional) Agrega producto genérico → cartStore.addGenericItem()
6. Abre PaymentModal
7. Modal consulta CompanyRepository.get() → calcula impuestos
8. Usuario registra pagos (efectivo/tarjeta/transferencia)
9. Se crea la venta en BD con total + impuesto + cliente_id
10. Se generan movimientos de inventario + detalles de venta
11. Se genera ticket/PDF con datos dinámicos de empresa/cliente/impuestos
```
