import React from 'react';

interface Props {
  text: string;
}

const Title = (props: Props) => (
  <div className="card-title font-weight-bolder mt-2 mb-1">{props.text}</div>
);

export default Title;
