import React, { useState } from 'react';
import isNull from 'lodash/isNull';
import placeholder from '../../images/kubernetes_grey.svg';
import getEndpointPrefix from '../../utils/getEndpointPrefix';

interface Props {
  imageId: string | null;
  alt: string;
  className?: string;
}

const Image = (props: Props) => {
  const [error, setError] = useState(false);
  const src = isNull(props.imageId) ? '' : `${getEndpointPrefix()}/image/${props.imageId}`;

  console.log(props);

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
          srcSet={`${src}@1x 1x, ${src}@2x 2x, ${src}@3x 3x, ${src}@4x 4x`}
          src={src}
          className={props.className}
          onError={() => setError(true)}
        />
      )}
    </>

  );
}

export default Image;
