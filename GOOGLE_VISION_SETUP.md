# 🔧 Configuración de Google Vision API

## 1. Crear proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Vision API**:
   - Ve a "APIs & Services" > "Library"
   - Busca "Vision API"
   - Haz clic en "Enable"

## 2. Crear Service Account

1. Ve a "IAM & Admin" > "Service Accounts"
2. Haz clic en "Create Service Account"
3. Nombre: `splity-vision-ocr`
4. Rol: `Project > Editor` o `Cloud Vision API Service Agent`
5. Haz clic en "Create"

## 3. Generar credenciales

1. En la lista de Service Accounts, haz clic en el que creaste
2. Ve a la pestaña "Keys"
3. Haz clic en "Add Key" > "Create new key"
4. Selecciona formato **JSON**
5. Descarga el archivo JSON

## 4. Configurar variables de entorno

Agrega estas variables a tu archivo `.env.local`:

```bash
# Google Cloud Vision API
GOOGLE_CLOUD_PROJECT_ID=tu_project_id
GOOGLE_VISION_CREDENTIALS={"type":"service_account","project_id":"tu_project_id",...}
```

**Opción 1: JSON completo en variable**
Copia todo el contenido del archivo JSON descargado y pégalo en `GOOGLE_VISION_CREDENTIALS` (en una sola línea).

**Opción 2: Archivo de credenciales**
```bash
GOOGLE_APPLICATION_CREDENTIALS=./path/to/your/service-account-key.json
```

## 5. Costos

- Google Vision API: $1.50 por 1,000 imágenes
- Primeras 1,000 imágenes por mes son **GRATIS**
- Muy económico para uso normal

## 6. Ejemplo de .env.local

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key

# Google Vision (EJEMPLO - Reemplaza con tus credenciales reales)
GOOGLE_CLOUD_PROJECT_ID=tu-proyecto-id
GOOGLE_VISION_CREDENTIALS='{
  "type": "service_account",
  "project_id": "tu-proyecto-id",
  "private_key_id": "tu_private_key_id",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nTU_PRIVATE_KEY_AQUI\\n-----END PRIVATE KEY-----\\n",
  "client_email": "tu-service-account@tu-proyecto.iam.gserviceaccount.com",
  "client_id": "tu_client_id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/tu-service-account%40tu-proyecto.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}'
```

## 7. Verificar configuración

Una vez configurado, ejecuta:
```bash
npm run dev
```

Y prueba subir un recibo. Los logs en la consola te dirán si las credenciales funcionan correctamente. 