import React, { useState } from 'react';
import isNull from 'lodash/isNull';
import placeholder from '../../images/kubernetes_grey.svg';
import getHubBaseURL from '../../utils/getHubBaseURL';

interface Props {
  imageId: string | null;
  alt: string;
  className?: string;
}

const Image = (props: Props) => {
  const [error, setError] = useState(false);

  const getSrc = () => {
    return `${getHubBaseURL()}/image/${props.imageId}`;
  }

  return (
    <>
      {error || isNull(props.imageId) ? (
        <img
          alt={props.alt}
          src={placeholder}
          className={props.className}
        />
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
}

export default Image;
