import React from 'react';
import { MdVerifiedUser } from 'react-icons/md';

import Label from './Label';
import LabelWithTooltip from './LabelWithTooltip';

interface Props {
  verifiedPublisher?: null | boolean;
  className?: string;
}

const VerifiedPublisherBadge = (props: Props) => (
  <LabelWithTooltip
    active={props.verifiedPublisher}
    className={props.className}
    label={<Label text="Verified Publisher" icon={<MdVerifiedUser />} />}
    tooltipMessage="The publisher owns this repository"
    visibleTooltip
  />
);

export default VerifiedPublisherBadge;
