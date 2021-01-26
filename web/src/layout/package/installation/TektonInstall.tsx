import React from 'react';

import CommandBlock from './CommandBlock';

interface Props {
  contentUrl: string;
}

const TektonInstall = (props: Props) => (
  <div className="mt-3">
    <CommandBlock command={`kubectl apply -f ${props.contentUrl}`} title="Install the task:" />
  </div>
);

export default TektonInstall;
