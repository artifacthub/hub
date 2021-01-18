import classnames from 'classnames';
import { isUndefined } from 'lodash';
import React from 'react';

import styles from './Label.module.css';

interface Props {
  icon?: JSX.Element;
  bgLeftIcon?: string;
  text: string;
  labelStyle?: string;
  className?: string;
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
        <div
          className={`text-center labelIconWrapper ${styles.iconWrapper}`}
          style={{
            backgroundColor: props.bgLeftIcon,
          }}
        >
          {props.icon}
        </div>
      )}
      <div
        className={classnames('text-nowrap', styles.labelText, { [styles.labelTextNoIcon]: isUndefined(props.icon) })}
      >
        {props.text}
      </div>
    </div>
  </div>
);

export default React.memo(Label);
