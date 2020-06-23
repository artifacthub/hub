import isNull from 'lodash/isNull';
import React, { useState } from 'react';

import getHubBaseURL from '../../utils/getHubBaseURL';

interface Props {
  imageId: string | null;
  alt: string;
  className?: string;
}

const PLACEHOLDER_SRC = '/static/media/package_placeholder.svg';

const Image = (props: Props) => {
  const [error, setError] = useState(false);

  const getSrc = () => {
    return `${getHubBaseURL()}/image/${props.imageId}`;
  };

  return (
    <>
      {error || isNull(props.imageId) ? (
        <img alt={props.alt} src={PLACEHOLDER_SRC} className={props.className} />
      ) : (
        <img
          alt={props.alt}
          srcSet={`${getSrc()}@1x 1x, ${getSrc()}@2x 2x, ${getSrc()}@3x 3x, ${getSrc()}@4x 4x`}
          src={getSrc()}
          className={props.className}
          onError={() => setError(true)}
        />
      )}
    </>
  );
};

export default Image;
