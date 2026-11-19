import { z } from "zod";

// POST /auth/login. Los largos máximos frenan un cuerpo armado para hacer trabajar de más a bcrypt (que además solo mira los primeros 72 bytes).
const loginSchema = z.object({
  usuario: z.string({ error: "El usuario es obligatorio y debe ser un texto" }).min(1, "El usuario es obligatorio").max(50, "El usuario no puede superar los 50 caracteres"),
  password: z.string({ error: "La contraseña es obligatoria y debe ser un texto" }).min(1, "La contraseña es obligatoria").max(72, "La contraseña no puede superar los 72 caracteres"),
});

export { loginSchema };
