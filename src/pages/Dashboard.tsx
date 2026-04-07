import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Recipe, Ingredient } from '../types';
import { Link } from 'react-router-dom';
import { ChefHat, Scale, ShoppingCart, TrendingUp, Calculator, Banknote } from 'lucide-react';
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
    { name: 'Total Resep', value: recipes.length, icon: ChefHat, color: 'bg-primary-light text-primary' },
    { name: 'Bahan Baku', value: ingredients.length, icon: Scale, color: 'bg-blue-50 text-blue-600' },
    { name: 'Kategori', value: new Set(recipes.map(r => r.category)).size, icon: TrendingUp, color: 'bg-stone-100 text-stone-600' },
  ];

  const quickActions = [
    { name: 'Buat Resep', path: '/make-recipe', icon: ChefHat, desc: 'Produksi batch baru' },
    { name: 'Kalkulasi HPP', path: '/hpp', icon: Calculator, desc: 'Hitung biaya & harga' },
    { name: 'Kasir', path: '/cashier', icon: Banknote, desc: 'Transaksi penjualan' },
  ];

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-serif font-bold text-stone-800">Dashboard</h1>
          <p className="text-stone-500 text-sm font-medium">Selamat datang kembali di sistem manajemen <span className="text-primary font-bold">Dalia Cake & Bakery</span></p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-line shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Sistem Aktif</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="pro-card p-8 flex items-center gap-6 group hover:border-primary/30 hover:shadow-xl hover:shadow-stone-200/50"
          >
            <div className={cn("p-5 rounded-2xl transition-all group-hover:scale-110", stat.color)}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">{stat.name}</p>
              <p className="text-4xl font-mono font-bold text-stone-800 leading-none">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold text-stone-800">Akses Cepat</h2>
          <div className="h-px flex-1 bg-stone-100 mx-6 hidden md:block" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, idx) => (
            <Link
              key={action.name}
              to={action.path}
              className="pro-card p-6 flex items-center gap-5 group hover:border-primary/30 hover:bg-stone-50/50 transition-all"
            >
              <div className="p-4 bg-white rounded-xl border border-stone-100 text-stone-400 group-hover:text-primary group-hover:border-primary/20 transition-all shadow-sm">
                <action.icon size={24} />
              </div>
              <div>
                <p className="font-bold text-stone-800 group-hover:text-primary transition-colors">{action.name}</p>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="pro-card p-10">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-serif font-bold text-stone-800 flex items-center gap-3">
              <div className="p-2 bg-primary-light text-primary rounded-xl">
                <ChefHat size={20} />
              </div>
              Resep Terbaru
            </h2>
            <Link to="/recipes" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Lihat Semua</Link>
          </div>
          <div className="space-y-1">
            {recipes.length === 0 ? (
              <div className="text-center py-20 bg-stone-50/50 rounded-[32px] border-2 border-dashed border-stone-100">
                <ChefHat size={40} className="mx-auto text-stone-200 mb-4" />
                <p className="text-stone-400 text-sm font-medium italic">Belum ada resep yang ditambahkan.</p>
              </div>
            ) : (
              recipes.slice(0, 5).map((recipe) => (
                <Link key={recipe.id} to={`/recipes/${recipe.id}`} className="flex items-center justify-between p-5 rounded-[24px] hover:bg-stone-50 transition-all group border border-transparent hover:border-stone-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-primary-light group-hover:text-primary transition-all font-serif font-bold text-xl">
                      {recipe.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-stone-800 group-hover:text-primary transition-colors">{recipe.name}</p>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">
                        {recipe.category} • Yield: {recipe.yield} {recipe.yieldUnit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-stone-400 bg-stone-100 px-3 py-1 rounded-full uppercase tracking-widest group-hover:bg-primary group-hover:text-white transition-all">
                      {recipe.category}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="pro-card p-10">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-serif font-bold text-stone-800 flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Scale size={20} />
              </div>
              Bahan Baku Termahal
            </h2>
            <Link to="/ingredients" className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">Lihat Semua</Link>
          </div>
          <div className="space-y-1">
            {ingredients.length === 0 ? (
              <div className="text-center py-20 bg-stone-50/50 rounded-[32px] border-2 border-dashed border-stone-100">
                <Scale size={40} className="mx-auto text-stone-200 mb-4" />
                <p className="text-stone-400 text-sm font-medium italic">Belum ada bahan baku.</p>
              </div>
            ) : (
              [...ingredients]
                .sort((a, b) => ((b.price || 0) / (b.baseQuantity || 1)) - ((a.price || 0) / (a.baseQuantity || 1)))
                .slice(0, 5)
                .map((ing) => (
                  <div key={ing.id} className="flex items-center justify-between p-5 rounded-[24px] hover:bg-stone-50 transition-all group border border-transparent hover:border-stone-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all font-serif font-bold text-xl">
                        {ing.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-stone-700 group-hover:text-stone-900 transition-colors">{ing.name}</p>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Stok: {ing.stock || 0} {ing.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-primary text-sm">{formatCurrency(ing.price || 0)}</p>
                      <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">per {ing.baseQuantity} {ing.unit}</p>
                    </div>
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
