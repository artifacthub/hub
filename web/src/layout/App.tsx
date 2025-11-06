import './App.css';
import '../themes/default.scss';

import { lazy, Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';

import { HOME_ROUTES } from '../utils/data';

const Layout = lazy(() => import('.'));
const ControlPanelView = lazy(() => import('./controlPanel'));
const HomeView = lazy(() => import('./home'));
const NotFound = lazy(() => import('./notFound'));
const PackageView = lazy(() => import('./package'));
const SearchView = lazy(() => import('./search'));
const StarredPackagesView = lazy(() => import('./starredPackages'));
const StatsView = lazy(() => import('./stats'));

const withSuspense = (component: JSX.Element) => <Suspense fallback={null}>{component}</Suspense>;

export default function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={withSuspense(<Layout />)}>
        <Route index element={withSuspense(<HomeView />)} />
        {HOME_ROUTES.map((path: string) => (
          <Route key={path} path={path} element={withSuspense(<HomeView />)} />
        ))}
        <Route path="/packages/search" element={withSuspense(<SearchView />)} />
        <Route
          path="/packages/:repositoryKind/:repositoryName/:packageName/:version?"
          element={withSuspense(<PackageView />)}
        />
        <Route path="/control-panel/:section?/:subsection?" element={withSuspense(<ControlPanelView />)} />
        <Route path="/packages/starred" element={withSuspense(<StarredPackagesView />)} />
        <Route path="/stats" element={withSuspense(<StatsView />)} />
        <Route path="*" element={withSuspense(<NotFound />)} />
      </Route>
    )
  );

  return <RouterProvider router={router} />;
}
