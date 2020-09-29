import classnames from 'classnames';
import { isUndefined } from 'lodash';
import React from 'react';

import styles from './Label.module.css';

interface Props {
  icon?: JSX.Element;
  text: string;
  labelStyle?: string;
  className?: string;
  tooltipContent?: string;
}

const Label = (props: Props) => (
  <div className={`${props.className}`}>
    <div
      className={classnames(
        'd-flex flex-row align-items-center overflow-hidden',
        styles.labelWrapper,
        {
          [styles[props.labelStyle as string]]: !isUndefined(props.labelStyle),
        },
        { [styles.default]: isUndefined(props.labelStyle) }
      )}
    >
      {!isUndefined(props.icon) && (
        <div className={`text-center labelIconWrapper ${styles.iconWrapper}`}>{props.icon}</div>
      )}
      <div className={`text-nowrap ${styles.labelText}`}>{props.text}</div>
    </div>
  </div>
);

export default Label;
