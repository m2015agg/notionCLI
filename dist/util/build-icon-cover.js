export function buildIcon(opts) {
    if (opts.iconEmoji)
        return { type: "emoji", emoji: opts.iconEmoji };
    if (opts.iconUrl)
        return { type: "external", external: { url: opts.iconUrl } };
    return undefined;
}
export function buildCover(opts) {
    if (opts.coverUrl)
        return { type: "external", external: { url: opts.coverUrl } };
    return undefined;
}
//# sourceMappingURL=build-icon-cover.js.map