import type { HexeActivationType, HexeEffect } from '../../types';

export interface FormState {
  name: string;
  description: string;
  imageUrl?: string;
  activationType: HexeActivationType;
  skillLevel: number | '';
  costs: { mp?: number; stm?: number; hp?: number; chance?: number };
  duration: string;
  conditionText: string;
  diceFormula: string;
  effects: HexeEffect[];
}

export const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  imageUrl: undefined,
  activationType: 'active',
  skillLevel: '',
  costs: {},
  duration: '',
  conditionText: '',
  diceFormula: '',
  effects: []
};

