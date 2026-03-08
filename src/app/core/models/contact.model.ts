export type ContactSource = 'Evaneos' | 'Directo';
export type ContactBudget = 'Básico' | 'Normal' | 'Alto';
export type TravellerType = 'Aventurero' | 'Cauteloso';
export type Ritm = '2 noches por etapa' | '1 noche por etapa' | 'Otro';

export interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  mobile: string | null;
  source: ContactSource | null;
  budget: ContactBudget | null;
  traveller_type: TravellerType | null;
  ritm: Ritm | null;
  adults: number | null;
  children: number | null;
  created_at: string;
}

export interface ContactCreate {
  full_name: string;
  email?: string;
  source?: ContactSource;
  budget?: ContactBudget;
  traveller_type?: TravellerType;
  ritm?: Ritm;
}