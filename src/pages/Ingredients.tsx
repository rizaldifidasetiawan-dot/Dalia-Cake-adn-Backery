import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Ingredient } from '../types';
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react';
import { formatCurrency, cn, logActivity } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { motion, AnimatePresence } from 'motion/react';

const Ingredients: React.FC = () => {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ingToDelete, setIngToDelete] = useState<string | null>(null);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [formData, setFormData] = useState({ name: '', unit: 'gr', price: 0, baseQuantity: 1 });
  const [tempValues, setTempValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'ingredients'), 
      (snapshot) => {
        setIngredients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient)));
      },
      (error) => {
        console.error("Ingredients snapshot error:", error);
      }
    );
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicate name (case-insensitive)
    const isDuplicate = ingredients.some(ing => 
      ing.name.toLowerCase() === formData.name.toLowerCase() && 
      (!editingIng || ing.id !== editingIng.id)
    );

    if (isDuplicate) {
      alert('Bahan baku dengan nama tersebut sudah ada.');
      return;
    }

    try {
      if (editingIng) {
        await updateDoc(doc(db, 'ingredients', editingIng.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        if (user) {
          await logActivity(user, 'Update Bahan Baku', `Mengubah bahan baku: ${formData.name}`, 'info');
        }
      } else {
        await addDoc(collection(db, 'ingredients'), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        if (user) {
          await logActivity(user, 'Tambah Bahan Baku', `Menambah bahan baku baru: ${formData.name}`, 'success');
        }
      }
      setIsModalOpen(false);
      setEditingIng(null);
      setFormData({ name: '', unit: 'gr', price: 0, baseQuantity: 1 });
    } catch (error) {
      console.error('Error saving ingredient:', error);
    }
  };

  const handleDeleteClick = (id: string) => {
    setIngToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (ingToDelete) {
      try {
        const ing = ingredients.find(i => i.id === ingToDelete);
        await deleteDoc(doc(db, 'ingredients', ingToDelete));
        if (user && ing) {
          await logActivity(user, 'Hapus Bahan Baku', `Menghapus bahan baku: ${ing.name}`, 'warning');
        }
        setIsDeleteModalOpen(false);
        setIngToDelete(null);
      } catch (error) {
        console.error('Error deleting ingredient:', error);
      }
    }
  };

  const filtered = ingredients.filter(ing => 
    ing.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-bold text-primary">Bahan Baku</h1>
          <p className="text-stone-500 text-sm">Kelola harga dan unit bahan baku produksi Anda secara profesional.</p>
        </div>
        <button
          onClick={() => {
            setEditingIng(null);
            setFormData({ name: '', unit: 'gr', price: 0, baseQuantity: 1 });
            setIsModalOpen(true);
          }}
          className="hidden md:flex pro-button items-center justify-center gap-2"
        >
          <Plus size={20} />
          Tambah Bahan
        </button>
      </header>

      {/* Mobile FAB */}
      <button
        onClick={() => {
          setEditingIng(null);
          setFormData({ name: '', unit: 'gr', price: 0, baseQuantity: 1 });
          setIsModalOpen(true);
        }}
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl z-40 active:scale-95 transition-transform"
      >
        <Plus size={28} />
      </button>

      <div className="pro-card p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            placeholder="Cari bahan baku..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pro-input pl-12 py-3"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((ing) => (
          <motion.div
            layout
            key={ing.id}
            className="pro-card p-6 flex flex-col justify-between group hover:border-primary/30 transition-all"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-stone-800 group-hover:text-primary transition-colors">{ing.name}</h3>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Bahan Baku</p>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => {
                      setEditingIng(ing);
                      setFormData({ 
                        name: ing.name, 
                        unit: ing.unit, 
                        price: ing.price || 0, 
                        baseQuantity: ing.baseQuantity || 1 
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-stone-400 hover:text-primary hover:bg-primary-light rounded-xl transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(ing.id)}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 py-4 border-y border-stone-50">
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Harga per {ing.baseQuantity} {ing.unit}</p>
                  <p className="text-2xl font-mono font-bold text-primary">{formatCurrency(ing.price)}</p>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">
                    {formatCurrency(ing.price / (ing.baseQuantity || 1))} / {ing.unit}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Aktif</span>
              </div>
              <p className="text-[10px] font-mono text-stone-300">ID: {ing.id.slice(0, 8)}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-stone-400/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md pro-card overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
            >
              <div className="flex justify-between items-center p-8 border-b border-stone-50 bg-stone-50/50 shrink-0">
                <h2 className="text-2xl font-serif font-bold text-stone-800">
                  {editingIng ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors text-stone-400">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Nama Bahan</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pro-input"
                    placeholder="Contoh: Tepung Terigu"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
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
                      value={tempValues['baseQuantity'] !== undefined ? tempValues['baseQuantity'] : (formData.baseQuantity === 0 ? '' : formData.baseQuantity.toString())}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setTempValues(prev => ({ ...prev, baseQuantity: val }));
                          setFormData({ ...formData, baseQuantity: val === '' ? 0 : parseFloat(val) });
                        }
                      }}
                      onBlur={() => setTempValues(prev => {
                        const n = { ...prev };
                        delete n.baseQuantity;
                        return n;
                      })}
                      className="pro-input"
                      placeholder="Contoh: 500"
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
                      value={tempValues['price'] !== undefined ? tempValues['price'] : (formData.price === 0 ? '' : formData.price.toString())}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setTempValues(prev => ({ ...prev, price: val }));
                        setFormData({ ...formData, price: val === '' ? 0 : parseInt(val) });
                      }}
                      onBlur={() => setTempValues(prev => {
                        const n = { ...prev };
                        delete n.price;
                        return n;
                      })}
                      className="pro-input pl-10"
                      placeholder="Contoh: 10000"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="pro-button w-full flex items-center justify-center gap-2 py-4"
                >
                  <Save size={20} />
                  Simpan Bahan Baku
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-stone-400/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white w-full max-w-sm pro-card p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-stone-800 mb-2">Hapus Bahan Baku?</h2>
              <p className="text-stone-400 text-sm mb-8">Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi resep yang menggunakan bahan ini.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-stone-400 hover:bg-stone-50 transition-all uppercase tracking-widest text-[10px]"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-100 uppercase tracking-widest text-[10px]"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Ingredients;
