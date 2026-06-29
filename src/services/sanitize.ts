import sanitizeHtml from 'sanitize-html';

// Allowed HTML tags for email body
const ALLOWED_TAGS = [
  'a', 'b', 'blockquote', 'br', 'caption', 'cite', 'code', 'col', 'colgroup',
  'dd', 'del', 'details', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'kbd', 'li',
  'mark', 'ol', 'p', 'pre', 'q', 's', 'small', 'span', 'strong', 'sub',
  'summary', 'sup', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul',
];

// Allowed attributes per tag
const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['style', 'class', 'id', 'align', 'valign', 'width', 'height'],
  'a': ['href', 'target', 'rel', 'title'],
  'img': ['src', 'alt', 'width', 'height', 'border'],
  'td': ['colspan', 'rowspan', 'bgcolor'],
  'th': ['colspan', 'rowspan'],
  'table': ['border', 'cellpadding', 'cellspacing', 'bgcolor'],
  'col': ['span'],
  'colgroup': ['span'],
};

// Allowed URL schemes — blocks javascript:, data:, vbscript:
const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

export function sanitizeEmailBody(body: string, isHtml: boolean): string {
  if (!isHtml) return body; // plain text — no HTML to sanitize

  return sanitizeHtml(body, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: {
      img: ['http', 'https', 'cid'], // cid: for inline images
    },
    // Strip dangerous attributes like onclick, onload, onerror etc.
    disallowedTagsMode: 'discard',
    enforceHtmlBoundary: false,
  });
}
