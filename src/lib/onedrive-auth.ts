// Librería para manejar autenticación delegada de OneDrive
import axios from 'axios';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export class OneDriveAuth {
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.AZURE_CLIENT_ID!;
    this.clientSecret = process.env.AZURE_CLIENT_SECRET!;
    this.tenantId = process.env.AZURE_TENANT_ID!;
    this.redirectUri = process.env.AZURE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
  }

  // Generar URL de autorización para que el usuario inicie sesión
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: 'Files.Read.All Files.ReadWrite.All offline_access User.Read',
      state: this.generateState(),
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  // Intercambiar código de autorización por tokens
  async getTokenFromCode(code: string): Promise<TokenResponse> {
    try {
      // Usar 'common' para soportar cuentas personales de Microsoft
      const tokenUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/token`;
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      });

      const response = await axios.post<TokenResponse>(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data;
    } catch (error: unknown) {
      console.error('Error getting token from code:', (error as any).response?.data);
      throw new Error(`Failed to get token: ${(error as any).response?.data?.error_description || (error instanceof Error ? error.message : 'Unknown error')}`);
    }
  }

  // Renovar access token usando refresh token
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      // Usar 'common' para soportar cuentas personales de Microsoft
      const tokenUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/token`;
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await axios.post<TokenResponse>(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data;
    } catch (error: unknown) {
      console.error('Error refreshing token:', (error as any).response?.data);
      throw new Error(`Failed to refresh token: ${(error as any).response?.data?.error_description || (error instanceof Error ? error.message : 'Unknown error')}`);
    }
  }

  // Generar state aleatorio para seguridad
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Helper para obtener archivos de OneDrive con token delegado
export async function getOneDriveFilesWithToken(accessToken: string, folderId: string) {
  try {
    const url = folderId === 'root' 
      ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
      : `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const value = response.data?.value;
    if (!Array.isArray(value)) {
      console.warn('[OneDrive] Graph children response sin array "value":', response.data);
      return [];
    }
    return value;
  } catch (error: unknown) {
    const ax = error as { response?: { status?: number; data?: { error?: { message?: string; code?: string } } } };
    console.error('Error getting OneDrive files:', ax.response?.status, ax.response?.data);
    const msg =
      ax.response?.data?.error?.message ||
      (error instanceof Error ? error.message : 'Unknown error');
    throw new Error(`Failed to get files (${ax.response?.status ?? '?'}): ${msg}`);
  }
}

// Helper para buscar carpetas (OData: comilla simple en el texto se escapa duplicándola)
export async function searchOneDriveFolders(accessToken: string, query: string) {
  try {
    const escaped = query.replace(/'/g, "''");
    const url = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${escaped}')`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const value = response.data?.value;
    if (!Array.isArray(value)) {
      console.warn('[OneDrive] Graph search response sin array "value":', response.data);
      return [];
    }
    return value.filter((item: { folder?: unknown }) => item.folder);
  } catch (error: unknown) {
    const ax = error as { response?: { status?: number; data?: { error?: { message?: string; code?: string } } } };
    console.error('Error searching folders:', ax.response?.status, ax.response?.data);
    const msg =
      ax.response?.data?.error?.message ||
      (error instanceof Error ? error.message : 'Unknown error');
    throw new Error(`Failed to search folders (${ax.response?.status ?? '?'}): ${msg}`);
  }
}
