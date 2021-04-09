import isUndefined from 'lodash/isUndefined';
import React, { createContext, useContext, useEffect, useReducer } from 'react';

import { API } from '../api';
import useSystemThemeMode from '../hooks/useSystemThemeMode';
import { Prefs, Profile, ThemePrefs, UserFullName } from '../types';
import cleanLoginUrlParams from '../utils/cleanLoginUrlParams';
import detectActiveThemeMode from '../utils/detectActiveThemeMode';
import history from '../utils/history';
import isControlPanelSectionAvailable from '../utils/isControlPanelSectionAvailable';
import lsStorage from '../utils/localStoragePreferences';

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
  dispatch: React.Dispatch<any>;
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

export async function refreshUserProfile(dispatch: React.Dispatch<any>, redirectUrl?: string) {
  try {
    const profile: Profile = await API.getUserProfile();
    dispatch({ type: 'signIn', profile });
    const currentUrl = `${window.location.pathname}${
      window.location.search !== '' ? `?${cleanLoginUrlParams(window.location.search)}` : ''
    }`;
    if (!isUndefined(redirectUrl)) {
      if (redirectUrl === currentUrl) {
        history.replace(redirectUrl);
      } else {
        // Redirect to correct route when neccessary
        history.push(redirectUrl);
      }
    }
  } catch (err) {
    dispatch({ type: 'signOut' });
    if (err.message === 'invalid session') {
      history.push(
        `${window.location.pathname}${
          window.location.search === '' ? '?' : `${window.location.search}&`
        }modal=login&redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`
      );
    }
  }
}

function redirectToControlPanel(context: 'user' | 'org') {
  if (history.location.pathname.startsWith('/control-panel')) {
    const sections = history.location.pathname.split('/');
    if (!isControlPanelSectionAvailable(context, sections[2], sections[3])) {
      history.push('/control-panel/repositories');
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
  switch (action.type) {
    case 'signIn':
      prefs = lsStorage.getPrefs(action.profile.alias);
      const userPrefs = { ...prefs, theme: getCurrentSystemActiveTheme(prefs.theme) };
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
      const guestPrefs = { ...prefs, theme: getCurrentSystemActiveTheme(prefs.theme) };
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
      const effective = action.theme === 'automatic' ? detectActiveThemeMode() : action.theme;
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
  const [ctx, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    refreshUserProfile(dispatch);
  }, []);

  useSystemThemeMode(ctx.prefs.theme.configured === 'automatic', dispatch);

  return <AppCtx.Provider value={{ ctx, dispatch }}>{props.children}</AppCtx.Provider>;
}

function useAppCtx() {
  return useContext(AppCtx);
}

export { AppCtxProvider, useAppCtx };
