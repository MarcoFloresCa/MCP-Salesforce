# Build & Deploy Guide

## Desarrollo Local

### 1. Instalación de dependencias

```bash
npm install
```

### 2. Compilación

```bash
npm run build
```

Esto genera los archivos JavaScript en el directorio `dist/`.

### 3. Configuración

```bash
cp .env.example .env
# Edita .env con tus credenciales
```

### 4. Ejecución

```bash
npm run start
```

O en modo desarrollo con auto-rebuild:

```bash
npm run dev
```

## Pruebas

### Test básico de conexión

```bash
# Verifica que el servidor responde
echo '{}' | npm run start -- --help
```

### Test con org específica

Crea un archivo `.env` con credenciales de sandbox de prueba y ejecuta:

```bash
npm run start
```

## Empaquetado

### Para uso local

```bash
npm run build
# Los archivos están en dist/
```

### Para distribución como npm

```bash
npm publish --access public
```

## OpenCode Integration

### Configuración básica

1. Instala el paquete o clona el repositorio
2. Copia el contenido de `opencode.json.example`
3. Edita las credenciales
4. Agrega a tu `opencode.json`

### Verificar funcionamiento

Después de configurar, consulta los logs de OpenCode para verificar la conexión:

```bash
# El servidor debería mostrar logs de conexión
# Busca mensajes como:
# - "Configuration loaded: X orgs configured"
# - "Connecting to org 'alias'"
# - "Successfully connected to org 'alias'"
```

## Troubleshooting

### Error: "Org not found"

Verifica que el alias en tu query coincida exactamente con el alias en `SALESFORCE_ORGS_JSON`.

### Error: "Failed to connect"

1. Verifica username/password
2. Verifica el security token
3. Verifica la loginUrl (test.salesforce.com para sandbox)

### Error: "Invalid configuration"

El JSON en `SALESFORCE_ORGS_JSON` tiene formato incorrecto. Verifica la sintaxis.

### Warning de producción

Esto es normal. Indica que te conectaste a una org de producción. Todas las operaciones serán solo lectura.
