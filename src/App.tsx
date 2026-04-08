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
import ActivityLogs from './pages/ActivityLogs';
import MakeRecipe from './pages/MakeRecipe';
import HPP from './pages/HPP';
import Cashier from './pages/Cashier';

const ProtectedRoute = ({ 
  children, 
  allowedRoles = ['admin', 'staff', 'kasir', 'custom'],
  path
}: { 
  children: React.ReactNode, 
  allowedRoles?: ('admin' | 'staff' | 'kasir' | 'custom')[],
  path?: string
}) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" />;
  
  if (user.role === 'custom' && path) {
    if (!user.allowedPages?.includes(path)) {
      // Find first allowed page or go home
      const firstPage = user.allowedPages?.[0] || "/";
      return <Navigate to={firstPage} />;
    }
    return <>{children}</>;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'staff') return <Navigate to="/make-recipe" />;
    if (user.role === 'kasir') return <Navigate to="/cashier" />;
    if (user.role === 'custom') return <Navigate to={user.allowedPages?.[0] || "/"} />;
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
                <ProtectedRoute allowedRoles={['admin', 'custom']} path="/">
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recipes" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'custom']} path="/recipes">
                  <Recipes />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recipes/:id" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'custom']} path="/recipes">
                  <RecipeDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/make-recipe" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'staff', 'custom']} path="/make-recipe">
                  <MakeRecipe />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hpp" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'custom']} path="/hpp">
                  <HPP />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cashier" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'kasir', 'custom']} path="/cashier">
                  <Cashier />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ingredients" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'custom']} path="/ingredients">
                  <Ingredients />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/shopping-list" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'custom']} path="/shopping-list">
                  <ShoppingList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/users" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'custom']} path="/users">
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/activity-logs" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'custom']} path="/activity-logs">
                  <ActivityLogs />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}
