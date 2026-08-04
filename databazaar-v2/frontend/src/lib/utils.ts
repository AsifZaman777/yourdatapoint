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
export function getApiErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  const e = err as { response?: { data?: { detail?: unknown } }; message?: string } | undefined;
  const detail = e?.response?.data?.detail;
  if (!detail) {
    return e?.message || fallback;
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    // Pydantic validation errors: [{type, loc, msg, input}, ...]
    const msgs = detail
      .map((d: Record<string, unknown> | string) => {
        if (typeof d === "string") return d;
        if (d && typeof d === "object" && "msg" in d && typeof d.msg === "string") {
          return d.msg;
        }
        return JSON.stringify(d);
      })
      .filter(Boolean);
    return msgs.length > 0 ? msgs.join("; ") : fallback;
  }
  if (typeof detail === "object" && detail !== null) {
    const obj = detail as Record<string, unknown>;
    if (typeof obj.msg === "string") return obj.msg;
    if (typeof obj.message === "string") return obj.message;
    return JSON.stringify(detail);
  }
  return String(detail);
}
