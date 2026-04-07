import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Recipe, Ingredient } from '../types';
import { UtensilsCrossed, Calculator, Scale, Info, Search, ChefHat } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const MakeRecipe: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [multiplierInput, setMultiplierInput] = useState<string>('1');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const multiplier = parseFloat(multiplierInput) || 0;

  useEffect(() => {
    const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching recipes:", error);
      setLoading(false);
    });

    const unsubIngredients = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      setIngredients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient)));
    }, (error) => {
      console.error("Error fetching ingredients:", error);
    });

    return () => {
      unsubRecipes();
      unsubIngredients();
    };
  }, []);

  const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateScaledIngredients = () => {
    if (!selectedRecipe) return [];
    return selectedRecipe.ingredients.map(ri => {
      const ing = ingredients.find(i => i.id === ri.ingredientId);
      const scaledAmount = ri.amount * multiplier;
      return {
        name: ing?.name || 'Unknown Ingredient',
        amount: scaledAmount,
        unit: ing?.unit || ''
      };
    });
  };

  const scaledIngredients = calculateScaledIngredients();

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
            <UtensilsCrossed size={32} />
            Buat Resep
          </h1>
          <p className="text-stone-500 text-sm">Pilih resep dan tentukan jumlah porsi yang ingin dibuat untuk melihat kebutuhan bahan baku.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recipe Selection Sidebar */}
        <div className="space-y-6">
          <section className="pro-card p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-light text-primary rounded-xl">
                <ChefHat size={20} />
              </div>
              <h2 className="text-lg font-serif font-bold text-stone-800">Pilih Resep</h2>
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="text"
                placeholder="Cari resep..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pro-input pl-12 py-3 text-sm"
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {filteredRecipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => setSelectedRecipeId(recipe.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all border group",
                    selectedRecipeId === recipe.id
                      ? "bg-primary text-white border-primary shadow-lg shadow-pink-200/50 translate-x-1"
                      : "bg-stone-50/50 text-stone-700 border-stone-100 hover:border-pink-200 hover:bg-primary-light hover:text-primary"
                  )}
                >
                  <p className="font-bold text-sm leading-tight mb-1">{recipe.name}</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                      selectedRecipeId === recipe.id 
                        ? "bg-white/20 border-white/30 text-white" 
                        : "bg-white border-stone-100 text-stone-400 group-hover:border-pink-100 group-hover:text-primary"
                    )}>
                      {recipe.category}
                    </span>
                    <span className={cn(
                      "text-[8px] font-bold uppercase tracking-widest opacity-60",
                      selectedRecipeId === recipe.id ? "text-white" : "text-stone-400"
                    )}>
                      Yield: {recipe.yield} {recipe.yieldUnit}
                    </span>
                  </div>
                </button>
              ))}
              {filteredRecipes.length === 0 && (
                <div className="py-10 text-center space-y-2">
                  <Search size={32} className="mx-auto text-stone-200" />
                  <p className="text-stone-400 font-serif italic text-xs">Resep tidak ditemukan.</p>
                </div>
              )}
            </div>
          </section>

          {selectedRecipe && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pro-card p-8 bg-stone-900 text-white border-stone-800 space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stone-800 text-primary rounded-xl">
                  <Calculator size={24} />
                </div>
                <h2 className="text-xl font-serif font-bold">Jumlah Adonan</h2>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Multiplier Produksi</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={multiplierInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setMultiplierInput(val);
                        }
                      }}
                      className="w-full px-6 py-5 bg-stone-800 border border-stone-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all font-mono font-bold text-3xl text-primary"
                      placeholder="0"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-sm">
                      x Lipat
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-stone-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Estimasi Hasil Akhir</span>
                    <span className="font-mono font-bold text-lg text-stone-300">
                      {(selectedRecipe.yield * multiplier).toLocaleString()} {selectedRecipe.yieldUnit}
                    </span>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </div>

        {/* Scaled Ingredients Display */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedRecipe ? (
              <motion.div
                key={selectedRecipe.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <section className="pro-card p-8 md:p-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-primary-light text-primary text-[10px] font-bold uppercase tracking-widest rounded-full border border-pink-100">
                          {selectedRecipe.category}
                        </span>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                          {multiplier}x Produksi
                        </span>
                      </div>
                      <h2 className="text-3xl font-serif font-bold text-stone-800">{selectedRecipe.name}</h2>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-primary">
                        <Scale size={24} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Total Bahan Baku</p>
                        <p className="font-bold text-stone-700">{scaledIngredients.length} Macam</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-stone-100">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50/50">
                          <th className="px-8 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Bahan Baku</th>
                          <th className="px-8 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-widest text-right">Kebutuhan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {scaledIngredients.map((item, idx) => (
                          <tr key={idx} className="hover:bg-stone-50/30 transition-colors group">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/30 group-hover:bg-primary transition-colors"></div>
                                <span className="font-bold text-stone-700">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <span className="font-mono font-bold text-lg text-primary">{item.amount.toLocaleString()}</span>
                              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-2">{item.unit}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {selectedRecipe.instructions && (
                  <section className="pro-card p-8 md:p-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-stone-50 text-stone-400 rounded-xl">
                        <Info size={20} />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-stone-800">Instruksi Pembuatan</h3>
                    </div>
                    <div className="p-8 bg-stone-50/50 rounded-[32px] border border-stone-100">
                      <p className="text-stone-600 whitespace-pre-wrap leading-relaxed font-medium">
                        {selectedRecipe.instructions}
                      </p>
                    </div>
                  </section>
                )}
              </motion.div>
            ) : (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 pro-card border-dashed border-stone-200 bg-stone-50/30">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl shadow-stone-200/50 border border-stone-100">
                  <UtensilsCrossed size={48} className="text-primary opacity-20" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-stone-800 mb-3">Belum Ada Resep Terpilih</h3>
                <p className="text-stone-500 max-w-sm leading-relaxed">Silakan pilih resep dari daftar di samping untuk mulai menghitung kebutuhan bahan baku produksi Anda.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default MakeRecipe;
