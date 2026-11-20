// The shipped reference dataset, built from the engine rule matrix. The page
// shows what the engine decides and what the host decides, never wiki prose.
export interface ReferenceRule {
  id: string;
  status: string;
  when: string;
  behavior: string;
  decision: string;
  examples: string[];
}

export interface ReferenceInteraction {
  roleId: string;
  name: string;
  reason: string;
}

export interface ReferenceEntry {
  name: string;
  ability: string;
  oldid: number;
  url: string;
  rules: ReferenceRule[];
  interactions: ReferenceInteraction[];
}

export interface ReferenceDataset {
  roles: Record<string, ReferenceEntry>;
}

const cache = new Map<string, Promise<ReferenceDataset>>();

export function loadReference(url: string): Promise<ReferenceDataset> {
  const cached = cache.get(url);
  if (cached) return cached;
  const request = fetch(url).then((response) => {
    if (!response.ok) throw new Error(`Reference data: ${response.status}`);
    return response.json() as Promise<ReferenceDataset>;
  });
  cache.set(url, request);
  return request;
}
