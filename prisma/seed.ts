import { PrismaClient, User, Service, Appointment } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, addHours, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seeding...');
  
  // Limpiar datos existentes
  await cleanDatabase();
  
  // Crear usuarios: administrador, fisioterapeutas y pacientes
  const adminUser = await createAdminUser();
  const therapists = await createTherapists();
  const patients = await createPatients();
  
  // Crear servicios
  const services = await createServices();
  
  // Asignar servicios a fisioterapeutas
  await assignServicesToTherapists(therapists, services);
  
  // Crear citas
  const appointments = await createAppointments(patients, therapists, services);
  
  // Crear notas de fisioterapeutas
  await createTherapistNotes(appointments, therapists);
  
  // Crear respuestas de encuestas
  await createSurveyResponses(appointments, patients);
  
  console.log('Seeding completado!');
  console.log('NOTA: Los horarios (schedules) deben crearse manualmente desde la interfaz debido a restricciones de migración.');
}

async function cleanDatabase() {
  console.log('Limpiando base de datos...');
  
  // El orden es importante debido a las relaciones de clave foránea
  await prisma.surveyResponse.deleteMany({});
  await prisma.therapistNote.deleteMany({});
  await prisma.appointmentService.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.therapistService.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.user.deleteMany({});
  
  console.log('Base de datos limpiada');
}

async function createAdminUser() {
  console.log('Creando usuario administrador...');
  
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@clinica.com',
      hashedPassword,
      role: 'ADMIN',
      phone: '1234567890',
      active: true
    },
  });
  
  console.log(`Administrador creado: ${admin.name} (${admin.email})`);
  return admin;
}

async function createTherapists() {
  console.log('Creando fisioterapeutas...');
  
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const therapistsData = [
    {
      name: 'Ana Rodríguez',
      email: 'ana.rodriguez@clinica.com',
      phone: '3001234567',
      specialization: 'Fisioterapia Deportiva'
    },
    {
      name: 'Carlos Mendoza',
      email: 'carlos.mendoza@clinica.com',
      phone: '3009876543',
      specialization: 'Rehabilitación Neurológica'
    },
    {
      name: 'Laura Gómez',
      email: 'laura.gomez@clinica.com',
      phone: '3005678901',
      specialization: 'Terapia Manual'
    }
  ];
  
  const therapists = [];
  
  for (const data of therapistsData) {
    const therapist = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        hashedPassword,
        role: 'THERAPIST',
        phone: data.phone,
        active: true
      },
    });
    
    console.log(`Fisioterapeuta creado: ${therapist.name} (${therapist.email})`);
    therapists.push(therapist);
  }
  
  return therapists;
}

async function createPatients() {
  console.log('Creando pacientes...');
  
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const patientsData = [
    {
      name: 'Pedro Sánchez',
      email: 'pedro.sanchez@example.com',
      phone: '3201234567'
    },
    {
      name: 'María López',
      email: 'maria.lopez@example.com',
      phone: '3209876543'
    },
    {
      name: 'Juan García',
      email: 'juan.garcia@example.com',
      phone: '3205678901'
    },
    {
      name: 'Sofia Martínez',
      email: 'sofia.martinez@example.com',
      phone: '3207654321'
    },
    {
      name: 'Diego Torres',
      email: 'diego.torres@example.com',
      phone: '3203456789'
    }
  ];
  
  const patients = [];
  
  for (const data of patientsData) {
    const patient = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        hashedPassword,
        role: 'PATIENT',
        phone: data.phone,
        active: true
      },
    });
    
    console.log(`Paciente creado: ${patient.name} (${patient.email})`);
    patients.push(patient);
  }
  
  return patients;
}

async function createServices() {
  console.log('Creando servicios...');
  
  const servicesData = [
    {
      name: 'Fisioterapia Deportiva',
      description: 'Tratamiento especializado para lesiones relacionadas con actividades deportivas y ejercicio físico.',
      duration: 60,
      price: 75000,
      imageUrl: '/images/services/fisioterapia-deportiva.jpg',
    },
    {
      name: 'Rehabilitación Neurológica',
      description: 'Terapia especializada para pacientes con afecciones neurológicas como ACV, Parkinson o esclerosis múltiple.',
      duration: 90,
      price: 90000,
      imageUrl: '/images/services/rehabilitacion-neurologica.jpg',
    },
    {
      name: 'Terapia Manual',
      description: 'Técnicas manuales para tratar el dolor y mejorar la movilidad articular.',
      duration: 45,
      price: 65000,
      imageUrl: '/images/services/terapia-manual.jpg',
    },
    {
      name: 'Fisioterapia Geriátrica',
      description: 'Tratamiento especializado para adultos mayores enfocado en mejorar la movilidad y funcionalidad.',
      duration: 60,
      price: 70000,
      imageUrl: '/images/services/fisioterapia-geriatrica.jpg',
    },
    {
      name: 'Masaje Terapéutico',
      description: 'Masaje para aliviar la tensión muscular y mejorar la circulación.',
      duration: 30,
      price: 50000,
      imageUrl: '/images/services/masaje-terapeutico.jpg',
    },
  ];
  
  const services = [];
  
  for (const data of servicesData) {
    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description,
        duration: data.duration,
        price: data.price,
        imageUrl: data.imageUrl,
        isActive: true,
      },
    });
    
    console.log(`Servicio creado: ${service.name}`);
    services.push(service);
  }
  
  return services;
}

async function assignServicesToTherapists(therapists: User[], services: Service[]) {
  console.log('Asignando servicios a fisioterapeutas...');
  
  // Ana Rodríguez - Fisioterapia Deportiva y Masaje Terapéutico
  await prisma.therapistService.create({
    data: {
      therapistId: therapists[0].id,
      serviceId: services[0].id,
    },
  });
  
  await prisma.therapistService.create({
    data: {
      therapistId: therapists[0].id,
      serviceId: services[4].id,
    },
  });
  
  // Carlos Mendoza - Rehabilitación Neurológica y Fisioterapia Geriátrica
  await prisma.therapistService.create({
    data: {
      therapistId: therapists[1].id,
      serviceId: services[1].id,
    },
  });
  
  await prisma.therapistService.create({
    data: {
      therapistId: therapists[1].id,
      serviceId: services[3].id,
    },
  });
  
  // Laura Gómez - Terapia Manual y Masaje Terapéutico
  await prisma.therapistService.create({
    data: {
      therapistId: therapists[2].id,
      serviceId: services[2].id,
    },
  });
  
  await prisma.therapistService.create({
    data: {
      therapistId: therapists[2].id,
      serviceId: services[4].id,
    },
  });
  
  console.log('Servicios asignados a fisioterapeutas');
}

async function createAppointments(patients: User[], therapists: User[], services: Service[]) {
  console.log('Creando citas...');
  
  const today = new Date();
  const appointments = [];
  
  // Citas para la semana actual y la siguiente
  // Pedro Sánchez - Ana Rodríguez - Fisioterapia Deportiva
  const appointment1 = await prisma.appointment.create({
    data: {
      patientId: patients[0].id,
      therapistId: therapists[0].id,
      date: setHours(setMinutes(addDays(today, 1), 0), 10),
      status: 'SCHEDULED',
    },
  });
  
  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment1.id,
      serviceId: services[0].id,
    },
  });
  
  appointments.push(appointment1);
  
  // María López - Carlos Mendoza - Rehabilitación Neurológica
  const appointment2 = await prisma.appointment.create({
    data: {
      patientId: patients[1].id,
      therapistId: therapists[1].id,
      date: setHours(setMinutes(addDays(today, 2), 30), 14),
      status: 'CONFIRMED',
    },
  });
  
  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment2.id,
      serviceId: services[1].id,
    },
  });
  
  appointments.push(appointment2);
  
  // Juan García - Laura Gómez - Terapia Manual
  const appointment3 = await prisma.appointment.create({
    data: {
      patientId: patients[2].id,
      therapistId: therapists[2].id,
      date: setHours(setMinutes(addDays(today, 3), 0), 16),
      status: 'SCHEDULED',
    },
  });
  
  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment3.id,
      serviceId: services[2].id,
    },
  });
  
  appointments.push(appointment3);
  
  // Sofia Martínez - Ana Rodríguez - Masaje Terapéutico
  const appointment4 = await prisma.appointment.create({
    data: {
      patientId: patients[3].id,
      therapistId: therapists[0].id,
      date: setHours(setMinutes(addDays(today, 4), 30), 11),
      status: 'SCHEDULED',
    },
  });
  
  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment4.id,
      serviceId: services[4].id,
    },
  });
  
  appointments.push(appointment4);
  
  // Diego Torres - Carlos Mendoza - Fisioterapia Geriátrica
  const appointment5 = await prisma.appointment.create({
    data: {
      patientId: patients[4].id,
      therapistId: therapists[1].id,
      date: setHours(setMinutes(addDays(today, 5), 0), 9),
      status: 'CONFIRMED',
    },
  });
  
  await prisma.appointmentService.create({
    data: {
      appointmentId: appointment5.id,
      serviceId: services[3].id,
    },
  });
  
  appointments.push(appointment5);
  
  // Citas ya completadas
  // Pedro Sánchez - Laura Gómez - Masaje Terapéutico (completada)
  const pastAppointment1 = await prisma.appointment.create({
    data: {
      patientId: patients[0].id,
      therapistId: therapists[2].id,
      date: setHours(setMinutes(addDays(today, -5), 0), 15),
      status: 'COMPLETED',
    },
  });
  
  await prisma.appointmentService.create({
    data: {
      appointmentId: pastAppointment1.id,
      serviceId: services[4].id,
    },
  });
  
  appointments.push(pastAppointment1);
  
  // María López - Ana Rodríguez - Fisioterapia Deportiva (completada)
  const pastAppointment2 = await prisma.appointment.create({
    data: {
      patientId: patients[1].id,
      therapistId: therapists[0].id,
      date: setHours(setMinutes(addDays(today, -10), 30), 10),
      status: 'COMPLETED',
    },
  });
  
  await prisma.appointmentService.create({
    data: {
      appointmentId: pastAppointment2.id,
      serviceId: services[0].id,
    },
  });
  
  appointments.push(pastAppointment2);
  
  console.log(`${appointments.length} citas creadas`);
  return appointments;
}

async function createTherapistNotes(appointments: Appointment[], therapists: User[]) {
  console.log('Creando notas de fisioterapeutas...');
  
  // Notas para citas completadas
  await prisma.therapistNote.create({
    data: {
      appointmentId: appointments[5].id, // Pedro - Laura - Masaje Terapéutico
      therapistId: therapists[2].id, // Laura Gómez
      content: 'Paciente presenta tensión muscular en zona lumbar. Se realizó masaje terapéutico con énfasis en esta área. Se recomienda estiramientos diarios y aplicación de calor local.',
    },
  });
  
  await prisma.therapistNote.create({
    data: {
      appointmentId: appointments[6].id, // María - Ana - Fisioterapia Deportiva
      therapistId: therapists[0].id, // Ana Rodríguez
      content: 'Paciente con lesión en tobillo derecho. Se realizaron ejercicios de fortalecimiento y propiocepción. Evolución favorable. Programar seguimiento en 15 días.',
    },
  });
  
  console.log('Notas de fisioterapeutas creadas');
}

async function createSurveyResponses(appointments: Appointment[], patients: User[]) {
  console.log('Creando respuestas de encuestas...');
  
  // Encuestas para citas completadas
  await prisma.surveyResponse.create({
    data: {
      appointmentId: appointments[5].id, // Pedro - Laura - Masaje Terapéutico
      patientId: patients[0].id, // Pedro Sánchez
      satisfaction: 5,
      comments: 'Excelente servicio. La terapeuta Laura fue muy profesional y el masaje me ayudó mucho a aliviar la tensión.',
    },
  });
  
  await prisma.surveyResponse.create({
    data: {
      appointmentId: appointments[6].id, // María - Ana - Fisioterapia Deportiva
      patientId: patients[1].id, // María López
      satisfaction: 4,
      comments: 'Buen servicio. Los ejercicios han sido efectivos para mi recuperación. Recomendaría más indicaciones escritas para los ejercicios en casa.',
    },
  });
  
  console.log('Respuestas de encuestas creadas');
}

// Nota: La función para crear horarios ha sido eliminada debido a restricciones de permisos en la base de datos.
// Los horarios deben crearse manualmente desde la interfaz de usuario.

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
