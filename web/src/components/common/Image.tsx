import React, { useState } from 'react';
import isNull from 'lodash/isNull';
import placeholder from '../../images/kubernetes_grey.svg';

interface Props {
  src: string | null;
  alt: string;
  className?: string;
}

const Image = (props: Props) => {
  const [error, setError] = useState(false);

  return (
    <img
      alt={props.alt}
      src={error || isNull(props.src) ? placeholder : props.src}
      className={props.className}
      onError={() => setError(true)}
    />
  );
}

export default Image;
