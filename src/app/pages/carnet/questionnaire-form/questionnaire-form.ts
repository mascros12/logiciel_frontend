import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';

import { CarnetService } from '../../../core/services/carnet.service';
import {
  FeedbackAnswer,
  FeedbackForm,
  FeedbackRow,
} from '../../../core/models/carnet-feedback.model';

@Component({
  selector: 'app-questionnaire-form',
  standalone: true,
  imports: [FormsModule, ButtonModule],
  templateUrl: './questionnaire-form.html',
  styleUrl: './questionnaire-form.scss',
})
export class QuestionnaireForm {
  private readonly carnets = inject(CarnetService);

  readonly mode = input<'staff' | 'public'>('staff');
  readonly carnetId = input('');
  readonly token = input('');

  readonly form = signal<FeedbackForm | null>(null);
  readonly busy = signal(false);
  readonly note = signal('');

  constructor() {
    effect(() => {
      const key = this.mode() === 'public' ? this.token() : this.carnetId();
      if (key) this.load();
    });
  }

  groups(): { title: string; rows: FeedbackRow[] }[] {
    const form = this.form();
    if (!form) return [];
    const titles: Record<FeedbackRow['category'], string> = {
      hotel: 'Hôtels',
      activity: 'Activités',
      vehicle: 'Véhicules',
    };
    return (['hotel', 'activity', 'vehicle'] as const)
      .map((category) => ({
        title: titles[category],
        rows: form.rows.filter((row) => row.category === category),
      }))
      .filter((group) => group.rows.length > 0);
  }

  answer(key: string): FeedbackAnswer {
    const form = this.form();
    const found = form?.answers.find((item) => item.key === key);
    return found ?? { key, value: '', detail: '' };
  }

  setScore(row: FeedbackRow, score: number): void {
    row.score = row.score === score ? null : score;
  }

  setAnswer(key: string, value: string): void {
    const form = this.form();
    if (!form) return;
    const current = form.answers.find((item) => item.key === key);
    if (current) current.value = value;
    else form.answers.push({ key, value, detail: '' });
  }

  setDetail(key: string, detail: string): void {
    const form = this.form();
    if (!form) return;
    const current = form.answers.find((item) => item.key === key);
    if (current) current.detail = detail;
    else form.answers.push({ key, value: '', detail });
  }

  allowsDetail(key: string): boolean {
    const form = this.form();
    const question = form?.questions.find((item) => item.key === key);
    if (!question || question.kind !== 'single' || question.options.length === 0) {
      return false;
    }
    const chosen = this.answer(key).value;
    const last = question.options[question.options.length - 1];
    return chosen === last && /autre|précisez|precisez/i.test(last);
  }

  save(): void {
    const form = this.form();
    const key = this.mode() === 'public' ? this.token() : this.carnetId();
    if (!form || !key || this.busy()) return;
    this.busy.set(true);
    this.note.set('');
    const body = {
      scores: form.rows.map((row) => ({
        key: row.key,
        score: row.score,
        comment: row.comment,
      })),
      answers: form.questions.map((question) => this.answer(question.key)),
    };
    const request =
      this.mode() === 'public'
        ? this.carnets.savePublicFeedback(key, body)
        : this.carnets.saveFeedback(key, body);
    request.subscribe({
      next: (saved) => {
        this.form.set(saved);
        this.busy.set(false);
        this.note.set(
          this.mode() === 'public'
            ? 'Réponses enregistrées.'
            : 'Cuestionario guardado.',
        );
      },
      error: (error: { error?: { detail?: string } }) => {
        this.busy.set(false);
        this.note.set(error?.error?.detail || 'No se pudo guardar el cuestionario.');
      },
    });
  }

  private load(): void {
    const key = this.mode() === 'public' ? this.token() : this.carnetId();
    if (!key) return;
    const request =
      this.mode() === 'public'
        ? this.carnets.publicFeedback(key)
        : this.carnets.feedback(key);
    request.subscribe({
      next: (form) => this.form.set(form),
      error: () => this.form.set(null),
    });
  }
}
