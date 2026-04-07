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
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/recipes')} className="p-3 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-serif font-bold text-primary">
            {isNew ? 'Tambah Resep Baru' : isAdmin ? 'Edit Resep' : 'Detail Resep'}
          </h1>
        </div>
        {isAdmin && (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-primary text-white py-3 px-8 rounded-full font-bold hover:bg-primary-dark transition-all shadow-lg"
          >
            <Save size={20} />
            Simpan Resep
          </button>
        )}
      </header>

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Basic Info */}
        <section className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Nama Resep</label>
              <input
                type="text"
                value={recipe.name}
                onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                disabled={!isAdmin}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Contoh: Roti Tawar Gandum"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Kategori</label>
              <select
                value={recipe.category}
                onChange={(e) => setRecipe({ ...recipe, category: e.target.value })}
                disabled={!isAdmin}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none bg-white disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="Roti">Roti</option>
                <option value="Kue">Kue</option>
                <option value="Pastry">Pastry</option>
                <option value="Masakan">Masakan</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Yield (Hasil)</label>
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Unit Hasil</label>
              <input
                type="text"
                value={recipe.yieldUnit}
                onChange={(e) => setRecipe({ ...recipe, yieldUnit: e.target.value })}
                disabled={!isAdmin}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="loaves, slices, pcs"
              />
            </div>
          </div>
        </section>

        {/* Ingredients */}
        <section className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ChefHat className="text-primary" />
              Bahan Baku
            </h2>
            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsQuickAddOpen(true)}
                  className="flex items-center gap-2 text-blue-600 font-bold hover:bg-blue-50 px-4 py-2 rounded-full transition-colors text-sm"
                >
                  <Plus size={16} />
                  Bahan Baru
                </button>
                <button
                  onClick={handleAddIngredient}
                  className="flex items-center gap-2 text-primary font-bold hover:bg-primary-light px-4 py-2 rounded-full transition-colors text-sm"
                >
                  <Plus size={16} />
                  Pilih Bahan
                </button>
              </div>
            )}
          </div>
          <div className="space-y-4">
            {recipe.ingredients?.map((ri, idx) => {
              const selectedIng = allIngredients.find(i => i.id === ri.ingredientId);
              return (
                <div key={idx} className="flex flex-col md:flex-row md:items-center gap-4 p-4 md:p-4 bg-gray-50 rounded-2xl border border-gray-100 relative">
                  <div className="flex-1">
                    <label className="md:hidden text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Nama Bahan</label>
                    <select
                      value={ri.ingredientId}
                      onChange={(e) => handleIngredientChange(idx, 'ingredientId', e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="">Pilih Bahan...</option>
                      {allIngredients.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name}</option>
                      ))}\
                    </select>
                  </div>
                  <div className="w-full md:w-32">
                    <label className="md:hidden text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Jumlah</label>
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
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder="0"
                    />
                  </div>
                  <div className="w-full md:w-24">
                    <label className="md:hidden text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Satuan</label>
                    <select
                      value={ri.unit || selectedIng?.unit || 'gr'}
                      onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                      disabled={!isAdmin}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
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
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveIngredient(idx)}
                      className="absolute top-2 right-2 md:relative md:top-0 md:right-0 p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              );
            })}
            {(!recipe.ingredients || recipe.ingredients.length === 0) && (
              <p className="text-center text-gray-400 py-8 italic">Belum ada bahan baku ditambahkan.</p>
            )}
          </div>
        </section>

        {/* Instructions */}
        <section className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 space-y-4">
          <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Instruksi Pembuatan</label>
          <textarea
            value={recipe.instructions}
            onChange={(e) => setRecipe({ ...recipe, instructions: e.target.value })}
            disabled={!isAdmin}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none min-h-[200px] disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Tulis langkah-langkah pembuatan di sini..."
          />
        </section>

        {/* Cost Summary */}
        <section className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-light rounded-2xl">
              <Calculator size={24} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Ringkasan Biaya</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Biaya Lain-lain</span>
                  <div className="relative w-32">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">Rp</span>
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
                      className="w-full pl-7 pr-2 py-1 text-right rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 italic">Kemasan, tenaga kerja, listrik, dll.</p>
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-primary">Total HPP Resep</span>
                  <span className="text-xl font-mono font-bold text-primary">{formatCurrency(hppTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>HPP per {recipe.yieldUnit} ({recipe.yield} unit)</span>
                  <span className="font-mono">{formatCurrency(hppPerUnit)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Markup Keuntungan</span>
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
                      className="w-full pr-6 pl-2 py-1 text-right rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                      placeholder="0"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-400">
                  <span>Nilai Keuntungan</span>
                  <span>{formatCurrency(suggestedPrice - hppPerUnit)}</span>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-2xl border border-green-100 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-green-700">Saran Harga Jual</span>
                  <span className="text-xl font-mono font-bold text-green-700">{formatCurrency(suggestedPrice)}</span>
                </div>
                <p className="text-[10px] text-green-600/70 italic">Dibulatkan: {formatCurrency(Math.round(suggestedPrice / 100) * 100)}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Quick Add Ingredient Modal */}
      <AnimatePresence>
        {isQuickAddOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50">
                <h2 className="text-xl font-bold text-blue-600">Tambah Bahan Baku Baru</h2>
                <button onClick={() => setIsQuickAddOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleQuickAddIngredient} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Nama Bahan</label>
                  <input
                    required
                    type="text"
                    value={quickAddData.name}
                    onChange={(e) => setQuickAddData({ ...quickAddData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Contoh: Tepung Terigu"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Unit</label>
                    <select
                      value={quickAddData.unit}
                      onChange={(e) => setQuickAddData({ ...quickAddData, unit: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="gr">gr</option>
                      <option value="ml">ml</option>
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                      <option value="liter">liter</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Jumlah Per Unit</label>
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
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Contoh: 500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Harga per Jumlah Unit</label>
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Contoh: 10000"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg"
                >
                  <Save size={20} />
                  Simpan & Tambah ke Resep
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
