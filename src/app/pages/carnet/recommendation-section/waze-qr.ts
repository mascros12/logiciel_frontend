import { Component, effect, input, signal } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-waze-qr',
  standalone: true,
  template: `
    @if (src()) {
      <img [src]="src()" alt="Code Waze" width="112" height="112" />
    }
  `,
})
export class WazeQr {
  readonly url = input.required<string>();
  readonly src = signal('');

  constructor() {
    effect(() => {
      const url = this.url();
      void QRCode.toDataURL(url, {
        margin: 1,
        width: 112,
        errorCorrectionLevel: 'M',
      }).then((value) => {
        if (this.url() === url) this.src.set(value);
      });
    });
  }
}
