import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, getDocs, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { ActivityLog, DeviceSession } from '../types';
import { useAuth } from '../lib/auth';
import { logActivity, handleFirestoreError, OperationType } from '../lib/utils';
import { Shield, Clock, User, Info, AlertTriangle, CheckCircle, Search, Filter, Trash2, X, Smartphone, Monitor, Tablet, Globe, Power } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const ActivityLogs: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'devices'>('logs');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isWarningDismissed, setIsWarningDismissed] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000); // Update every 30s for online status
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Logs subscription
    const qLogs = query(
      collection(db, 'activity_logs'),
      orderBy('timestamp', 'desc'),
      limit(200)
    );

    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching logs:", error);
      handleFirestoreError(error, OperationType.LIST, 'activity_logs');
      setLoading(false);
    });

    // Devices subscription
    const qDevices = query(collection(db, 'device_sessions'), orderBy('lastActive', 'desc'));
    const unsubDevices = onSnapshot(qDevices, (snapshot) => {
      setDevices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeviceSession)));
    }, (error) => {
      console.error("Error fetching devices:", error);
      handleFirestoreError(error, OperationType.LIST, 'device_sessions');
    });

    return () => {
      unsubLogs();
      unsubDevices();
    };
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="text-amber-500" size={18} />;
      case 'error': return <AlertTriangle className="text-red-500" size={18} />;
      case 'success': return <CheckCircle className="text-emerald-500" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-amber-50 border-amber-100';
      case 'error': return 'bg-red-50 border-red-100';
      case 'success': return 'bg-emerald-50 border-emerald-100';
      default: return 'bg-blue-50 border-blue-100';
    }
  };

  const handleDeleteLogs = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    setIsDeleting(true);
    try {
      const q = query(collection(db, 'activity_logs'));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(doc(db, 'activity_logs', d.id));
      });
      
      await batch.commit();
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting logs:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const suspiciousActivities = logs.filter(log => {
    const isSuspiciousAction = ['Delete User', 'Update User', 'Hapus Resep', 'Hapus Bahan'].includes(log.action);
    const isError = log.type === 'error';
    const isWarning = log.type === 'warning';
    
    // Detect multiple failed attempts or high-risk actions
    return isSuspiciousAction || isError || isWarning;
  });

  const getDeviceIcon = (deviceName: string) => {
    const name = deviceName.toLowerCase();
    if (name.includes('iphone') || name.includes('android')) return <Smartphone size={20} />;
    if (name.includes('ipad') || name.includes('tablet')) return <Tablet size={20} />;
    if (name.includes('windows') || name.includes('mac') || name.includes('pc')) return <Monitor size={20} />;
    return <Globe size={20} />;
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      await updateDoc(doc(db, 'device_sessions', deviceId), {
        revoked: true,
        lastActive: new Date().toISOString()
      });
      await logActivity(currentUser, 'Revoke Device', `Mencabut akses perangkat ID: ${deviceId}`, 'warning');
    } catch (error) {
      console.error("Error revoking device:", error);
    }
  };

  const handleRestoreDevice = async (deviceId: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      await updateDoc(doc(db, 'device_sessions', deviceId), {
        revoked: false,
        lastActive: new Date().toISOString()
      });
      await logActivity(currentUser, 'Restore Device', `Memulihkan akses perangkat ID: ${deviceId}`, 'success');
    } catch (error) {
      console.error("Error restoring device:", error);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || log.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
            <Shield size={32} />
            Log Aktivitas & Perangkat
          </h1>
          <p className="text-stone-400">Monitor aktivitas dan kelola perangkat yang terhubung.</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-stone-100 p-1 rounded-2xl flex">
            <button
              onClick={() => setActiveTab('logs')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === 'logs' ? "bg-white text-primary shadow-sm" : "text-stone-400 hover:text-stone-600"
              )}
            >
              Log Aktivitas
            </button>
            <button
              onClick={() => setActiveTab('devices')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === 'devices' ? "bg-white text-primary shadow-sm" : "text-stone-400 hover:text-stone-600"
              )}
            >
              Perangkat ({devices.length})
            </button>
          </div>
          {currentUser?.role === 'admin' && activeTab === 'logs' && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-red-500 rounded-2xl font-bold hover:bg-red-100 transition-all border border-red-100"
            >
              <Trash2 size={18} />
              Hapus Semua Log
            </button>
          )}
        </div>
      </header>

      {activeTab === 'logs' && suspiciousActivities.length > 0 && !isWarningDismissed && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-amber-50 border border-amber-200 p-6 rounded-[24px] flex items-start gap-4 relative group"
        >
          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-amber-800">Aktivitas Mencurigakan Terdeteksi</h3>
            <p className="text-amber-700 text-sm mb-3">Terdapat {suspiciousActivities.length} aktivitas yang memerlukan perhatian Anda (Error, Warning, atau Penghapusan Data).</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setFilterType('warning')}
                className="text-xs font-bold text-amber-800 underline hover:text-amber-900"
              >
                Lihat Aktivitas Peringatan
              </button>
              <button 
                onClick={() => setIsWarningDismissed(true)}
                className="text-xs font-bold text-stone-400 hover:text-stone-600 transition-colors"
              >
                Abaikan Peringatan
              </button>
            </div>
          </div>
          <button 
            onClick={() => setIsWarningDismissed(true)}
            className="absolute top-4 right-4 p-2 text-amber-400 hover:text-amber-600 transition-colors"
            title="Tutup"
          >
            <X size={20} />
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {activeTab === 'logs' ? (
          <>
            <div className="md:col-span-1 space-y-6">
          <section className="pro-card p-6 space-y-4">
            <h2 className="text-lg font-bold text-stone-700 flex items-center gap-2">
              <Filter size={20} className="text-primary" />
              Filter
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Cari</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                  <input
                    type="text"
                    placeholder="Cari log..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pro-input pl-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Tipe</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pro-input text-sm"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
          </section>

          <section className="bg-primary/5 p-6 rounded-[24px] border border-primary/10">
            <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
              <Info size={16} />
              Statistik
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-stone-500">Total Log</span>
                <span className="font-bold text-stone-700">{logs.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-500">Hari Ini</span>
                <span className="font-bold text-stone-700">
                  {logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-2 border-t border-stone-100 mt-2">
                <span className="text-stone-500">Total Perangkat</span>
                <span className="font-bold text-primary">{devices.length}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="md:col-span-3">
          <section className="pro-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Waktu</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Pengguna</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Aksi</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  <AnimatePresence mode="popLayout">
                    {filteredLogs.map((log) => (
                      <motion.tr 
                        key={log.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-stone-50/30 transition-colors group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-stone-500">
                            <Clock size={14} />
                            <span className="text-xs font-mono">
                              {new Date(log.timestamp).toLocaleString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                day: '2-digit',
                                month: '2-digit'
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400">
                              <User size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-stone-700 leading-none">{log.displayName}</p>
                              <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">{log.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider",
                            getBgColor(log.type)
                          )}>
                            {getIcon(log.type)}
                            <span className="text-stone-700">{log.action}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-stone-500 line-clamp-2 max-w-xs">{log.details}</p>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {filteredLogs.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-stone-400 text-sm">Tidak ada log aktivitas yang ditemukan.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </>
    ) : (
      <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <motion.div
                layout
                key={device.id}
                className={cn(
                  "pro-card p-6 relative overflow-hidden group",
                  device.revoked && "opacity-60 grayscale"
                )}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm",
                      device.revoked ? "bg-stone-100 text-stone-400 border-stone-200" : "bg-primary-light text-primary border-pink-100"
                    )}>
                      {getDeviceIcon(device.deviceName)}
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-stone-800">{device.deviceName}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{device.platform}</span>
                        {device.isInstalled && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[8px] font-bold uppercase tracking-widest">
                            Terinstall (PWA)
                          </span>
                        )}
                        {!device.revoked && (new Date(now).getTime() - new Date(device.lastActive).getTime() < 180000) && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[8px] font-bold uppercase tracking-widest animate-pulse">
                            <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                            Online
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {currentUser?.role === 'admin' && (
                    <div className="flex gap-2 relative z-10">
                      {device.revoked ? (
                        <button
                          onClick={() => handleRestoreDevice(device.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all text-[10px] font-bold uppercase tracking-widest border border-emerald-100 shadow-sm"
                          title="Izinkan Akses Kembali"
                        >
                          <CheckCircle size={14} />
                          Izinkan
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRevokeDevice(device.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all text-[10px] font-bold uppercase tracking-widest border border-red-100"
                          title="Cabut Akses Perangkat"
                        >
                          <Power size={14} />
                          Cabut
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Pengguna</span>
                      <span className="text-xs font-bold text-stone-700">{device.displayName} (@{device.username})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Aktif Terakhir</span>
                      <span className="text-xs font-mono text-stone-500">
                        {(() => {
                          const diff = new Date(now).getTime() - new Date(device.lastActive).getTime();
                          if (diff < 60000) return 'Baru saja';
                          if (diff < 3600000) return `${Math.floor(diff / 60000)}m lalu`;
                          if (diff < 86400000) return `${Math.floor(diff / 3600000)}j lalu`;
                          return new Date(device.lastActive).toLocaleDateString('id-ID');
                        })()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-[8px] text-stone-300 font-mono break-all line-clamp-1">
                    ID: {device.deviceId}
                  </div>
                </div>

                {device.revoked && (
                  <div className="absolute inset-0 bg-stone-900/5 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
                    <div className="bg-white px-4 py-2 rounded-full shadow-xl border border-stone-100 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-red-500" />
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Akses Dicabut</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            {devices.length === 0 && (
              <div className="col-span-full p-20 text-center pro-card border-dashed border-stone-200">
                <Smartphone size={48} className="mx-auto text-stone-200 mb-4" />
                <p className="text-stone-400 font-serif italic">Belum ada perangkat yang terdaftar.</p>
              </div>
            )}
          </div>
        )}
      </div>
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
              <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">Hapus Semua Log?</h2>
              <p className="text-stone-500 text-sm mb-8">Tindakan ini akan menghapus seluruh riwayat aktivitas secara permanen.</p>
              <div className="flex gap-4">
                <button
                  disabled={isDeleting}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-stone-400 hover:bg-stone-50 transition-all uppercase tracking-widest text-[10px]"
                >
                  Batal
                </button>
                <button
                  disabled={isDeleting}
                  onClick={handleDeleteLogs}
                  className="flex-1 py-4 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-100 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Hapus Semua'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivityLogs;
