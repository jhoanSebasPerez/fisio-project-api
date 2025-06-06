# Sistema de Gestión de Citas para Clínica de Fisioterapia

Este proyecto es una aplicación web para la gestión de citas de una clínica de fisioterapia, permitiendo a los pacientes agendar citas con fisioterapeutas y a los administradores gestionar los servicios, fisioterapeutas y citas.

## Tecnologías Utilizadas

El proyecto utiliza las siguientes tecnologías:

- **Next.js**: Framework de React para renderizado en servidor y app router
- **React Hook Form**: Para el manejo de formularios
- **Zod**: Para validaciones de formularios
- **Shadcn/UI**: Componentes UI con diseño minimalista y moderno
- **Axios**: Para manejo de solicitudes HTTP
- **Zustand**: Para manejo del estado entre componentes
- **Prisma**: ORM para interacción con la base de datos
- **PostgreSQL**: Motor de base de datos
- **NextAuth**: Para autenticación y autorización
- **React Big Calendar**: Para visualización de calendario de citas
- **Recharts**: Para gráficas estadísticas

## Estructura del Proyecto

```
proyecto-api/
├── prisma/                  # Configuración y schema de Prisma
├── public/                  # Archivos públicos
├── src/
│   ├── app/                 # Rutas y páginas de la aplicación
│   │   ├── api/             # API endpoints
│   │   ├── appointments/    # Páginas para citas
│   │   ├── auth/            # Páginas de autenticación
│   │   ├── dashboard/       # Dashboard para admin y fisioterapeutas
│   │   ├── services/        # Páginas de servicios
│   │   ├── globals.css      # Estilos globales
│   │   ├── layout.tsx       # Layout principal
│   │   └── page.tsx         # Página principal
│   ├── components/          # Componentes reutilizables
│   │   ├── ui/              # Componentes UI genéricos
│   │   └── providers/       # Providers de React
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilidades y configuraciones
│   │   ├── email/           # Funciones para envío de emails
│   │   └── prisma.ts        # Cliente de Prisma
│   └── utils/               # Funciones utilitarias
└── ...
```

## Características Principales

### Para Pacientes
- Ver servicios disponibles
- Agendar citas seleccionando servicios, fisioterapeuta, fecha y hora
- Recibir correos de confirmación y recordatorio
- Confirmar o reprogramar citas
- Completar encuestas de satisfacción

### Para Administradores
- Gestionar servicios (crear, editar, desactivar)
- Gestionar fisioterapeutas (agregar, modificar, desactivar)
- Asignar servicios a fisioterapeutas
- Ver reportes y estadísticas
- Gestionar citas

### Para Fisioterapeutas
- Ver agenda de citas
- Registrar notas sobre tratamientos
- Consultar historial de pacientes
- Cerrar citas y registrar observaciones

## Configuración del Proyecto

### Requisitos Previos
- Node.js (v14 o superior)
- PostgreSQL

### Instalación

1. Clonar el repositorio
```bash
git clone [url-del-repositorio]
cd proyecto-api
```

2. Instalar dependencias
```bash
npm install
```

3. Configurar variables de entorno
Crea un archivo `.env` basado en el `.env.example` y configura tus variables de entorno.

4. Configurar la base de datos
```bash
npx prisma migrate dev
```

5. Iniciar el servidor de desarrollo
```bash
npm run dev
```

6. Acceder a la aplicación
Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

## API Endpoints

### Autenticación
- `POST /api/auth/[...nextauth]` - Autenticación con NextAuth
- `POST /api/register` - Registro de usuarios

### Servicios
- `GET /api/services` - Obtener todos los servicios
- `POST /api/services` - Crear un nuevo servicio (admin)
- `PUT /api/services/:id` - Actualizar un servicio (admin)

### Fisioterapeutas
- `GET /api/therapists` - Obtener todos los fisioterapeutas
- `POST /api/therapists` - Crear un nuevo fisioterapeuta (admin)
- `PUT /api/therapists/:id` - Actualizar un fisioterapeuta (admin)

### Citas
- `GET /api/appointments` - Obtener citas (filtradas según el rol)
- `POST /api/appointments` - Crear una nueva cita
- `PUT /api/appointments/:id` - Actualizar una cita
- `PUT /api/appointments/:id/confirm` - Confirmar una cita
- `PUT /api/appointments/:id/reschedule` - Reprogramar una cita

## Desarrollo Futuro

Algunas características planificadas para futuras versiones:

- Integración con sistema de pagos
- Aplicación móvil
- Sistema de notificaciones push
- Soporte para múltiples idiomas
- Generación automática de facturas
