'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEmpresas, Empresa } from '@/hooks/useEmpresas';
import Link from 'next/link';

export default function NuevaEmpresaPage() {
  const router = useRouter();
  const { addEmpresa } = useEmpresas();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Empresa, 'id'>>({
    nombre: '',
    direccion: '',
    telefono: '',
    email: '',
    cuit: '',
    estado: 'activa',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await addEmpresa(formData);
      // Redirigir a la página de empresas después de agregar
      router.push('/dashboard/empresas');
    } catch (err: any) {
      console.error('Error al agregar empresa:', err);
      setError(err.message || 'Error al agregar la empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-4 sm:p-6 lg:p-8 bg-white flex flex-col items-center'>
      <div className='mb-4 sm:mb-6 w-full max-w-5xl'>
        <div className="flex items-center">
          <Link href="/dashboard/empresas" className="mr-2 text-gray-600 hover:text-gray-900 flex-shrink-0">
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Añadir Nueva Empresa
          </h3>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-gray-500">
          Complete el formulario para agregar una nueva empresa al sistema
        </p>
      </div>

      {error && (
        <div className="mb-4 sm:mb-6 w-full max-w-5xl bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded relative" role="alert">
          <strong className="font-bold text-sm">Error:</strong>
          <span className="block sm:inline text-sm"> {error}</span>
        </div>
      )}

      <div className="w-full max-w-5xl bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-10 border border-gray-200">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Empresa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                id="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="mt-1 focus:ring-gray-500 text-gray-900 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md px-3 py-2"
                placeholder="Ingrese el nombre de la empresa"
              />
            </div>

            <div>
              <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-2">
                Dirección
              </label>
              <input
                type="text"
                name="direccion"
                id="direccion"
                value={formData.direccion}
                onChange={handleChange}
                className="mt-1 focus:ring-gray-500 text-gray-900 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md px-3 py-2"
                placeholder="Ingrese la dirección"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="text"
                  name="telefono"
                  id="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="mt-1 focus:ring-gray-500 text-gray-900 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md px-3 py-2"
                  placeholder="Ingrese el teléfono"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 focus:ring-gray-500 text-gray-900 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md px-3 py-2"
                  placeholder="Ingrese el email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cuit" className="block text-sm font-medium text-gray-700 mb-2">
                CUIT
              </label>
              <input
                type="text"
                name="cuit"
                id="cuit"
                value={formData.cuit}
                onChange={handleChange}
                className="mt-1 focus:ring-gray-500 text-gray-900 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md px-3 py-2"
                placeholder="Ingrese el CUIT"
              />
            </div>

            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                name="estado"
                id="estado"
                value={formData.estado}
                onChange={handleChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-gray-500 text-gray-900 focus:border-gray-500 sm:text-sm"
              >
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 sm:gap-4">
            <Link
              href="/dashboard/empresas"
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors text-center"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

