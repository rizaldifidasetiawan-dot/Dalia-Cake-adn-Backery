import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { Recipe, Ingredient, RecipeIngredient } from '../types';
import { Save, ArrowLeft, Plus, Trash2, Calculator, ChefHat, Info, X, Banknote } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/auth';

const RecipeDetail: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [recipe, setRecipe] = useState<Partial<Recipe>>({
    name: '',
    category: 'Roti',
    yield: 1,
    yieldUnit: 'loaves',
    ingredients: [],
    instructions: '',
    otherCosts: 0,
    markupPercent: 30,
    createdAt: new Date().toISOString()
  });

  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddData, setQuickAddData] = useState({ name: '', unit: 'gr', price: 0, baseQuantity: 1 });
  const [tempValues, setTempValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubIng = onSnapshot(
      collection(db, 'ingredients'), 
      (snapshot) => {
        setAllIngredients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient)));
      },
      (error) => {
        console.error("Ingredients snapshot error in RecipeDetail:", error);
      }
    );

    if (!isNew) {
      const fetchRecipe = async () => {
        const docRef = doc(db, 'recipes', id!);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRecipe({ id: docSnap.id, ...docSnap.data() } as Recipe);
        }
        setLoading(false);
      };
      fetchRecipe();
    }

    return () => unsubIng();
  }, [id, isNew]);

  const handleAddIngredient = () => {
    setRecipe(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), { ingredientId: '', amount: 0 }]
    }));
  };

  const handleQuickAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, 'ingredients'), {
        ...quickAddData,
        updatedAt: new Date().toISOString()
      });
      
      // Automatically add this new ingredient to the recipe
      setRecipe(prev => ({
        ...prev,
        ingredients: [...(prev.ingredients || []), { ingredientId: docRef.id, amount: 0 }]
      }));
      
      setIsQuickAddOpen(false);
      setQuickAddData({ name: '', unit: 'gr', price: 0, baseQuantity: 1 });
    } catch (error) {
      console.error('Error quick adding ingredient:', error);
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients?.filter((_, i) => i !== index)
    }));
  };

  const handleIngredientChange = (index: number, field: keyof RecipeIngredient, value: any) => {
    const newIngs = [...(recipe.ingredients || [])];
    newIngs[index] = { ...newIngs[index], [field]: value };
    setRecipe({ ...recipe, ingredients: newIngs });
  };

  const calculateHPP = () => {
    const ingredientCost = (recipe.ingredients || []).reduce((total, ri) => {
      const ing = allIngredients.find(i => i.id === ri.ingredientId);
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

  const hppTotal = calculateHPP();
  const hppPerUnit = hppTotal / (recipe.yield || 1);
  const suggestedPrice = hppPerUnit * (1 + (recipe.markupPercent || 0) / 100);

  const isAdmin = user?.role === 'admin';

  const handleSave = async () => {
    if (!recipe.name || (recipe.ingredients || []).length === 0) {
      alert('Nama resep dan bahan baku harus diisi.');
      return;
    }

    try {
      if (isNew) {
        await addDoc(collection(db, 'recipes'), {
          ...recipe,
          createdAt: new Date().toISOString()
        });
      } else {
        await updateDoc(doc(db, 'recipes', id!), {
          ...recipe
        });
      }
      navigate('/recipes');
    } catch (error) {
      console.error('Error saving recipe:', error);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <button 
            onClick={() => navigate('/recipes')}
            className="text-[10px] font-bold text-stone-400 hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-widest mb-2"
          >
            <ArrowLeft size={14} />
            Kembali ke Daftar
          </button>
          <h1 className="text-3xl font-serif font-bold text-primary">
            {isNew ? 'Tambah Resep Baru' : isAdmin ? 'Edit Resep' : 'Detail Resep'}
          </h1>
          <p className="text-stone-500 text-sm">Kelola detail komposisi dan kalkulasi biaya produksi secara presisi.</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleSave}
            className="pro-button flex items-center justify-center gap-2 px-8"
          >
            <Save size={20} />
            Simpan Resep
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info */}
          <section className="pro-card p-8 space-y-6">
            <h2 className="text-xl font-serif font-bold text-stone-800 border-b border-stone-50 pb-4">Informasi Dasar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Nama Resep</label>
                <input
                  type="text"
                  value={recipe.name}
                  onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                  disabled={!isAdmin}
                  className="pro-input text-lg font-bold"
                  placeholder="Contoh: Roti Tawar Gandum"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Kategori</label>
                <select
                  value={recipe.category}
                  onChange={(e) => setRecipe({ ...recipe, category: e.target.value })}
                  disabled={!isAdmin}
                  className="pro-input bg-white"
                >
                  <option value="Roti">Roti</option>
                  <option value="Kue">Kue</option>
                  <option value="Pastry">Pastry</option>
                  <option value="Masakan">Masakan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Yield (Hasil)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tempValues['yield'] !== undefined ? tempValues['yield'] : (recipe.yield === 0 ? '' : recipe.yield?.toString())}
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setTempValues(prev => ({ ...prev, yield: val }));
                        setRecipe({ ...recipe, yield: val === '' ? 0 : parseFloat(val) });
                      }
                    }}
                    onBlur={() => setTempValues(prev => {
                      const n = { ...prev };
                      delete n.yield;
                      return n;
                    })}
                    disabled={!isAdmin}
                    className="pro-input"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Unit Hasil</label>
                  <input
                    type="text"
                    value={recipe.yieldUnit}
                    onChange={(e) => setRecipe({ ...recipe, yieldUnit: e.target.value })}
                    disabled={!isAdmin}
                    className="pro-input"
                    placeholder="loaves, slices, pcs"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Ingredients */}
          <section className="pro-card p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-50 pb-4">
              <h2 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <ChefHat className="text-primary" />
                Bahan Baku
              </h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest hidden md:grid">
                <div className="col-span-5">Nama Bahan</div>
                <div className="col-span-3 text-center">Jumlah</div>
                <div className="col-span-3 text-center">Satuan</div>
                <div className="col-span-1"></div>
              </div>

              <div className="space-y-3">
                {recipe.ingredients?.map((ri, idx) => {
                  const selectedIng = allIngredients.find(i => i.id === ri.ingredientId);
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={idx} 
                      className="flex flex-col md:grid md:grid-cols-12 gap-4 p-5 bg-stone-50/50 rounded-2xl border border-stone-100 relative group hover:border-primary/30 transition-all"
                    >
                      <div className="md:col-span-5">
                        <label className="md:hidden text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 block">Nama Bahan</label>
                        <select
                          value={ri.ingredientId}
                          onChange={(e) => handleIngredientChange(idx, 'ingredientId', e.target.value)}
                          disabled={!isAdmin}
                          className="w-full px-4 py-2.5 rounded-xl border border-stone-100 outline-none bg-white font-bold text-stone-800 focus:border-primary transition-all disabled:opacity-60"
                        >
                          <option value="">Pilih Bahan...</option>
                          {allIngredients.map(ing => (
                            <option key={ing.id} value={ing.id}>{ing.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="md:hidden text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 block">Jumlah</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={tempValues[`ing-${idx}`] !== undefined ? tempValues[`ing-${idx}`] : (ri.amount === 0 ? '' : ri.amount.toString())}
                          onChange={(e) => {
                            const val = e.target.value.replace(',', '.');
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              setTempValues(prev => ({ ...prev, [`ing-${idx}`]: val }));
                              handleIngredientChange(idx, 'amount', val === '' ? 0 : parseFloat(val));
                            }
                          }}
                          onBlur={() => setTempValues(prev => {
                            const n = { ...prev };
                            delete n[`ing-${idx}`];
                            return n;
                          })}
                          disabled={!isAdmin}
                          className="w-full px-4 py-2.5 rounded-xl border border-stone-100 outline-none bg-white font-mono font-bold text-center focus:border-primary transition-all disabled:opacity-60"
                          placeholder="0"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="md:hidden text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 block">Satuan</label>
                        <select
                          value={ri.unit || selectedIng?.unit || 'gr'}
                          onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                          disabled={!isAdmin}
                          className="w-full px-4 py-2.5 rounded-xl border border-stone-100 outline-none bg-white font-bold text-stone-600 focus:border-primary transition-all disabled:opacity-60"
                        >
                          <option value="gr">gr</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="liter">liter</option>
                          <option value="pcs">pcs</option>
                          <option value="butir">butir</option>
                          <option value="sdm">sdm</option>
                          <option value="sdt">sdt</option>
                        </select>
                      </div>
                      <div className="md:col-span-1 flex items-center justify-end">
                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveIngredient(idx)}
                            className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {(!recipe.ingredients || recipe.ingredients.length === 0) && (
                  <div className="text-center py-12 bg-stone-50/50 rounded-[32px] border-2 border-dashed border-stone-100">
                    <ChefHat size={40} className="mx-auto text-stone-200 mb-4" />
                    <p className="text-stone-400 text-sm font-medium italic">Belum ada bahan baku ditambahkan.</p>
                  </div>
                )}

                {isAdmin && (
                  <div className="flex flex-wrap gap-3 pt-6 border-t border-stone-50">
                    <button
                      onClick={() => setIsQuickAddOpen(true)}
                      className="flex-1 md:flex-none text-[10px] font-bold text-blue-500 hover:text-blue-600 px-6 py-3 rounded-2xl border border-blue-100 hover:bg-blue-50 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Bahan Baru
                    </button>
                    <button
                      onClick={handleAddIngredient}
                      className="flex-1 md:flex-none text-[10px] font-bold text-primary hover:text-primary-dark px-6 py-3 rounded-2xl border border-pink-100 hover:bg-pink-50 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Pilih Bahan
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Instructions */}
          <section className="pro-card p-8 space-y-4">
            <h2 className="text-xl font-serif font-bold text-stone-800 border-b border-stone-50 pb-4">Instruksi Pembuatan</h2>
            <textarea
              value={recipe.instructions}
              onChange={(e) => setRecipe({ ...recipe, instructions: e.target.value })}
              disabled={!isAdmin}
              className="pro-input min-h-[200px] py-4 leading-relaxed"
              placeholder="Tulis langkah-langkah pembuatan secara detail di sini..."
            />
          </section>
        </div>

        <div className="space-y-8">
          {/* Cost Summary */}
          <section className="bg-white p-8 rounded-[32px] shadow-sm space-y-6 border border-line sticky top-8">
            <h2 className="text-xl font-serif font-bold text-primary flex items-center gap-2">
              <Calculator size={24} />
              Ringkasan Biaya
            </h2>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Biaya Lain-lain</span>
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">Rp</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={tempValues['otherCosts'] !== undefined ? tempValues['otherCosts'] : (recipe.otherCosts === 0 ? '' : recipe.otherCosts?.toString())}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.');
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setTempValues(prev => ({ ...prev, otherCosts: val }));
                            setRecipe({ ...recipe, otherCosts: val === '' ? 0 : parseFloat(val) });
                          }
                        }}
                        onBlur={() => setTempValues(prev => {
                          const n = { ...prev };
                          delete n.otherCosts;
                          return n;
                        })}
                        disabled={!isAdmin}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-stone-100 rounded-xl outline-none focus:border-primary font-mono text-sm text-right text-stone-700"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-stone-400 italic font-medium uppercase tracking-wider">Kemasan, tenaga kerja, listrik, dll.</p>
                </div>

                <div className="pt-6 border-t border-stone-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Total HPP Batch</p>
                  <p className="text-3xl font-mono font-bold text-primary tracking-tighter">{formatCurrency(hppTotal)}</p>
                  <div className="flex justify-between items-center mt-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    <span>HPP per {recipe.yieldUnit}</span>
                    <span className="font-mono text-stone-700">{formatCurrency(hppPerUnit)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-stone-100 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Markup Keuntungan</span>
                  <div className="relative w-24">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tempValues['markupPercent'] !== undefined ? tempValues['markupPercent'] : (recipe.markupPercent === 0 ? '' : recipe.markupPercent?.toString())}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setTempValues(prev => ({ ...prev, markupPercent: val }));
                          setRecipe({ ...recipe, markupPercent: val === '' ? 0 : parseFloat(val) });
                        }
                      }}
                      onBlur={() => setTempValues(prev => {
                        const n = { ...prev };
                        delete n.markupPercent;
                        return n;
                      })}
                      disabled={!isAdmin}
                      className="w-full pr-7 pl-3 py-2 bg-white border border-stone-100 rounded-xl outline-none focus:border-primary font-mono text-sm text-right text-stone-700"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">%</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Saran Harga Jual</p>
                  <p className="text-3xl font-mono font-bold text-stone-800 tracking-tighter">{formatCurrency(suggestedPrice)}</p>
                  <p className="text-[9px] text-stone-400 italic font-medium uppercase tracking-wider">Dibulatkan: {formatCurrency(Math.round(suggestedPrice / 100) * 100)}</p>
                </div>
              </div>

              <div className="p-4 bg-primary-light/30 rounded-2xl flex gap-3 items-start border border-primary-light">
                <Info size={18} className="shrink-0 mt-0.5 text-primary" />
                <p className="text-[10px] text-stone-500 leading-relaxed font-medium uppercase tracking-wider">
                  HPP dihitung berdasarkan total biaya bahan baku dan biaya tambahan lainnya dibagi dengan jumlah yield.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Quick Add Ingredient Modal */}
      <AnimatePresence>
        {isQuickAddOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickAddOpen(false)}
              className="absolute inset-0 bg-stone-400/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white w-full max-w-md pro-card overflow-hidden"
            >
              <div className="p-6 border-b border-stone-50 flex justify-between items-center bg-stone-50/50">
                <h2 className="text-xl font-serif font-bold text-stone-800">Bahan Baku Baru</h2>
                <button onClick={() => setIsQuickAddOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors text-stone-400">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleQuickAddIngredient} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Nama Bahan</label>
                  <input
                    required
                    type="text"
                    value={quickAddData.name}
                    onChange={(e) => setQuickAddData({ ...quickAddData, name: e.target.value })}
                    className="pro-input"
                    placeholder="Contoh: Tepung Terigu"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Unit</label>
                    <select
                      value={quickAddData.unit}
                      onChange={(e) => setQuickAddData({ ...quickAddData, unit: e.target.value })}
                      className="pro-input bg-white"
                    >
                      <option value="gr">gr</option>
                      <option value="ml">ml</option>
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                      <option value="liter">liter</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Jumlah Per Unit</label>
                    <input
                      required
                      type="text"
                      inputMode="decimal"
                      value={tempValues['quick-base'] !== undefined ? tempValues['quick-base'] : (quickAddData.baseQuantity === 0 ? '' : quickAddData.baseQuantity.toString())}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setTempValues(prev => ({ ...prev, 'quick-base': val }));
                          setQuickAddData({ ...quickAddData, baseQuantity: val === '' ? 0 : parseFloat(val) });
                        }
                      }}
                      onBlur={() => setTempValues(prev => {
                        const n = { ...prev };
                        delete n['quick-base'];
                        return n;
                      })}
                      className="pro-input font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Harga per Jumlah Unit</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm">Rp</span>
                    <input
                      required
                      type="text"
                      inputMode="numeric"
                      value={tempValues['quick-price'] !== undefined ? tempValues['quick-price'] : (quickAddData.price === 0 ? '' : quickAddData.price.toString())}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setTempValues(prev => ({ ...prev, 'quick-price': val }));
                        setQuickAddData({ ...quickAddData, price: val === '' ? 0 : parseInt(val) });
                      }}
                      onBlur={() => setTempValues(prev => {
                        const n = { ...prev };
                        delete n['quick-price'];
                        return n;
                      })}
                      className="pro-input pl-12 font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="pro-button w-full flex items-center justify-center gap-2 py-4"
                >
                  <Save size={20} />
                  Simpan & Tambah
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecipeDetail;
