import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { Recipe } from '../types';
import { useAuth } from '../lib/auth';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  Banknote,
  X,
  CheckCircle2,
  Settings,
  Save
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CartItem {
  recipeId: string;
  name: string;
  price: number;
  quantity: number;
}

interface ReceiptSettings {
  storeName: string;
  address: string;
  phone: string;
  footer: string;
}

const Cashier: React.FC = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
    storeName: 'DALIA BAKERY',
    address: 'Jl. Contoh No. 123, Kota',
    phone: '0812-3456-7890',
    footer: 'Terima Kasih, Selamat Menikmati!'
  });
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe)));
    });

    const loadSettings = async () => {
      const docRef = doc(db, 'settings', 'receipt');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setReceiptSettings(docSnap.data() as ReceiptSettings);
      }
    };
    loadSettings();

    return () => unsub();
  }, []);

  const saveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'receipt'), receiptSettings);
      setIsSettingsModalOpen(false);
    } catch (error) {
      console.error("Error saving receipt settings:", error);
    }
  };

  const addToCart = (recipe: Recipe) => {
    const price = recipe.sellingPrice || 0;
    setCart(prev => {
      const existing = prev.find(item => item.recipeId === recipe.id);
      if (existing) {
        return prev.map(item => 
          item.recipeId === recipe.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { recipeId: recipe.id, name: recipe.name, price, quantity: 1 }];
    });
  };

  const updateQuantity = (recipeId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.recipeId === recipeId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (recipeId: string) => {
    setCart(prev => prev.filter(item => item.recipeId !== recipeId));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const change = paymentAmount > 0 ? paymentAmount - total : 0;

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Struk Pembayaran - Dalia Bakery</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; 
              padding: 10mm; 
              font-size: 12px;
              line-height: 1.4;
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .mt-4 { margin-top: 15px; }
            .mb-2 { margin-bottom: 5px; }
            .no-print { display: none; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${isMobile ? '<div class="no-print text-center" style="padding: 10px; background: #f0f0f0; margin-bottom: 20px; font-family: sans-serif; border-radius: 8px;">Gunakan menu browser untuk "Simpan sebagai PDF" atau "Cetak"</div>' : ''}
          ${printContent.innerHTML}
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
  };

  const finishTransaction = () => {
    setCart([]);
    setCustomerName('');
    setPaymentAmount(0);
    setIsReceiptModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
            <Banknote size={32} />
            Kasir Dalia Bakery
          </h1>
          <p className="text-stone-500 text-sm">Pilih produk dan cetak struk pembayaran untuk pelanggan.</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="pro-button-secondary flex items-center justify-center gap-2"
          >
            <Settings size={20} />
            Pengaturan Struk
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product Selection */}
        <div className={cn("lg:col-span-2 space-y-6", isCartOpen && "hidden lg:block")}>
          <section className="pro-card p-6 md:p-8">
            <div className="relative mb-8">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
              <input
                type="text"
                placeholder="Cari produk berdasarkan nama atau kategori..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pro-input pl-14 py-4"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {filteredRecipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => addToCart(recipe)}
                  className="bg-white p-5 rounded-[28px] border border-stone-100 hover:border-primary hover:shadow-xl hover:shadow-pink-100/50 transition-all text-left group flex flex-col justify-between h-full relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    <div className="p-2 bg-primary text-white rounded-xl shadow-lg shadow-pink-200">
                      <Plus size={16} />
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest bg-primary-light px-3 py-1 rounded-full mb-3 inline-block border border-pink-100">
                      {recipe.category}
                    </span>
                    <h3 className="font-serif font-bold text-base text-stone-800 mb-1 group-hover:text-primary transition-colors line-clamp-2 leading-tight">{recipe.name}</h3>
                  </div>
                  <div className="mt-6 pt-4 border-t border-stone-50 flex items-center justify-between">
                    <p className="font-mono font-bold text-sm text-stone-700">{formatCurrency(recipe.sellingPrice || 0)}</p>
                    <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center text-stone-300 group-hover:bg-primary-light group-hover:text-primary transition-colors">
                      <Plus size={14} />
                    </div>
                  </div>
                </button>
              ))}
              {filteredRecipes.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-stone-200">
                    <Search size={40} />
                  </div>
                  <p className="text-stone-400 font-serif italic">Produk tidak ditemukan.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Shopping Cart */}
        <div className={cn("space-y-6", !isCartOpen && "hidden lg:block")}>
          <section className="pro-card p-8 flex flex-col h-[calc(100vh-200px)] lg:h-[calc(100vh-250px)] lg:sticky lg:top-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-light text-primary rounded-xl">
                  <ShoppingCart size={20} />
                </div>
                <h2 className="text-xl font-serif font-bold text-stone-800">Keranjang</h2>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="lg:hidden p-2 text-stone-400 hover:bg-stone-50 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-24 h-24 bg-stone-50 rounded-full flex items-center justify-center text-stone-200">
                    <ShoppingCart size={48} />
                  </div>
                  <p className="text-stone-400 font-serif italic text-sm">Keranjang masih kosong</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.recipeId} className="flex items-center gap-4 p-4 rounded-2xl bg-stone-50/50 border border-stone-100 group transition-all hover:bg-white hover:shadow-md">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-stone-800 truncate leading-tight mb-1">{item.name}</p>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-stone-100 shadow-sm">
                      <button 
                        onClick={() => updateQuantity(item.recipeId, -1)}
                        className="p-1.5 text-stone-400 hover:text-primary hover:bg-primary-light rounded-lg transition-all"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-mono font-bold text-sm min-w-[20px] text-center text-stone-700">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.recipeId, 1)}
                        className="p-1.5 text-stone-400 hover:text-primary hover:bg-primary-light rounded-lg transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.recipeId)}
                      className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-stone-100 space-y-6">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total Pembayaran</p>
                  <p className="text-3xl font-mono font-bold text-primary leading-none">{formatCurrency(total)}</p>
                </div>
              </div>
              <button
                disabled={cart.length === 0}
                onClick={() => setIsReceiptModalOpen(true)}
                className="pro-button w-full flex items-center justify-center gap-3 py-5 text-base"
              >
                <Printer size={20} />
                Bayar & Cetak Struk
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Mobile Cart FAB */}
      {!isCartOpen && cart.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="lg:hidden fixed bottom-24 right-6 bg-primary text-white p-4 rounded-full shadow-2xl z-40 flex items-center gap-2 animate-bounce"
        >
          <ShoppingCart size={24} />
          <span className="bg-white text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        </button>
      )}

      {/* Receipt Modal */}
      <AnimatePresence>
        {isReceiptModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReceiptModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white w-full max-w-2xl pro-card overflow-hidden flex flex-col md:flex-row"
            >
              {/* Payment Form */}
              <div className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto max-h-[80vh] md:max-h-none">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif font-bold text-primary">Pembayaran</h2>
                  <button onClick={() => setIsReceiptModalOpen(false)} className="p-2 text-stone-400 hover:bg-stone-50 rounded-xl transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Nama Pelanggan</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="pro-input font-bold"
                      placeholder="Umum"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Jumlah Bayar (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 font-bold">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={paymentAmount === 0 ? '' : paymentAmount.toString()}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setPaymentAmount(val === '' ? 0 : parseInt(val));
                        }}
                        className="pro-input pl-14 py-5 font-mono text-2xl"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-stone-50/50 rounded-[32px] border border-stone-100 space-y-4">
                    <div className="flex justify-between text-xs font-bold text-stone-400 uppercase tracking-widest">
                      <span>Total Tagihan</span>
                      <span className="font-mono text-stone-600">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-stone-100">
                      <span className="font-serif font-bold text-lg text-stone-800">Kembalian</span>
                      <span className={cn(
                        "text-3xl font-mono font-bold",
                        change >= 0 ? "text-green-600" : "text-red-500"
                      )}>
                        {formatCurrency(change)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    onClick={handlePrint}
                    className="flex-1 py-4 rounded-2xl font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                  >
                    <Printer size={18} />
                    Cetak Struk
                  </button>
                  <button
                    disabled={paymentAmount < total}
                    onClick={finishTransaction}
                    className="pro-button flex-1 flex items-center justify-center gap-2 py-4"
                  >
                    <CheckCircle2 size={18} />
                    Selesai
                  </button>
                </div>
              </div>

              {/* Desktop Receipt Preview */}
              <div className="hidden md:block w-80 bg-stone-50 p-10 overflow-y-auto border-l border-stone-100">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-6 text-center">Preview Struk</p>
                <div 
                  ref={receiptRef}
                  className="bg-white p-8 shadow-xl shadow-stone-200/50 font-mono text-[10px] text-stone-800 space-y-3 rounded-sm border-t-8 border-primary"
                >
                  <div className="text-center space-y-1">
                    <p className="font-bold text-sm uppercase tracking-tighter">{receiptSettings.storeName}</p>
                    <p className="text-[8px] text-stone-500 leading-tight">{receiptSettings.address}</p>
                    <p className="text-[8px] text-stone-500">Telp: {receiptSettings.phone}</p>
                  </div>
                  
                  <div className="border-t border-dashed border-stone-200 my-4"></div>
                  
                  <div className="space-y-1 text-[8px] text-stone-500">
                    <div className="flex justify-between">
                      <span>Tanggal:</span>
                      <span>{new Date().toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kasir:</span>
                      <span>{user?.displayName || 'Admin'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pelanggan:</span>
                      <span>{customerName || 'Umum'}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-stone-200 my-4"></div>

                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.recipeId} className="space-y-0.5">
                        <p className="font-bold">{item.name}</p>
                        <div className="flex justify-between text-stone-500">
                          <span>{item.quantity} x {formatCurrency(item.price)}</span>
                          <span>{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-stone-200 my-4"></div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between font-bold text-xs">
                      <span>TOTAL:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                      <span>BAYAR:</span>
                      <span>{formatCurrency(paymentAmount)}</span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                      <span>KEMBALI:</span>
                      <span>{formatCurrency(change)}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-stone-200 my-4"></div>

                  <div className="text-center pt-2">
                    <p className="text-[8px] text-stone-400 italic leading-tight">{receiptSettings.footer}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md pro-card overflow-hidden"
            >
              <div className="p-6 border-b border-stone-50 flex justify-between items-center bg-stone-50/50">
                <h2 className="text-xl font-serif font-bold text-stone-800">Pengaturan Struk</h2>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 text-stone-400 hover:bg-white rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Nama Toko</label>
                  <input
                    type="text"
                    value={receiptSettings.storeName}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, storeName: e.target.value })}
                    className="pro-input font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Alamat</label>
                  <input
                    type="text"
                    value={receiptSettings.address}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, address: e.target.value })}
                    className="pro-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">No. Telp</label>
                  <input
                    type="text"
                    value={receiptSettings.phone}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, phone: e.target.value })}
                    className="pro-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Pesan Penutup (Footer)</label>
                  <textarea
                    value={receiptSettings.footer}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, footer: e.target.value })}
                    className="pro-input min-h-[100px] py-4"
                  />
                </div>

                <button
                  onClick={saveSettings}
                  className="pro-button w-full flex items-center justify-center gap-2 py-4"
                >
                  <Save size={20} />
                  Simpan Pengaturan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Cashier;
