import { PROFILES } from "./dataset";

export const NAME_BY_SLUG: Record<string, string> = Object.fromEntries(
  PROFILES.map((p) => [p.slug, p.name])
);

export const SLUG_BY_NAME: Record<string, string> = Object.fromEntries(
  PROFILES.map((p) => [p.name, p.slug])
);
