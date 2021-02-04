import { compact } from 'lodash';
import uniq from 'lodash/uniq';
import React, { useCallback, useEffect, useState } from 'react';

import SmallTitle from '../common/SmallTitle';
import styles from './Platforms.module.css';

interface Props {
  platforms?: string[] | null;
}

const Platforms = (props: Props) => {
  const cleanPlatforms = useCallback((): string[] => {
    let platforms: string[] = [];
    if (props.platforms) {
      platforms = uniq(compact(props.platforms));
    }

    return platforms;
  }, [props.platforms]);

  const [platforms, setPlatforms] = useState<string[]>(cleanPlatforms());

  useEffect(() => {
    setPlatforms(cleanPlatforms());
  }, [cleanPlatforms, props.platforms]);

  if (platforms.length === 0) return null;

  return (
    <>
      <SmallTitle text="Supported platforms" />
      <div className="mb-3 d-flex flex-row flex-wrap">
        {platforms.map((platform: string) => (
          <div
            data-testid="platformBadge"
            className={`d-inline badge font-weight-normal mr-2 mb-1 mw-100 text-truncate ${styles.badge}`}
            key={platform}
          >
            {platform}
          </div>
        ))}
      </div>
    </>
  );
};

export default Platforms;
