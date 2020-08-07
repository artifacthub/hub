import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { createContext, useContext, useEffect, useReducer } from 'react';

import { API } from '../api';
import useSystemThemeMode from '../hooks/useSystemThemeMode';
import { Prefs, Profile, ThemePrefs, UserFullName } from '../types';
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
  | { type: 'updateEfectiveTheme'; theme: string }
  | { type: 'enableAutomaticTheme'; enabled: boolean };

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

export function updateEfectiveTheme(theme: string) {
  return { type: 'updateTheme', theme };
}

export function enableAutomaticTheme(enabled: boolean) {
  return { type: 'enableAutomaticTheme', enabled };
}

export async function refreshUserProfile(dispatch: React.Dispatch<any>, redirectUrl?: string) {
  try {
    const profile: Profile = await API.getUserProfile();
    dispatch({ type: 'signIn', profile });
    if (!isUndefined(redirectUrl)) {
      // Redirect to correct route when neccessary
      history.push({ pathname: redirectUrl });
    }
  } catch {
    dispatch({ type: 'signOut' });
  }
}

export const detectActiveThemeMode = (): string => {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

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

function updateAutomaticTheme(currentPrefs: Prefs, enabled: boolean): Prefs {
  return {
    ...currentPrefs,
    theme: {
      ...currentPrefs.theme,
      automatic: enabled,
      efective: enabled ? detectActiveThemeMode() : currentPrefs.theme.configured,
    },
  };
}

function updateActiveStyleSheet(current: string) {
  document.getElementsByTagName('html')[0].setAttribute('data-theme', current);
}

function getCurrentSystemActiveTheme(prefs: ThemePrefs): ThemePrefs {
  if (prefs.automatic && (isUndefined(prefs.efective) || detectActiveThemeMode() !== prefs.efective)) {
    return {
      ...prefs,
      efective: detectActiveThemeMode(),
    };
  } else {
    return prefs;
  }
}

export function appReducer(state: AppState, action: Action) {
  switch (action.type) {
    case 'signIn':
      const tmpUserPrefs = lsStorage.getPrefs(action.profile.alias);
      const userPrefs = { ...tmpUserPrefs, theme: getCurrentSystemActiveTheme(tmpUserPrefs.theme) };
      updateActiveStyleSheet(userPrefs.theme.efective || userPrefs.theme.configured);

      return {
        user: action.profile,
        prefs: userPrefs,
      };
    case 'unselectOrg':
      const unselectedOrgPrefs = updateSelectedOrg(state.prefs);
      lsStorage.setPrefs(unselectedOrgPrefs, state.user!.alias);
      redirectToControlPanel('user');
      return {
        ...state,
        prefs: unselectedOrgPrefs,
      };
    case 'signOut':
      const tmpGuestPrefs = lsStorage.getPrefs();
      const guestPrefs = { ...tmpGuestPrefs, theme: getCurrentSystemActiveTheme(tmpGuestPrefs.theme) };
      updateActiveStyleSheet(guestPrefs.theme.efective || guestPrefs.theme.configured);
      return { user: null, prefs: guestPrefs };
    case 'updateOrg':
      const newPrefs = updateSelectedOrg(state.prefs, action.name);
      lsStorage.setPrefs(newPrefs, state.user!.alias);
      if (isUndefined(state.prefs.controlPanel.selectedOrg) || action.name !== state.prefs.controlPanel.selectedOrg) {
        redirectToControlPanel('org');
      }
      return {
        ...state,
        prefs: newPrefs,
      };
    case 'updateLimit':
      const updatedPrefs = {
        ...state.prefs,
        search: {
          ...state.prefs.search,
          limit: action.limit,
        },
      };
      lsStorage.setPrefs(updatedPrefs, !isNull(state.user) && !isUndefined(state.user) ? state.user.alias : undefined);
      return {
        ...state,
        prefs: updatedPrefs,
      };
    case 'updateTheme':
      const updatedUserPrefs = {
        ...state.prefs,
        theme: {
          configured: action.theme,
          efective: action.theme,
          automatic: false,
        },
      };
      lsStorage.setPrefs(
        updatedUserPrefs,
        !isNull(state.user) && !isUndefined(state.user) ? state.user.alias : undefined
      );
      updateActiveStyleSheet(action.theme);

      return {
        ...state,
        prefs: updatedUserPrefs,
      };

    case 'updateEfectiveTheme':
      const updatedThemePrefs = {
        ...state.prefs,
        theme: {
          ...state.prefs.theme,
          efective: action.theme,
        },
      };
      lsStorage.setPrefs(
        updatedThemePrefs,
        !isNull(state.user) && !isUndefined(state.user) ? state.user.alias : undefined
      );
      updateActiveStyleSheet(action.theme);

      return {
        ...state,
        prefs: updatedThemePrefs,
      };

    case 'enableAutomaticTheme':
      const updatedThemeUserPrefs = updateAutomaticTheme(state.prefs, action.enabled);
      lsStorage.setPrefs(
        updatedThemeUserPrefs,
        !isNull(state.user) && !isUndefined(state.user) ? state.user.alias : undefined
      );
      updateActiveStyleSheet(updatedThemeUserPrefs.theme.efective || updatedThemeUserPrefs.theme.configured);
      return {
        ...state,
        prefs: updatedThemeUserPrefs,
      };
    case 'updateUser':
      lsStorage.updateAlias(state.user!.alias, action.user.alias);
      return {
        ...state,
        user: {
          ...state.user!,
          ...action.user,
        },
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

  useSystemThemeMode(ctx.prefs.theme.automatic, dispatch);

  return <AppCtx.Provider value={{ ctx, dispatch }}>{props.children}</AppCtx.Provider>;
}

function useAppCtx() {
  return useContext(AppCtx);
}

export { AppCtxProvider, useAppCtx };
