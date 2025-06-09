import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Crear el manejador para la ruta de autenticación usando las opciones definidas en /lib/auth.ts
const handler = NextAuth(authOptions);

// Exportar solo los manejadores HTTP, no las opciones de configuración
export { handler as GET, handler as POST };
