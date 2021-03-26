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
  labelClassName?: string;
  onlyIcon?: boolean;
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
          className={classnames('text-center labelIconWrapper', styles.iconWrapper, {
            [styles.onlyIcon]: props.onlyIcon,
          })}
          style={{
            backgroundColor: props.bgLeftIcon,
          }}
        >
          {props.icon}
        </div>
      )}

      {(isUndefined(props.onlyIcon) || !props.onlyIcon) && (
        <div
          className={classnames(
            'text-nowrap',
            styles.labelText,
            { [styles.labelTextNoIcon]: isUndefined(props.icon) },
            props.labelClassName
          )}
        >
          {props.text}
        </div>
      )}
    </div>
  </div>
);

export default Label;
