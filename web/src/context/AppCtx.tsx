import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { createContext, useContext, useEffect, useReducer } from 'react';

import { API } from '../api';
import { Prefs, Profile, UserFullName } from '../types';
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
  | { type: 'updateLimit'; limit: number };

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

function redirectToControlPanel(context: 'user' | 'org') {
  if (history.location.pathname.startsWith('/control-panel')) {
    const sections = history.location.pathname.split('/');
    if (!isControlPanelSectionAvailable(context, sections[2], sections[3])) {
      history.push('/control-panel/packages');
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

export function appReducer(state: AppState, action: Action) {
  switch (action.type) {
    case 'signIn':
      return {
        user: action.profile,
        prefs: lsStorage.getPrefs(action.profile.alias),
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
      return { user: null, prefs: lsStorage.getPrefs() };
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

  return <AppCtx.Provider value={{ ctx, dispatch }}>{props.children}</AppCtx.Provider>;
}

function useAppCtx() {
  return useContext(AppCtx);
}

export { AppCtxProvider, useAppCtx };
