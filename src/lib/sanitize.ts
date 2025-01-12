import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  return DOMPurify.sanitize(html);
} 