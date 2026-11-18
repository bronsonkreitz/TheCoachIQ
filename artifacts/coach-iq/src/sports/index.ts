import type { SportId } from '@/lib/types';
import type { SportConfig } from './types';
import { baseball } from './baseball';
import { soccer } from './soccer';
import { football } from './football';
import { basketball } from './basketball';
import { hockey } from './hockey';

/** Add a sport: create a config file and register it here. Everything else is shared. */
export const SPORTS: Record<SportId, SportConfig> = { baseball, soccer, football, basketball, hockey };
export const SPORT_LIST: SportConfig[] = [baseball, soccer, football, basketball, hockey];
export const isSport = (s: string | undefined): s is SportId => !!s && s in SPORTS;
export type { SportConfig };
