import { useState } from 'react';
import { products } from '../data/products';

interface InventoryData {
  [productId: number]: {
    stock: number;
    lowStockThreshold: number;
  };
}

export function useInventory() {
  // Initialize inventory from products data
  const initialInventory: InventoryData = {};
  products.forEach(product => {
    initialInventory[product.id] = {
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
    };
  });

  const [inventory, setInventory] = useState<InventoryData>(initialInventory);

  const updateStock = (productId: number, newStock: number) => {
    setInventory(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        stock: newStock,
      },
    }));
    return true;
  };

  const getProductStock = (productId: number) => {
    return inventory[productId] || { stock: 0, lowStockThreshold: 5 };
  };

  const isLowStock = (productId: number) => {
    const { stock, lowStockThreshold } = getProductStock(productId);
    return stock > 0 && stock <= lowStockThreshold;
  };

  const isOutOfStock = (productId: number) => {
    const { stock } = getProductStock(productId);
    return stock === 0;
  };

  return {
    inventory,
    loading: false,
    updateStock,
    getProductStock,
    isLowStock,
    isOutOfStock,
  };
}