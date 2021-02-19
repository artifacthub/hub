import lsPreferences from './localStoragePreferences';

const defaultPrefs = {
  controlPanel: {},
  search: { limit: 20 },
  theme: {
    configured: 'light',
    automatic: false,
  },
  notifications: {
    lastDisplayedTime: null,
    enabled: true,
    displayed: [],
  },
};

const initialUserPrefs = {
  controlPanel: {},
  search: { limit: 60 },
  theme: {
    configured: 'light',
    automatic: false,
  },
  notifications: {
    lastDisplayedTime: null,
    enabled: true,
    displayed: [],
  },
};

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
    const userPrefs = {
      controlPanel: { selectedOrg: 'testorg' },
      search: { limit: 60 },
      theme: {
        configured: 'light',
        automatic: false,
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

  it('gets default user prefs', () => {
    expect(lsPreferences.getPrefs('user2')).toStrictEqual(defaultPrefs);
  });

  it('renames user', () => {
    const userPrefs = {
      ...defaultPrefs,
      controlPanel: { selectedOrg: 'testorg1' },
      theme: {
        configured: 'light',
        automatic: false,
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
});
