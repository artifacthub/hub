import React from 'react';
import { useCountUp } from 'react-countup';

interface Props {
  number: number;
}

const CountUpNumber = (props: Props) => {
  const { countUp } = useCountUp({
    end: props.number,
    duration: 1,
  });

  return (
    <h3>{countUp}</h3>
  );
}

export default CountUpNumber;
