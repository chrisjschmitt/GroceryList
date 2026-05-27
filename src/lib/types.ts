export interface Store {
  id: string;
  name: string;
  location: string;
}

export interface StorePrice {
  storeId: string;
  storeName: string;
  price: number;
  onSale: boolean;
}

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  checked: boolean;
  prices: StorePrice[];
  bestPrice?: StorePrice;
  createdAt: string;
}

export interface GroceryList {
  items: GroceryItem[];
}

export interface RegularItem {
  id: string;
  category: string;
  name: string;
  selected: boolean;
}
