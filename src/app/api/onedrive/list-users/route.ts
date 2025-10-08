import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface MicrosoftGraphToken {
  access_token: string;
}

async function getAccessToken(): Promise<string> {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID!,
      client_secret: process.env.AZURE_CLIENT_SECRET!,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const response = await axios.post<MicrosoftGraphToken>(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  } catch (_error: unknown) {
    throw new Error('Failed to obtain access token');
  }
}

export async function GET(_req: NextRequest) {
  try {
    const accessToken = await getAccessToken();

    // Listar todos los usuarios en el tenant
    const usersResponse = await axios.get(
      'https://graph.microsoft.com/v1.0/users',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const users = usersResponse.data.value.map((user: { displayName: string; userPrincipalName: string; mail: string; id: string }) => ({
      displayName: user.displayName,
      userPrincipalName: user.userPrincipalName,
      mail: user.mail,
      id: user.id
    }));

    return NextResponse.json({
      success: true,
      message: 'Usuarios encontrados en tu Azure AD',
      users,
      instructions: [
        'Estos son los usuarios que existen en tu Azure AD tenant',
        'Usa uno de estos emails en ONEDRIVE_USER_EMAIL',
        'Recomendación: usa userPrincipalName o mail',
        'El usuario debe tener OneDrive habilitado'
      ]
    });

  } catch (error: unknown) {
    console.error('Error listing users:', (error as any).response?.data);
    
    return NextResponse.json({
      error: 'Failed to list users',
      details: (error as any).response?.data || (error instanceof Error ? error.message : 'Unknown error'),
      possibleReasons: [
        'La aplicación necesita permisos de User.Read.All',
        'No se ha dado "Grant admin consent" al permiso User.Read.All',
        'El token no tiene los permisos necesarios'
      ],
      howToFix: [
        '1. Ve a Azure AD → App registrations → Tu app',
        '2. API permissions → Add permission',
        '3. Microsoft Graph → Application permissions',
        '4. Busca y agrega: User.Read.All',
        '5. Click "Grant admin consent"',
        '6. Espera 5 minutos y vuelve a intentar'
      ]
    }, { status: 500 });
  }
}
