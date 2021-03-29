import { Prefs } from '../types';
import lsPreferences, { fixTheme, OldThemePrefs, PreferencesList } from './localStoragePreferences';

const defaultPrefs: Prefs = {
  controlPanel: {},
  search: { limit: 20 },
  theme: {
    configured: 'light',
    effective: 'light',
  },
  notifications: {
    lastDisplayedTime: null,
    enabled: true,
    displayed: [],
  },
};

const initialUserPrefs: Prefs = {
  controlPanel: {},
  search: { limit: 60 },
  theme: {
    configured: 'light',
    effective: 'light',
  },
  notifications: {
    lastDisplayedTime: null,
    enabled: true,
    displayed: [],
  },
};

interface FixThemeTests {
  list: PreferencesList;
  result: PreferencesList;
}

const fixThemeTests: FixThemeTests[] = [
  {
    list: {},
    result: {},
  },
  {
    list: {
      guest: {
        search: { limit: 20 },
        controlPanel: {},
        theme: { configured: 'light', automatic: false } as OldThemePrefs,
        notifications: {
          lastDisplayedTime: 1616418551259,
          enabled: true,
          displayed: ['ac040137e34c699c365216db58a1a24b', '789ca4669063535df55ccff943ed09b3'],
        },
      },
    },
    result: {
      guest: {
        search: { limit: 20 },
        controlPanel: {},
        theme: { configured: 'light', effective: 'light' },
        notifications: {
          lastDisplayedTime: 1616418551259,
          enabled: true,
          displayed: ['ac040137e34c699c365216db58a1a24b', '789ca4669063535df55ccff943ed09b3'],
        },
      },
    },
  },
  {
    list: {
      guest: {
        search: { limit: 20 },
        controlPanel: {},
        theme: { configured: 'dark', automatic: false } as OldThemePrefs,
        notifications: {
          lastDisplayedTime: 1616418551259,
          enabled: true,
          displayed: ['ac040137e34c699c365216db58a1a24b', '789ca4669063535df55ccff943ed09b3'],
        },
      },
    },
    result: {
      guest: {
        search: { limit: 20 },
        controlPanel: {},
        theme: { configured: 'dark', effective: 'dark' },
        notifications: {
          lastDisplayedTime: 1616418551259,
          enabled: true,
          displayed: ['ac040137e34c699c365216db58a1a24b', '789ca4669063535df55ccff943ed09b3'],
        },
      },
    },
  },
  {
    list: {
      guest: {
        search: { limit: 20 },
        controlPanel: {},
        theme: { configured: 'light', efective: 'light', automatic: true } as OldThemePrefs,
        notifications: {
          lastDisplayedTime: 1616488221213,
          enabled: true,
          displayed: ['789ca4669063535df55ccff943ed09b3', 'eaf6e39382a29763e0be2220ee0b16f5'],
        },
      },
      cin: {
        search: { limit: 20 },
        controlPanel: {},
        theme: { configured: 'light', automatic: true } as OldThemePrefs,
        notifications: {
          lastDisplayedTime: 1615798776666,
          enabled: true,
          displayed: ['789ca4669063535df55ccff943ed09b3'],
        },
      },
    },
    result: {
      guest: {
        search: { limit: 20 },
        controlPanel: {},
        theme: { configured: 'automatic', effective: 'light' },
        notifications: {
          lastDisplayedTime: 1616488221213,
          enabled: true,
          displayed: ['789ca4669063535df55ccff943ed09b3', 'eaf6e39382a29763e0be2220ee0b16f5'],
        },
      },
      cin: {
        search: { limit: 20 },
        controlPanel: {},
        theme: { configured: 'automatic', effective: 'light' },
        notifications: {
          lastDisplayedTime: 1615798776666,
          enabled: true,
          displayed: ['789ca4669063535df55ccff943ed09b3'],
        },
      },
    },
  },
  {
    list: {
      guest: {
        search: { limit: 20 },
        controlPanel: {},
        theme: { configured: 'dark', efective: 'dark' } as OldThemePrefs,
        notifications: {
          lastDisplayedTime: 1616788229321,
          enabled: true,
          displayed: [
            '789ca4669063535df55ccff943ed09b3',
            '3e9794c54540f60dd983faf00451723e',
            'c118b7ebd6b25bcf9c5eb07d11b36fee',
          ],
        },
      },
      cin: {
        search: { limit: 20 },
        controlPanel: {},
        theme: { configured: 'light', automatic: true } as OldThemePrefs,
        notifications: {
          lastDisplayedTime: 1615798893643,
          enabled: true,
          displayed: ['789ca4669063535df55ccff943ed09b3'],
        },
      },
    },
    result: {
      guest: {
        search: { limit: 20 },
        controlPanel: {},
        theme: { configured: 'dark', effective: 'dark' },
        notifications: {
          lastDisplayedTime: 1616788229321,
          enabled: true,
          displayed: [
            '789ca4669063535df55ccff943ed09b3',
            '3e9794c54540f60dd983faf00451723e',
            'c118b7ebd6b25bcf9c5eb07d11b36fee',
          ],
        },
      },
      cin: {
        search: { limit: 20 },
        controlPanel: {},
        theme: { configured: 'automatic', effective: 'light' },
        notifications: {
          lastDisplayedTime: 1615798893643,
          enabled: true,
          displayed: ['789ca4669063535df55ccff943ed09b3'],
        },
      },
    },
  },
];

describe('localStoragePreferences', () => {
  afterAll(() => {
    window.localStorage.removeItem('prefs');
  });

  it('init LocalStoragePreferences', () => {
    expect(lsPreferences.getPrefs()).toStrictEqual(defaultPrefs);
  });

  it('saves user prefs', () => {
    lsPreferences.setPrefs(initialUserPrefs, 'user1');
    expect(lsPreferences.getPrefs('user1')).toStrictEqual(initialUserPrefs);
  });

  it('updates user prefs', () => {
    expect(lsPreferences.getPrefs('user1')).toStrictEqual(initialUserPrefs);
    const userPrefs: Prefs = {
      controlPanel: { selectedOrg: 'testorg' },
      search: { limit: 60 },
      theme: {
        configured: 'light',
        effective: 'light',
      },
      notifications: {
        lastDisplayedTime: null,
        enabled: true,
        displayed: [],
      },
    };
    lsPreferences.setPrefs(userPrefs, 'user1');
    expect(lsPreferences.getPrefs('user1')).toStrictEqual(userPrefs);
  });

  it('updates user notifications prefs', () => {
    expect(lsPreferences.getPrefs('user1')).toStrictEqual({
      ...initialUserPrefs,
      controlPanel: { selectedOrg: 'testorg' },
    });
    const userPrefs: Prefs = {
      controlPanel: { selectedOrg: 'testorg' },
      search: { limit: 60 },
      theme: {
        configured: 'light',
        effective: 'light',
      },
      notifications: {
        lastDisplayedTime: 1617021994512,
        enabled: true,
        displayed: ['789ca4669063535df55ccff943ed09b3'],
      },
    };
    lsPreferences.setPrefs(userPrefs, 'user1');
    expect(lsPreferences.getPrefs('user1')).toStrictEqual(userPrefs);
  });

  it('gets default user prefs', () => {
    expect(lsPreferences.getPrefs('user2')).toStrictEqual(defaultPrefs);
  });

  it('renames user', () => {
    const userPrefs: Prefs = {
      ...defaultPrefs,
      controlPanel: { selectedOrg: 'testorg1' },
      theme: {
        configured: 'light',
        effective: 'light',
      },
      notifications: {
        lastDisplayedTime: null,
        enabled: true,
        displayed: [],
      },
    };
    lsPreferences.setPrefs(userPrefs, 'user2');
    expect(lsPreferences.getPrefs('user2')).toStrictEqual(userPrefs);
    lsPreferences.updateAlias('user2', 'updatedUser');
    expect(lsPreferences.getPrefs('updatedUser')).toStrictEqual(userPrefs);
    expect(lsPreferences.getPrefs('user2')).toStrictEqual(defaultPrefs);
  });

  describe('Test fixTheme', () => {
    for (let i = 0; i < fixThemeTests.length; i++) {
      it('format correct Prefs', () => {
        const formatted = fixTheme(fixThemeTests[i].list);
        expect(formatted).toEqual(fixThemeTests[i].result);
      });
    }
  });
});
