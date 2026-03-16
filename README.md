# MCP Salesforce Reader

MCP server para consultar metadata de Salesforce en modo solo lectura. Diseñado para integrar con OpenCode y permitir a agentes de IA entender estructuras de orgs Salesforce.

## Características

- **Multi-org**: Configura múltiples orgs (sandboxes, UAT, producción) y selecciona cuál usar en cada consulta
- **Solo lectura**: Todas las operaciones son de consulta, nunca modifican la org
- **Producción segura**: Los warnings y logsalertan cuando te conectas a producción
- **Enriquecimiento**: Las respuestas incluyen información adicional útil para razonamiento
- **Comparación de schemas**: Compara objetos y campos entre dos orgs

## Herramientas Disponibles

| Herramienta | Descripción |
|-------------|-------------|
| `list_objects` | Lista todos los objetos disponibles en la org |
| `describe_object` | Describe un objeto completo con sus campos |
| `list_fields` | Lista los campos de un objeto |
| `get_field_metadata` | Obtiene metadata detallada de un campo |
| `get_formula_field_details` | Analiza campos fórmula (referencias, complejidad, impacto) |
| `query_soql_readonly` | Ejecuta queries SOQL en modo solo lectura |
| `query_tooling_readonly` | Ejecuta queries en Tooling API (metadata, Apex) |
| `compare_schemas` | Compara schemas entre dos orgs |

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

```json
SALESFORCE_ORGS_JSON='[
  {
    "alias": "mi-sandbox",
    "environment": "sandbox",
    "loginUrl": "https://test.salesforce.com",
    "username": "mi.usuario@miempresa.com",
    "password": "micontraseña",
    "securityToken": "miSecurityToken"
  }
]'

DEFAULT_ORG_ALIAS=mi-sandbox
LOG_LEVEL=info
```

### Formato de Configuración

Cada org necesita:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `alias` | Identificador único | `dev`, `uat`, `prod` |
| `environment` | Tipo de entorno | `sandbox` o `production` |
| `loginUrl` | URL de login | `https://test.salesforce.com` (sandbox) o `https://login.salesforce.com` (prod) |
| `username` | Usuario de Salesforce | `admin@miempresa.com` |
| `password` | Contraseña | `********` |
| `securityToken` | Security token | `********` |

**Nota**: El environment `production` activa modo solo lectura y muestra warnings.

## Uso con OpenCode

### Opción 1: Instalación global

```bash
npm install -g mcp-salesforce-reader
```

### Opción 2: Instalación local

```bash
npm install mcp-salesforce-reader --save-dev
```

### Configuración en `opencode.json`

```json
{
  "mcpServers": {
    "salesforce-reader": {
      "command": "node",
      "args": ["./node_modules/mcp-salesforce-reader/dist/index.js"],
      "env": {
        "SALESFORCE_ORGS_JSON": "[{\"alias\":\"dev\",\"environment\":\"sandbox\",\"loginUrl\":\"https://test.salesforce.com\",\"username\":\"user@dev.org\",\"password\":\"xxx\",\"securityToken\":\"xxx\"},{\"alias\":\"prod\",\"environment\":\"production\",\"loginUrl\":\"https://login.salesforce.com\",\"username\":\"user@prod.org\",\"password\":\"xxx\",\"securityToken\":\"xxx\"}]",
        "DEFAULT_ORG_ALIAS": "dev",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Ejemplos de Uso

### Listar objetos

```json
{
  "orgAlias": "dev"
}
```

### Describir un objeto

```json
{
  "orgAlias": "dev",
  "objectApiName": "Account"
}
```

### Obtener metadata de un campo

```json
{
  "orgAlias": "dev",
  "objectApiName": "Account",
  "fieldApiName": "AnnualRevenue"
}
```

### Analizar campo fórmula

```json
{
  "orgAlias": "dev",
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

## Seguridad

### Produccion

- **Modo solo lectura**: Las operaciones en orgs de producción son siempre de lectura
- **Warnings**: Se muestra warning en primera conexión a producción
- **Logs**: Todas las conexiones a producción se registran

### Contraseñas y Tokens

- **Nunca** pongas credenciales reales en `opencode.json`
- Usa variables de entorno o un archivo `.env` local
- No hagas commit de `.env` al repositorio
- Considera usar OAuth2 con JWT Bearer para mayor seguridad

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
├── policies/        # Validaciones de seguridad
├── tools/           # Herramientas MCP
├── enrichers/       # Enrichment de metadata
├── logging/         # Sistema de logs
└── index.ts         # Punto de entrada
```

## Próximas características

- [ ] Tools de escritura (crear/modificar campos)
- [ ] Autenticación OAuth2/JWT
- [ ] Cache de metadata
- [ ] Soporte para HTTP transport
- [ ] Tests de integración

## Licencia

MIT
