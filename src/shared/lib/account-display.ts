/**
 * Utility to clean account display names by removing UE/CX prefixes
 * Only affects visual display, not IDs or relationships
 */

export function cleanAccountDisplayName(name: string): string {
  // Remove common prefixes like "UE - " or "CX - "
  return name
    .replace(/^UE\s*[-–—]\s*/i, "")
    .replace(/^CX\s*[-–—]\s*/i, "")
    .replace(/^Unidade Executora\s*[-–—]\s*/i, "")
    .replace(/^Caixa Escolar\s*[-–—]\s*/i, "")
    .trim();
}

/**
 * Get full entity name without abbreviation
 */
export function getEntityDisplayName(type: string): string {
  switch (type) {
    case "ue":
      return "Unidade Executora";
    case "cx":
      return "Caixa Escolar";
    case "associacao":
      return "Associação";
    default:
      return type;
  }
}

/**
 * Get short origin label for selects
 */
export function getOriginLabel(origin: string): string {
  switch (origin) {
    case "UE":
      return "Unidade Executora";
    case "CX":
      return "Caixa Escolar";
    case "ASSOC":
      return "Associação";
    default:
      return origin;
  }
}
