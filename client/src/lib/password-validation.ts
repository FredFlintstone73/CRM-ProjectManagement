import { z } from "zod";

// Strong password validation function
export const validatePassword = (password: string) => {
  if (password.length < 12) {
    return "Password must be at least 12 characters long";
  }
  
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  
  if (!hasLetter) {
    return "Password must contain at least one letter";
  }
  if (!hasNumber) {
    return "Password must contain at least one number";
  }
  if (!hasSpecial) {
    return "Password must contain at least one special character";
  }
  
  return null;
};

// Zod schema for strong password validation
export const strongPasswordSchema = z.string()
  .min(12, "Password must be at least 12 characters long")
  .refine(
    (password) => /[a-zA-Z]/.test(password),
    "Password must contain at least one letter"
  )
  .refine(
    (password) => /\d/.test(password),
    "Password must contain at least one number"
  )
  .refine(
    (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
    "Password must contain at least one special character"
  );