import compact from 'lodash/compact';
import uniq from 'lodash/uniq';
import { useCallback, useEffect, useState } from 'react';

import SmallTitle from '../common/SmallTitle';
import styles from './Platforms.module.css';

interface Props {
  title: string;
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
      <SmallTitle text={props.title} />
      <div className="mb-3 d-flex flex-row flex-wrap pt-1">
        {platforms.map((platform: string) => (
          <div
            data-testid="platformBadge"
            className={`d-inline badge fw-normal me-2 mb-1 mw-100 text-truncate ${styles.badge}`}
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
