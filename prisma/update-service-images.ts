const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateServiceImages() {
  try {
    console.log('Actualizando imágenes de servicios...');

    // Mapa de nombres de servicios a rutas de imágenes
    const serviceImageMap = {
      'Fisioterapia Deportiva': '/images/services/fisioterapia-deportiva.jpg',
      'Rehabilitación Neurológica': '/images/services/rehabilitacion-neurologica.jpg',
      'Terapia Manual': '/images/services/terapia-manual.jpg',
      'Fisioterapia Geriátrica': '/images/services/fisioterapia-geriatrica.jpg',
      'Masaje Terapéutico': '/images/services/masaje-terapeutico.jpg',
    };

    // Obtener todos los servicios
    const services = await prisma.service.findMany();

    // Actualizar cada servicio con su imagen correspondiente
    for (const service of services) {
      const imageUrl = serviceImageMap[service.name as keyof typeof serviceImageMap] || null;

      if (imageUrl) {
        await prisma.service.update({
          where: { id: service.id },
          data: { imageUrl },
        });
        console.log(`Servicio "${service.name}" actualizado con imagen: ${imageUrl}`);
      } else {
        console.log(`No se encontró imagen para el servicio: ${service.name}`);
      }
    }

    console.log('Actualización completada con éxito.');
  } catch (error) {
    console.error('Error al actualizar imágenes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateServiceImages();

export { };
