import { create } from "zustand";

interface Product {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  codigo: string;
  categoria_id?: number;
  imagen?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
  selectedCustomer: any | null;
  setCustomer: (customer: any) => void;
  addItem: (product: Product, quantity?: number) => void;
  addGenericItem: (nombre: string, precio: number) => void;
  removeItem: (product: number) => void;
  updateQuantity: (producId: number, quantity: number) => void;
  clearCart: () => void;
  calcularTotal: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  selectedCustomer: null,
  setCustomer: (customer) => set({ selectedCustomer: customer }),
  addItem: (product, quantity = 1) => {
    const { items, calcularTotal } = get();

    const existingItem = items.find((item) => item.product.id === product.id);
    // Generic products might have negative IDs, so we can treat them uniquely or just add them.
    // We'll give generic products unique negative IDs so they don't stack unless explicitly matched.
    if (existingItem && product.id >= 0) {
      existingItem.quantity += quantity;
    } else {
      items.push({ product, quantity });
    }

    set({ items: [...items] });
    calcularTotal();
  },
  addGenericItem: (nombre, precio) => {
    const { addItem } = get();
    // Unique negative ID based on timestamp
    const genericProduct: Product = {
      id: -Date.now(),
      nombre,
      precio,
      stock: 9999, // infinite
      codigo: "GENERIC"
    };
    addItem(genericProduct, 1);
  },
  clearCart: () => {
    set({ items: [], total: 0, selectedCustomer: null });
  },

  updateQuantity: (productId, quantity) => {
    const { items, calcularTotal } = get();

    const item = items.find((item) => item.product.id === productId);

    if (item && quantity > 0) {
      item.quantity = quantity;
      set({ items: [...items] });
      calcularTotal();
    }
  },

  removeItem: (productId) => {
    const { items, calcularTotal } = get();
    const updatedItems = items.filter((item) => item.product.id !== productId);
    set({ items: updatedItems });
    calcularTotal();
  },

  calcularTotal: () => {
    const { items } = get();

    const total = items.reduce(
      (sum, item) => sum + item.product.precio * item.quantity,
      0
    );

    set({ total });
  },
}));

