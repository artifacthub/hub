import { ChangeEvent, useCallback } from 'react';

import { TsQuery as TsQueryType } from '../../types';
import { TS_QUERY } from '../../utils/data';
import CheckBox from '../common/Checkbox';
import SmallTitle from '../common/SmallTitle';
import styles from './TsQuery.module.css';

interface Props {
  active: string[];
  onChange: (value: string, checked: boolean) => void;
  device: string;
}

const TsQuery = (props: Props) => {
  const isChecked = useCallback(
    (option: string) => {
      return props.active.includes(option);
    },
    [props.active]
  );

  const onTsQueryChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { value, checked } = e.target;
    props.onChange(value, checked);
  };

  return (
    <div role="menuitem" className="mt-2 mt-sm-3 pt-1">
      <SmallTitle text="Category" className="text-dark font-weight-bold" />
      <div className="mt-3">
        {TS_QUERY.map((option: TsQueryType) => (
          <CheckBox
            key={`ts_${option.label}`}
            name="tsQuery"
            value={option.label}
            device={props.device}
            labelClassName="mw-100"
            className={styles.checkbox}
            label={option.name}
            checked={isChecked(option.label)}
            onChange={onTsQueryChange}
          />
        ))}
      </div>
    </div>
  );
};

export default TsQuery;
