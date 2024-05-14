import isNull from 'lodash/isNull';
import { useState } from 'react';
import { matchRoutes, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { AppCtxProvider } from '../context/AppCtx';
import useOnLocationChange from '../hooks/useOnLocationChange';
import useScrollRestorationFix from '../hooks/useScrollRestorationFix';
import { HOME_ROUTES, PKG_DETAIL_PATH } from '../utils/data';
import getMetaTag from '../utils/getMetaTag';
import { history } from '../utils/history';
import updateMetaIndex from '../utils/updateMetaIndex';
import notificationsDispatcher from '../utils/userNotificationsDispatcher';
import AlertController from './common/AlertController';
import UserNotificationsController from './common/userNotifications';
import BannerMOTD from './navigation/BannerMOTD';
import Footer from './navigation/Footer';
import Navbar from './navigation/Navbar';

const Layout = () => {
  const location = useLocation();

  // init custom history object to allow navigation from
  // anywhere in the react app (inside or outside components)
  history.navigate = useNavigate();
  history.location = location;

  const analyticsConfig: string | null = getMetaTag('gaTrackingID');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let analytics: any = null;
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scrollPosition, setScrollPosition] = useState<undefined | number>(undefined);
  const [viewedPackage, setViewedPackage] = useState<undefined | string>(undefined);

  const privateRoutes = [{ path: '/packages/starred' }, { path: '/control-panel/:section?/:subsection?' }];
  const matchesWithPrivateRoutes = matchRoutes(privateRoutes, location);
  const homeRoutes = ['/', ...HOME_ROUTES];

  if (!isNull(analyticsConfig)) {
    import('../analytics/analytics').then((a) => {
      analytics = a.default;
    });
  }

  useOnLocationChange((loc: Location) => {
    // Updates meta tags every time that history is called for all locations except for package detail page
    if (!PKG_DETAIL_PATH.test(loc.pathname)) {
      updateMetaIndex();
    }

    // Calls page view only when script has been loaded
    if (!isNull(analytics)) {
      analytics.page();
    }

    // Clean notifications to change location
    notificationsDispatcher.dismissNotification(location.pathname);
  });

  useScrollRestorationFix();

  return (
    <AppCtxProvider>
      <div className="d-flex flex-column min-vh-100 position-relative whiteBranded">
        <div className="visually-hidden visually-hidden-focusable">
          <a href="#content">Skip to Main Content</a>
        </div>
        <AlertController />
        <BannerMOTD />
        <UserNotificationsController />
        <div className="d-flex flex-column flex-grow-1">
          <Navbar
            isSearching={isSearching}
            privateRoute={!isNull(matchesWithPrivateRoutes)}
            inHome={homeRoutes.includes(location.pathname)}
          />
          <div className="d-flex flex-column flex-grow-1">
            <Outlet
              context={{
                isSearching,
                setIsSearching,
                isLoading,
                setIsLoading,
                scrollPosition,
                setScrollPosition,
                viewedPackage,
                setViewedPackage,
              }}
            />
          </div>
          <Footer isHidden={isSearching || isLoading} />
        </div>
      </div>
    </AppCtxProvider>
  );
};

export default Layout;
