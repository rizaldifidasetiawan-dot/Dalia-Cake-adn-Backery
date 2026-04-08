export interface AppUser {
  id: string;
  uid?: string;
  username: string;
  password: string;
  role: 'admin' | 'staff' | 'kasir' | 'custom';
  displayName: string;
  createdAt: string;
  allowedPages?: string[];
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  price: number;
  baseQuantity: number;
  updatedAt: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  amount: number;
  unit?: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  yield: number;
  yieldUnit: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  otherCosts: number;
  markupPercent: number;
  sellingPrice?: number;
  createdAt: string;
}

export interface ShoppingListRecipe {
  recipeId: string;
  multiplier: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  recipes: ShoppingListRecipe[];
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  action: string;
  details: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface DeviceSession {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  userAgent: string;
  isInstalled: boolean;
  lastActive: string;
  revoked: boolean;
}
