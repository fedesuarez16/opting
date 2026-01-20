/**
 * Determina qué estudios aplican según el servicio del usuario
 * @param servicio - El servicio asignado al usuario
 * @returns Un objeto que indica qué estudios aplican
 */
export function getEstudiosAplicables(servicio: string) {
  const servicioUpper = servicio.toUpperCase();
  
  // Si el servicio es "PUESTA A TIERRA", solo PAT aplica
  if (servicioUpper.includes('PUESTA A TIERRA')) {
    return {
      pat: true,
      iluminacion: false,
      ruido: false,
      termografia: false,
      cargaTermica: false,
      pruebaDisyuntores: false,
      extintores: false,
    };
  }
  
  // Para "BLINDAJE LEGAL" y otros servicios, todos los estudios aplican
  return {
    pat: true,
    iluminacion: true,
    ruido: true,
    termografia: true,
    cargaTermica: true,
    pruebaDisyuntores: true,
    extintores: true,
  };
}

/**
 * Obtiene todos los servicios únicos disponibles en el sistema
 * @param mediciones - Array de mediciones
 * @returns Array de servicios únicos
 */
export function getServiciosDisponibles(mediciones: Array<{ datos: Record<string, unknown> }>): string[] {
  const serviciosSet = new Set<string>();
  
  mediciones.forEach((m) => {
    const datos = m.datos as Record<string, unknown>;
    const getValue = (k: string) => String((datos[k] ?? '') as unknown);
    
    const servicio = getValue('SERVICIO') || getValue('servicio');
    if (servicio && servicio.trim() !== '') {
      serviciosSet.add(servicio.trim());
    }
  });
  
  // Ordenar alfabéticamente
  return Array.from(serviciosSet).sort((a, b) => 
    a.localeCompare(b, 'es', { sensitivity: 'base' })
  );
}
