import { Fragment } from "react";

/**
 * Highlights matches of `query` inside `text` (FR-11).
 *
 * Built from React nodes rather than injected HTML: the text comes from the
 * user's own prompts, and nothing here should ever be parsed as markup.
 */
export function Highlight({
  text,
  query,
}: {
  text: string;
  query?: string;
}) {
  const needle = query?.trim();
  if (!needle) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();

  const parts: { value: string; match: boolean }[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const index = lowerText.indexOf(lowerNeedle, cursor);
    if (index === -1) {
      parts.push({ value: text.slice(cursor), match: false });
      break;
    }
    if (index > cursor) {
      parts.push({ value: text.slice(cursor, index), match: false });
    }
    parts.push({
      value: text.slice(index, index + needle.length),
      match: true,
    });
    cursor = index + needle.length;
  }

  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part.match ? (
            <mark className="bg-primary/25 text-foreground rounded-sm">
              {part.value}
            </mark>
          ) : (
            part.value
          )}
        </Fragment>
      ))}
    </>
  );
}
