import { Component, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { OrganisationRow } from '../../../core/utils/carnet-document';
import { RichText } from '../rich-text/rich-text';

@Component({
  selector: 'app-organisation-table',
  standalone: true,
  imports: [RichText],
  templateUrl: './organisation-table.html',
  styleUrl: './organisation-table.scss',
})
export class OrganisationTable {
  private readonly sanitizer = inject(DomSanitizer);

  readonly heading = input('Organisation du voyage');
  readonly rows = input<OrganisationRow[]>([]);
  readonly notices = input<string[]>([]);

  marked(value: string): SafeHtml {
    const html = value
      .replaceAll('<b>', '<strong>')
      .replaceAll('</b>', '</strong>')
      .replaceAll('<font color="#9b1b1b">', '<span class="is-red">')
      .replaceAll('<font color="#5c2d91">', '<span class="is-purple">')
      .replaceAll('</font>', '</span>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
