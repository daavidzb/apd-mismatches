# Resumen de la Aplicación de Gestión de Descuadres

## Estructura General

La aplicación está estructurada en capas:

### 1. Frontend

- **Vistas** (src/views/)
  - `dashboard.ejs`: Panel principal con estadísticas
  - `analysis.ejs`: Análisis detallado de descuadres
  - `managed.ejs`: Gestión de medicamentos
  - `reports.ejs`: Reportes y comparativas
  - `upload-view.ejs`: Carga de archivos Excel

### 2. Backend

#### Controladores
Organizados por funcionalidad en api:

1. **Dashboard** (dashboard.js)
```javascript
- get_trend_data         // Gráfico de tendencias (30 días)
- get_state_distribution // Distribución por estados
- get_month_report       // Resumen mensual
```

2. **Analysis** (analysis.js)
```javascript
- get_analysis_all           // Lista completa de descuadres
- get_medicine_evolution     // Evolución histórica
- get_compare_months        // Comparativa entre meses
- get_categories_report     // Estadísticas por categoría
```

3. **Management** (managed.js)
```javascript
- update_medicine_management // Actualizar estado/categoría
- get_medicine_management   // Obtener detalles de gestión
- update_managed_mismatch   // Actualizar gestión existente
```

4. **Data** (data.js)
```javascript
- get_medicines_list    // Lista de medicamentos
- get_categorias       // Categorías disponibles
- get_estados         // Estados posibles
```

## Flujo de Datos

1. **Carga de Datos**
   - Usuario sube archivo Excel
   - Sistema procesa y almacena datos
   - Se generan estadísticas iniciales

2. **Análisis**
   - Identificación de patrones
   - Clasificación de descuadres
   - Generación de reportes

3. **Gestión**
   - Asignación de estados
   - Categorización
   - Seguimiento de cambios

## Características Principales

### Dashboard
- Gráficos de tendencias
- Distribución por estados
- Indicadores clave
- Top medicamentos

### Análisis
- Patrones de descuadres
- Comparativas mensuales
- Evolución histórica
- Filtros avanzados

### Gestión
- Estados configurables
- Categorización
- Observaciones
- Historial de cambios

## Base de Datos

Principales tablas:
```sql
- descuadres          // Registro de descuadres
- reportes           // Informes diarios
- medicamentos_gestionados // Gestiones realizadas
- estados_descuadre  // Estados posibles
- categorias_descuadre // Categorías
- motivos_descuadre  // Motivos de descuadre
```

## Seguridad
- Autenticación mediante passport.js
- Middleware de autorización
- Sesiones seguras
- Control de acceso por rutas

## APIs Principales
```javascript
// Análisis
GET /api/analysis/:month          // Descuadres del mes
GET /api/analysis/detail/:code    // Detalles específicos
PUT /api/analysis/manage/:code    // Actualizar gestión

// Dashboard

GET /api/dashboard/trend         // Datos de tendencias
GET /api/dashboard/states        // Distribución estados

// Reportes

GET /api/reports/categories/:month // Estadísticas categorías
GET /api/reports/compare/:m1/:m2  // Comparativa meses
```

## Tecnologías Utilizadas
- Node.js con Express
- MySQL para base de datos
- EJS para vistas
- DataTables para tablas
- ApexCharts para gráficos
- Bootstrap para UI
