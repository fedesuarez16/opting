'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';

type UserRole = 'admin' | 'general_manager' | 'branch_manager';

interface UserData {
  uid: string;
  email: string;
  role: UserRole;
  empresaId?: string;
  sucursalId?: string;
  empresaNombre?: string;
  sucursalNombre?: string;
  createdAt?: string;
  emailVerified?: boolean;
  disabled?: boolean;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

export default function UsuariosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Verificar rol del usuario y redirigir si no es admin
  useEffect(() => {
    const checkUserRole = async () => {
      if (authLoading || !user) {
        return;
      }
      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUserRole(userData.role);
          if (userData.role !== 'admin') {
            router.push('/dashboard');
            return;
          }
        } else {
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Error checking user role:', err);
        router.push('/dashboard');
      }
    };
    checkUserRole();
  }, [user, authLoading, router]);

  // Obtener todos los usuarios desde la API (que combina Authentication y Realtime Database)
  const fetchUsers = async () => {
    if (userRole !== 'admin') return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/users/list');
      const data = await response.json();
      
      if (data.success && data.users) {
        // Ordenar por fecha de creación (más recientes primero)
        const sortedUsers = [...data.users].sort((a: UserData, b: UserData) => {
          const dateA = a.metadata?.creationTime 
            ? new Date(a.metadata.creationTime).getTime() 
            : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const dateB = b.metadata?.creationTime 
            ? new Date(b.metadata.creationTime).getTime() 
            : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return dateB - dateA;
        });
        
        setUsers(sortedUsers);
      } else {
        console.error('Error fetching users:', data.error);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === 'admin') {
      fetchUsers();
    }
  }, [userRole]);

  // Función para eliminar usuario
  const handleDeleteUser = async (uid: string, email: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${email}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingUserId(uid);
    try {
      const response = await fetch(`/api/users/delete?uid=${uid}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Recargar la lista de usuarios
        await fetchUsers();
      } else {
        alert(`Error al eliminar usuario: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar usuario');
    } finally {
      setDeletingUserId(null);
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'general_manager':
        return 'Gerente General';
      case 'branch_manager':
        return 'Gerente de Sucursal';
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'general_manager':
        return 'bg-blue-100 text-blue-800';
      case 'branch_manager':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading || loading || userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 lg:p-8 bg-white min-h-full'>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Usuarios Registrados</h1>
          <p className="mt-2 text-sm text-gray-600">Lista de todos los usuarios y sus vínculos con empresas y sucursales</p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No hay usuarios registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Rol</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Empresa</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Sucursal</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Fecha de Registro</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((userData) => (
                  <tr key={userData.uid} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{userData.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(userData.role)}`}>
                        {getRoleLabel(userData.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {userData.empresaNombre || (userData.empresaId ? userData.empresaId : '-')}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {userData.sucursalNombre || (userData.sucursalId ? userData.sucursalId : '-')}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {userData.metadata?.creationTime
                        ? new Date(userData.metadata.creationTime).toLocaleDateString('es-AR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : userData.createdAt 
                        ? new Date(userData.createdAt).toLocaleDateString('es-AR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteUser(userData.uid, userData.email)}
                        disabled={deletingUserId === userData.uid || userData.uid === user?.uid}
                        className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title={userData.uid === user?.uid ? 'No puedes eliminar tu propio usuario' : 'Eliminar usuario'}
                      >
                        {deletingUserId === userData.uid ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>Total de usuarios: {users.length}</p>
      </div>
    </div>
  );
}
