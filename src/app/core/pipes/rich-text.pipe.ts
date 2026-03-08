import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'richText', standalone: true })
export class RichTextPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null): SafeHtml {
    if (!value) return '';

    let result = value
      // Escapar HTML primero
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // *negrita*
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      // _cursiva_
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      // ~tachado~
      .replace(/~([^~]+)~/g, '<s>$1</s>');

    return this.sanitizer.bypassSecurityTrustHtml(result);
  }
}