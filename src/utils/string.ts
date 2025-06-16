// src/utils/string.ts
export const slugify = (name: string, fallback = "Your_Contractor") =>
  (name || fallback).trim().replace(/\s+/g, "_");
