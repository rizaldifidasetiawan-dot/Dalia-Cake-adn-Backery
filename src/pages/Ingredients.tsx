import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Ingredient } from '../types';
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Ingredients: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ingToDelete, setIngToDelete] = useState<string | null>(null);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [formData, setFormData] = useState({ name: '', unit: 'gr', price: 0, baseQuantity: 1 });

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
    try {
      if (editingIng) {
        await updateDoc(doc(db, 'ingredients', editingIng.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'ingredients'), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
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
        await deleteDoc(doc(db, 'ingredients', ingToDelete));
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
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Bahan Baku</h1>
          <p className="text-gray-500">Kelola harga dan unit bahan baku</p>
        </div>
        <button
          onClick={() => {
            setEditingIng(null);
            setFormData({ name: '', unit: 'gr', pricePerUnit: 0 });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-primary text-white py-3 px-6 rounded-full hover:bg-primary-dark transition-all shadow-md"
        >
          <Plus size={20} />
          Tambah Bahan
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Cari bahan baku..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((ing) => (
          <motion.div
            layout
            key={ing.id}
            className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-gray-800">{ing.name}</h3>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteClick(ing.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Harga per {ing.baseQuantity} {ing.unit}</p>
              <p className="text-2xl font-mono font-bold text-primary">{formatCurrency(ing.price)}</p>
              <p className="text-[10px] text-gray-400 font-bold">({formatCurrency(ing.price / (ing.baseQuantity || 1))} / {ing.unit})</p>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-primary-light">
                <h2 className="text-xl font-bold text-primary">
                  {editingIng ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Nama Bahan</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Contoh: Tepung Terigu"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none bg-white"
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
                      type="number"
                      min="1"
                      value={formData.baseQuantity}
                      onChange={(e) => setFormData({ ...formData, baseQuantity: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Contoh: 500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Harga per Jumlah Unit</label>
                  <input
                    required
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Contoh: 10000"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg"
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Hapus Bahan Baku?</h2>
              <p className="text-gray-500 mb-6">Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-100"
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
