import sanitizeHtml from 'sanitize-html';

/**
 * Strict allowlist for WYSIWYG product descriptions — everything else
 * (scripts, styles, handlers) is stripped before the HTML reaches Mongo.
 */
export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u',
      'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a',
    ],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    disallowedTagsMode: 'discard',
  }).trim();
}

/** Plain-text preview of a rich description (cards, emails, meta tags). */
export function descriptionToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
}
