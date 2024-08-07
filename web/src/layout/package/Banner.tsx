import classNames from 'classnames';
import isNull from 'lodash/isNull';
import { useContext, useEffect, useRef, useState } from 'react';

import { AppCtx } from '../../context/AppCtx';
import { Banner as IBanner } from '../../types';
import ExternalLink from '../common/ExternalLink';
import styles from './Banner.module.css';

interface Props {
  wrapperClassName?: string;
  className?: string;
  banner: IBanner;
  removeBanner: () => void;
  maxEqualRatio: boolean;
}

const Banner = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const { effective } = ctx.prefs.theme;
  const img = useRef<HTMLImageElement>(null);
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
  }, [props.banner]);

  useEffect(() => {
    return () => {
      if (bannerTimeout) {
        clearTimeout(bannerTimeout);
      }
    };
  }, []);

  if (isNull(visibleBanner)) return null;

  const getCardImage = () => (
    <div className={`card flex-row shadow-sm mw-100 overflow-hidden ${styles.card} ${props.className}`}>
      <img
        ref={img}
        src={effective === 'light' ? visibleBanner.images['light-theme'] : visibleBanner.images['dark-theme']}
        alt={visibleBanner.name || 'Banner'}
        className="mw-100 h-auto mx-auto"
        onError={props.removeBanner}
        onLoad={() => {
          if (props.maxEqualRatio && img && img.current && img.current.naturalHeight > img.current.naturalWidth) {
            setIsLoaded(false);
          } else {
            setIsLoaded(true);
          }
        }}
      />
    </div>
  );

  return (
    <div className={classNames('overflow-hidden', styles.bannerWrapper, { [styles.loaded]: isLoaded })}>
      {visibleBanner.link ? (
        <ExternalLink
          href={visibleBanner.link}
          className={props.wrapperClassName}
          label={props.banner.name ? `${props.banner.name} link` : 'Banner link'}
        >
          <>{getCardImage()}</>
        </ExternalLink>
      ) : (
        <div className={props.wrapperClassName}>{getCardImage()}</div>
      )}
    </div>
  );
};

export default Banner;
