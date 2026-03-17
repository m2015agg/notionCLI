export function buildIcon(opts: Record<string, unknown>): object | undefined {
  if (opts.iconEmoji) return { type: "emoji", emoji: opts.iconEmoji };
  if (opts.iconUrl) return { type: "external", external: { url: opts.iconUrl } };
  return undefined;
}

export function buildCover(opts: Record<string, unknown>): object | undefined {
  if (opts.coverUrl) return { type: "external", external: { url: opts.coverUrl } };
  return undefined;
}
