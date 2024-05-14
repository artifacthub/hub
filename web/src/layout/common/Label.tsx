import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';

import styles from './Label.module.css';

interface Props {
  icon?: JSX.Element;
  iconLegend?: string | number;
  bgLeftIcon?: string;
  text: string;
  textForSmallDevices?: string;
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
      {(!isUndefined(props.icon) || !isUndefined(props.iconLegend)) && (
        <div
          data-testid="label-wrapper"
          className={classnames(
            'text-center border border-1 border-end-0 position-relative',
            {
              labelIconWrapper:
                isUndefined(props.labelStyle) || (!isUndefined(props.labelStyle) && props.labelStyle !== 'success'),
            },
            styles.iconWrapper,
            {
              [`${styles.onlyIcon} me-0`]: props.onlyIcon,
            }
          )}
          style={{
            backgroundColor: props.bgLeftIcon,
          }}
        >
          {props.icon && <span className={classnames({ 'ms-1': !isUndefined(props.iconLegend) })}>{props.icon}</span>}

          {props.iconLegend && (
            <span className={`mx-1 fw-bold position-relative ${styles.iconLegend}`}>{props.iconLegend}</span>
          )}
        </div>
      )}
      {(isUndefined(props.onlyIcon) || !props.onlyIcon) && (
        <div
          className={classnames(
            'text-nowrap border border-1 fw-bold',
            styles.labelText,
            { [styles.labelTextNoIcon]: isUndefined(props.icon) },
            props.labelClassName
          )}
        >
          {props.textForSmallDevices ? (
            <>
              <span className="d-none d-sm-inline">{props.text}</span>
              <span className="d-inline d-sm-none">{props.textForSmallDevices}</span>
            </>
          ) : (
            <>{props.text}</>
          )}
        </div>
      )}
    </div>
  </div>
);

export default Label;
