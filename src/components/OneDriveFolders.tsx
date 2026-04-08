'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSucursales } from '@/hooks/useSucursales';
import { useMediciones } from '@/hooks/useMediciones';
import { useEmpresas } from '@/hooks/useEmpresas';
import { firestore } from '@/lib/firebase';
import { collection, doc, getDocs } from 'firebase/firestore';

interface OneDriveFolder {
  id: string;
  name: string;
  type: 'folder' | 'file';
  childCount?: number;
  webUrl: string;
  size?: number;
  downloadUrl?: string;
}

interface OneDriveItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  childCount?: number;
  webUrl: string;
  size?: number;
  downloadUrl?: string;
}

type OneDriveApiErrorBody = {
  code?: string;
  error?: string;
  message?: string;
  userMessageEs?: string;
};

function isOneDriveAzureConfigError(data: OneDriveApiErrorBody | null, status: number): boolean {
  if (!data) return false;
  if (data.code === 'azure_client_secret_expired') return true;
  if (status === 503 && String(data.error || '').includes('Azure')) return true;
  const blob = `${data.error || ''} ${data.message || ''}`;
  return (
    blob.includes('AADSTS7000222') ||
    blob.includes('7000222') ||
    /client secret keys.*expired/i.test(blob) ||
    blob.toLowerCase().includes('invalid_client')
  );
}

function oneDriveAzureConfigUserMessage(data: OneDriveApiErrorBody | null): string {
  return (
    data?.userMessageEs ||
    'OneDrive no está disponible: el secreto de cliente de Azure expiró o hubo un error de configuración. Contactá al administrador del sistema.'
  );
}

/**
 * syncCoberturaLegalProvincia guarda `{ ...data }` del body; las claves suelen ser las columnas del sheet,
 * no siempre "COBERTURA LEGAL PROVINCIAL".
 */
function extraerValorCoberturaProvincialDesdeDoc(data: Record<string, unknown>): string | number | null {
  const preferKeys = [
    'COBERTURA LEGAL PROVINCIAL',
    'PORCENTAJE DE COBERTURA LEGAL',
    'COBERTURA LEGAL',
    'coberturaLegalProvincial',
    'coberturaLegalProvincia',
    'coberturaLegal',
  ];
  for (const k of preferKeys) {
    const v = data[k];
    if (v === undefined || v === null) continue;
    if (typeof v === 'number' && !isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && v.trim() !== 'undefined' && v.trim() !== 'null') {
      return v.trim();
    }
  }
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    const kn = k.toUpperCase();
    if (kn === 'FECHAS DE MEDICIÓN' || kn === 'FECHA CREACION' || kn === 'CLIENTE' || kn === 'PROVINCIA') {
      continue;
    }
    if (
      kn.includes('COBERTURA') &&
      (kn.includes('PROVINCIAL') || kn.includes('PORCENTAJE') || kn.includes('PORCENT'))
    ) {
      if (typeof v === 'number' && !isNaN(v)) return v;
      if (typeof v === 'string' && v.trim() !== '') return v.trim();
    }
  }
  return null;
}

interface OneDriveFoldersProps {
  empresaId?: string;
  sucursalId?: string;
  sucursalNombre?: string;
  empresaNombre?: string;
  filterBySucursal?: boolean;
  filterByEmpresa?: boolean;
}

export default function OneDriveFolders({ empresaId, sucursalId, sucursalNombre, empresaNombre, filterBySucursal = false, filterByEmpresa = false }: OneDriveFoldersProps) {
  const [items, setItems] = useState<OneDriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<Array<{ id: string; name: string }>>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'cobertura' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const isFetchingRef = useRef(false);
  const router = useRouter();
  const [provinciasContents, setProvinciasContents] = useState<Map<string, OneDriveItem[]>>(new Map());
  const [porcentajesProvinciaFirestore, setPorcentajesProvinciaFirestore] = useState<Map<string, string | null>>(new Map());
  const [porcentajesSucursalFirestore, setPorcentajesSucursalFirestore] = useState<Map<string, string | null>>(new Map());
  const [empresaFolderName, setEmpresaFolderName] = useState<string | null>(null);
  
  // Obtener todas las empresas (para calcular porcentajes en la raíz)
  const { empresas: allEmpresas } = useEmpresas();
  
  // Obtener sucursales si estamos filtrando por empresa
  const { sucursales } = useSucursales(filterByEmpresa && empresaId ? empresaId : undefined);

  // Obtener mediciones de todas las sucursales para calcular porcentaje de cobertura legal
  const { mediciones: allMediciones } = useMediciones(filterByEmpresa && empresaId ? empresaId : undefined);
  
  // Obtener mediciones de todas las empresas (para calcular porcentajes en la raíz)
  const { mediciones: allMedicionesGlobales } = useMediciones(undefined);
  
  // Función helper para formatear el porcentaje (quitar 0 inicial si existe)
  const formatearPorcentaje = useCallback((valor: string | number | null): string | null => {
    if (!valor) return null;

    const numValue = typeof valor === 'string'
      ? parseFloat(valor.replace('%', '').replace(',', '.').trim())
      : valor;

    if (isNaN(numValue)) return null;

    // Si el valor es < 1 (tiene 0 inicial), quitar el 0 y mostrar el resto
    if (numValue < 1 && numValue > 0) {
      // Multiplicar por 100 y redondear
      return Math.round(numValue * 100).toString();
    }

    // Si es >= 1, mostrar tal cual (redondeado)
    return Math.round(numValue).toString();
  }, []);

  const normalizeText = useCallback((value: string): string => {
    return value
      .normalize('NFD') // separa acentos
      .replace(/\p{Diacritic}/gu, '') // saca diacríticos
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ') // normaliza separadores
      .trim()
      .replace(/\s+/g, ' ');
  }, []);

  /** Solo nombres que corresponden a una provincia en Firestore (sin fuzzy por letras sueltas). */
  const getBestProvinciaCobertura = useCallback(
    (provinciaNombre: string): string | null => {
      if (!provinciaNombre) return null;
      const normTarget = normalizeText(provinciaNombre);
      if (!normTarget) return null;

      if (porcentajesProvinciaFirestore.has(normTarget)) {
        return porcentajesProvinciaFirestore.get(normTarget) ?? null;
      }

      const compactTarget = normTarget.replace(/\s+/g, '');
      if (compactTarget && porcentajesProvinciaFirestore.has(compactTarget)) {
        return porcentajesProvinciaFirestore.get(compactTarget) ?? null;
      }

      // Misma provincia con nombre más largo en carpeta: p.ej. "CIUDAD AUTONOMA BUENOS AIRES" ↔ "BUENOS AIRES"
      // Requiere al menos 2 palabras en el lado corto (evita matches con nombres de archivo/carpeta sueltos).
      const wordsOf = (s: string) => s.split(' ').filter((w) => w.length >= 2);
      const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      for (const [key, val] of porcentajesProvinciaFirestore.entries()) {
        if (!key || val === null) continue;
        const wt = wordsOf(normTarget);
        const wk = wordsOf(key);
        if (wt.length === 0 || wk.length === 0) continue;
        const [shorterTokens, longerStr] =
          wt.length <= wk.length ? [wt, key] : [wk, normTarget];
        if (shorterTokens.length < 2) continue;
        const allTokensInLonger = shorterTokens.every((t) =>
          new RegExp(`(^|\\s)${escapeRe(t)}(\\s|$)`).test(longerStr)
        );
        if (allTokensInLonger) {
          return val;
        }
      }

      return null;
    },
    [porcentajesProvinciaFirestore, normalizeText]
  );

  /** Solo si el nombre (normalizado) coincide con un doc en `cobertura_legal` — sin fuzzy. */
  const getBestSucursalCobertura = useCallback(
    (sucursalNombre: string): string | null => {
      if (!sucursalNombre) return null;
      const normTarget = normalizeText(sucursalNombre);
      if (!normTarget) return null;

      if (porcentajesSucursalFirestore.has(normTarget)) {
        return porcentajesSucursalFirestore.get(normTarget) ?? null;
      }

      const compactTarget = normTarget.replace(/\s+/g, '');
      if (compactTarget && porcentajesSucursalFirestore.has(compactTarget)) {
        return porcentajesSucursalFirestore.get(compactTarget) ?? null;
      }

      return null;
    },
    [normalizeText, porcentajesSucursalFirestore]
  );

  /** IDs en Firestore son case-sensitive: probamos variantes del nombre de empresa (ej. Fravega vs FRAVEGA). */
  const candidatosEmpresaCoberturaLegal = useMemo(() => {
    const emp = filterByEmpresa && empresaId ? allEmpresas.find((e) => e.id === empresaId) : undefined;
    const base = [empresaFolderName, empresaNombre, empresaId, emp?.nombre, emp?.id]
      .map((v) => (v ?? '').replace(/\s+/g, ' ').trim())
      .filter((v) => v.length > 0);
    const raw: string[] = [];
    const seenBase = new Set<string>();
    for (const s of base) {
      if (seenBase.has(s)) continue;
      seenBase.add(s);
      raw.push(s);
      const first = s.trim().split(/\s+/)[0];
      if (first && first !== s && !seenBase.has(first)) {
        seenBase.add(first);
        raw.push(first);
      }
    }
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of raw) {
      const variants = [s, s.toUpperCase(), s.toLowerCase(), normalizeText(s)];
      for (const v of variants) {
        if (!v || seen.has(v)) continue;
        seen.add(v);
        out.push(v);
      }
    }
    return out;
  }, [filterByEmpresa, empresaFolderName, empresaNombre, empresaId, allEmpresas, normalizeText]);

  useEffect(() => {
    const loadCoberturaPorProvinciaDesdeFirestore = async () => {
      if (!filterByEmpresa || (!empresaNombre && !empresaId)) {
        setPorcentajesProvinciaFirestore(new Map());
        return;
      }

      if (candidatosEmpresaCoberturaLegal.length === 0) {
        setPorcentajesProvinciaFirestore(new Map());
        return;
      }

      const mapa = new Map<string, string | null>();

      const registerProvinciaDoc = (provinciaDoc: { id: string; data: () => Record<string, unknown> }) => {
        const data = provinciaDoc.data() as Record<string, unknown>;
        const coberturaRaw = extraerValorCoberturaProvincialDesdeDoc(data);
        const coberturaFormateada =
          coberturaRaw !== null ? formatearPorcentaje(coberturaRaw) : null;

        const aliasFields: unknown[] = [
          provinciaDoc.id,
          data['NOMBRE'],
          data['NOMBRE PROVINCIA'],
          data['PROVINCIA'],
          data['nombre'],
          data['provincia'],
        ];
        const keys = new Set<string>();
        for (const v of aliasFields) {
          if (typeof v === 'string' && v.trim()) {
            const nt = normalizeText(v);
            keys.add(nt);
            keys.add(nt.replace(/\s+/g, ''));
          }
        }
        for (const k of keys) {
          if (!k) continue;
          const prev = mapa.get(k);
          if (coberturaFormateada !== null) {
            mapa.set(k, coberturaFormateada);
          } else if (prev === undefined) {
            mapa.set(k, null);
          }
        }
      };

      try {
        for (const empresaKey of candidatosEmpresaCoberturaLegal) {
          const provinciasRef = collection(doc(firestore, 'coberturaLegal', empresaKey), 'provincias');
          const snapshot = await getDocs(provinciasRef);
          if (snapshot.empty) continue;
          snapshot.forEach((d) =>
            registerProvinciaDoc({
              id: d.id,
              data: () => d.data() as Record<string, unknown>,
            })
          );
        }
      } catch (err) {
        console.error(
          '[OneDriveFolders] coberturaLegal/provincias:',
          candidatosEmpresaCoberturaLegal,
          err
        );
      }

      if (mapa.size === 0) {
        console.warn(
          '[OneDriveFolders] Sin docs en coberturaLegal/.../provincias para candidatos:',
          candidatosEmpresaCoberturaLegal
        );
      }

      setPorcentajesProvinciaFirestore(mapa);
    };

    loadCoberturaPorProvinciaDesdeFirestore();
  }, [filterByEmpresa, candidatosEmpresaCoberturaLegal, normalizeText, formatearPorcentaje]);

  // Cargar COBERTURA LEGAL de sucursales desde Firestore:
  // /cobertura_legal/{nombreSucursal} -> campo "COBERTURA LEGAL"
  useEffect(() => {
    const loadCoberturaPorSucursalDesdeFirestore = async () => {
      if (!filterByEmpresa || !empresaId) {
        setPorcentajesSucursalFirestore(new Map());
        return;
      }

      try {
        const snapshot = await getDocs(collection(firestore, 'cobertura_legal'));
        const mapa = new Map<string, string | null>();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const coberturaRaw = data['COBERTURA LEGAL'];
          const coberturaFormateada =
            typeof coberturaRaw === 'number' || typeof coberturaRaw === 'string'
              ? formatearPorcentaje(coberturaRaw)
              : null;

          mapa.set(normalizeText(docSnap.id), coberturaFormateada);
        });

        setPorcentajesSucursalFirestore(mapa);
      } catch (err) {
        console.error('Error leyendo cobertura_legal para sucursales', err);
        setPorcentajesSucursalFirestore(new Map());
      }
    };

    loadCoberturaPorSucursalDesdeFirestore();
  }, [filterByEmpresa, empresaId, normalizeText, formatearPorcentaje]);
  
  // Mapa de sucursalId -> porcentaje de cobertura legal
  const porcentajesPorSucursal = useMemo(() => {
    const mapa = new Map<string, string | null>();
    
    if (!filterByEmpresa || !empresaId) return mapa;
    
    // Agrupar mediciones por sucursal
    const medicionesPorSucursal = new Map<string, typeof allMediciones>();
    allMediciones.forEach((m) => {
      if (m.sucursalId) {
        if (!medicionesPorSucursal.has(m.sucursalId)) {
          medicionesPorSucursal.set(m.sucursalId, []);
        }
        medicionesPorSucursal.get(m.sucursalId)!.push(m);
      }
    });
    
    // Para cada sucursal, obtener el porcentaje más reciente
    medicionesPorSucursal.forEach((medicionesSucursal, sucursalId) => {
      let valor: string | null = null;
      
      // Buscar el valor en las mediciones (priorizando la más reciente)
      for (const m of medicionesSucursal) {
        const datos = m.datos as Record<string, unknown>;
        const getValue = (k: string) => String((datos[k] ?? '') as any).trim();
        
        const coberturaValue = getValue('PORCENTAJE DE COBERTURA LEGAL');
        
        if (coberturaValue && coberturaValue !== '' && coberturaValue !== 'undefined' && coberturaValue !== 'null') {
          valor = formatearPorcentaje(coberturaValue);
          break; // Usar el primer valor encontrado (más reciente)
        }
      }
      
      if (valor !== null) {
        mapa.set(sucursalId, valor);
      }
    });
    
    return mapa;
  }, [allMediciones, filterByEmpresa, empresaId]);

  // Mapa de empresaId -> porcentaje promedio de cobertura legal (para carpetas en la raíz)
  const porcentajesPorEmpresa = useMemo(() => {
    const mapa = new Map<string, string | null>();
    
    // Si estamos filtrando por empresa, no calcular porcentajes por empresa
    if (filterByEmpresa) return mapa;
    
    // Para cada empresa, calcular el promedio del porcentaje de cobertura legal de todas sus sucursales
    allEmpresas.forEach((empresa) => {
      // Obtener todas las mediciones de esta empresa
      const medicionesEmpresa = allMedicionesGlobales.filter((m) => m.empresaId === empresa.id);
      
      if (medicionesEmpresa.length === 0) return;
      
      // Agrupar mediciones por sucursal
      const medicionesPorSucursal = new Map<string, typeof medicionesEmpresa>();
      medicionesEmpresa.forEach((m) => {
        if (m.sucursalId) {
          if (!medicionesPorSucursal.has(m.sucursalId)) {
            medicionesPorSucursal.set(m.sucursalId, []);
          }
          medicionesPorSucursal.get(m.sucursalId)!.push(m);
        }
      });
      
      // Para cada sucursal, obtener el porcentaje más reciente
      const valoresPorSucursal: number[] = [];
      medicionesPorSucursal.forEach((medicionesSucursal) => {
        for (const m of medicionesSucursal) {
          const datos = m.datos as Record<string, unknown>;
          const getValue = (k: string) => String((datos[k] ?? '') as any).trim();
          
          const coberturaValue = getValue('PORCENTAJE DE COBERTURA LEGAL');
          
          if (coberturaValue && coberturaValue !== '' && coberturaValue !== 'undefined' && coberturaValue !== 'null') {
            const numValue = parseFloat(coberturaValue.replace('%', '').replace(',', '.'));
            if (!isNaN(numValue)) {
              // Si el valor es < 1, multiplicar por 100
              const valorFinal = numValue < 1 && numValue > 0 ? numValue * 100 : numValue;
              valoresPorSucursal.push(valorFinal);
              break; // Usar el primer valor encontrado (más reciente)
            }
          }
        }
      });
      
      // Calcular el promedio
      if (valoresPorSucursal.length > 0) {
        const promedio = valoresPorSucursal.reduce((sum, val) => sum + val, 0) / valoresPorSucursal.length;
        const porcentajeFormateado = formatearPorcentaje(promedio);
        if (porcentajeFormateado !== null) {
          mapa.set(empresa.id, porcentajeFormateado);
        }
      }
    });
    
    return mapa;
  }, [allEmpresas, allMedicionesGlobales, filterByEmpresa]);

  // Mapa de folderId (provincia) -> porcentaje promedio de cobertura legal
  const porcentajesPorProvincia = useMemo(() => {
    const mapa = new Map<string, string | null>();
    
    // Solo calcular si estamos en la raíz y no estamos filtrando por empresa
    if (filterByEmpresa || filterBySucursal) return mapa;
    
    // Para cada carpeta de provincia, calcular el promedio de las empresas dentro
    provinciasContents.forEach((empresasEnProvincia, provinciaFolderId) => {
      const valoresPorEmpresa: number[] = [];
      
      // Para cada carpeta dentro de la provincia, verificar si es una empresa
      empresasEnProvincia.forEach((carpetaEmpresa) => {
        if (carpetaEmpresa.type !== 'folder') return;
        
        // Buscar la empresa que coincida con esta carpeta
        const itemNameLower = carpetaEmpresa.name.toLowerCase().trim();
        const ntCarpeta = normalizeText(carpetaEmpresa.name);
        const empresa = allEmpresas.find(
          (e) => normalizeText(e.nombre) === ntCarpeta || e.id.trim().toLowerCase() === itemNameLower
        );
        
        if (empresa) {
          // Obtener el porcentaje de esta empresa
          const porcentajeEmpresa = porcentajesPorEmpresa.get(empresa.id);
          if (porcentajeEmpresa) {
            const numValue = parseFloat(porcentajeEmpresa);
            if (!isNaN(numValue)) {
              valoresPorEmpresa.push(numValue);
            }
          }
        }
      });
      
      // Calcular el promedio de todas las empresas en la provincia
      if (valoresPorEmpresa.length > 0) {
        const promedio = valoresPorEmpresa.reduce((sum, val) => sum + val, 0) / valoresPorEmpresa.length;
        const porcentajeFormateado = formatearPorcentaje(promedio);
        if (porcentajeFormateado !== null) {
          mapa.set(provinciaFolderId, porcentajeFormateado);
        }
      }
    });
    
    return mapa;
  }, [provinciasContents, allEmpresas, porcentajesPorEmpresa, filterByEmpresa, filterBySucursal, normalizeText]);

  // Cargar contenido de carpetas de provincia cuando estamos en la raíz
  useEffect(() => {
    const loadProvinciasContents = async () => {
      // Solo cargar si estamos en la raíz y no estamos filtrando
      if (filterByEmpresa || filterBySucursal || items.length === 0) return;
      
      const newContents = new Map<string, OneDriveItem[]>();
      
      // Para cada carpeta en la raíz, obtener su contenido
      for (const item of items) {
        if (item.type !== 'folder') continue;
        
        try {
          const response = await fetch(`/api/onedrive/folders?action=list-folder-contents&folderId=${item.id}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.items) {
              // Filtrar solo carpetas (empresas dentro de la provincia)
              const carpetas = data.items.filter((i: OneDriveItem) => i.type === 'folder');
              if (carpetas.length > 0) {
                newContents.set(item.id, carpetas);
              }
            }
          }
        } catch (error) {
          console.error(`Error loading contents for folder ${item.name}:`, error);
        }
      }
      
      if (newContents.size > 0) {
        setProvinciasContents(newContents);
      }
    };
    
    loadProvinciasContents();
  }, [items, filterByEmpresa, filterBySucursal]);

  const fetchFolders = useCallback(async (folderId?: string, isNavigation: boolean = false, forceRefresh: boolean = false) => {
    if (isFetchingRef.current && !forceRefresh) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      // Agregar timestamp para evitar caché del navegador
      const timestamp = forceRefresh ? `&_t=${Date.now()}` : '';
      const cacheHeaders: RequestInit = {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      };

      let response;
      
      // Si estamos navegando dentro de una carpeta
      if (isNavigation && folderId) {
        console.log('🔍 [OneDrive] Navigating to folder:', folderId);
        response = await fetch(`/api/onedrive/folders?action=list-folder-contents&folderId=${folderId}${timestamp}`, cacheHeaders);
      } else if (filterByEmpresa && empresaNombre) {
        // Buscar la carpeta de la empresa - primero en la raíz (más confiable)
        console.log('🔍 [OneDrive] Fetching folders for empresa:', empresaNombre);
        console.log('📂 [OneDrive] Step 1: Searching in root folders first...');
        
        const empresaNombreLower = empresaNombre.toLowerCase().trim();
        let empresaFolder: OneDriveFolder | null = null;
        
        // Primero buscar directamente en la raíz (más confiable)
        const rootResponse = await fetch(`/api/onedrive/folders?action=list-root-folders${timestamp}`, cacheHeaders);
        const rootData = await rootResponse.json();
        
        console.log('📥 [OneDrive] Root folders response:', rootData);
        
        // Verificar si hay error de autenticación
        if (!rootResponse.ok && (rootResponse.status === 401 || rootData.error?.includes('Not authenticated') || rootData.error?.includes('No tokens found'))) {
          console.log('🔒 [OneDrive] Authentication required');
          setError('Not authenticated');
          setItems([]);
          return;
        }

        if (!rootResponse.ok && isOneDriveAzureConfigError(rootData, rootResponse.status)) {
          setError(oneDriveAzureConfigUserMessage(rootData));
          setItems([]);
          return;
        }
        
        if (rootResponse.ok && rootData.success && rootData.folders && rootData.folders.length > 0) {
          console.log('✅ [OneDrive] Root folders found:', rootData.folders.length);
          console.log('📋 [OneDrive] Root folder names:', rootData.folders.map((f: OneDriveFolder) => f.name));
          
          // Buscar la carpeta exacta (comparación case-insensitive)
          empresaFolder = rootData.folders.find((f: OneDriveFolder) => 
            f.name.toLowerCase().trim() === empresaNombreLower
          ) || null;
          
          // Si no se encuentra exacta, buscar la que contiene el nombre
          if (!empresaFolder) {
            empresaFolder = rootData.folders.find((f: OneDriveFolder) => 
              f.name.toLowerCase().trim().includes(empresaNombreLower) ||
              empresaNombreLower.includes(f.name.toLowerCase().trim())
            ) || null;
          }
          
          if (empresaFolder) {
            console.log('✅ [OneDrive] Found empresa folder in root:', empresaFolder.name, 'ID:', empresaFolder.id);
          } else {
            console.log('⚠️ [OneDrive] Empresa folder not found in root, trying search API...');
          }
        } else {
          console.log('⚠️ [OneDrive] Failed to get root folders, trying search API...');
        }
        
        // Si no se encontró en la raíz, intentar con la búsqueda
        if (!empresaFolder) {
          console.log('🔍 [OneDrive] Step 2: Trying search API...');
          const searchResponse = await fetch(`/api/onedrive/folders?action=search-folder&folderName=${encodeURIComponent(empresaNombre)}${timestamp}`, cacheHeaders);
          const searchData = await searchResponse.json();
          
          console.log('📥 [OneDrive] Search response:', searchData);
          
          // Verificar si hay error de autenticación en la búsqueda
          if (!searchResponse.ok && (searchResponse.status === 401 || searchData.error?.includes('Not authenticated') || searchData.error?.includes('No tokens found'))) {
            console.log('🔒 [OneDrive] Authentication required in search');
            setError('Not authenticated');
            setItems([]);
            return;
          }

          if (!searchResponse.ok && isOneDriveAzureConfigError(searchData, searchResponse.status)) {
            setError(oneDriveAzureConfigUserMessage(searchData));
            setItems([]);
            return;
          }
          
          if (searchResponse.ok && searchData.success && searchData.folders && searchData.folders.length > 0) {
            console.log('✅ [OneDrive] Search found folders:', searchData.folders.length, 'matches');
            console.log('📋 [OneDrive] Search folder names:', searchData.folders.map((f: OneDriveFolder) => f.name));
            
            // Buscar la carpeta exacta
            empresaFolder = searchData.folders.find((f: OneDriveFolder) => 
              f.name.toLowerCase().trim() === empresaNombreLower
            ) || null;
            
            // Si no se encuentra exacta, buscar la que contiene el nombre
            if (!empresaFolder) {
              empresaFolder = searchData.folders.find((f: OneDriveFolder) => 
                f.name.toLowerCase().trim().includes(empresaNombreLower) ||
                empresaNombreLower.includes(f.name.toLowerCase().trim())
              ) || null;
            }
            
            if (empresaFolder) {
              console.log('✅ [OneDrive] Found empresa folder via search:', empresaFolder.name, 'ID:', empresaFolder.id);
            }
          }
        }
        
        // Si encontramos la carpeta, listar su contenido
        if (empresaFolder) {
          console.log('📁 [OneDrive] Listing contents of empresa folder:', empresaFolder.name);
          setEmpresaFolderName(empresaFolder.name);
          response = await fetch(`/api/onedrive/folders?action=list-folder-contents&folderId=${empresaFolder.id}${timestamp}`, cacheHeaders);
        } else {
          // Verificar si el error fue por falta de autenticación antes de reportar carpeta no encontrada
          if (rootResponse.status === 401 || rootData.error?.includes('Not authenticated') || rootData.error?.includes('No tokens found')) {
            console.log('🔒 [OneDrive] Authentication required - root folders request failed');
            setError('Not authenticated');
            setItems([]);
            return;
          }

          if (isOneDriveAzureConfigError(rootData, rootResponse.status)) {
            setError(oneDriveAzureConfigUserMessage(rootData));
            setItems([]);
            return;
          }
          
          // No se encontró la carpeta
          console.log('❌ [OneDrive] Empresa folder not found:', empresaNombre);
          console.log('📋 [OneDrive] Available root folders:', rootData.folders?.map((f: OneDriveFolder) => f.name) || 'none');
          setError(`No se encontró la carpeta "${empresaNombre}" en OneDrive. Por favor verifique que la carpeta existe con ese nombre exacto en la raíz.`);
          setItems([]);
          return;
        }
      } else if (filterBySucursal && (sucursalNombre || sucursalId)) {
        // Buscar carpetas que coincidan con la sucursal
        console.log('🔍 [OneDrive] Fetching folders for sucursal:', sucursalNombre || sucursalId);
        const searchTerm = sucursalNombre || sucursalId || '';
        response = await fetch(`/api/onedrive/folders?action=search-folder&folderName=${encodeURIComponent(searchTerm)}${timestamp}`, cacheHeaders);
      } else {
        // Listar carpetas raíz
        console.log('🔍 [OneDrive] Fetching root folders');
        setEmpresaFolderName(null);
        response = await fetch(`/api/onedrive/folders?action=list-root-folders${timestamp}`, cacheHeaders);
      }

      const data = await response.json();
      
      console.log('📥 [OneDrive] API Response status:', response.status, response.ok);
      console.log('📥 [OneDrive] API Response data:', data);

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to fetch folders';
        console.error('❌ [OneDrive] API Error:', errorMsg);
        
        // Si es un error de autenticación, guardar información adicional
        if (response.status === 401 || errorMsg.includes('Not authenticated') || errorMsg.includes('No tokens found')) {
          setError('Not authenticated');
          setItems([]);
          return;
        }

        if (isOneDriveAzureConfigError(data, response.status)) {
          setError(oneDriveAzureConfigUserMessage(data));
          setItems([]);
          return;
        }
        
        throw new Error(errorMsg);
      }

      if (data.success) {
        let processedItems = data.folders || data.items || [];
        
        console.log('🔄 [OneDrive] Processing items:', processedItems.length, 'raw items');
        console.log('🔄 [OneDrive] Data structure:', {
          hasFolders: !!data.folders,
          hasItems: !!data.items,
          foldersLength: data.folders?.length || 0,
          itemsLength: data.items?.length || 0
        });
        
        // Si es contenido de carpeta (navigation o filterByEmpresa), convertir items al formato correcto
        if ((isNavigation || filterByEmpresa) && data.items) {
          console.log('🔄 [OneDrive] Processing folder contents (items)');
          // NO filtrar archivos, mostrar ambos (carpetas y archivos)
          processedItems = data.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            type: item.type || (item.folder ? 'folder' : 'file'),
            childCount: item.type === 'folder' || item.folder ? (item.childCount || 0) : undefined,
            webUrl: item.webUrl,
            size: item.type === 'file' && !item.folder ? item.size : undefined,
            downloadUrl: item.type === 'file' && !item.folder ? (item.downloadUrl || item.url) : undefined
          }));
        } else if (data.folders) {
          console.log('🔄 [OneDrive] Processing folders list');
          // Si viene como folders, asegurarse de que tengan el tipo correcto
          processedItems = processedItems.map((folder: any) => ({
            ...folder,
            type: 'folder'
          }));
        }
        
        // Ordenar: carpetas primero, luego archivos
        processedItems.sort((a: OneDriveItem, b: OneDriveItem) => {
          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          return a.name.localeCompare(b.name);
        });
        
        // Filtrar solo carpetas que coincidan con el nombre de la sucursal
        if (filterBySucursal && sucursalNombre && !isNavigation) {
          processedItems = processedItems.filter((item: OneDriveItem) => 
            item.type === 'folder' && (
              item.name.toLowerCase().includes(sucursalNombre.toLowerCase()) ||
              sucursalNombre.toLowerCase().includes(item.name.toLowerCase())
            )
          );
        }
        
        setItems(processedItems);
        setCurrentFolderId(folderId || null);
        // Limpiar error si la búsqueda fue exitosa
        setError(null);
        console.log('✅ [OneDrive] Items loaded:', processedItems.length, '(folders:', processedItems.filter((i: OneDriveItem) => i.type === 'folder').length, ', files:', processedItems.filter((i: OneDriveItem) => i.type === 'file').length, ')');
        
        if (processedItems.length === 0 && filterByEmpresa) {
          console.warn('⚠️ [OneDrive] No items found in empresa folder. This might be normal if the folder is empty.');
        }
      } else {
        const errorMsg = data.error || 'Unknown error occurred';
        console.error('❌ [OneDrive] API returned success=false:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('❌ [OneDrive] Error fetching folders:', err);
      setError(err.message || 'Failed to load folders');
      setItems([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [filterByEmpresa, filterBySucursal, empresaNombre, sucursalNombre, sucursalId]);

  useEffect(() => {
    // Fetch folders when empresaNombre or sucursalNombre changes
    fetchFolders();
  }, [empresaNombre, empresaId, sucursalNombre, sucursalId, fetchFolders]);

  const navigateToFolder = useCallback((folderId: string, folderName: string) => {
    // Siempre navegar dentro de la carpeta normalmente, sin importar si es una sucursal o no
    console.log('📁 [OneDrive] Navegando dentro de carpeta:', folderName);
    setFolderHistory(prev => [...prev, { id: folderId, name: folderName }]);
    // Limpiar items antes de navegar para evitar mostrar datos obsoletos
    setItems([]);
    fetchFolders(folderId, true, true);
  }, [fetchFolders]);

  const navigateBack = useCallback(() => {
    if (folderHistory.length > 0) {
      const newHistory = [...folderHistory];
      newHistory.pop();
      setFolderHistory(newHistory);
      
      if (newHistory.length === 0) {
        // Volver a la carpeta inicial
        fetchFolders();
      } else {
        // Navegar a la carpeta anterior
        const previousFolder = newHistory[newHistory.length - 1];
        fetchFolders(previousFolder.id, true);
      }
    } else {
      // Volver a la carpeta inicial
      fetchFolders();
    }
  }, [folderHistory, fetchFolders]);

  const handleRefresh = () => {
    // Limpiar el estado antes de refrescar para forzar actualización
    setItems([]);
    setCurrentFolderId(null);
    setFolderHistory([]);
    // Forzar refresh con timestamp único
    fetchFolders(undefined, false, true);
  };

  // Función para manejar el ordenamiento
  const handleSort = useCallback((type: 'name' | 'cobertura') => {
    if (sortBy === type) {
      // Si ya está ordenando por este criterio, cambiar el orden
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es un nuevo criterio, establecerlo y usar orden ascendente por defecto
      setSortBy(type);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  // Filtrar y ordenar items basado en el término de búsqueda y criterio de ordenamiento
  const filteredItems = useMemo(() => {
    let filtered = searchTerm.trim() === '' 
      ? items 
      : items.filter(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
        );
    
    // Ordenar items si hay un criterio de ordenamiento
        if (sortBy === 'cobertura') {
      filtered = [...filtered].sort((a, b) => {
        let porcentajeA: string | null = null;
        let porcentajeB: string | null = null;
        
        if (filterByEmpresa && empresaId) {
          const listingProvincias = folderHistory.length === 0;
          // Si estamos filtrando por empresa, buscar por sucursal
          const getSucursal = (item: OneDriveItem) => {
            if (item.type !== 'folder') return null;
            const itemNameLower = item.name.toLowerCase().trim();
            return sucursales.find(s => {
              const sucursalNombreLower = s.nombre.toLowerCase().trim();
              const sucursalIdLower = s.id.toLowerCase().trim();
              return sucursalNombreLower === itemNameLower || 
                     sucursalIdLower === itemNameLower ||
                     itemNameLower.includes(sucursalIdLower) || 
                     sucursalIdLower.includes(itemNameLower) ||
                     itemNameLower.startsWith(sucursalIdLower) || 
                     sucursalIdLower.startsWith(itemNameLower);
            });
          };
          
          const sucursalA = getSucursal(a);
          const sucursalB = getSucursal(b);
          
          const provinciaA = getBestProvinciaCobertura(a.name);
          const provinciaB = getBestProvinciaCobertura(b.name);
          const sucursalCoberturaA = getBestSucursalCobertura(a.name);
          const sucursalCoberturaB = getBestSucursalCobertura(b.name);

          if (listingProvincias) {
            // Estamos listando provincias: siempre usar Firestore de provincias
            porcentajeA = provinciaA ?? null;
            porcentajeB = provinciaB ?? null;
          } else {
            // Estamos dentro de una provincia: usar Firestore de sucursales
            porcentajeA = sucursalCoberturaA ?? null;
            porcentajeB = sucursalCoberturaB ?? null;
          }
        } else {
          // Si estamos en la raíz, primero verificar si es provincia, luego empresa
          // Para provincias en vista de empresa, usamos Firestore (matching por nombre)
          const porcentajeProvinciaA =
            filterByEmpresa ? getBestProvinciaCobertura(a.name) : porcentajesPorProvincia.get(a.id);
          const porcentajeProvinciaB =
            filterByEmpresa ? getBestProvinciaCobertura(b.name) : porcentajesPorProvincia.get(b.id);
          
          if (porcentajeProvinciaA !== undefined) {
            porcentajeA = porcentajeProvinciaA;
          } else {
            const getEmpresa = (item: OneDriveItem) => {
              if (item.type !== 'folder') return null;
              const itemNameLower = item.name.toLowerCase().trim();
              const nt = normalizeText(item.name);
              return allEmpresas.find(
                (e) => normalizeText(e.nombre) === nt || e.id.trim().toLowerCase() === itemNameLower
              );
            };
            
            const empresaA = getEmpresa(a);
            porcentajeA = empresaA ? (porcentajesPorEmpresa.get(empresaA.id) ?? null) : null;
          }
          
          if (porcentajeProvinciaB !== undefined) {
            porcentajeB = porcentajeProvinciaB;
          } else {
            const getEmpresa = (item: OneDriveItem) => {
              if (item.type !== 'folder') return null;
              const itemNameLower = item.name.toLowerCase().trim();
              const nt = normalizeText(item.name);
              return allEmpresas.find(
                (e) => normalizeText(e.nombre) === nt || e.id.trim().toLowerCase() === itemNameLower
              );
            };
            
            const empresaB = getEmpresa(b);
            porcentajeB = empresaB ? (porcentajesPorEmpresa.get(empresaB.id) ?? null) : null;
          }
        }
        
        // Convertir a números para comparar
        const numA = porcentajeA ? parseFloat(porcentajeA) : -1; // -1 para que los sin porcentaje vayan al final
        const numB = porcentajeB ? parseFloat(porcentajeB) : -1;
        
        if (sortOrder === 'asc') {
          return numA - numB; // Ascendente (menor a mayor)
        } else {
          return numB - numA; // Descendente (mayor a menor)
        }
      });
    } else if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => {
        if (sortOrder === 'asc') {
          return a.name.localeCompare(b.name);
        } else {
          return b.name.localeCompare(a.name);
        }
      });
    }
    
    return filtered;
  }, [items, searchTerm, sortBy, sortOrder, filterByEmpresa, empresaId, sucursales, folderHistory, porcentajesPorSucursal, porcentajesProvinciaFirestore, allEmpresas, porcentajesPorEmpresa, porcentajesPorProvincia, getBestProvinciaCobertura, getBestSucursalCobertura, normalizeText]);

  if (loading && items.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
          <div className="flex-1">
            <div className="h-5 sm:h-6 bg-gray-200 rounded w-48 sm:w-64 mb-2 animate-pulse"></div>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-32 sm:w-48 animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-20 sm:w-24 animate-pulse"></div>
        </div>
        
        {/* Skeleton de barra de búsqueda */}
        <div className="mb-4 sm:mb-6">
          <div className="h-11 sm:h-10 bg-gray-200 rounded-lg w-full animate-pulse"></div>
        </div>

        {/* Skeleton de tabla (desktop) */}
        <div className="hidden sm:block rounded-md border border-gray-200 shadow-md">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gray-50 border-gray-100">
            <div className="h-5 sm:h-6 bg-gray-200 rounded w-32 sm:w-40 animate-pulse"></div>
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton de cards (mobile) */}
        <div className="sm:hidden space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-sm mb-6">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar carpetas </h3>
          <p className="text-red-600 mb-4">{error}</p>
          {error.includes('Not authenticated') && (
            <a
              href="/api/auth/login"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Iniciar Sesión con OneDrive
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
              {filterByEmpresa && empresaNombre 
                ? `Sucursales de ${empresaNombre}` 
                : filterBySucursal && sucursalNombre 
                ? `Sucursales - ${sucursalNombre}` 
                : 'Sucursales'}
            </h3>
            {folderHistory.length > 0 && (
              <button
                onClick={navigateBack}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors active:bg-gray-300 flex-shrink-0"
                title="Volver"
              >
                ← Volver
              </button>
            )}
          </div>
         
          {folderHistory.length > 0 && (
            <div className="flex items-center space-x-1 mt-1 overflow-x-auto pb-1">
              <span className="text-xs text-gray-400 flex-shrink-0">Ubicación:</span>
              <div className="flex items-center space-x-1 min-w-0">
              {folderHistory.map((folder, index) => (
                  <span key={folder.id} className="text-xs text-gray-600 whitespace-nowrap">
                  {folder.name}
                  {index < folderHistory.length - 1 && <span className="mx-1">/</span>}
                </span>
              ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
            {searchTerm.trim() ? (
              <span>
                {filteredItems.length}/{items.length}
              </span>
            ) : (
              <span>
                {items.length} {items.length !== 1 ? 'items' : 'item'}
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:bg-gray-300 flex-shrink-0"
          >
            {loading ? '...' : '🔄'}
          </button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-10 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            placeholder="Buscar archivos y carpetas..."
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center active:opacity-70"
              title="Limpiar búsqueda"
            >
              <svg
                className="h-5 w-5 text-gray-400 hover:text-gray-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {(items.length === 0 && !loading) || (searchTerm.trim() && filteredItems.length === 0 && items.length > 0) ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm.trim() && filteredItems.length === 0 && items.length > 0
              ? 'No se encontraron resultados'
              : error 
              ? 'Error al cargar carpetas' 
              : 'No hay carpetas disponibles'}
          </h4>
          <p className="text-gray-500">
            {searchTerm.trim() && filteredItems.length === 0 && items.length > 0
              ? `No se encontraron archivos o carpetas que coincidan con "${searchTerm}"`
              : error || (filterByEmpresa && empresaNombre 
                ? `No se encontraron carpetas en "${empresaNombre}"`
                : filterBySucursal && sucursalNombre
                ? `No se encontraron carpetas relacionadas con "${sucursalNombre}"`
                : 'No se encontraron carpetas en el nivel raíz de OneDrive')}
          </p>
          {error && filterByEmpresa && empresaNombre && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Sugerencia:</strong> Asegúrese de que existe una carpeta con el nombre exacto "{empresaNombre}" en OneDrive.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {items.length === 0 && !loading && !searchTerm.trim() && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            {error ? 'Error al cargar carpetas' : 'No hay carpetas disponibles'}
          </h4>
          <p className="text-gray-500">
            {error || (filterByEmpresa && empresaNombre 
              ? `No se encontraron carpetas en "${empresaNombre}"`
              : filterBySucursal && sucursalNombre
              ? `No se encontraron carpetas relacionadas con "${sucursalNombre}"`
              : 'No se encontraron carpetas en el nivel raíz de OneDrive')}
          </p>
          {error && filterByEmpresa && empresaNombre && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Sugerencia:</strong> Asegúrese de que existe una carpeta con el nombre exacto "{empresaNombre}" en OneDrive.
              </p>
            </div>
          )}
        </div>
      )}
      {/* Skeleton cuando está cargando pero ya hay items (navegación entre carpetas) */}
      {loading && items.length > 0 ? (
        <div className="w-full">
          <div className="rounded-md border border-gray-200 shadow-md">
            <div className="px-6 py-4 border-b bg-gray-50 border-gray-100">
              <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100">
                  <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="w-full">
          {/* Desktop: Tabla */}
          <div className="hidden sm:block rounded-md border border-gray-200 shadow-md">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gray-50 border-gray-100 text-gray-500">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold">
                  {currentFolderId || filterByEmpresa ? 'Documentación' : 'Documentación'}
                </h3>
              </div>
            </div>

            <div className="relative text-gray-500 overflow-x-auto">
              <table className="w-full text-gray-500 caption-bottom text-sm">
                <thead className="border-gray-200">
                  <tr className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 hover:text-gray-900 transition-colors px-2 py-1 rounded hover:bg-gray-100"
                        title="Ordenar por nombre"
                      >
                        <span>Nombre</span>
                        <div className="flex flex-col">
                          <svg 
                            className={`w-3 h-3 ${sortBy === 'name' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5 12l5-5 5 5H5z" />
                          </svg>
                          <svg 
                            className={`w-3 h-3 -mt-1 ${sortBy === 'name' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5 8l5 5 5-5H5z" />
                          </svg>
                        </div>
                      </button>
                    </th>
                    <th className="h-12 px-4 text-center align-middle font-medium text-gray-600">
                      <button
                        onClick={() => handleSort('cobertura')}
                        className="flex items-center justify-center gap-2 hover:text-gray-900 transition-all mx-auto px-3 py-2 rounded-md hover:bg-gray-100 border border-transparent hover:border-gray-300"
                        title={sortBy === 'cobertura' 
                          ? sortOrder === 'asc' 
                            ? 'Ordenar: Menor a Mayor (click para cambiar)' 
                            : 'Ordenar: Mayor a Menor (click para cambiar)'
                          : 'Click para ordenar por porcentaje'}
                      >
                        <span className="font-medium">Cobertura Legal</span>
                        <div className="flex flex-col items-center">
                          <svg 
                            className={`w-3 h-3 ${sortBy === 'cobertura' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5 12l5-5 5 5H5z" />
                          </svg>
                          <svg 
                            className={`w-3 h-3 -mt-1 ${sortBy === 'cobertura' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5 8l5 5 5-5H5z" />
                          </svg>
                        </div>
                        {sortBy === 'cobertura' && (
                          <span className="text-xs text-blue-600 font-semibold ml-1">
                            {sortOrder === 'asc' ? '(↑)' : '(↓)'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredItems.map((item) => {
                    const getFileIcon = (fileName: string): string => {
                      const extension = fileName.split('.').pop()?.toLowerCase() || '';
                      switch (extension) {
                        case 'pdf': return '📄';
                        case 'doc':
                        case 'docx': return '📝';
                        case 'xls':
                        case 'xlsx': return '📊';
                        case 'ppt':
                        case 'pptx': return '📋';
                        case 'jpg':
                        case 'jpeg':
                        case 'png':
                        case 'gif': return '🖼️';
                        case 'zip':
                        case 'rar': return '🗜️';
                        case 'txt': return '📃';
                        default: return '📄';
                      }
                    };

                    const formatFileSize = (bytes?: number): string => {
                      if (!bytes) return '-';
                      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                      const i = Math.floor(Math.log(bytes) / Math.log(1024));
                      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
                    };

                    // Verificar si esta carpeta es una sucursal (funciona en cualquier nivel de navegación)
                    const itemNameLower = item.name.toLowerCase().trim();
                    const isSucursal = filterByEmpresa && empresaId && item.type === 'folder' && sucursales.some(s => {
                      const sucursalNombreLower = s.nombre.toLowerCase().trim();
                      const sucursalIdLower = s.id.toLowerCase().trim();
                      
                      // Comparaciones exactas
                      if (sucursalNombreLower === itemNameLower || sucursalIdLower === itemNameLower) {
                        return true;
                      }
                      
                      // Verificar si contiene o empieza con el ID/nombre de la sucursal
                      if (itemNameLower.includes(sucursalIdLower) || sucursalIdLower.includes(itemNameLower)) {
                        return true;
                      }
                      
                      if (itemNameLower.startsWith(sucursalIdLower) || sucursalIdLower.startsWith(itemNameLower)) {
                        return true;
                      }
                      
                      return false;
                    });
                    
                    const sucursal = isSucursal ? sucursales.find(s => {
                      const sucursalNombreLower = s.nombre.toLowerCase().trim();
                      const sucursalIdLower = s.id.toLowerCase().trim();
                      
                      if (sucursalNombreLower === itemNameLower || sucursalIdLower === itemNameLower) {
                        return true;
                      }
                      
                      if (itemNameLower.includes(sucursalIdLower) || sucursalIdLower.includes(itemNameLower)) {
                        return true;
                      }
                      
                      if (itemNameLower.startsWith(sucursalIdLower) || sucursalIdLower.startsWith(itemNameLower)) {
                        return true;
                      }
                      
                      return false;
                    }) : null;
                    
                    // Obtener el porcentaje de cobertura legal para esta sucursal, empresa o provincia
                    let porcentajeCobertura: string | null = null;
                    
                    if (filterByEmpresa && empresaId && item.type === 'folder') {
                      // Si estamos listando provincias (estamos en la raíz de la empresa), siempre usar Firestore:
                      // `coberturaLegal/{empresa}/provincias/{provincia}` -> `COBERTURA LEGAL PROVINCIAL`
                      // Si estamos dentro de una provincia (navegación ya hecha), usar:
                      // `cobertura_legal/{sucursal}` -> `COBERTURA LEGAL`
                      const listingProvincias = folderHistory.length === 0;
                      porcentajeCobertura = listingProvincias
                        ? getBestProvinciaCobertura(item.name)
                        : getBestSucursalCobertura(item.name);
                    } else if (!filterByEmpresa || !empresaId) {
                      // Si estamos en la raíz, primero verificar si es una provincia
                      const porcentajeProvincia = porcentajesPorProvincia.get(item.id);
                      if (porcentajeProvincia !== undefined) {
                        porcentajeCobertura = porcentajeProvincia;
                      } else {
                        // Si no es provincia, buscar por empresa
                        const itemNameLower = item.name.toLowerCase().trim();
                        const empresa =
                          item.type === 'folder'
                            ? allEmpresas.find((e) => {
                                const nt = normalizeText(item.name);
                                return (
                                  normalizeText(e.nombre) === nt ||
                                  e.id.trim().toLowerCase() === itemNameLower
                                );
                              })
                            : undefined;
                        porcentajeCobertura = empresa ? (porcentajesPorEmpresa.get(empresa.id) ?? null) : null;
                      }
                    }
                    
                    // Si es una sucursal, redirigir a la página de detalle de la sucursal
                    const handleFolderClick = () => {
                      if (isSucursal && sucursal && empresaId) {
                        router.push(`/dashboard/empresas/${encodeURIComponent(empresaId)}/sucursales/${encodeURIComponent(sucursal.id)}`);
                      } else if (item.type === 'folder') {
                        navigateToFolder(item.id, item.name);
                      }
                    };

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-100 transition-colors ${
                          item.type === 'folder' 
                            ? 'hover:bg-gray-100 cursor-pointer bg-white'
                            : 'hover:bg-gray-50 bg-white'
                        }`}
                        onClick={item.type === 'folder' ? handleFolderClick : undefined}
                      >
                        <td className="p-4 align-middle font-medium">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              item.type === 'folder' 
                                ? 'bg-gray-200'
                                : 'bg-gray-100'
                            }`}>
                              <span className="text-lg">
                                {item.type === 'folder' ? '📁' : getFileIcon(item.name)}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 align-middle text-center">
                          {item.type === 'folder' && porcentajeCobertura !== null ? (
                            <span className="inline-flex min-w-[3.75rem] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-gray-800 shadow-sm">
                              {porcentajeCobertura}%
                            </span>
                          ) : null}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.type === 'file' ? (
                              <>
                                {item.webUrl && (
                                  <a
                                    href={item.webUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-gray-300 hover:bg-gray-50 hover:text-gray-900 h-9 px-3"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Previsualizar archivo en OneDrive"
                                  >
                                    Ver
                                  </a>
                                )}
                                {item.downloadUrl && (
                                  <a
                                    href={item.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-gray-500 text-white hover:bg-gray-600 h-9 px-3"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Descargar archivo"
                                  >
                                    Descargar
                                  </a>
                                )}
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: Cards */}
          <div className="sm:hidden space-y-3">
            {filteredItems.map((item) => {
              const getFileIcon = (fileName: string): string => {
                const extension = fileName.split('.').pop()?.toLowerCase() || '';
                switch (extension) {
                  case 'pdf': return '📄';
                  case 'doc':
                  case 'docx': return '📝';
                  case 'xls':
                  case 'xlsx': return '📊';
                  case 'ppt':
                  case 'pptx': return '📋';
                  case 'jpg':
                  case 'jpeg':
                  case 'png':
                  case 'gif': return '🖼️';
                  case 'zip':
                  case 'rar': return '🗜️';
                  case 'txt': return '📃';
                  default: return '📄';
                }
              };

              const formatFileSize = (bytes?: number): string => {
                if (!bytes) return '-';
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(1024));
                return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
              };

              // Verificar si esta carpeta es una sucursal
              const itemNameLower = item.name.toLowerCase().trim();
              const isSucursal = filterByEmpresa && empresaId && item.type === 'folder' && sucursales.some(s => {
                const sucursalNombreLower = s.nombre.toLowerCase().trim();
                const sucursalIdLower = s.id.toLowerCase().trim();
                
                if (sucursalNombreLower === itemNameLower || sucursalIdLower === itemNameLower) {
                  return true;
                }
                
                if (itemNameLower.includes(sucursalIdLower) || sucursalIdLower.includes(itemNameLower)) {
                  return true;
                }
                
                if (itemNameLower.startsWith(sucursalIdLower) || sucursalIdLower.startsWith(itemNameLower)) {
                  return true;
                }
                
                return false;
              });
              
              const sucursalMobile = isSucursal ? sucursales.find(s => {
                const sucursalNombreLower = s.nombre.toLowerCase().trim();
                const sucursalIdLower = s.id.toLowerCase().trim();
                
                if (sucursalNombreLower === itemNameLower || sucursalIdLower === itemNameLower) {
                  return true;
                }
                
                if (itemNameLower.includes(sucursalIdLower) || sucursalIdLower.includes(itemNameLower)) {
                  return true;
                }
                
                if (itemNameLower.startsWith(sucursalIdLower) || sucursalIdLower.startsWith(itemNameLower)) {
                  return true;
                }
                
                return false;
              }) : null;
              
              // Obtener el porcentaje de cobertura legal para esta sucursal, empresa o provincia (mobile)
              let porcentajeCoberturaMobile: string | null = null;
              
              if (filterByEmpresa && empresaId && item.type === 'folder') {
                const listingProvincias = folderHistory.length === 0;
                porcentajeCoberturaMobile = listingProvincias
                  ? getBestProvinciaCobertura(item.name)
                  : getBestSucursalCobertura(item.name);
              } else if (!filterByEmpresa || !empresaId) {
                // Si estamos en la raíz, primero verificar si es una provincia
                const porcentajeProvinciaMobile = porcentajesPorProvincia.get(item.id);
                if (porcentajeProvinciaMobile !== undefined) {
                  porcentajeCoberturaMobile = porcentajeProvinciaMobile;
                } else {
                  // Si no es provincia, buscar por empresa
                  const itemNameLower = item.name.toLowerCase().trim();
                  const empresaMobile =
                    item.type === 'folder'
                      ? allEmpresas.find((e) => {
                          const nt = normalizeText(item.name);
                          return (
                            normalizeText(e.nombre) === nt ||
                            e.id.trim().toLowerCase() === itemNameLower
                          );
                        })
                      : undefined;
                  porcentajeCoberturaMobile = empresaMobile
                    ? (porcentajesPorEmpresa.get(empresaMobile.id) ?? null)
                    : null;
                }
              }
              
              // Si es una sucursal, redirigir a la página de detalle de la sucursal
              const handleFolderClickMobile = () => {
                if (isSucursal && sucursalMobile && empresaId) {
                  router.push(`/dashboard/empresas/${encodeURIComponent(empresaId)}/sucursales/${encodeURIComponent(sucursalMobile.id)}`);
                } else if (item.type === 'folder') {
                  navigateToFolder(item.id, item.name);
                }
              };

              return (
                <div
                  key={item.id}
                  className={`border border-gray-200 rounded-lg p-4 transition-colors ${
                    item.type === 'folder' 
                      ? 'bg-white active:bg-gray-50 cursor-pointer'
                      : 'bg-gray-50'
                  }`}
                  onClick={item.type === 'folder' ? handleFolderClickMobile : undefined}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === 'folder' 
                        ? 'bg-blue-50'
                        : 'bg-gray-100'
                    }`}>
                      <span className="text-2xl">
                        {item.type === 'folder' ? '📁' : getFileIcon(item.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 mb-1 break-words">
                        {item.name}
                      </div>
                      {item.type === 'folder' && porcentajeCoberturaMobile !== null ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-500">Cobertura Legal</span>
                          <span className="inline-flex min-w-[3.25rem] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-800 shadow-sm">
                            {porcentajeCoberturaMobile}%
                          </span>
                        </div>
                      ) : null}
                      {item.type === 'file' && item.size && (
                        <div className="text-xs text-gray-500">
                          {formatFileSize(item.size)}
                        </div>
                      )}
                     
                    </div>
                  </div>
                  {item.type === 'file' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      {item.webUrl && (
                        <a
                          href={item.webUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 h-10 px-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ver
                        </a>
                      )}
                      {item.downloadUrl && (
                        <a
                          href={item.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 h-10 px-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Descargar
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

