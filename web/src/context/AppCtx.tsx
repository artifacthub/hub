import isNull from 'lodash/isNull';
import React, { createContext, useContext, useEffect, useReducer } from 'react';

import { API } from '../api';
import { Alias } from '../types';
import history from '../utils/history';

interface OrgCtx {
  name: string;
  displayName?: string;
}

interface AppState {
  user:
    | {
        alias: string;
      }
    | null
    | undefined;
  org: OrgCtx | null;
  requestSignIn: boolean;
}

interface Props {
  children: JSX.Element;
}

const initialState: AppState = {
  user: undefined,
  org: null,
  requestSignIn: true,
};

type Action =
  | { type: 'requestSignIn' }
  | { type: 'signIn'; alias: string }
  | { type: 'signOut' }
  | { type: 'unselectOrg' }
  | { type: 'updateOrg'; name: string; displayName?: string };

export const AppCtx = createContext<{
  ctx: AppState;
  dispatch: React.Dispatch<any>;
}>({
  ctx: initialState,
  dispatch: () => null,
});

export function requestSignIn() {
  return { type: 'requestSignIn' };
}

export function signOut() {
  return { type: 'signOut' };
}

export function unselectOrg() {
  return { type: 'unselectOrg' };
}

export function updateOrg(name: string, displayName?: string) {
  return { type: 'updateOrg', name, displayName };
}

function redirectToControlPanel() {
  if (history.location.pathname.startsWith('/control-panel')) {
    history.push('/control-panel/packages');
  }
}

export function appReducer(state: AppState, action: Action) {
  switch (action.type) {
    case 'requestSignIn':
      return {
        ...state,
        requestSignIn: true,
      };
    case 'signIn':
      const orgCtx = window.localStorage.getItem('orgCtx');
      let org: OrgCtx | null = null;
      if (!isNull(orgCtx)) {
        org = JSON.parse(orgCtx);
      }
      return {
        user: {
          alias: action.alias,
        },
        org: org,
        requestSignIn: false,
      };
    case 'unselectOrg':
      window.localStorage.removeItem('orgCtx');
      redirectToControlPanel();
      return { ...state, org: null };
    case 'signOut':
      window.localStorage.removeItem('orgCtx');
      return { user: null, org: null, requestSignIn: false };
    case 'updateOrg':
      let orgToSave = { name: action.name, displayName: action.displayName };
      window.localStorage.setItem('orgCtx', JSON.stringify(orgToSave));
      if (isNull(state.org) || (!isNull(state.org) && action.name !== state.org.name)) {
        redirectToControlPanel();
      }
      return {
        ...state,
        org: orgToSave,
      };
    default:
      return { ...state };
  }
}

function AppCtxProvider(props: Props) {
  const [ctx, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    async function isUserAuth() {
      try {
        const user: Alias = await API.getUserAlias();
        dispatch({ type: 'signIn', alias: user.alias });
      } catch {
        dispatch({ type: 'signOut' });
      }
    }
    if (ctx.requestSignIn) {
      isUserAuth();
    }
  }, [ctx.requestSignIn]);

  return <AppCtx.Provider value={{ ctx, dispatch }}>{props.children}</AppCtx.Provider>;
}

function useAppCtx() {
  return useContext(AppCtx);
}

export { AppCtxProvider, useAppCtx };
