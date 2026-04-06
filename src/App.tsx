import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Recipes from './pages/Recipes';
import RecipeDetail from './pages/RecipeDetail';
import Ingredients from './pages/Ingredients';
import ShoppingList from './pages/ShoppingList';
import UserManagement from './pages/UserManagement';
import MakeRecipe from './pages/MakeRecipe';
import HPP from './pages/HPP';
import Cashier from './pages/Cashier';

const ProtectedRoute = ({ 
  children, 
  allowedRoles = ['admin', 'staff', 'kasir']
}: { 
  children: React.ReactNode, 
  allowedRoles?: ('admin' | 'staff' | 'kasir')[]
}) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" />;
  
  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'staff') return <Navigate to="/make-recipe" />;
    if (user.role === 'kasir') return <Navigate to="/cashier" />;
    return <Navigate to="/recipes" />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route 
              path="/" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recipes" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Recipes />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recipes/:id" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <RecipeDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/make-recipe" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'staff']}>
                  <MakeRecipe />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hpp" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <HPP />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cashier" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'kasir']}>
                  <Cashier />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ingredients" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Ingredients />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/shopping-list" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ShoppingList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/users" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}
