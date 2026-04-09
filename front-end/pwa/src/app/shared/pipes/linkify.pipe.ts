import { Pipe, PipeTransform } from '@angular/core';

/**
 * This pipe is used by components to detect and render links found in strings especially in description fields
 */
export interface LinkifySegment {
  isLink: boolean;
  content: string;
  href?: string;
}

@Pipe({ name: 'linkify' })
export class LinkifyPipe implements PipeTransform {
  // Matches either an http(s) URL or a bare www. URL.
  private readonly urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/g;

  transform(value: string | null | undefined): LinkifySegment[] {
    if (!value) return [];
    const segments: LinkifySegment[] = [];
    let lastIndex = 0;
    for (const match of value.matchAll(this.urlRegex)) {
      const start = match.index!;
      if (start > lastIndex) {
        segments.push({ isLink: false, content: value.slice(lastIndex, start) });
      }
      const matched = match[0];
      const href = matched.startsWith('www.') ? `http://${matched}` : matched;
      segments.push({ isLink: true, content: matched, href });
      lastIndex = start + matched.length;
    }
    if (lastIndex < value.length) {
      segments.push({ isLink: false, content: value.slice(lastIndex) });
    }
    return segments;
  }
}
