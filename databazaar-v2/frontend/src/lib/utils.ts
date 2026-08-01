import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely extract a human-readable error message from an Axios error.
 * Handles Pydantic validation errors (detail = [{type,loc,msg,input}])
 * which would crash Sonner/React if passed as a React child.
 */
export function getApiErrorMessage(err: any, fallback = "Something went wrong."): string {
  const detail = err?.response?.data?.detail;
  if (!detail) {
    return err?.message || fallback;
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    // Pydantic validation errors: [{type, loc, msg, input}, ...]
    const msgs = detail
      .map((d: any) => (typeof d === "string" ? d : d?.msg || JSON.stringify(d)))
      .filter(Boolean);
    return msgs.length > 0 ? msgs.join("; ") : fallback;
  }
  if (typeof detail === "object") {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return String(detail);
}
