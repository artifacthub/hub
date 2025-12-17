import './App.css';
import '../themes/default.scss';

import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';

import { HOME_ROUTES } from '../utils/data';
import Layout from '.';
import ControlPanelView from './controlPanel';
import HomeView from './home';
import NotFound from './notFound';
import PackageView from './package';
import SearchView from './search';
import StarredPackagesView from './starredPackages';
import StatsView from './stats';

export default function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<Layout />}>
        <Route index element={<HomeView />} />
        {HOME_ROUTES.map((path: string) => (
          <Route key={path} path={path} element={<HomeView />} />
        ))}
        <Route path="/packages/search" element={<SearchView />} />
        <Route path="/packages/:repositoryKind/:repositoryName/:packageName/:version?" element={<PackageView />} />
        <Route path="/control-panel/:section?/:subsection?" element={<ControlPanelView />} />
        <Route path="/packages/starred" element={<StarredPackagesView />} />
        <Route path="/stats" element={<StatsView />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    )
  );

  return <RouterProvider router={router} />;
}
