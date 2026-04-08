import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Recipe, Ingredient } from '../types';
import { Plus, Search, ChefHat, Eye, Trash2, Filter, Scale, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/auth';

const Recipes: React.FC = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'recipes'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe)));
      },
      (error) => {
        console.error("Recipes snapshot error:", error);
      }
    );
    return () => unsub();
  }, []);

  const categories = ['Semua', ...Array.from(new Set(recipes.map(r => r.category)))];

  const filtered = recipes.filter(r => 
    (categoryFilter === 'Semua' || r.category === categoryFilter) &&
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRecipeToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (recipeToDelete) {
      try {
        await deleteDoc(doc(db, 'recipes', recipeToDelete));
        setIsDeleteModalOpen(false);
        setRecipeToDelete(null);
      } catch (error) {
        console.error('Error deleting recipe:', error);
      }
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-bold text-primary">Manajemen Resep</h1>
          <p className="text-stone-500 text-sm">Kelola koleksi resep roti dan masakan Dalia Bakery secara profesional.</p>
        </div>
        {user?.role === 'admin' && (
          <Link
            to="/recipes/new"
            className="hidden md:flex pro-button items-center justify-center gap-2"
          >
            <Plus size={20} />
            Tambah Resep
          </Link>
        )}
      </header>

      {/* Mobile FAB */}
      {user?.role === 'admin' && (
        <Link
          to="/recipes/new"
          className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl z-40 active:scale-95 transition-transform"
        >
          <Plus size={28} />
        </Link>
      )}

      <div className="pro-card p-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            placeholder="Cari resep..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pro-input pl-12 py-3"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap",
                categoryFilter === cat 
                  ? "bg-primary text-white border-primary shadow-md" 
                  : "bg-stone-50 text-stone-400 border-transparent hover:border-pink-200 hover:text-primary"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((recipe) => (
          <Link
            key={recipe.id}
            to={`/recipes/${recipe.id}`}
            className="group pro-card overflow-hidden hover:border-primary/30 transition-all duration-300 flex flex-col"
          >
            <div className="p-8 flex-1 space-y-4">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-primary-light text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
                  {recipe.category}
                </span>
                {user?.role === 'admin' && (
                  <button 
                    onClick={(e) => handleDeleteClick(e, recipe.id)}
                    className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <h3 className="text-2xl font-serif font-bold text-stone-800 group-hover:text-primary transition-colors leading-tight">
                {recipe.name}
              </h3>
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-stone-50">
                <div className="flex items-center gap-2">
                  <ChefHat size={14} className="text-primary" />
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{recipe.ingredients.length} Bahan</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Scale size={14} className="text-primary" />
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Yield: {recipe.yield} {recipe.yieldUnit}</span>
                </div>
              </div>
            </div>
            <div className="px-8 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between group-hover:bg-primary-light transition-colors">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest group-hover:text-primary">
                Lihat Detail
              </span>
              <Eye size={18} className="text-stone-300 group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ))}
      </div>

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
              <h2 className="text-xl font-bold text-stone-800 mb-2">Hapus Resep?</h2>
              <p className="text-stone-400 text-sm mb-8">Tindakan ini tidak dapat dibatalkan.</p>
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

export default Recipes;
