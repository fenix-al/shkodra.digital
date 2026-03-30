import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Type-safe Tailwind class merger for TypeScript components. */
export function cx(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
