function inline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("_") && part.endsWith("_"))
      return (
        <em key={key} className="text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      );
    return <span key={key}>{part}</span>;
  });
}

/** Renders the small subset of markdown our AI replies use: bold, italics, bullets. */
export function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (/^[-*•]\s+/.test(trimmed))
          return (
            <p key={i} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{inline(trimmed.replace(/^[-*•]\s+/, ""), String(i))}</span>
            </p>
          );
        return <p key={i}>{inline(trimmed, String(i))}</p>;
      })}
    </div>
  );
}
