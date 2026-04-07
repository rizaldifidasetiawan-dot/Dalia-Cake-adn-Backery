import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { Recipe, Ingredient } from '../types';
import { Calculator, Plus, Trash2, Search, Info, ChefHat } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SelectedRecipeItem {
  recipeId: string;
  multiplier: number;
}

const HPP: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [packingCost, setPackingCost] = useState<number>(0);
  const [profitPercentage, setProfitPercentage] = useState<number>(30);
  const [totalUnit, setTotalUnit] = useState<number>(1);
  const [expandedRecipes, setExpandedRecipes] = useState<string[]>([]);
  const [tempValues, setTempValues] = useState<Record<string, string>>({});

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

  const addRecipe = (recipeId: string) => {
    if (selectedRecipes.some(item => item.recipeId === recipeId)) return;
    setSelectedRecipes(prev => [...prev, { recipeId, multiplier: 1 }]);
  };

  const removeRecipe = (recipeId: string) => {
    setSelectedRecipes(prev => prev.filter(item => item.recipeId !== recipeId));
  };

  const updateMultiplier = (recipeId: string, multiplier: number) => {
    setSelectedRecipes(prev => prev.map(item => 
      item.recipeId === recipeId ? { ...item, multiplier: Math.max(0, multiplier) } : item
    ));
  };

  const updateSellingPrice = async (recipeId: string, price: number) => {
    try {
      await updateDoc(doc(db, 'recipes', recipeId), {
        sellingPrice: price
      });
    } catch (error) {
      console.error("Error updating selling price:", error);
    }
  };

  const calculateRecipeHPP = (recipe: Recipe) => {
    const ingredientCost = recipe.ingredients.reduce((total, ri) => {
      const ing = ingredients.find(i => i.id === ri.ingredientId);
      if (ing) {
        let pricePerUnit = (ing.price || 0) / (ing.baseQuantity || 1);
        
        // Handle unit conversion if necessary
        const recipeUnit = ri.unit || ing.unit;
        if (ing.unit === 'kg' && recipeUnit === 'gr') pricePerUnit /= 1000;
        if (ing.unit === 'gr' && recipeUnit === 'kg') pricePerUnit *= 1000;
        if (ing.unit === 'liter' && recipeUnit === 'ml') pricePerUnit /= 1000;
        if (ing.unit === 'ml' && recipeUnit === 'liter') pricePerUnit *= 1000;

        return total + (pricePerUnit * ri.amount);
      }
      return total;
    }, 0);
    return ingredientCost + (recipe.otherCosts || 0);
  };

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grandTotalHPP = selectedRecipes.reduce((total, item) => {
    const recipe = recipes.find(r => r.id === item.recipeId);
    if (recipe) {
      return total + (calculateRecipeHPP(recipe) * item.multiplier);
    }
    return total;
  }, 0);

  const totalCost = grandTotalHPP + packingCost;
  const profitAmount = (totalCost * profitPercentage) / 100;
  const sellingPrice = totalCost + profitAmount;

  const pricePerUnit = totalUnit > 0 ? sellingPrice / totalUnit : 0;

  const totalYield = selectedRecipes.reduce((total, item) => {
    const recipe = recipes.find(r => r.id === item.recipeId);
    if (recipe) {
      return total + (recipe.yield * item.multiplier);
    }
    return total;
  }, 0);

  const pricePerPiece = totalYield > 0 ? sellingPrice / totalYield : 0; // Keeping this for reference if needed, but we'll use pricePerUnit for the display requested

  const toggleRecipeExpand = (recipeId: string) => {
    setExpandedRecipes(prev => 
      prev.includes(recipeId) ? prev.filter(id => id !== recipeId) : [...prev, recipeId]
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header>
        <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
          <Calculator size={32} />
          Kalkulasi HPP Gabungan
        </h1>
        <p className="text-gray-500">Hitung total biaya produksi dari beberapa resep sekaligus.</p>
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
              {filteredRecipes.map(recipe => {
                const isSelected = selectedRecipes.some(item => item.recipeId === recipe.id);
                return (
                  <button
                    key={recipe.id}
                    onClick={() => isSelected ? removeRecipe(recipe.id) : addRecipe(recipe.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl transition-all border flex items-center justify-between group",
                      isSelected
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-gray-50 text-gray-700 border-transparent hover:border-pink-200 hover:bg-pink-50"
                    )}
                  >
                    <div>
                      <p className="font-bold">{recipe.name}</p>
                      <p className={cn("text-xs opacity-70", isSelected ? "text-white" : "text-gray-500")}>
                        {recipe.category}
                      </p>
                    </div>
                    {isSelected ? <Trash2 size={18} /> : <Plus size={18} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </button>
                );
              })}
            </div>
          </section>

          {selectedRecipes.length > 0 && (
            <section className="bg-primary text-white p-8 rounded-[32px] shadow-xl sticky top-8 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calculator size={24} />
                Ringkasan Biaya
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm opacity-70">
                  <span>Total HPP Resep</span>
                  <span>{formatCurrency(grandTotalHPP)}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-70">Biaya Packing</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">Rp</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tempValues['packingCost'] !== undefined ? tempValues['packingCost'] : (packingCost === 0 ? '' : packingCost.toString())}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setTempValues(prev => ({ ...prev, packingCost: val }));
                          setPackingCost(val === '' ? 0 : parseFloat(val));
                        }
                      }}
                      onBlur={() => setTempValues(prev => {
                        const n = { ...prev };
                        delete n.packingCost;
                        return n;
                      })}
                      className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl outline-none focus:bg-white/20 transition-all font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-70">Keuntungan (%)</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tempValues['profitPercentage'] !== undefined ? tempValues['profitPercentage'] : (profitPercentage === 0 ? '' : profitPercentage.toString())}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setTempValues(prev => ({ ...prev, profitPercentage: val }));
                          setProfitPercentage(val === '' ? 0 : parseFloat(val));
                        }
                      }}
                      onBlur={() => setTempValues(prev => {
                        const n = { ...prev };
                        delete n.profitPercentage;
                        return n;
                      })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl outline-none focus:bg-white/20 transition-all font-mono"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-70">Total Unit</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tempValues['totalUnit'] !== undefined ? tempValues['totalUnit'] : (totalUnit === 0 ? '' : totalUnit.toString())}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setTempValues(prev => ({ ...prev, totalUnit: val }));
                          setTotalUnit(val === '' ? 0 : parseFloat(val));
                        }
                      }}
                      onBlur={() => setTempValues(prev => {
                        const n = { ...prev };
                        delete n.totalUnit;
                        return n;
                      })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl outline-none focus:bg-white/20 transition-all font-mono"
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/20">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Total Modal (HPP + Packing)</p>
                  <p className="text-2xl font-mono font-bold text-[#f5f5f0]">{formatCurrency(totalCost)}</p>
                </div>

                <div className="pt-4">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Estimasi Harga Jual</p>
                  <p className="text-4xl font-mono font-bold text-[#f5f5f0]">{formatCurrency(sellingPrice)}</p>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Estimasi Harga Jual per Unit</p>
                  <p className="text-2xl font-mono font-bold text-white/90">{formatCurrency(pricePerUnit)}</p>
                  <p className="text-[10px] opacity-50 italic">Berdasarkan {totalUnit} unit</p>
                </div>
              </div>

              <div className="p-4 bg-primary-dark rounded-2xl flex gap-3 items-start">
                <Info size={18} className="shrink-0 mt-0.5 opacity-70" />
                <p className="text-xs opacity-70 leading-relaxed">
                  Harga jual dihitung dari total modal (HPP + Packing) ditambah persentase keuntungan yang diinginkan.
                </p>
              </div>
            </section>
          )}
        </div>

        {/* Calculation Table */}
        <div className="lg:col-span-2">
          <section className="bg-white p-8 rounded-[32px] shadow-sm border border-pink-50 min-h-[400px]">
            {selectedRecipes.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif font-bold text-primary">Daftar Kalkulasi</h2>
                  <button 
                    onClick={() => setSelectedRecipes([])}
                    className="text-xs font-bold text-red-500 hover:bg-red-50 px-4 py-2 rounded-full transition-colors"
                  >
                    Hapus Semua
                  </button>
                </div>

                <div className="md:hidden space-y-4">
                  {selectedRecipes.map((item) => {
                    const recipe = recipes.find(r => r.id === item.recipeId);
                    if (!recipe) return null;
                    const hpp = calculateRecipeHPP(recipe);
                    const hppPerUnit = hpp / (recipe.yield || 1);
                    const suggestedPrice = hppPerUnit * (1 + (recipe.markupPercent || 0) / 100);
                    const isExpanded = expandedRecipes.includes(recipe.id);

                    return (
                      <div key={item.recipeId} className="bg-gray-50/50 rounded-3xl p-5 border border-gray-100 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => toggleRecipeExpand(recipe.id)}
                              className={cn(
                                "p-2 rounded-xl transition-all",
                                isExpanded ? "bg-primary text-white rotate-180" : "bg-white text-gray-400 shadow-sm"
                              )}
                            >
                              <Plus size={16} />
                            </button>
                            <div>
                              <p className="font-bold text-gray-800">{recipe.name}</p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest">{recipe.category}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeRecipe(item.recipeId)}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-xl"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Jumlah (Batch)</p>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={tempValues[`mult-${item.recipeId}`] !== undefined ? tempValues[`mult-${item.recipeId}`] : (item.multiplier === 0 ? '' : item.multiplier.toString())}
                              onChange={(e) => {
                                const val = e.target.value.replace(',', '.');
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  setTempValues(prev => ({ ...prev, [`mult-${item.recipeId}`]: val }));
                                  updateMultiplier(item.recipeId, val === '' ? 0 : parseFloat(val));
                                }
                              }}
                              onBlur={() => setTempValues(prev => {
                                const n = { ...prev };
                                delete n[`mult-${item.recipeId}`];
                                return n;
                              })}
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl outline-none font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Harga Jual / Unit</p>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">Rp</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={tempValues[`sell-${recipe.id}`] !== undefined ? tempValues[`sell-${recipe.id}`] : (recipe.sellingPrice === 0 || !recipe.sellingPrice ? '' : recipe.sellingPrice.toString())}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, '');
                                  setTempValues(prev => ({ ...prev, [`sell-${recipe.id}`]: val }));
                                  updateSellingPrice(recipe.id, val === '' ? 0 : parseInt(val));
                                }}
                                onBlur={() => setTempValues(prev => {
                                  const n = { ...prev };
                                  delete n[`sell-${recipe.id}`];
                                  return n;
                                })}
                                className="w-full pl-7 pr-2 py-2 text-right bg-white border border-gray-100 rounded-xl outline-none font-mono font-bold text-sm"
                                placeholder={Math.round(suggestedPrice).toString()}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-end pt-2 border-t border-gray-100">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">HPP / Batch</p>
                            <p className="font-mono text-sm text-gray-600">{formatCurrency(hpp)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-primary uppercase">Subtotal</p>
                            <p className="font-mono font-bold text-primary text-xl">
                              {formatCurrency(hpp * item.multiplier)}
                            </p>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden pt-4"
                            >
                              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-inner space-y-2">
                                {recipe.ingredients.map((ri, idx) => {
                                  const ing = ingredients.find(i => i.id === ri.ingredientId);
                                  if (!ing) return null;
                                  let pricePerUnit = (ing.price || 0) / (ing.baseQuantity || 1);
                                  const recipeUnit = ri.unit || ing.unit;
                                  if (ing.unit === 'kg' && recipeUnit === 'gr') pricePerUnit /= 1000;
                                  if (ing.unit === 'gr' && recipeUnit === 'kg') pricePerUnit *= 1000;
                                  if (ing.unit === 'liter' && recipeUnit === 'ml') pricePerUnit /= 1000;
                                  if (ing.unit === 'ml' && recipeUnit === 'liter') pricePerUnit *= 1000;
                                  const subtotal = pricePerUnit * ri.amount;
                                  return (
                                    <div key={idx} className="flex justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                                      <span className="text-gray-600">{ing.name}</span>
                                      <span className="font-mono font-bold">{formatCurrency(subtotal)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto rounded-3xl border border-gray-100 shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Resep & Yield</th>
                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">Jumlah (Batch)</th>
                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-right">HPP / Batch</th>
                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-right">Subtotal</th>
                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">Harga Jual / Unit</th>
                        <th className="px-6 py-5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedRecipes.map((item) => {
                        const recipe = recipes.find(r => r.id === item.recipeId);
                        if (!recipe) return null;
                        const hpp = calculateRecipeHPP(recipe);
                        const hppPerUnit = hpp / (recipe.yield || 1);
                        const suggestedPrice = hppPerUnit * (1 + (recipe.markupPercent || 0) / 100);
                        const isExpanded = expandedRecipes.includes(recipe.id);
                        
                        return (
                          <React.Fragment key={item.recipeId}>
                            <tr className="hover:bg-pink-50/30 transition-colors group">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={() => toggleRecipeExpand(recipe.id)}
                                    className={cn(
                                      "p-1 rounded-lg transition-all",
                                      isExpanded ? "bg-primary text-white rotate-180" : "bg-gray-100 text-gray-400 hover:text-primary"
                                    )}
                                  >
                                    <Plus size={14} />
                                  </button>
                                  <div className="space-y-1">
                                    <p className="font-bold text-gray-800 group-hover:text-primary transition-colors">{recipe.name}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        {recipe.category}
                                      </span>
                                      <span className="text-[10px] font-medium text-gray-400">
                                        Yield: {recipe.yield} unit
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center justify-center">
                                  <div className="relative group/input">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={tempValues[`mult-${item.recipeId}`] !== undefined ? tempValues[`mult-${item.recipeId}`] : (item.multiplier === 0 ? '' : item.multiplier.toString())}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(',', '.');
                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                          setTempValues(prev => ({ ...prev, [`mult-${item.recipeId}`]: val }));
                                          updateMultiplier(item.recipeId, val === '' ? 0 : parseFloat(val));
                                        }
                                      }}
                                      onBlur={() => setTempValues(prev => {
                                        const n = { ...prev };
                                        delete n[`mult-${item.recipeId}`];
                                        return n;
                                      })}
                                      className="w-20 px-3 py-2 text-center bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold transition-all"
                                    />
                                    <div className="absolute -top-2 -right-2 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full opacity-0 group-hover/input:opacity-100 transition-opacity">
                                      Edit
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <p className="font-mono text-sm text-gray-600">{formatCurrency(hpp)}</p>
                                <p className="text-[9px] text-gray-400 italic">HPP/Unit: {formatCurrency(hppPerUnit)}</p>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <p className="font-mono font-bold text-primary text-lg leading-none">
                                  {formatCurrency(hpp * item.multiplier)}
                                </p>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex flex-col items-center gap-1.5">
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">Rp</span>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={tempValues[`sell-${recipe.id}`] !== undefined ? tempValues[`sell-${recipe.id}`] : (recipe.sellingPrice === 0 || !recipe.sellingPrice ? '' : recipe.sellingPrice.toString())}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setTempValues(prev => ({ ...prev, [`sell-${recipe.id}`]: val }));
                                        updateSellingPrice(recipe.id, val === '' ? 0 : parseInt(val));
                                      }}
                                      onBlur={() => setTempValues(prev => {
                                        const n = { ...prev };
                                        delete n[`sell-${recipe.id}`];
                                        return n;
                                      })}
                                      className="w-32 pl-8 pr-3 py-2 text-right bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono font-bold text-sm transition-all"
                                      placeholder={Math.round(suggestedPrice).toString()}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 text-[9px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                                    <Info size={10} className="text-primary" />
                                    <span>Saran: <span className="font-bold">{formatCurrency(suggestedPrice)}</span></span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <button 
                                  onClick={() => removeRecipe(item.recipeId)}
                                  className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                  title="Hapus dari daftar"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                            <AnimatePresence>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={6} className="px-6 py-0 border-none">
                                    <motion.div 
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="bg-gray-50/50 rounded-2xl p-6 mb-4 border border-gray-100 shadow-inner">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Rincian Bahan Baku per Batch</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                            {recipe.ingredients.map((ri, idx) => {
                                              const ing = ingredients.find(i => i.id === ri.ingredientId);
                                              if (!ing) return null;
                                              
                                              let pricePerUnit = (ing.price || 0) / (ing.baseQuantity || 1);
                                              const recipeUnit = ri.unit || ing.unit;
                                              if (ing.unit === 'kg' && recipeUnit === 'gr') pricePerUnit /= 1000;
                                              if (ing.unit === 'gr' && recipeUnit === 'kg') pricePerUnit *= 1000;
                                              if (ing.unit === 'liter' && recipeUnit === 'ml') pricePerUnit /= 1000;
                                              if (ing.unit === 'ml' && recipeUnit === 'liter') pricePerUnit *= 1000;
                                              
                                              const subtotal = pricePerUnit * ri.amount;
                                              return (
                                                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                                  <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-700">{ing.name}</span>
                                                    <span className="text-[10px] text-gray-400">{ri.amount} {recipeUnit} x {formatCurrency(pricePerUnit)}</span>
                                                  </div>
                                                  <span className="font-mono text-sm font-bold text-gray-600">{formatCurrency(subtotal)}</span>
                                                </div>
                                              );
                                            })}
                                          {recipe.otherCosts > 0 && (
                                            <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                              <span className="text-sm font-medium text-gray-700">Biaya Lain-lain</span>
                                              <span className="font-mono text-sm font-bold text-gray-600">{formatCurrency(recipe.otherCosts)}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  </td>
                                </tr>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-primary/5">
                        <td colSpan={3} className="px-6 py-8">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-2xl">
                              <Calculator size={24} className="text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-primary uppercase tracking-widest">Total HPP Gabungan</p>
                              <p className="text-gray-500 text-[10px]">Total biaya produksi dari semua resep terpilih</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-8 text-right">
                          <p className="text-3xl font-mono font-bold text-primary tracking-tighter">
                            {formatCurrency(grandTotalHPP)}
                          </p>
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12">
                <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mb-6">
                  <ChefHat size={40} className="text-primary opacity-40" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Belum Ada Resep Dipilih</h3>
                <p className="text-gray-500 max-w-xs">Pilih beberapa resep dari daftar di samping untuk menghitung total HPP gabungan.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default HPP;
