// Simple cart store using localStorage

export interface CartItem {
  id: number;
  name: string;
  price: string;
  image?: string;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

const CART_KEY = 'mycosci_cart';

export function getCart(): Cart {
  if (typeof window === 'undefined') {
    return { items: [], total: 0 };
  }

  try {
    const stored = localStorage.getItem(CART_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading cart:', e);
  }

  return { items: [], total: 0 };
}

function saveCart(cart: Cart): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: cart }));
  } catch (e) {
    console.error('Error saving cart:', e);
  }
}

function parsePrice(price: string): number {
  // Handle prices like "$12.99", "12.99", "$1,234.56"
  const cleaned = price.replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    return sum + (parsePrice(item.price) * item.quantity);
  }, 0);
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity: number = 1): Cart {
  const cart = getCart();

  const existingIndex = cart.items.findIndex(i => i.id === item.id);

  if (existingIndex >= 0) {
    cart.items[existingIndex].quantity += quantity;
  } else {
    cart.items.push({ ...item, quantity });
  }

  cart.total = calculateTotal(cart.items);
  saveCart(cart);

  return cart;
}

export function removeFromCart(itemId: number): Cart {
  const cart = getCart();
  cart.items = cart.items.filter(item => item.id !== itemId);
  cart.total = calculateTotal(cart.items);
  saveCart(cart);
  return cart;
}

export function updateQuantity(itemId: number, quantity: number): Cart {
  const cart = getCart();

  if (quantity <= 0) {
    return removeFromCart(itemId);
  }

  const item = cart.items.find(i => i.id === itemId);
  if (item) {
    item.quantity = quantity;
    cart.total = calculateTotal(cart.items);
    saveCart(cart);
  }

  return cart;
}

export function clearCart(): Cart {
  const cart = { items: [], total: 0 };
  saveCart(cart);
  return cart;
}

export function getCartCount(): number {
  const cart = getCart();
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}
