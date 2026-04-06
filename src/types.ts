export interface AppUser {
  id: string;
  uid?: string;
  username: string;
  password: string;
  role: 'admin' | 'staff' | 'kasir';
  displayName: string;
  createdAt: string;
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
