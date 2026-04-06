import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Recipe, Ingredient } from '../types';
import { ChefHat, Scale, ShoppingCart, TrendingUp } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

const Dashboard: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubRecipes = onSnapshot(
      query(collection(db, 'recipes'), orderBy('createdAt', 'desc'), limit(5)),
      (snapshot) => {
        setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe)));
        setLoading(false);
      },
      (error) => {
        console.error("Recipes snapshot error in Dashboard:", error);
        setLoading(false);
      }
    );

    const unsubIngredients = onSnapshot(
      collection(db, 'ingredients'), 
      (snapshot) => {
        setIngredients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient)));
      },
      (error) => {
        console.error("Ingredients snapshot error in Dashboard:", error);
      }
    );

    return () => {
      unsubRecipes();
      unsubIngredients();
    };
  }, []);

  const stats = [
    { name: 'Total Resep', value: recipes.length, icon: ChefHat, color: 'bg-pink-100 text-pink-600' },
    { name: 'Bahan Baku', value: ingredients.length, icon: Scale, color: 'bg-pink-100 text-pink-600' },
    { name: 'Kategori', value: new Set(recipes.map(r => r.category)).size, icon: TrendingUp, color: 'bg-pink-100 text-pink-600' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-serif font-bold text-primary">Dashboard</h1>
        <p className="text-gray-500">Selamat datang kembali di Dalia Cake & Bakery</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-[32px] shadow-sm border border-pink-50 flex items-center gap-4"
          >
            <div className={cn("p-4 rounded-2xl", stat.color)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white p-8 rounded-[32px] shadow-sm border border-pink-50">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <ChefHat className="text-primary" />
            Resep Terbaru
          </h2>
          <div className="space-y-4">
            {recipes.length === 0 ? (
              <p className="text-gray-400 text-center py-8 italic">Belum ada resep yang ditambahkan.</p>
            ) : (
              recipes.map((recipe) => (
                <div key={recipe.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div>
                    <p className="font-bold text-gray-800">{recipe.name}</p>
                    <p className="text-sm text-gray-500">{recipe.category} • Yield: {recipe.yield} {recipe.yieldUnit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-[#5A5A40] uppercase tracking-wider">Kategori</p>
                    <p className="font-bold text-primary">
                      {recipe.category}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white p-8 rounded-[32px] shadow-sm border border-pink-50">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Scale className="text-primary" />
            Bahan Baku Termahal
          </h2>
          <div className="space-y-4">
            {ingredients.length === 0 ? (
              <p className="text-gray-400 text-center py-8 italic">Belum ada bahan baku.</p>
            ) : (
              [...ingredients]
                .sort((a, b) => ((b.price || 0) / (b.baseQuantity || 1)) - ((a.price || 0) / (a.baseQuantity || 1)))
                .slice(0, 5)
                .map((ing) => (
                  <div key={ing.id} className="flex items-center justify-between p-4 rounded-2xl border border-pink-50">
                    <p className="font-medium text-gray-700">{ing.name}</p>
                    <p className="font-mono font-bold text-primary">{formatCurrency(ing.price || 0)} / {ing.baseQuantity} {ing.unit}</p>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
