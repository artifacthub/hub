import React from 'react';

interface Props {
  content: string;
}

const NoData = (props: Props) => (
  <div className="m-5 text-center p-5 border bg-light">
    <h1>{props.content}</h1>
  </div>
);

export default NoData;
