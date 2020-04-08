import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { createContext, useContext, useEffect, useReducer } from 'react';

import { API } from '../api';
import { Profile, UserFullName } from '../types';
import history from '../utils/history';

interface OrgCtx {
  name: string;
  displayName?: string;
}

interface AppState {
  user: Profile | null | undefined;
  org: OrgCtx | null;
  requestSignIn: boolean;
  redirect?: string;
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
  | { type: 'requestSignIn'; redirect?: string }
  | { type: 'signIn'; profile: Profile }
  | { type: 'signOut' }
  | { type: 'unselectOrg' }
  | { type: 'updateUser'; user: UserFullName }
  | { type: 'updateOrg'; name: string; displayName?: string };

export const AppCtx = createContext<{
  ctx: AppState;
  dispatch: React.Dispatch<any>;
}>({
  ctx: initialState,
  dispatch: () => null,
});

export function requestSignIn(redirect?: string) {
  return { type: 'requestSignIn', redirect };
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

export function updateUser(user: UserFullName) {
  return { type: 'updateUser', user };
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
        redirect: action.redirect,
      };
    case 'signIn':
      const orgCtx = window.localStorage.getItem('orgCtx');
      let org: OrgCtx | null = null;
      if (!isNull(orgCtx)) {
        org = JSON.parse(orgCtx);
      }
      return {
        user: action.profile,
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
    case 'updateUser':
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
    async function isUserAuth() {
      try {
        const profile: Profile = await API.getUserProfile();
        dispatch({ type: 'signIn', profile });
        if (!isUndefined(ctx.redirect)) {
          // Redirect to correct route when neccessary
          history.push({ pathname: ctx.redirect });
        }
      } catch {
        dispatch({ type: 'signOut' });
      }
    }
    if (ctx.requestSignIn) {
      isUserAuth();
    }
  }, [ctx.requestSignIn, ctx.redirect]);

  return <AppCtx.Provider value={{ ctx, dispatch }}>{props.children}</AppCtx.Provider>;
}

function useAppCtx() {
  return useContext(AppCtx);
}

export { AppCtxProvider, useAppCtx };
