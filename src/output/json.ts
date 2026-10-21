// Model reply parsing shared by every call type. Bare JSON or exactly one
// fenced code block parses; prose outside the fence doesn't (Models & Research
// v0.7, Scoring).

export function parseJson(raw: string): { json: unknown; fenced: boolean; error?: string } {
  const text = raw.trim();
  try {
    return { json: JSON.parse(text), fenced: false };
  } catch {
    const m = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/);
    if (m?.[1] !== undefined) {
      try {
        return { json: JSON.parse(m[1]), fenced: true };
      } catch (e) {
        return { json: null, fenced: true, error: `invalid JSON inside code fence: ${(e as Error).message}` };
      }
    }
    return { json: null, fenced: false, error: "not JSON" };
  }
}
