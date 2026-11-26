import { Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { parseRichText } from '../../../core/utils/rich-text';

@Component({
  selector: 'app-rich-text',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './rich-text.html',
  styleUrl: './rich-text.scss',
})
export class RichText {
  readonly value = input('');

  blocks() {
    return parseRichText(this.value());
  }
}
