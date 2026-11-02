import { Component, input } from '@angular/core';
import { parseRichText } from '../../../core/utils/rich-text';

@Component({
  selector: 'app-rich-text',
  standalone: true,
  templateUrl: './rich-text.html',
  styleUrl: './rich-text.scss',
})
export class RichText {
  readonly value = input('');

  blocks() {
    return parseRichText(this.value());
  }
}
