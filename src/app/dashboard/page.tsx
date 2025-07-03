'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

type UserRole = 'admin' | 'general_manager' | 'branch_manager';

interface UserData {
  role: UserRole;
  branchId?: string;
  email: string;
}

interface BranchData {
  name: string;
  [key: string]: any;
}

interface DashboardStats {
  totalUsers?: number;
  totalBranches?: number;
  totalDocuments?: number;
  branchStats?: {
    name: string;
    documents: number;
    users: number;
  }[];
  error?: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Dashboard mounted');
    console.log('Auth loading:', authLoading);
    console.log('User:', user);

    if (!authLoading && !user) {
      console.log('No user, redirecting to login');
      router.push('/login');
      return;
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        console.log('No user available for data fetch');
        return;
      }

      try {
        console.log('Starting data fetch for user:', user.uid);
        
        const userRef = ref(database, `users/${user.uid}`);
        console.log('Fetching from path:', `users/${user.uid}`);
        
        const userSnapshot = await get(userRef);
        console.log('User snapshot:', userSnapshot.exists() ? 'exists' : 'does not exist');
        
        if (!userSnapshot.exists()) {
          console.log('Creating user data for:', user.uid);
          // Create default user data
          await set(userRef, {
            email: user.email,
            role: 'admin', // You can change this to the desired default role
            createdAt: new Date().toISOString(),
          });
          
          // Fetch the newly created user data
          const newUserSnapshot = await get(userRef);
          const userData = newUserSnapshot.val() as UserData;
          setUserRole(userData.role);
          
          // Set initial stats
          setStats({
            totalUsers: 1,
            totalBranches: 0,
            totalDocuments: 0,
          });
          
          setLoading(false);
          return;
        }

        const userData = userSnapshot.val() as UserData;
        console.log('User data:', userData);
        setUserRole(userData.role);

        // Fetch dashboard stats based on role
        if (userData.role === 'admin') {
          console.log('Fetching admin stats');
          const usersRef = ref(database, 'users');
          const branchesRef = ref(database, 'branches');
          const documentsRef = ref(database, 'documents');

          const [usersSnapshot, branchesSnapshot, documentsSnapshot] = await Promise.all([
            get(usersRef),
            get(branchesRef),
            get(documentsRef),
          ]);

          setStats({
            totalUsers: Object.keys(usersSnapshot.val() || {}).length,
            totalBranches: Object.keys(branchesSnapshot.val() || {}).length,
            totalDocuments: Object.keys(documentsSnapshot.val() || {}).length,
          });
        } else if (userData.role === 'general_manager') {
          console.log('Fetching general manager stats');
          const branchesRef = ref(database, 'branches');
          const branchesSnapshot = await get(branchesRef);
          
          const branchStats = [];
          if (branchesSnapshot.exists()) {
            const branchesData = branchesSnapshot.val() as Record<string, BranchData>;
            for (const [branchId, branchData] of Object.entries(branchesData)) {
              const branchDocsRef = ref(database, `documents/${branchId}`);
              const branchUsersRef = ref(database, `users`);
              
              const [docsSnapshot, usersSnapshot] = await Promise.all([
                get(branchDocsRef),
                get(branchUsersRef),
              ]);

              const branchUsers = Object.values(usersSnapshot.val() || {}).filter(
                (user: any) => user.branchId === branchId
              );

              branchStats.push({
                name: branchData.name,
                documents: Object.keys(docsSnapshot.val() || {}).length,
                users: branchUsers.length,
              });
            }
          }

          setStats({ branchStats });
        } else if (userData.role === 'branch_manager' && userData.branchId) {
          console.log('Fetching branch manager stats for branch:', userData.branchId);
          const branchDocsRef = ref(database, `documents/${userData.branchId}`);
          const branchUsersRef = ref(database, 'users');
          
          const [docsSnapshot, usersSnapshot] = await Promise.all([
            get(branchDocsRef),
            get(branchUsersRef),
          ]);

          const branchUsers = Object.values(usersSnapshot.val() || {}).filter(
            (user: any) => user.branchId === userData.branchId
          );

          setStats({
            totalDocuments: Object.keys(docsSnapshot.val() || {}).length,
            totalUsers: branchUsers.length,
          });
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (user && !authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Panel de Administración
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Bienvenido, {user?.email}
        </p>
        
        <div className="mt-8">
          {userRole === 'admin' && (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-3xl">👥</span>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Usuarios
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats.totalUsers || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-3xl">🏢</span>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Empresas
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats.totalBranches || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-3xl">📄</span>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Documentos
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats.totalDocuments || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Empresas */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md mb-8">
                <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Empresas
                  </h3>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    + Agregar Empresa
                  </button>
                </div>
                <ul className="divide-y divide-gray-200">
                  {/* Empresa ejemplo 1 */}
                  <li>
                    <div className="px-4 py-4 flex items-center sm:px-6">
                      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-indigo-600 truncate">
                            Empresa SRL
                          </h4>
                          <p className="mt-1 text-sm text-gray-500">
                            3 Sucursales · 12 Empleados
                          </p>
                        </div>
                        <div className="mt-4 flex-shrink-0 sm:mt-0">
                          <div className="flex overflow-hidden -space-x-1">
                            <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
                            <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
                            <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80" alt="" />
                          </div>
                        </div>
                      </div>
                      <div className="ml-5 flex-shrink-0">
                        <button className="p-1 rounded-full text-gray-400 hover:text-gray-500">
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </li>
                  {/* Empresa ejemplo 2 */}
                  <li>
                    <div className="px-4 py-4 flex items-center sm:px-6">
                      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-indigo-600 truncate">
                            TechSolutions Inc.
                          </h4>
                          <p className="mt-1 text-sm text-gray-500">
                            2 Sucursales · 8 Empleados
                          </p>
                        </div>
                        <div className="mt-4 flex-shrink-0 sm:mt-0">
                          <div className="flex overflow-hidden -space-x-1">
                            <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80" alt="" />
                            <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
                          </div>
                        </div>
                      </div>
                      <div className="ml-5 flex-shrink-0">
                        <button className="p-1 rounded-full text-gray-400 hover:text-gray-500">
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Sucursales */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Sucursales
                  </h3>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    + Agregar Sucursal
                  </button>
                </div>
                <div className="overflow-hidden overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Empresa
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dirección
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Empleados
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Editar</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">Sucursal Centro</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">Empresa SRL</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">Av. Corrientes 1234, CABA</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          5
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Activa
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <a href="#" className="text-indigo-600 hover:text-indigo-900">Editar</a>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">Sucursal Norte</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">Empresa SRL</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">Av. Libertador 5678, Vicente López</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          4
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Activa
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <a href="#" className="text-indigo-600 hover:text-indigo-900">Editar</a>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">Sucursal Central</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">TechSolutions Inc.</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">Av. Córdoba 834, CABA</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          6
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Activa
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <a href="#" className="text-indigo-600 hover:text-indigo-900">Editar</a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {userRole === 'general_manager' && stats.branchStats && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {stats.branchStats.map((branch) => (
                  <li key={branch.name}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {branch.name}
                        </p>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <span className="mr-2">👥</span>
                            {branch.users} users
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <span className="mr-2">📄</span>
                            {branch.documents} documents
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {userRole === 'branch_manager' && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-3xl">👥</span>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Branch Users
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.totalUsers || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-3xl">📄</span>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Branch Documents
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.totalDocuments || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 