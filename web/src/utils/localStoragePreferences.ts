import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';

import { Prefs, ThemePrefs } from '../types';
import detectActiveThemeMode from './detectActiveThemeMode';

export interface PreferencesList {
  [key: string]: Prefs;
}

export interface OldThemePrefs extends ThemePrefs {
  // Legacy
  automatic?: boolean;
  efective?: string;
}

const LS_ITEM = 'prefs';
const APPLIED_MIGRATION = 'appliedAHMigration';
export const DEFAULT_SEARCH_LIMIT = 20;
const DEFAULT_THEME = 'automatic';
const LS_ACTIVE_PROFILE = 'activeProfile';

const DEFAULT_PREFS: Prefs = {
  search: { limit: DEFAULT_SEARCH_LIMIT },
  controlPanel: {},
  theme: { configured: DEFAULT_THEME, effective: detectActiveThemeMode() },
  notifications: {
    lastDisplayedTime: null,
    enabled: true,
    displayed: [],
  },
};

interface Migration {
  key: number;
  description: string;
  method: (lsActual: PreferencesList) => PreferencesList;
}

const migrations: Migration[] = [
  {
    key: 1,
    description: "Fix typo: efective -> effective and use 'automatic' as configured option",
    method: (lsActual: PreferencesList): PreferencesList => {
      const lsUpdated: PreferencesList = {};
      Object.keys(lsActual).forEach((user: string) => {
        const oldThemePrefs = { ...lsActual[user].theme } as OldThemePrefs;
        const themePrefs: ThemePrefs = {
          configured: oldThemePrefs.configured,
          effective: oldThemePrefs.configured,
        };
        if (oldThemePrefs.automatic === true) {
          themePrefs.configured = 'automatic';
        }
        themePrefs.effective = themePrefs.configured === 'automatic' ? detectActiveThemeMode() : themePrefs.effective;

        const currentPrefs = { ...lsActual[user] };
        currentPrefs.theme = themePrefs;
        lsUpdated[user] = currentPrefs;
      });
      return lsUpdated;
    },
  },
  {
    key: 2,
    description: "Update default guest theme prefs when the configured theme is 'light'",
    method: (lsActual: PreferencesList): PreferencesList => {
      const lsUpdated: PreferencesList = { ...lsActual };
      const guestPrefs: Prefs = lsUpdated.guest ? { ...lsUpdated.guest } : DEFAULT_PREFS;
      if (guestPrefs.theme.configured === 'light') {
        guestPrefs.theme = DEFAULT_PREFS.theme;
      }
      return { ...lsUpdated, guest: { ...guestPrefs } };
    },
  },
];

export const applyMigrations = (lsActual: PreferencesList): PreferencesList => {
  let lsUpdated: PreferencesList = { ...lsActual };
  const lastMigration = getLastMigrationNumber();

  if (isEmpty(lsUpdated)) {
    lsUpdated = { guest: DEFAULT_PREFS };
  } else {
    const sortedMigrations: Migration[] = sortBy(migrations, 'key');
    let migrationsToApply = [...sortedMigrations];
    const migrationApplied = window.localStorage.getItem(APPLIED_MIGRATION);

    if (migrationApplied) {
      // If latest migration has been applied, we don't do anything
      if (lastMigration === parseInt(migrationApplied)) {
        migrationsToApply = [];
      } else {
        // Migrations newest than current one are applied to prefs
        migrationsToApply = sortedMigrations.filter(
          (migration: Migration) => migration.key > parseInt(migrationApplied)
        );
      }
    }

    migrationsToApply.forEach((migration: Migration) => {
      lsUpdated = migration.method(lsUpdated);
    });
  }

  // Saved last migration
  try {
    window.localStorage.setItem(LS_ITEM, JSON.stringify(lsUpdated));
    window.localStorage.setItem(APPLIED_MIGRATION, lastMigration.toString());
  } catch {
    // Incognite mode
  }

  return lsUpdated;
};

const getLastMigrationNumber = (): number => {
  const sortedMigrations = sortBy(migrations, 'key');
  return sortedMigrations[sortedMigrations.length - 1].key;
};

export class LocalStoragePreferences {
  private savedPreferences: PreferencesList = { guest: DEFAULT_PREFS };

  constructor() {
    try {
      const preferences = window.localStorage.getItem(LS_ITEM);
      this.savedPreferences = applyMigrations(!isNull(preferences) ? JSON.parse(preferences) : {});
    } catch {
      // Incognite mode
    }
  }

  public updateAlias(oldAlias: string, newAlias: string) {
    if (!isUndefined(this.savedPreferences[oldAlias])) {
      const newSavedPreferences: PreferencesList = { ...this.savedPreferences };
      newSavedPreferences[newAlias] = this.savedPreferences[oldAlias];
      delete newSavedPreferences[oldAlias];
      this.savedPreferences = newSavedPreferences;

      try {
        window.localStorage.setItem(LS_ITEM, JSON.stringify(newSavedPreferences));
      } catch {
        // Incognite mode
      }
    }
  }

  public setPrefs(prefs: Prefs, alias?: string) {
    let preferences;
    if (alias) {
      preferences = { ...this.savedPreferences, [alias]: prefs };
    } else {
      preferences = { ...this.savedPreferences, guest: prefs };
    }
    this.savedPreferences = preferences;

    try {
      window.localStorage.setItem(LS_ITEM, JSON.stringify(preferences));
    } catch {
      // Incognite mode
    }
  }

  public getPrefs(alias?: string): Prefs {
    let prefs: Prefs = {
      ...DEFAULT_PREFS,
      ...this.savedPreferences.guest,
    };
    if (alias) {
      if (this.savedPreferences[alias]) {
        prefs = {
          ...DEFAULT_PREFS,
          ...this.savedPreferences[alias],
        };
      } else {
        this.setPrefs(prefs, alias);
      }
    }
    return prefs;
  }

  public getActiveProfile(): Prefs {
    const activeProfile = window.localStorage.getItem(LS_ACTIVE_PROFILE);
    return this.getPrefs(activeProfile || undefined);
  }

  public setActiveProfile(profile?: string) {
    try {
      window.localStorage.setItem(LS_ACTIVE_PROFILE, profile || 'guest');
    } catch {
      // Incognite mode
    }
  }
}

const lsPreferences = new LocalStoragePreferences();
export default lsPreferences;
