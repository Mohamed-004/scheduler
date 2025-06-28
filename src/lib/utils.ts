import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a secure random token for invitations
 */
export function generateSecureToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).substring(2)
}
