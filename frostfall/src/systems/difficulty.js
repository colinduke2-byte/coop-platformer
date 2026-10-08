// The active difficulty's numbers (data/tuning.js TUNE.difficulty): one place every system reads them from.
import { TUNE } from '../data/tuning.js';
import { settings } from './settings.js';
export const DIFFICULTIES = ['easy', 'normal', 'hard'];
export const diff = () => TUNE.difficulty[settings.difficulty] || TUNE.difficulty.normal;
