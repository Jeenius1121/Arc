/** One occurrence of a map condition (event) on a given map. Times are epoch milliseconds. */
export interface EventOccurrence {
  id: string;
  map: string;
  condition: string;
  start: number;
  end: number;
}

/** A saved, user-defined filter ("Nuit", "Orage sur Champ de bataille", ...). */
export interface FilterPreset {
  id: string;
  name: string;
  /** Empty = all maps. */
  maps: string[];
  /** Empty = all conditions. */
  conditions: string[];
  /** Empty = no category restriction. */
  categories: string[];
  /** Hide events that are already running. */
  upcomingOnly: boolean;
}

export interface FilterState {
  maps: string[];
  conditions: string[];
  categories: string[];
  upcomingOnly: boolean;
}

export const EMPTY_FILTER: FilterState = {
  maps: [],
  conditions: [],
  categories: [],
  upcomingOnly: false,
};
