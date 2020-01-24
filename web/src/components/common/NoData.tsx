import React from 'react';

interface Props {
  children: string | JSX.Element;
}

const NoData = (props: Props) => (
  <div className="alert alert-primary ml-auto mr-auto mt-5 w-75 text-center p-5 border">
    <div className="h3">{props.children}</div>
  </div>
);

export default NoData;
