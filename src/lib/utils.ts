import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date range as a string
 * @param startDate The start date
 * @param endDate The end date
 * @returns A formatted string representing the date range
 */
export function dateRangeToString(startDate: Date, endDate: Date): string {
  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const isSameMonth = 
    startDate.getMonth() === endDate.getMonth() && 
    startDate.getFullYear() === endDate.getFullYear();
  
  if (isSameDay) {
    return format(startDate, 'd MMM yyyy', { locale: es });
  } else if (isSameMonth) {
    return `${format(startDate, 'd', { locale: es })} - ${format(endDate, 'd MMM yyyy', { locale: es })}`;
  } else {
    return `${format(startDate, 'd MMM', { locale: es })} - ${format(endDate, 'd MMM yyyy', { locale: es })}`;
  }
}
