# MCP Salesforce Reader

MCP server para consultar metadata de Salesforce en modo solo lectura. Diseñado para integrar con OpenCode y permitir a agentes de IA entender estructuras de orgs Salesforce.

## Características

- **Multi-org**: Configura múltiples orgs (sandboxes, UAT, producción) y selecciona cuál usar en cada consulta
- **Solo lectura**: Todas las operaciones son de consulta, nunca modifican la org
- **Producción segura**: Requiere confirmación explícita para acceder a producción
- **Query sanitization**: Solo SELECT permitido, con límites enforced
- **Enriquecimiento**: Las respuestas incluyen información adicional útil para razonamiento
- **Comparación de schemas**: Compara objetos y campos entre dos orgs
- **Auditoría completa**: Logs de todas las operaciones con sanitización

## Seguridad

### Confirmación de Producción
Para acceder a cualquier tool en una org marcada como `production`, primero debes confirmar con `confirm_production_access`:

```javascript
// Primero: confirmar acceso
{
  "tool": "confirm_production_access",
  "params": {
    "orgAlias": "banagro-prod",
    "confirmationToken": "TU_TOKEN"
  }
}

// Después: usar otras tools
{
  "tool": "list_objects",
  "params": {
    "orgAlias": "banagro-prod"
  }
}
```

### Query Restrictions
- Solo SELECT queries permitidas
- SOSL bloqueado
- ALL ROWS bloqueado
- LIMIT forzado (100 en prod, 1000 en sandbox)
- Producción limitada a 1000 registros max
- Tooling API limitada a 500 registros max en prod

## Herramientas Disponibles

| Herramienta | Descripción | Requiere Confirmación en Prod |
|-------------|-------------|-------------------------------|
| `confirm_production_access` | Confirma acceso a producción | ❌ No |
| `list_objects` | Lista todos los objetos disponibles en la org | ✅ Sí |
| `describe_object` | Describe un objeto completo con sus campos | ✅ Sí |
| `list_fields` | Lista los campos de un objeto | ✅ Sí |
| `get_field_metadata` | Obtiene metadata detallada de un campo | ✅ Sí |
| `get_formula_field_details` | Analiza campos fórmula (referencias, complejidad, impacto) | ✅ Sí |
| `query_soql_readonly` | Ejecuta queries SOQL (SELECT solo) | ✅ Sí |
| `query_tooling_readonly` | Ejecuta queries en Tooling API (SELECT solo) | ✅ Sí |
| `compare_schemas` | Compara schemas entre dos orgs | ✅ Sí |

## Requisitos

- Node.js 18+
- Cuenta de Salesforce con API access
- Security token de Salesforce

## Instalación

### Como paquete npm

```bash
npm install mcp-salesforce-reader
```

### Como desarrollo local

```bash
git clone <repo> mcp-salesforce-reader
cd mcp-salesforce-reader
npm install
npm run build
```

## Configuración

1. Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

2. Edita `.env` con tus credenciales:

```bash
# Org 1: Sandbox Dev
SALESFORCE_BANAGRO_DEV_ALIAS=banagro-dev
SALESFORCE_BANAGRO_DEV_ENVIRONMENT=sandbox
SALESFORCE_BANAGRO_DEV_LOGIN_URL=https://test.salesforce.com
SALESFORCE_BANAGRO_DEV_USERNAME=user@dev.org
SALESFORCE_BANAGRO_DEV_PASSWORD=***
SALESFORCE_BANAGRO_DEV_SECURITY_TOKEN=***

# Org 2: Production
SALESFORCE_BANAGRO_PROD_ALIAS=banagro-prod
SALESFORCE_BANAGRO_PROD_ENVIRONMENT=production
SALESFORCE_BANAGRO_PROD_LOGIN_URL=https://login.salesforce.com
SALESFORCE_BANAGRO_PROD_USERNAME=user@prod.org
SALESFORCE_BANAGRO_PROD_PASSWORD=***
SALESFORCE_BANAGRO_PROD_SECURITY_TOKEN=***

# Token de confirmación para producción
PRODUCTION_CONFIRMATION_TOKEN=mi_token_secreto

# Org por defecto
DEFAULT_ORG_ALIAS=banagro-dev
```

### Formato de Configuración

Cada org necesita:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `SALESFORCE_<PREFIX>_ALIAS` | Identificador único | `banagro-dev` |
| `SALESFORCE_<PREFIX>_ENVIRONMENT` | Tipo de entorno | `sandbox` o `production` |
| `SALESFORCE_<PREFIX>_LOGIN_URL` | URL de login | `https://test.salesforce.com` (sandbox) o `https://login.salesforce.com` (prod) |
| `SALESFORCE_<PREFIX>_USERNAME` | Usuario de Salesforce | `admin@miempresa.com` |
| `SALESFORCE_<PREFIX>_PASSWORD` | Contraseña | `********` |
| `SALESFORCE_<PREFIX>_SECURITY_TOKEN` | Security token | `********` |

**Nota**: El sistema detecta automáticamente las orgs buscando variables que terminen en `_ALIAS`.

## Uso con OpenCode

### Configuración en `opencode.json`

```json
{
  "mcpServers": {
    "salesforce-reader": {
      "command": "node",
      "args": ["./node_modules/mcp-salesforce-reader/dist/index.js"],
      "env": {
        "SALESFORCE_BANAGRO_DEV_ALIAS": "banagro-dev",
        "SALESFORCE_BANAGRO_DEV_ENVIRONMENT": "sandbox",
        "SALESFORCE_BANAGRO_DEV_LOGIN_URL": "https://test.salesforce.com",
        "SALESFORCE_BANAGRO_DEV_USERNAME": "user@dev.org",
        "SALESFORCE_BANAGRO_DEV_PASSWORD": "xxx",
        "SALESFORCE_BANAGRO_DEV_SECURITY_TOKEN": "xxx",
        "SALESFORCE_BANAGRO_PROD_ALIAS": "banagro-prod",
        "SALESFORCE_BANAGRO_PROD_ENVIRONMENT": "production",
        "SALESFORCE_BANAGRO_PROD_LOGIN_URL": "https://login.salesforce.com",
        "SALESFORCE_BANAGRO_PROD_USERNAME": "user@prod.org",
        "SALESFORCE_BANAGRO_PROD_PASSWORD": "xxx",
        "SALESFORCE_BANAGRO_PROD_SECURITY_TOKEN": "xxx",
        "PRODUCTION_CONFIRMATION_TOKEN": "xxx",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Ejemplos de Uso

### Confirmar acceso a producción

```json
{
  "orgAlias": "banagro-prod",
  "confirmationToken": "mi_token_secreto"
}
```

### Listar objetos

```json
{
  "orgAlias": "banagro-dev"
}
```

### Describir un objeto

```json
{
  "orgAlias": "banagro-dev",
  "objectApiName": "Account"
}
```

### Obtener metadata de un campo

```json
{
  "orgAlias": "banagro-dev",
  "objectApiName": "Account",
  "fieldApiName": "AnnualRevenue"
}
```

### Analizar campo fórmula

```json
{
  "orgAlias": "banagro-dev",
  "objectApiName": "Account",
  "fieldApiName": "AnnualRevenueFormatted__c"
}
```

### Query SOQL

```json
{
  "orgAlias": "prod",
  "query": "SELECT Id, Name, AnnualRevenue FROM Account WHERE AnnualRevenue > 100000",
  "limit": 10
}
```

### Comparar schemas entre orgs

```json
{
  "orgAlias": "prod",
  "targetOrgAlias": "dev",
  "objectApiNames": ["Account", "Opportunity"]
}
```

## Logging y Auditoría

Todas las operaciones se registran con:

- Timestamp
- Org alias
- Environment (sandbox/production)
- Tool ejecutada
- Duración
- Cantidad de registros
- Query sanitizada (sin valores sensibles)
- Estado de confirmación de producción

**Nunca se registran**: passwords, securityTokens, confirmationTokens, credenciales.

## Desarrollo

### Comandos disponibles

```bash
npm run build    # Compila TypeScript
npm run start    # Inicia el servidor
npm run dev      # Build + start para desarrollo
npm run clean    # Limpia archivos compilados
```

### Estructura del proyecto

```
src/
├── config/          # Carga y validación de configuración
├── auth/            # Autenticación con Salesforce
├── policies/        # Validaciones de seguridad y confirmación
├── tools/           # Herramientas MCP
├── enrichers/       # Enrichment de metadata
├── logging/         # Sistema de logs y auditoría
└── index.ts         # Punto de entrada
```

## Cosas que NO hace este MCP

- ❌ Operaciones de escritura (create, update, delete)
- ❌ Ejecutar Apex
- ❌ Deployment de metadata
- ❌ Acceso sin confirmación a producción

## Licencia

MIT
