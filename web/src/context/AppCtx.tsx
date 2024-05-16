import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { createContext, Dispatch, useContext, useEffect, useReducer, useState } from 'react';

import API from '../api';
import useSystemThemeMode from '../hooks/useSystemThemeMode';
import { Prefs, Profile, ThemePrefs, UserFullName } from '../types';
import cleanLoginUrlParams from '../utils/cleanLoginUrlParams';
import detectActiveThemeMode from '../utils/detectActiveThemeMode';
import { history } from '../utils/history';
import isControlPanelSectionAvailable from '../utils/isControlPanelSectionAvailable';
import lsPreferences from '../utils/localStoragePreferences';
import lsStorage from '../utils/localStoragePreferences';
import themeBuilder from '../utils/themeBuilder';

interface AppState {
  user: Profile | null | undefined;
  prefs: Prefs;
}

interface Props {
  children: JSX.Element;
}

const initialState: AppState = {
  user: undefined,
  prefs: lsStorage.getPrefs(),
};

type Action =
  | { type: 'signIn'; profile: Profile }
  | { type: 'signOut' }
  | { type: 'unselectOrg' }
  | { type: 'updateUser'; user: UserFullName }
  | { type: 'updateOrg'; name: string }
  | { type: 'updateLimit'; limit: number }
  | { type: 'updateTheme'; theme: string }
  | { type: 'updateEffectiveTheme'; theme: string }
  | { type: 'enabledDisplayedNotifications'; enabled: boolean }
  | { type: 'addNewDisplayedNotification'; id: string };

export const AppCtx = createContext<{
  ctx: AppState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: Dispatch<any>;
}>({
  ctx: initialState,
  dispatch: () => null,
});

export function signOut() {
  return { type: 'signOut' };
}

export function unselectOrg() {
  return { type: 'unselectOrg' };
}

export function updateOrg(name: string) {
  return { type: 'updateOrg', name };
}

export function updateUser(user: UserFullName) {
  return { type: 'updateUser', user };
}

export function updateLimit(limit: number) {
  return { type: 'updateLimit', limit };
}

export function updateTheme(theme: string) {
  return { type: 'updateTheme', theme };
}

export function updateEffectiveTheme(theme: string) {
  return { type: 'updateTheme', theme };
}

export function enabledDisplayedNotifications(enabled: boolean) {
  return { type: 'enabledDisplayedNotifications', enabled };
}

export function addNewDisplayedNotification(id: string) {
  return { type: 'addNewDisplayedNotification', id };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function refreshUserProfile(dispatch: Dispatch<any>, redirectUrl?: string | null) {
  try {
    const profile: Profile = await API.getUserProfile();
    dispatch({ type: 'signIn', profile });
    const currentUrl = `${window.location.pathname}${
      window.location.search !== '' ? `?${cleanLoginUrlParams(window.location.search)}` : ''
    }`;
    if (redirectUrl && history.navigate) {
      if (redirectUrl === currentUrl) {
        history.navigate(redirectUrl, { replace: true });
      } else {
        const redirection = redirectUrl.split('?');
        // Redirect to correct route when necessary
        history.navigate({
          pathname: redirection[0],
          search: !isUndefined(redirection[1]) ? `?${redirection[1]}` : '',
        });
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    dispatch({ type: 'signOut' });
    if (err.message === 'invalid session' && history.navigate && history.location) {
      history.navigate(
        `${history.location.pathname}${
          history.location.search === '' ? '?' : `${history.location.search}&`
        }modal=login&redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`
      );
    }
  }
}

function redirectToControlPanel(context: 'user' | 'org') {
  if (history.location && history.location.pathname.startsWith('/control-panel')) {
    const sections = history.location.pathname.split('/');
    if (!isControlPanelSectionAvailable(context, sections[2], sections[3]) && history.navigate) {
      history.navigate('/control-panel/repositories');
    }
  }
}

function updateSelectedOrg(currentPrefs: Prefs, name?: string): Prefs {
  return {
    ...currentPrefs,
    controlPanel: {
      ...currentPrefs.controlPanel,
      selectedOrg: name,
    },
  };
}

export function updateActiveStyleSheet(current: string) {
  document.getElementsByTagName('html')[0].setAttribute('data-theme', current);
  document
    .querySelector(`meta[name='theme-color']`)!
    .setAttribute('content', current === 'light' ? '#417598' : '#131216');
}

function getCurrentSystemActiveTheme(prefs: ThemePrefs): ThemePrefs {
  if (
    prefs.configured === 'automatic' &&
    (isUndefined(prefs.effective) || detectActiveThemeMode() !== prefs.effective)
  ) {
    return {
      ...prefs,
      effective: detectActiveThemeMode(),
    };
  } else {
    return prefs;
  }
}

export function appReducer(state: AppState, action: Action) {
  let prefs;
  let userPrefs;
  let guestPrefs;
  let effective;
  switch (action.type) {
    case 'signIn':
      prefs = lsStorage.getPrefs(action.profile.alias);
      userPrefs = { ...prefs, theme: getCurrentSystemActiveTheme(prefs.theme) };
      updateActiveStyleSheet(userPrefs.theme.effective);
      lsStorage.setPrefs(userPrefs, action.profile.alias);
      lsStorage.setActiveProfile(action.profile.alias);
      return {
        user: action.profile,
        prefs: userPrefs,
      };

    case 'unselectOrg':
      prefs = updateSelectedOrg(state.prefs);
      lsStorage.setPrefs(prefs, state.user!.alias);
      redirectToControlPanel('user');
      return {
        ...state,
        prefs: prefs,
      };

    case 'signOut':
      prefs = lsStorage.getPrefs();
      guestPrefs = { ...prefs, theme: getCurrentSystemActiveTheme(prefs.theme) };
      lsStorage.setPrefs(guestPrefs);
      lsStorage.setActiveProfile();
      updateActiveStyleSheet(guestPrefs.theme.effective);
      return { user: null, prefs: guestPrefs };

    case 'updateOrg':
      prefs = updateSelectedOrg(state.prefs, action.name);
      lsStorage.setPrefs(prefs, state.user!.alias);
      if (isUndefined(state.prefs.controlPanel.selectedOrg) || action.name !== state.prefs.controlPanel.selectedOrg) {
        redirectToControlPanel('org');
      }
      return {
        ...state,
        prefs: prefs,
      };

    case 'updateLimit':
      prefs = {
        ...state.prefs,
        search: {
          ...state.prefs.search,
          limit: action.limit,
        },
      };
      lsStorage.setPrefs(prefs, state.user ? state.user.alias : undefined);
      return {
        ...state,
        prefs: prefs,
      };

    case 'updateTheme':
      effective = action.theme === 'automatic' ? detectActiveThemeMode() : action.theme;
      prefs = {
        ...state.prefs,
        theme: {
          configured: action.theme,
          effective: effective,
        },
      };

      lsStorage.setPrefs(prefs, state.user ? state.user.alias : undefined);
      updateActiveStyleSheet(effective);
      return {
        ...state,
        prefs: prefs,
      };

    case 'updateEffectiveTheme':
      prefs = {
        ...state.prefs,
        theme: {
          ...state.prefs.theme,
          effective: action.theme,
        },
      };
      lsStorage.setPrefs(prefs, state.user ? state.user.alias : undefined);
      updateActiveStyleSheet(action.theme);
      return {
        ...state,
        prefs: prefs,
      };

    case 'updateUser':
      lsStorage.updateAlias(state.user!.alias, action.user.alias);
      lsStorage.setActiveProfile(action.user.alias);
      return {
        ...state,
        user: {
          ...state.user!,
          ...action.user,
        },
      };

    case 'enabledDisplayedNotifications':
      prefs = {
        ...state.prefs,
        notifications: {
          ...state.prefs.notifications,
          enabled: action.enabled,
        },
      };
      lsStorage.setPrefs(prefs, state.user ? state.user.alias : undefined);
      return {
        ...state,
        prefs: prefs,
      };

    case 'addNewDisplayedNotification':
      prefs = {
        ...state.prefs,
        notifications: {
          ...state.prefs.notifications,
          displayed: [...state.prefs.notifications.displayed, action.id],
          lastDisplayedTime: Date.now(),
        },
      };
      lsStorage.setPrefs(prefs, state.user ? state.user.alias : undefined);
      return {
        ...state,
        prefs: prefs,
      };

    default:
      return { ...state };
  }
}

function AppCtxProvider(props: Props) {
  const activeProfilePrefs = lsPreferences.getActiveProfile();
  const [ctx, dispatch] = useReducer(appReducer, {
    user: undefined,
    prefs: activeProfilePrefs,
  });
  const [activeInitialTheme, setActiveInitialTheme] = useState<string | null>(null);

  useEffect(() => {
    const theme =
      activeProfilePrefs.theme.configured === 'automatic'
        ? detectActiveThemeMode()
        : activeProfilePrefs.theme.configured;
    themeBuilder.init();
    updateActiveStyleSheet(theme);
    setActiveInitialTheme(theme);
    refreshUserProfile(dispatch);
  }, []);

  useSystemThemeMode(ctx.prefs.theme.configured === 'automatic', dispatch);

  if (isNull(activeInitialTheme)) return null;

  return <AppCtx.Provider value={{ ctx, dispatch }}>{props.children}</AppCtx.Provider>;
}

function useAppCtx() {
  return useContext(AppCtx);
}

export { AppCtxProvider, useAppCtx };
