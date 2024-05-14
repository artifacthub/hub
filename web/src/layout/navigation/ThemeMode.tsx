import isUndefined from 'lodash/isUndefined';
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
          <div className="form-check">
            <input
              id={`${props.device}-automatic`}
              name="automatic"
              className={`form-check-input ${styles.input}`}
              type="radio"
              value="automatic"
              aria-checked={configured === 'automatic'}
              tabIndex={0}
              checked={configured === 'automatic'}
              onChange={() => onHandleChange('automatic')}
            />
            <label className={`form-check-label fw-bold w-100 ${styles.label}`} htmlFor={`${props.device}-automatic`}>
              <GoBrowser className={`mx-1 position-relative ${styles.icon}`} />
              Automatic
            </label>
          </div>
        </div>

        <div className="dropdown-item">
          <div className="form-check">
            <input
              id={`${props.device}-light`}
              name="light"
              className={`form-check-input ${styles.input}`}
              type="radio"
              value="light"
              aria-checked={configured === 'light'}
              tabIndex={-1}
              checked={configured === 'light'}
              onChange={() => onHandleChange('light')}
            />
            <label className={`form-check-label fw-bold w-100 ${styles.label}`} htmlFor={`${props.device}-light`}>
              <FiSun className={`mx-1 position-relative ${styles.icon}`} />
              Light
            </label>
          </div>
        </div>

        <div className="dropdown-item">
          <div className="form-check">
            <input
              id={`${props.device}-dark`}
              name="dark"
              className={`form-check-input ${styles.input}`}
              type="radio"
              value="dark"
              aria-checked={configured === 'dark'}
              tabIndex={-1}
              checked={configured === 'dark'}
              onChange={() => onHandleChange('dark')}
            />
            <label className={`form-check-label fw-bold w-100 ${styles.label}`} htmlFor={`${props.device}-dark`}>
              <FiMoon className={`mx-1 position-relative ${styles.icon}`} />
              Dark
            </label>
          </div>
        </div>
      </div>
    </>
  );
};

export default ThemeMode;
