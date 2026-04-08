import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AppUser } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function logActivity(
  user: AppUser,
  action: string,
  details: string,
  type: 'info' | 'warning' | 'error' | 'success' = 'info'
) {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      action,
      details,
      type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
