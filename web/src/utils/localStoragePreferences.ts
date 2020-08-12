import isUndefined from 'lodash/isUndefined';

import { Prefs } from '../types';

interface PreferencesList {
  [key: string]: Prefs;
}

const LS_ITEM = 'prefs';
const DEFAULT_SEARCH_LIMIT = 15;
const DEFAULT_THEME = 'light';
const LS_ACTIVE_PROFILE = 'activeProfile';
const DEFAULT_PREFS: Prefs = {
  search: { limit: DEFAULT_SEARCH_LIMIT },
  controlPanel: {},
  theme: { configured: DEFAULT_THEME, automatic: false },
};

export class LocalStoragePreferences {
  private savedPreferences: PreferencesList = { guest: DEFAULT_PREFS };

  constructor() {
    try {
      const preferences = window.localStorage.getItem(LS_ITEM);
      if (preferences) {
        this.savedPreferences = JSON.parse(preferences);
      } else {
        this.setPrefs(DEFAULT_PREFS);
      }
    } catch {
      // Incognite mode
    }
  }

  public updateAlias(oldAlias: string, newAlias: string) {
    if (this.savedPreferences.hasOwnProperty(oldAlias)) {
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
    if (!isUndefined(alias)) {
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
    if (!isUndefined(alias)) {
      if (!isUndefined(this.savedPreferences[alias])) {
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
