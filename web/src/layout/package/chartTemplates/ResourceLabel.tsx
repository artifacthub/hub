import React from 'react';

import styles from './ResourceLabel.module.css';

interface Props {
  text: string;
}

const ResourceLabel = (props: Props) => <span className={`text-truncate ${styles.label}`}>{props.text}</span>;

export default ResourceLabel;
