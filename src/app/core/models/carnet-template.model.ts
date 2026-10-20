export interface CarnetTemplate {
  key: string;
  title: string;
  body: string;
  position: number;
  placement: 'before' | 'after';
  block_type: string;
  active: boolean;
  version: number;
  updated_at: string;
  updated_by_id: string | null;
}

export interface CarnetTemplateUpdate {
  title: string;
  body: string;
  active: boolean;
  version: number;
}
