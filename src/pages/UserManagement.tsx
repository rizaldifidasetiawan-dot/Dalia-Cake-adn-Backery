import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { AppUser } from '../types';
import { useAuth } from '../lib/auth';
import { cn, logActivity } from '../lib/utils';
import { Plus, Trash2, Edit2, UserPlus, Shield, Key, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState<{
    username: string,
    password: string,
    displayName: string,
    role: 'admin' | 'staff' | 'kasir' | 'custom',
    allowedPages: string[]
  }>({
    username: '',
    password: '',
    displayName: '',
    role: 'staff',
    allowedPages: []
  });

  const AVAILABLE_PAGES = [
    { name: 'Dashboard', path: '/' },
    { name: 'Resep', path: '/recipes' },
    { name: 'Buat Resep', path: '/make-recipe' },
    { name: 'Bahan Baku', path: '/ingredients' },
    { name: 'Kalkulasi HPP', path: '/hpp' },
    { name: 'Kasir', path: '/cashier' },
    { name: 'Daftar Belanja', path: '/shopping-list' },
    { name: 'User Management', path: '/users' },
    { name: 'Log Aktivitas', path: '/activity-logs' },
  ];

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'), 
      (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
      },
      (error) => {
        console.error("Users snapshot error:", error);
      }
    );
    return () => unsub();
  }, []);

  if (currentUser?.role !== 'admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Akses Ditolak. Hanya Admin yang dapat mengakses halaman ini.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), {
          ...formData
        });
        if (currentUser) {
          await logActivity(currentUser, 'Update User', `Mengubah data user: ${formData.displayName} (@${formData.username})`, 'info');
        }
      } else {
        await addDoc(collection(db, 'users'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
        if (currentUser) {
          await logActivity(currentUser, 'Tambah User', `Menambah user baru: ${formData.displayName} (@${formData.username})`, 'success');
        }
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ 
        username: '', 
        password: '', 
        displayName: '', 
        role: 'staff',
        allowedPages: []
      });
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleDeleteClick = (id: string) => {
    const target = users.find(u => u.id === id);
    if (target?.username === 'Dalia') {
      setDeleteError('Admin Utama tidak dapat dihapus!');
      setTimeout(() => setDeleteError(null), 3000);
      return;
    }
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      try {
        const target = users.find(u => u.id === userToDelete);
        await deleteDoc(doc(db, 'users', userToDelete));
        if (currentUser && target) {
          await logActivity(currentUser, 'Hapus User', `Menghapus user: ${target.displayName} (@${target.username})`, 'warning');
        }
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-bold text-primary">User Management</h1>
          <p className="text-stone-500 text-sm">Kelola hak akses dan akun pengguna sistem Dalia Bakery.</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ 
              username: '', 
              password: '', 
              displayName: '', 
              role: 'staff',
              allowedPages: []
            });
            setIsModalOpen(true);
          }}
          className="pro-button flex items-center justify-center gap-2"
        >
          <UserPlus size={20} />
          Tambah User
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u) => (
          <motion.div
            layout
            key={u.id}
            className="pro-card p-6 group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl border shadow-sm",
                  u.role === 'admin' 
                    ? "bg-primary-light text-primary border-pink-100" 
                    : "bg-blue-50 text-blue-600 border-blue-100"
                )}>
                  {u.displayName[0]}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-800">{u.displayName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">@{u.username}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border",
                      u.role === 'admin' 
                        ? "bg-primary-light text-primary border-pink-100" 
                        : u.role === 'custom'
                        ? "bg-amber-50 text-amber-600 border-amber-100"
                        : u.role === 'kasir'
                        ? "bg-blue-50 text-blue-500 border-blue-100"
                        : "bg-stone-100 text-stone-500 border-stone-200"
                    )}>
                      {u.role}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                <button 
                  onClick={() => {
                    setEditingUser(u);
                    setFormData({ 
                      username: u.username, 
                      password: u.password, 
                      displayName: u.displayName, 
                      role: u.role,
                      allowedPages: u.allowedPages || []
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-stone-400 hover:text-primary hover:bg-primary-light rounded-xl transition-all"
                >
                  <Edit2 size={16} />
                </button>
                {u.username !== 'Dalia' && (
                  <button 
                    onClick={() => handleDeleteClick(u.id)}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {deleteError && userToDelete === u.id && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl text-center border border-red-100 animate-pulse">
                {deleteError}
              </div>
            )}

            <div className="p-4 bg-stone-50/50 rounded-2xl border border-stone-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1">
                  <Key size={10} />
                  Password
                </span>
                <span className="font-mono text-xs text-stone-600 font-bold">{u.password}</span>
              </div>
              {u.role === 'custom' && u.allowedPages && u.allowedPages.length > 0 && (
                <div className="pt-2 border-t border-stone-100">
                  <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest mb-2">Akses Halaman:</p>
                  <div className="flex flex-wrap gap-1">
                    {u.allowedPages.map(path => {
                      const page = AVAILABLE_PAGES.find(p => p.path === path);
                      return (
                        <span key={path} className="px-1.5 py-0.5 bg-white border border-stone-100 rounded-md text-[8px] text-stone-600 font-medium">
                          {page?.name || path}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-stone-400/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white w-full max-w-md pro-card overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-stone-50 flex justify-between items-center bg-stone-50/50 shrink-0">
                <h2 className="text-xl font-serif font-bold text-stone-800">
                  {editingUser ? 'Edit User' : 'Tambah User Baru'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors text-stone-400">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                  <input
                    required
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="pro-input"
                    placeholder="Contoh: Ahmad Kasir"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Username</label>
                    <input
                      required
                      type="text"
                      disabled={editingUser?.username === 'Dalia'}
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="pro-input disabled:bg-stone-50 disabled:text-stone-400"
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Role</label>
                    <select
                      disabled={editingUser?.username === 'Dalia'}
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="pro-input bg-white disabled:bg-stone-50 disabled:text-stone-400"
                    >
                      <option value="staff">Staff</option>
                      <option value="kasir">Kasir</option>
                      <option value="admin">Admin</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                {formData.role === 'custom' && (
                  <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1 block mb-2">Izin Akses Halaman</label>
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_PAGES.map((page) => (
                        <label key={page.path} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-stone-100 cursor-pointer hover:border-primary/30 transition-all">
                          <input
                            type="checkbox"
                            checked={formData.allowedPages.includes(page.path)}
                            onChange={(e) => {
                              const newPages = e.target.checked
                                ? [...formData.allowedPages, page.path]
                                : formData.allowedPages.filter(p => p !== page.path);
                              setFormData({ ...formData, allowedPages: newPages });
                            }}
                            className="w-4 h-4 rounded border-stone-300 text-primary focus:ring-primary"
                          />
                          <span className="text-[10px] font-bold text-stone-600 uppercase tracking-tight">{page.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Password</label>
                  <input
                    required
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pro-input"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  className="pro-button w-full flex items-center justify-center gap-2 py-4"
                >
                  <Save size={20} />
                  Simpan User
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-inner">
                <Trash2 size={40} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">Hapus User?</h2>
              <p className="text-stone-500 text-sm mb-8">Tindakan ini tidak dapat dibatalkan dan user akan kehilangan akses sistem.</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-stone-400 hover:bg-stone-50 transition-all uppercase tracking-widest text-[10px]"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-4 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-100 uppercase tracking-widest text-[10px]"
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

export default UserManagement;
