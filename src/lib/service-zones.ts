/**
 * Canonical service zone slugs used across web and mobile.
 * These map to store `area` values and agent `profiles.service_zone`.
 *
 * When storing on profiles or orders, always use the slug (lowercase, no spaces).
 * Display labels are for UI dropdowns.
 */
export const SERVICE_ZONES = [
  { slug: "mile1", label: "Mile 1" },
  { slug: "mile3", label: "Mile 3" },
  { slug: "dline", label: "D-Line" },
  { slug: "gra", label: "GRA Phase 2" },
  { slug: "rumuokoro", label: "Rumuokoro" },
  { slug: "rumuola", label: "Rumuola" },
  { slug: "adageorge", label: "Ada George" },
  { slug: "transamadi", label: "Trans Amadi" },
  { slug: "peterodili", label: "Peter Odili Road" },
  { slug: "elemejunction", label: "Eleme Junction" },
  { slug: "azikiwe", label: "Azikiwe Road" },
  { slug: "choba", label: "Choba" },
  { slug: "elelenwo", label: "Elelenwo" },
  { slug: "woji", label: "Woji" },
  { slug: "rumuomasi", label: "Rumuomasi" },
  { slug: "rsu", label: "RSU" },
  { slug: "agip", label: "Agip" },
  { slug: "oilmill", label: "Oil Mill" },
  { slug: "rumuibekwe", label: "Rumuibekwe" },
  { slug: "rumuokwuta", label: "Rumuokwuta" },
  { slug: "rumuodara", label: "Rumuodara" },
  { slug: "rumuolumeni", label: "Rumuolumeni" },
  { slug: "rukpokwu", label: "Rukpokwu" },
  { slug: "onne", label: "Onne" },
  { slug: "rumuobiakani", label: "Rumuobiakani" },
  { slug: "sanniabacha", label: "Sanni Abacha" },
  { slug: "abaroad", label: "Aba Road" },
  { slug: "grphase3", label: "GRA Phase 3" },
] as const;

export type ServiceZoneSlug = (typeof SERVICE_ZONES)[number]["slug"];

/**
 * Convert a store area string to its canonical zone slug.
 * Falls back to lowercased, space-stripped version.
 */
export function areaToZoneSlug(area: string): string {
  const normalized = area.trim().toLowerCase().replace(/\s+/g, "");
  const match = SERVICE_ZONES.find(
    (z) => z.slug === normalized || z.label.toLowerCase().replace(/\s+/g, "") === normalized
  );
  return match?.slug || normalized;
}
