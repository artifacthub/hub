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
  revealMode?: 'height' | 'fade' | 'none';
}

const Banner = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const { effective } = ctx.prefs.theme;
  const img = useRef<HTMLImageElement>(null);
  const bannerTimeout = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [visibleBanner, setVisibleBanner] = useState<IBanner | null>(props.banner);

  const updateLoadedState = () => {
    if (props.maxEqualRatio && img.current && img.current.naturalHeight > img.current.naturalWidth) {
      setIsLoaded(false);
    } else {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    if (visibleBanner !== props.banner) {
      if (bannerTimeout.current !== null) {
        clearTimeout(bannerTimeout.current);
      }
      setVisibleBanner(null);
      setIsLoaded(false);
      bannerTimeout.current = window.setTimeout(() => {
        setVisibleBanner(props.banner);
        bannerTimeout.current = null;
      }, 100);
    }
  }, [props.banner]);

  useEffect(() => {
    return () => {
      if (bannerTimeout.current !== null) {
        clearTimeout(bannerTimeout.current);
      }
    };
  }, []);

  if (isNull(visibleBanner)) return null;

  const imageSource = effective === 'light' ? visibleBanner.images['light-theme'] : visibleBanner.images['dark-theme'];
  const revealMode = props.revealMode ?? 'height';

  const getCardImage = () => (
    <div className={`card flex-row shadow-sm mw-100 overflow-hidden ${styles.card} ${props.className}`}>
      <img
        key={imageSource}
        ref={img}
        src={imageSource}
        alt={visibleBanner.name || 'Banner'}
        className="mw-100 h-auto mx-auto"
        onError={props.removeBanner}
        onLoad={updateLoadedState}
      />
    </div>
  );

  return (
    <div
      className={classNames({
        'overflow-hidden': revealMode === 'height',
        [styles.bannerWrapper]: revealMode === 'height',
        [styles.loaded]: revealMode === 'height' && isLoaded,
        [styles.fadeInOnLoad]: revealMode === 'fade',
        [styles.visible]: revealMode !== 'fade' || isLoaded,
      })}
    >
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
