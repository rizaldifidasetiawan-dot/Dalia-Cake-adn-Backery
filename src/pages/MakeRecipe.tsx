import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Recipe, Ingredient } from '../types';
import { UtensilsCrossed, Calculator, Scale, Info, Search } from 'lucide-react';
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
      <header>
        <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
          <UtensilsCrossed size={32} />
          Buat Resep
        </h1>
        <p className="text-gray-500">Pilih resep dan tentukan jumlah porsi yang ingin dibuat.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recipe Selection Sidebar */}
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-[32px] shadow-sm border border-pink-50 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Search size={20} className="text-primary" />
              Pilih Resep
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Cari resep..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {filteredRecipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => setSelectedRecipeId(recipe.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all border",
                    selectedRecipeId === recipe.id
                      ? "bg-primary text-white border-primary shadow-md"
                      : "bg-gray-50 text-gray-700 border-transparent hover:border-pink-200 hover:bg-pink-50"
                  )}
                >
                  <p className="font-bold">{recipe.name}</p>
                  <p className={cn("text-xs opacity-70", selectedRecipeId === recipe.id ? "text-white" : "text-gray-500")}>
                    {recipe.category} • Yield: {recipe.yield} {recipe.yieldUnit}
                  </p>
                </button>
              ))}
              {filteredRecipes.length === 0 && (
                <p className="text-center text-gray-400 py-4 italic text-sm">Resep tidak ditemukan.</p>
              )}
            </div>
          </section>

          {selectedRecipe && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary text-white p-8 rounded-[32px] shadow-xl space-y-6"
            >
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calculator size={24} />
                Jumlah Adonan
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-70">Jumlah Produksi (Multiplier)</label>
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
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:bg-white/20 transition-all font-bold text-2xl"
                    placeholder="0"
                  />
                </div>
                <div className="pt-4 border-t border-white/20 space-y-2">
                  <div className="flex justify-between text-sm opacity-70">
                    <span>Hasil Akhir</span>
                    <span>{(selectedRecipe.yield * multiplier).toFixed(2)} {selectedRecipe.yieldUnit}</span>
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
                <section className="bg-white p-8 rounded-[32px] shadow-sm border border-pink-50">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-serif font-bold text-primary">{selectedRecipe.name}</h2>
                      <p className="text-gray-500">Daftar bahan baku yang dibutuhkan untuk {multiplier}x resep</p>
                    </div>
                    <div className="bg-pink-50 px-4 py-2 rounded-full border border-pink-100">
                      <span className="text-primary font-bold">{multiplier}x Porsi</span>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-gray-100">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Bahan Baku</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {scaledIngredients.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-700">{item.name}</td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-mono font-bold text-primary">{item.amount.toLocaleString()}</span>
                              <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {selectedRecipe.instructions && (
                  <section className="bg-white p-8 rounded-[32px] shadow-sm border border-pink-50">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Info size={20} className="text-primary" />
                      Instruksi Pembuatan
                    </h3>
                    <div className="prose prose-pink max-w-none">
                      <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {selectedRecipe.instructions}
                      </p>
                    </div>
                  </section>
                )}
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-[32px] border border-dashed border-pink-200">
                <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mb-6">
                  <UtensilsCrossed size={40} className="text-primary opacity-40" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Belum Ada Resep Terpilih</h3>
                <p className="text-gray-500 max-w-xs">Silakan pilih resep dari daftar di samping untuk mulai menghitung kebutuhan bahan.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default MakeRecipe;
