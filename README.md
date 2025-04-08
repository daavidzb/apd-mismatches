# Athos Mismatches - Sistema de Gestión de Descuadres de Medicamentos

## Descripción
Sistema web para la gestión y análisis de descuadres de medicamentos entre FarmaTools y los armarios APD. Permite identificar, analizar y gestionar las diferencias de inventario, facilitando el seguimiento y la toma de decisiones.

## Características Principales

### 1. Análisis de Descuadres
- **Identificación de Patrones**
  - Temporal: Descuadres que aparecen una sola vez
  - Regular: Descuadres constantes o regularizados
  - Cambios: Descuadres con variaciones significativas
- **Visualización**
  - Gráficos de evolución temporal
  - Estadísticas por medicamento
  - Indicadores de tendencias

### 2. Gestión de Medicamentos
- **Estados Configurables**
  - Pendiente
  - En proceso
  - Regularizado
  - Corregido
- **Categorización**
  - Integración Dosis
  - Integración externa
  - Movimientos pendientes
  - Uso inadecuado
  - Horario comparación
  - Descuadre FarmaTools
  - En análisis

### 3. Reportes y Estadísticas
- Comparativas mensuales
- Distribución por estados
- Análisis por categorías
- Histórico de cambios

## Estructura del Proyecto

### Frontend
```
src/
  ├── views/
  │   ├── analysis.ejs    # Vista principal de análisis
  │   ├── dashboard.ejs   # Panel de control
  │   ├── managed.ejs     # Gestión de medicamentos
  │   └── reports.ejs     # Informes y estadísticas
  │
  └── public/
      ├── css/
      │   └── index.css   # Estilos principales
      └── js/
          ├── analysis.js  # Lógica de análisis
          ├── managed.js   # Gestión de medicamentos
          └── utils.js     # Utilidades comunes
```

### Backend
```
src/
  ├── controllers/
  │   └── api/
  │       ├── sync.js     # Sincronización de datos
  │       └── analysis.js # Controlador de análisis
  │
  ├── db/
  │   └── connection.js   # Configuración BD
  │
  └── routes/
      └── apis/          # Rutas API
```

## Base de Datos

### Tablas Principales
```sql
descuadres
- id_descuadre (PK)
- codigo_med
- descripcion
- cantidad_farmatools
- cantidad_armario_apd
- descuadre

medicamentos_gestionados
- id_gestion (PK)
- id_descuadre (FK)
- id_estado
- id_categoria
- observaciones
- fecha_gestion

estados_descuadre
- id_estado (PK)
- nombre
- color

categorias_descuadre
- id_categoria (PK)
- nombre
- descripcion
```

## API Endpoints

### Análisis
```javascript
GET  /api/analysis/:month          // Obtener descuadres del mes
GET  /api/analysis/detail/:code    // Detalles de medicamento
GET  /api/analysis/history/:code   // Histórico de descuadres
PUT  /api/analysis/manage/:code    // Gestionar medicamento
```

### Dashboard
```javascript
GET  /api/dashboard/trend          // Tendencias
GET  /api/dashboard/states         // Estados
GET  /api/dashboard/categories     // Categorías
```

## Configuración del Proyecto

### Requisitos Previos
- Node.js v14 o superior
- MySQL 5.7 o superior
- npm o yarn

### Instalación
```bash
# Clonar repositorio
git clone [url-repositorio]

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales

# Iniciar servidor desarrollo
npm run dev
```

### Scripts Disponibles
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "jest"
}
```

## Contribución
1. Crear rama feature/fix
2. Commit con mensaje descriptivo
3. Push y crear Pull Request
4. Code review y merge

## Notas Importantes
- Mantener consistencia en el estilo de código
- Documentar cambios significativos
- Ejecutar pruebas antes de commit
- Actualizar README si es necesario

## Tech Stack
- Backend: Node.js, Express
- Frontend: EJS, Bootstrap 5
- Base de datos: MySQL
- Librerías: DataTables, ApexCharts
- Autenticación: Passport.js

## Próximas Mejoras
- [ ] Implementar dark mode
- [ ] Mejorar rendimiento de consultas
- [ ] Añadir más filtros de análisis
- [ ] Exportación de reportes PDF
