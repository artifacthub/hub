import React, { useState } from 'react';
import isNull from 'lodash/isNull';
import placeholder from '../../images/kubernetes_grey.svg';

interface Props {
  src: string | null;
  alt: string;
  className?: string;
}

const Image = (props: Props) => {
  const [imageUrl, setImageUrl] = useState(props.src);

  return (
    <img
      alt={props.alt}
      src={isNull(imageUrl) ? placeholder : `${imageUrl}?raw=true`}
      className={props.className}
      onError={() => setImageUrl(placeholder)}
    />
  );
}

export default Image;
