import { isUndefined } from 'lodash';
import { useContext } from 'react';
import { FiMoon, FiSun } from 'react-icons/fi';
import { GoBrowser } from 'react-icons/go';

import { AppCtx, updateTheme } from '../../context/AppCtx';
import SmallTitle from '../common/SmallTitle';
import styles from './ThemeMode.module.css';

interface Props {
  onSelection?: () => void;
  device: string;
}

const ThemeMode = (props: Props) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const { configured } = ctx.prefs.theme;

  const onHandleChange = (value: string) => {
    dispatch(updateTheme(value));
    if (!isUndefined(props.onSelection)) {
      props.onSelection();
    }
  };

  return (
    <>
      <SmallTitle text="Theme" className="px-4" />
      <div data-testid="themeOptions">
        <div className="dropdown-item">
          <div className="custom-control custom-radio">
            <input
              id={`${props.device}-automatic`}
              name="automatic"
              className={`custom-control-input ${styles.input}`}
              type="radio"
              value="automatic"
              aria-checked={configured === 'automatic'}
              tabIndex={0}
              checked={configured === 'automatic'}
              readOnly
            />
            <label
              className={`custom-control-label font-weight-bold ${styles.label}`}
              htmlFor={`${props.device}-automatic`}
              onClick={() => onHandleChange('automatic')}
            >
              <GoBrowser className="mx-1" />
              Automatic
            </label>
          </div>
        </div>

        <div className="dropdown-item">
          <div className="custom-control custom-radio">
            <input
              id={`${props.device}-light`}
              name="light"
              className={`custom-control-input ${styles.input}`}
              type="radio"
              value="light"
              aria-checked={configured === 'light'}
              tabIndex={-1}
              checked={configured === 'light'}
              readOnly
            />
            <label
              className={`custom-control-label font-weight-bold ${styles.label}`}
              htmlFor={`${props.device}-light`}
              onClick={() => onHandleChange('light')}
            >
              <FiSun className="mx-1" /> Light
            </label>
          </div>
        </div>

        <div className="dropdown-item">
          <div className="custom-control custom-radio">
            <input
              id={`${props.device}-dark`}
              name="dark"
              className={`custom-control-input ${styles.input}`}
              type="radio"
              value="dark"
              aria-checked={configured === 'dark'}
              tabIndex={-1}
              checked={configured === 'dark'}
              readOnly
            />
            <label
              className={`custom-control-label font-weight-bold ${styles.label}`}
              htmlFor={`${props.device}-dark`}
              onClick={() => onHandleChange('dark')}
            >
              <FiMoon className="mx-1" /> Dark
            </label>
          </div>
        </div>
      </div>
    </>
  );
};

export default ThemeMode;
