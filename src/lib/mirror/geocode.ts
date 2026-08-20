export type PlaceHit = {
  name: string;
  admin: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export function placeLabel(p: PlaceHit): string {
  return [p.name, p.admin].filter(Boolean).join(", ");
}
