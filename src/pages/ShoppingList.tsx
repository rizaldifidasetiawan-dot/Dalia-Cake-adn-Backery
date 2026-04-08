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
  const [stockValues, setStockValues] = useState<Record<string, string>>({});

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
          const ing = ingredients.find(i => i.id === ri.ingredientId);
          if (ing) {
            let amountInBaseUnit = ri.amount * sr.multiplier;
            const recipeUnit = ri.unit || ing.unit;

            // Convert to base unit
            if (ing.unit === 'kg' && recipeUnit === 'gr') amountInBaseUnit /= 1000;
            if (ing.unit === 'gr' && recipeUnit === 'kg') amountInBaseUnit *= 1000;
            if (ing.unit === 'liter' && recipeUnit === 'ml') amountInBaseUnit /= 1000;
            if (ing.unit === 'ml' && recipeUnit === 'liter') amountInBaseUnit *= 1000;

            aggregated[ri.ingredientId] = (aggregated[ri.ingredientId] || 0) + amountInBaseUnit;
          }
        });
      }
    });

    return Object.entries(aggregated).map(([ingId, amount]) => {
      const ing = ingredients.find(i => i.id === ingId);
      const pricePerUnit = (ing?.price || 0) / (ing?.baseQuantity || 1);
      return {
        id: ingId,
        name: ing?.name || 'Unknown',
        amount: Number(amount.toFixed(2)),
        unit: ing?.unit || '',
        estimatedCost: pricePerUnit * amount
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  const shoppingItems = generateList().map(item => {
    const stock = parseFloat(stockValues[item.id] || '0') || 0;
    const amountToBuy = Math.max(0, item.amount - stock);
    const pricePerUnit = item.amount > 0 ? item.estimatedCost / item.amount : 0;
    return {
      ...item,
      stock,
      amountToBuy: Number(amountToBuy.toFixed(2)),
      finalCost: pricePerUnit * amountToBuy
    };
  });

  const totalEstimated = shoppingItems.reduce((acc, item) => acc + item.finalCost, 0);

  const handlePrint = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

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
            .no-print { display: none; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${isMobile ? '<div class="no-print" style="text-align: center; padding: 10px; background: #f0f0f0; margin-bottom: 20px; border-radius: 8px;">Gunakan menu browser untuk "Simpan sebagai PDF" atau "Cetak"</div>' : ''}
          <div class="header">
            <h1>Dalia Cake & Bakery</h1>
            <div class="meta">Daftar Belanja Otomatis • ${new Date().toLocaleDateString('id-ID')}</div>
          </div>
          
          <div class="items">
            ${shoppingItems.map(item => `
              <div class="item">
                <div>
                  <div class="item-name">${item.name}</div>
                  <div class="item-amount">
                    Butuh: ${item.amount} ${item.unit} | 
                    Stok: ${item.stock} ${item.unit} | 
                    Beli: ${item.amountToBuy} ${item.unit}
                  </div>
                </div>
                <div class="item-price">${formatCurrency(item.finalCost)}</div>
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
          <script>
            window.onload = () => {
              window.print();
              ${isMobile ? '' : 'setTimeout(() => { window.close(); }, 500);'}
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <div className="space-y-8 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Daftar Belanja Otomatis</h1>
          <p className="text-gray-500">Pilih resep dan jumlah batch untuk menghasilkan daftar belanja</p>
        </div>
        {isGenerated && (
          <button onClick={handlePrint} className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary-dark transition-all shadow-md">
            <Printer size={18} />
            Cetak Daftar
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recipe Selection */}
        <div className={cn("lg:col-span-1 space-y-6", isGenerated && "hidden lg:block")}>
          <section className="pro-card p-8">
            <h2 className="text-xl font-serif font-bold text-stone-800 mb-6 flex items-center gap-2">
              <Plus size={20} className="text-primary" />
              Pilih Resep
            </h2>
            <div className="grid grid-cols-1 gap-2 max-h-[300px] lg:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {recipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => handleAddRecipe(recipe.id)}
                  className="w-full text-left p-4 rounded-2xl border border-stone-50 hover:border-primary hover:bg-primary-light transition-all group"
                >
                  <p className="font-bold text-stone-700 group-hover:text-primary text-sm">{recipe.name}</p>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">{recipe.category}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="pro-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif font-bold text-stone-800">Resep Terpilih</h2>
              <span className="bg-primary-light text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                {selectedRecipes.length} Resep
              </span>
            </div>
            <div className="space-y-3 max-h-[200px] lg:max-h-none overflow-y-auto pr-2 custom-scrollbar">
              {selectedRecipes.length === 0 ? (
                <div className="text-center py-12 bg-stone-50/50 rounded-[24px] border-2 border-dashed border-stone-100">
                  <ShoppingCart size={32} className="mx-auto text-stone-200 mb-2" />
                  <p className="text-stone-400 text-xs font-medium italic">Belum ada resep dipilih.</p>
                </div>
              ) : (
                selectedRecipes.map(sr => {
                  const r = recipes.find(rec => rec.id === sr.recipeId);
                  return (
                    <div key={sr.recipeId} className="flex items-center justify-between gap-3 p-4 bg-stone-50/50 rounded-2xl border border-stone-100 group hover:bg-white hover:shadow-md transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-stone-800 truncate leading-tight">{r?.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => handleUpdateMultiplier(sr.recipeId, -1)} className="p-1.5 hover:bg-primary-light hover:text-primary rounded-lg text-stone-400 transition-colors"><Minus size={14} /></button>
                          <span className="text-xs font-mono font-bold text-primary w-10 text-center bg-white py-1 rounded-lg border border-stone-100">{sr.multiplier}x</span>
                          <button onClick={() => handleUpdateMultiplier(sr.recipeId, 1)} className="p-1.5 hover:bg-primary-light hover:text-primary rounded-full text-stone-400 transition-colors"><Plus size={14} /></button>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveRecipe(sr.recipeId)} className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                    </div>
                  );
                })
              )}
            </div>
            {selectedRecipes.length > 0 && (
              <button
                onClick={() => setIsGenerated(true)}
                className="pro-button w-full mt-8 flex items-center justify-center gap-3 py-4"
              >
                <ShoppingCart size={20} />
                Generate Daftar Belanja
              </button>
            )}
          </section>
        </div>

        {/* Generated List */}
        <div className={cn("lg:col-span-2", !isGenerated && "hidden lg:block")}>
          <AnimatePresence mode="wait">
            {isGenerated ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="pro-card p-8 md:p-10"
              >
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-primary">Daftar Belanja</h2>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Berdasarkan {selectedRecipes.length} resep terpilih</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsGenerated(false)} 
                      className="lg:hidden p-3 bg-stone-100 text-stone-500 rounded-full hover:bg-stone-200 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                    <button onClick={handlePrint} className="pro-button flex items-center gap-2 px-6">
                      <Printer size={18} />
                      <span className="hidden sm:inline">Cetak Daftar</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1 mb-10">
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50">
                    <div className="col-span-5">Bahan Baku</div>
                    <div className="col-span-2 text-center">Butuh</div>
                    <div className="col-span-2 text-center">Stok Ada</div>
                    <div className="col-span-3 text-right">Beli & Estimasi</div>
                  </div>
                  {shoppingItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 md:gap-4 p-6 border-b border-stone-50 hover:bg-stone-50/50 transition-colors rounded-2xl group">
                      <div className="col-span-5 flex items-center gap-4">
                        <div className="w-6 h-6 rounded-full border-2 border-stone-100 flex items-center justify-center group-hover:border-primary transition-colors shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-20 transition-opacity"></div>
                        </div>
                        <p className="font-bold text-sm md:text-base text-stone-800 truncate">{item.name}</p>
                      </div>
                      
                      <div className="col-span-2 flex md:flex-col justify-between items-center md:items-center">
                        <span className="md:hidden text-[10px] font-bold text-stone-400 uppercase tracking-widest">Butuh</span>
                        <p className="text-xs md:text-sm text-stone-500 font-bold font-mono">{item.amount} {item.unit}</p>
                      </div>

                      <div className="col-span-2 flex md:flex-col justify-between items-center">
                        <span className="md:hidden text-[10px] font-bold text-stone-400 uppercase tracking-widest">Stok Ada</span>
                        <div className="relative w-28 md:w-full">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={stockValues[item.id] !== undefined ? stockValues[item.id] : ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(',', '.');
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                setStockValues(prev => ({ ...prev, [item.id]: val }));
                              }
                            }}
                            placeholder="0"
                            className="w-full px-3 py-2 text-center bg-white border border-stone-100 rounded-xl outline-none text-xs font-bold font-mono focus:border-primary transition-all"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-stone-400 font-bold uppercase">{item.unit}</span>
                        </div>
                      </div>

                      <div className="col-span-3 flex md:flex-col justify-between items-center md:items-end">
                        <span className="md:hidden text-[10px] font-bold text-primary uppercase tracking-widest">Beli & Estimasi</span>
                        <div className="text-right">
                          <p className="font-bold text-sm text-primary font-mono">{item.amountToBuy} {item.unit}</p>
                          <p className="font-mono font-bold text-[10px] text-stone-400 mt-0.5">{formatCurrency(item.finalCost)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-8 rounded-[32px] flex items-center justify-between shadow-sm border border-line">
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Estimasi Belanja</p>
                    <p className="text-3xl md:text-4xl font-mono font-bold text-primary tracking-tighter">{formatCurrency(totalEstimated)}</p>
                  </div>
                  <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center text-primary shadow-inner border border-pink-100">
                    <CheckCircle2 size={32} />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-stone-50/30 rounded-[40px] border-2 border-dashed border-stone-100 text-center">
                <div className="w-24 h-24 bg-white rounded-full shadow-sm mb-6 flex items-center justify-center text-stone-200 border border-stone-50">
                  <ShoppingCart size={48} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-stone-300">Daftar Belanja Belum Dibuat</h3>
                <p className="text-stone-400 max-w-xs mx-auto mt-3 text-sm leading-relaxed">
                  Pilih beberapa resep di sebelah kiri dan klik tombol <span className="text-primary font-bold">Generate</span> untuk melihat daftar belanjaan Anda secara otomatis.
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
