import classNames from 'classnames';
import { isNull } from 'lodash';
import { useContext, useEffect, useState } from 'react';

import { AppCtx } from '../../context/AppCtx';
import { Banner as IBanner } from '../../types';
import ExternalLink from '../common/ExternalLink';
import styles from './Banner.module.css';

interface Props {
  banner: IBanner;
  removeBanner: () => void;
}

const Banner = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const { effective } = ctx.prefs.theme;
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [visibleBanner, setVisibleBanner] = useState<IBanner | null>(props.banner);
  const [bannerTimeout, setBannerTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visibleBanner !== props.banner) {
      setVisibleBanner(null);
      setIsLoaded(false);
      setBannerTimeout(
        setTimeout(() => {
          setVisibleBanner(props.banner);
        }, 100)
      );
    }
  }, [props.banner]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    return () => {
      if (bannerTimeout) {
        clearTimeout(bannerTimeout);
      }
    };
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (isNull(visibleBanner)) return null;

  const getCardImage = () => (
    <div className={`card shadow-sm p-3 mb-2 overflow-hidden ${styles.banner}`}>
      <img
        src={effective === 'light' ? visibleBanner.images['light-theme'] : visibleBanner.images['dark-theme']}
        alt={visibleBanner.name || 'Banner'}
        className={`mw-100 rounded mx-auto ${styles.image}`}
        onError={props.removeBanner}
        onLoad={() => {
          setIsLoaded(true);
        }}
      />
    </div>
  );

  return (
    <div className={classNames('overflow-hidden', styles.bannerWrapper, { [styles.loaded]: isLoaded })}>
      {visibleBanner.link ? (
        <ExternalLink href={visibleBanner.link} label={`${props.banner.name} link` || 'Banner link'}>
          <>{getCardImage()}</>
        </ExternalLink>
      ) : (
        <>{getCardImage()}</>
      )}
    </div>
  );
};

export default Banner;
