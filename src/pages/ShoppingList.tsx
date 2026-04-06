import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Recipe, Ingredient, ShoppingListRecipe } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, Printer, CheckCircle2 } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const ShoppingList: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<ShoppingListRecipe[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);

  useEffect(() => {
    const unsubRecipes = onSnapshot(
      query(collection(db, 'recipes'), orderBy('name')), 
      (snapshot) => {
        setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe)));
      },
      (error) => {
        console.error("Recipes snapshot error in ShoppingList:", error);
      }
    );
    const unsubIng = onSnapshot(
      collection(db, 'ingredients'), 
      (snapshot) => {
        setIngredients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient)));
      },
      (error) => {
        console.error("Ingredients snapshot error in ShoppingList:", error);
      }
    );
    return () => {
      unsubRecipes();
      unsubIng();
    };
  }, []);

  const handleAddRecipe = (recipeId: string) => {
    const existing = selectedRecipes.find(r => r.recipeId === recipeId);
    if (existing) {
      setSelectedRecipes(selectedRecipes.map(r => 
        r.recipeId === recipeId ? { ...r, multiplier: r.multiplier + 1 } : r
      ));
    } else {
      setSelectedRecipes([...selectedRecipes, { recipeId, multiplier: 1 }]);
    }
    setIsGenerated(false);
  };

  const handleUpdateMultiplier = (recipeId: string, delta: number) => {
    setSelectedRecipes(selectedRecipes.map(r => {
      if (r.recipeId === recipeId) {
        const newVal = Math.max(0.1, r.multiplier + delta);
        return { ...r, multiplier: Number(newVal.toFixed(1)) };
      }
      return r;
    }));
    setIsGenerated(false);
  };

  const handleRemoveRecipe = (recipeId: string) => {
    setSelectedRecipes(selectedRecipes.filter(r => r.recipeId !== recipeId));
    setIsGenerated(false);
  };

  const generateList = () => {
    const aggregated: { [key: string]: number } = {};
    
    selectedRecipes.forEach(sr => {
      const recipe = recipes.find(r => r.id === sr.recipeId);
      if (recipe) {
        recipe.ingredients.forEach(ri => {
          aggregated[ri.ingredientId] = (aggregated[ri.ingredientId] || 0) + (ri.amount * sr.multiplier);
        });
      }
    });

    return Object.entries(aggregated).map(([ingId, amount]) => {
      const ing = ingredients.find(i => i.id === ingId);
      const pricePerUnit = (ing?.price || 0) / (ing?.baseQuantity || 1);
      return {
        name: ing?.name || 'Unknown',
        amount,
        unit: ing?.unit || '',
        estimatedCost: pricePerUnit * amount
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  const shoppingItems = generateList();
  const totalEstimated = shoppingItems.reduce((acc, item) => acc + item.estimatedCost, 0);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan popup untuk mencetak daftar belanja.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Daftar Belanja - Dalia Bakery</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { font-family: serif; color: #DB2777; margin-bottom: 5px; }
            .header { border-bottom: 2px solid #FBCFE8; padding-bottom: 20px; margin-bottom: 30px; }
            .item { border-bottom: 1px solid #F3F4F6; padding: 12px 0; display: flex; justify-content: space-between; }
            .item-name { font-weight: bold; }
            .item-amount { color: #666; font-size: 0.9em; }
            .total { margin-top: 40px; font-size: 24px; font-weight: bold; color: #DB2777; border-top: 2px solid #DB2777; padding-top: 15px; text-align: right; }
            .meta { color: #999; font-size: 12px; margin-top: 5px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Dalia Cake & Bakery</h1>
            <div class="meta">Daftar Belanja Otomatis • ${new Date().toLocaleDateString('id-ID')}</div>
          </div>
          
          <div class="items">
            ${shoppingItems.map(item => `
              <div class="item">
                <div>
                  <div class="item-name">${item.name}</div>
                  <div class="item-amount">${item.amount} ${item.unit}</div>
                </div>
                <div class="item-price">${formatCurrency(item.estimatedCost)}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="total">
            <span style="font-size: 14px; color: #666; font-weight: normal; margin-right: 10px;">Total Estimasi:</span>
            ${formatCurrency(totalEstimated)}
          </div>
          
          <div style="margin-top: 50px; font-size: 10px; color: #ccc; text-align: center;">
            Dicetak melalui Sistem Manajemen Dalia Bakery
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    // Small delay to ensure styles are loaded before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-3xl font-serif font-bold text-primary">Daftar Belanja Otomatis</h1>
        <p className="text-gray-500">Pilih resep dan jumlah batch untuk menghasilkan daftar belanja</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recipe Selection */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-primary" />
              Pilih Resep
            </h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {recipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => handleAddRecipe(recipe.id)}
                  className="w-full text-left p-4 rounded-2xl border border-gray-50 hover:border-primary hover:bg-primary-light transition-all group"
                >
                  <p className="font-bold text-gray-700 group-hover:text-primary">{recipe.name}</p>
                  <p className="text-xs text-gray-400">{recipe.category} • Yield: {recipe.yield} {recipe.yieldUnit}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Resep Terpilih</h2>
            <div className="space-y-4">
              {selectedRecipes.length === 0 ? (
                <p className="text-center text-gray-400 py-4 italic text-sm">Belum ada resep dipilih.</p>
              ) : (
                selectedRecipes.map(sr => {
                  const r = recipes.find(rec => rec.id === sr.recipeId);
                  return (
                    <div key={sr.recipeId} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-700 truncate">{r?.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <button onClick={() => handleUpdateMultiplier(sr.recipeId, -1)} className="p-1 hover:bg-white rounded-full text-gray-500"><Minus size={14} /></button>
                          <span className="text-xs font-bold text-primary w-8 text-center">{sr.multiplier}x</span>
                          <button onClick={() => handleUpdateMultiplier(sr.recipeId, 1)} className="p-1 hover:bg-white rounded-full text-gray-500"><Plus size={14} /></button>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveRecipe(sr.recipeId)} className="p-2 text-red-500 hover:bg-white rounded-full"><Trash2 size={16} /></button>
                    </div>
                  );
                })
              )}
            </div>
            {selectedRecipes.length > 0 && (
              <button
                onClick={() => setIsGenerated(true)}
                className="w-full mt-6 bg-primary text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart size={20} />
                Generate Daftar Belanja
              </button>
            )}
          </section>
        </div>

        {/* Generated List */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {isGenerated ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white p-8 rounded-[32px] shadow-xl border border-gray-100"
                id="printable-area"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-primary">Daftar Belanja</h2>
                    <p className="text-sm text-gray-500">Berdasarkan {selectedRecipes.length} resep terpilih</p>
                  </div>
                  <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-3 bg-primary-light text-primary rounded-full font-bold hover:bg-pink-100 transition-colors">
                    <Printer size={18} />
                    Cetak
                  </button>
                </div>

                <div className="space-y-2 mb-8">
                  {shoppingItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors rounded-xl group">
                      <div className="flex items-center gap-4">
                        <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center group-hover:border-primary transition-colors">
                          <div className="w-3 h-3 rounded-full bg-primary opacity-0 group-hover:opacity-20"></div>
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{item.name}</p>
                          <p className="text-sm text-gray-500">{item.amount} {item.unit}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Estimasi Biaya</p>
                        <p className="font-mono font-bold text-gray-700">{formatCurrency(item.estimatedCost)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-primary-light p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Estimasi Belanja</p>
                    <p className="text-3xl font-mono font-bold text-primary">{formatCurrency(totalEstimated)}</p>
                  </div>
                  <CheckCircle2 size={48} className="text-primary opacity-20" />
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-white/50 rounded-[32px] border-2 border-dashed border-gray-200 text-center">
                <div className="p-6 bg-white rounded-full shadow-sm mb-4">
                  <ShoppingCart size={48} className="text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-400">Daftar Belanja Belum Dibuat</h3>
                <p className="text-gray-400 max-w-xs mx-auto mt-2">
                  Pilih beberapa resep di sebelah kiri dan klik tombol "Generate" untuk melihat daftar belanjaan Anda.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ShoppingList;
