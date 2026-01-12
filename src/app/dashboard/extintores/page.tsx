'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEmpresas } from '@/hooks/useEmpresas';
import { collectionGroup, getDocs, collection, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

type UserRole = 'admin' | 'general_manager' | 'branch_manager';

interface ExtintorInfo {
  empresaId: string;
  empresaNombre: string;
  sucursalId: string;
  sucursalNombre: string;
  fechaVencimiento: string;
  fechaVencimientoDate: Date;
}

export default function ExtintoresPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [empresaIdFromUser, setEmpresaIdFromUser] = useState<string | null>(null);
  const [sucursalIdFromUser, setSucursalIdFromUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [sortBy, setSortBy] = useState<'fecha' | 'empresa' | 'sucursal'>('fecha');
  const [filterVencidos, setFilterVencidos] = useState<boolean>(false);
  const [allExtintores, setAllExtintores] = useState<ExtintorInfo[]>([]);
  const [loadingExtintores, setLoadingExtintores] = useState(true);
  
  const { empresas } = useEmpresas();
  const empresa = empresas.find(e => e.id === empresaIdFromUser);
  const empresaId = empresa?.id || empresaIdFromUser || undefined;
  const empresaAsignadaNombre = empresa?.nombre;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUserRole(userData.role);
          
          if (userData.role === 'general_manager') {
            if (userData.empresaId) {
              setEmpresaIdFromUser(userData.empresaId);
            } else if (userData.empresaNombre) {
              const foundEmpresa = empresas.find(e => e.nombre === userData.empresaNombre);
              if (foundEmpresa) {
                setEmpresaIdFromUser(foundEmpresa.id);
              }
            }
          } else if (userData.role === 'branch_manager') {
            if (userData.empresaId) {
              setEmpresaIdFromUser(userData.empresaId);
            }
            if (userData.sucursalId) {
              setSucursalIdFromUser(userData.sucursalId);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, authLoading, router, empresas]);

  // Obtener todas las mediciones y procesar extintores
  useEffect(() => {
    const fetchExtintores = async () => {
      if (!userRole || empresas.length === 0) return;
      
      setLoadingExtintores(true);
      try {
        // Obtener todas las mediciones usando collectionGroup
        const medicionesQuery = collectionGroup(firestore, 'mediciones');
        const medicionesSnapshot = await getDocs(medicionesQuery);
        
        // Obtener todas las sucursales
        const allSucursales = new Map<string, { empresaId: string; nombre: string }>();
        for (const emp of empresas) {
          const empresaRef = doc(firestore, 'empresas', emp.id);
          const sucursalesCollection = collection(empresaRef, 'sucursales');
          const sucursalesSnapshot = await getDocs(sucursalesCollection);
          sucursalesSnapshot.forEach((sucDoc) => {
            allSucursales.set(`${emp.id}_${sucDoc.id}`, {
              empresaId: emp.id,
              nombre: sucDoc.data().nombre || sucDoc.id
            });
          });
        }

        // Agrupar mediciones por empresa y sucursal
        const medicionesPorSucursal = new Map<string, any[]>();
        
        medicionesSnapshot.forEach((doc) => {
          const pathParts = doc.ref.path.split('/');
          const empresaIndex = pathParts.indexOf('empresas');
          const sucursalIndex = pathParts.indexOf('sucursales');
          
          if (empresaIndex !== -1 && sucursalIndex !== -1 && sucursalIndex === empresaIndex + 2) {
            const empresaId = pathParts[empresaIndex + 1];
            const sucursalId = pathParts[sucursalIndex + 1];
            const key = `${empresaId}_${sucursalId}`;
            
            // Filtrar por empresa si es general_manager
            if (userRole === 'general_manager' && empresaId !== empresaIdFromUser) {
              return;
            }
            
            // Filtrar por sucursal si es branch_manager
            if (userRole === 'branch_manager' && sucursalId !== sucursalIdFromUser) {
              return;
            }
            
            if (!medicionesPorSucursal.has(key)) {
              medicionesPorSucursal.set(key, []);
            }
            medicionesPorSucursal.get(key)!.push({
              ...doc.data(),
              empresaId,
              sucursalId
            });
          }
        });

        // Procesar extintores
        const extintores: ExtintorInfo[] = [];
        
        medicionesPorSucursal.forEach((medicionesSucursal, key) => {
          const [empId, sucId] = key.split('_');
          const empresa = empresas.find(e => e.id === empId);
          const sucursal = allSucursales.get(key);
          
          let fechaMasReciente: Date | null = null;
          let fechaMasRecienteStr: string | null = null;

          medicionesSucursal.forEach((m) => {
            const datos = m as Record<string, unknown>;
            const getValue = (k: string) => String((datos[k] ?? '') as any);
            
            const fechaExtintoresValue = getValue('FECHA EXTINTORES') || 
                                         getValue('FECHA EXTINTOR') || 
                                         getValue('FECHA DE EXTINTORES') ||
                                         getValue('FECHA REGISTRO EXTINTORES');
            
            if (fechaExtintoresValue && fechaExtintoresValue.trim() !== '') {
              try {
                const fecha = new Date(fechaExtintoresValue);
                if (!isNaN(fecha.getTime())) {
                  if (!fechaMasReciente || fecha > fechaMasReciente) {
                    fechaMasReciente = fecha;
                    fechaMasRecienteStr = fechaExtintoresValue;
                  }
                }
              } catch (e) {
                // Ignorar errores de parsing
              }
            }
          });

          if (fechaMasReciente && fechaMasRecienteStr && empresa) {
            extintores.push({
              empresaId: empId,
              empresaNombre: empresa.nombre,
              sucursalId: sucId,
              sucursalNombre: sucursal?.nombre || sucId,
              fechaVencimiento: fechaMasRecienteStr,
              fechaVencimientoDate: fechaMasReciente
            });
          }
        });

        setAllExtintores(extintores);
      } catch (error) {
        console.error('Error fetching extintores:', error);
      } finally {
        setLoadingExtintores(false);
      }
    };

    fetchExtintores();
  }, [userRole, empresas, empresaIdFromUser, sucursalIdFromUser]);

  // Filtrar y ordenar extintores
  const extintoresFiltradosYOrdenados = useMemo(() => {
    let filtrados = allExtintores;

    // Filtrar por vencidos si está activo
    if (filterVencidos) {
      const ahora = new Date();
      filtrados = filtrados.filter(e => e.fechaVencimientoDate < ahora);
    }

    // Ordenar
    const sorted = [...filtrados].sort((a, b) => {
      switch (sortBy) {
        case 'fecha':
          return a.fechaVencimientoDate.getTime() - b.fechaVencimientoDate.getTime();
        case 'empresa':
          return a.empresaNombre.localeCompare(b.empresaNombre);
        case 'sucursal':
          return a.sucursalNombre.localeCompare(b.sucursalNombre);
        default:
          return 0;
      }
    });

    return sorted;
  }, [allExtintores, sortBy, filterVencidos]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 lg:p-8 bg-white min-h-full'>
            <div className='mb-6'>
              <h3 className="text-2xl font-semibold text-gray-900">
                Extintores
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {userRole === 'admin' 
                  ? 'Listado de vencimientos de extintores de todas las empresas'
                  : userRole === 'general_manager'
                  ? `Listado de vencimientos de extintores - ${empresaAsignadaNombre || 'Empresa'}`
                  : 'Fecha de vencimiento de extintores de esta sucursal'}
              </p>
            </div>

            {/* Filtros y ordenamiento */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterVencidos}
                    onChange={(e) => setFilterVencidos(e.target.checked)}
                    className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-700">Solo vencidos</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Ordenar por:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'fecha' | 'empresa' | 'sucursal')}
                  className="rounded-md border-gray-300 text-sm focus:ring-gray-500 focus:border-gray-500"
                >
                  <option value="fecha">Fecha de vencimiento</option>
                  <option value="empresa">Empresa</option>
                  <option value="sucursal">Sucursal</option>
                </select>
              </div>
            </div>

            {/* Tabla de extintores */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {loadingExtintores ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Cargando extintores...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {userRole === 'admin' && (
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Empresa</th>
                        )}
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Sucursal</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Fecha de Vencimiento</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {extintoresFiltradosYOrdenados.length === 0 ? (
                        <tr>
                          <td colSpan={userRole === 'admin' ? 4 : 3} className="px-4 py-8 text-center text-gray-500">
                            No hay extintores registrados
                          </td>
                        </tr>
                      ) : (
                        extintoresFiltradosYOrdenados.map((extintor, index) => {
                          const ahora = new Date();
                          const diasHastaVencimiento = Math.ceil(
                            (extintor.fechaVencimientoDate.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
                          );
                          const estaVencido = extintor.fechaVencimientoDate < ahora;
                          const venceEn30Dias = diasHastaVencimiento <= 30 && diasHastaVencimiento >= 0;

                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              {userRole === 'admin' && (
                                <td className="px-4 py-3 text-gray-900">{extintor.empresaNombre}</td>
                              )}
                              <td className="px-4 py-3 text-gray-900">{extintor.sucursalNombre}</td>
                              <td className="px-4 py-3 text-gray-900">
                                {extintor.fechaVencimientoDate.toLocaleDateString('es-AR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </td>
                              <td className="px-4 py-3">
                                {estaVencido ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Vencido
                                  </span>
                                ) : venceEn30Dias ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Vence en {diasHastaVencimiento} días
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Vigente
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
    </div>
  );
}
