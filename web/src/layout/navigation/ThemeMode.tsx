import { isUndefined } from 'lodash';
import React, { useContext } from 'react';
import { FiMoon, FiSun } from 'react-icons/fi';
import { GoBrowser } from 'react-icons/go';

import { AppCtx, updateTheme } from '../../context/AppCtx';
import SmallTitle from '../common/SmallTitle';
import styles from './ThemeMode.module.css';

interface Props {
  onSelection?: () => void;
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
              data-testid="radio-automatic"
              className={`custom-control-input ${styles.input}`}
              type="radio"
              name="theme"
              id="automatic"
              value="automatic"
              checked={configured === 'automatic'}
              readOnly
            />
            <label
              className={`custom-control-label font-weight-bold ${styles.label}`}
              htmlFor="automatic"
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
              data-testid="radio-light"
              className={`custom-control-input ${styles.input}`}
              type="radio"
              name="theme"
              id="light"
              value="light"
              checked={configured === 'light'}
              readOnly
            />
            <label
              className={`custom-control-label font-weight-bold ${styles.label}`}
              htmlFor="light"
              onClick={() => onHandleChange('light')}
            >
              <FiSun className="mx-1" /> Light
            </label>
          </div>
        </div>

        <div className="dropdown-item">
          <div className="custom-control custom-radio">
            <input
              data-testid="radio-dark"
              className={`custom-control-input ${styles.input}`}
              type="radio"
              name="theme"
              id="dark"
              value="dark"
              checked={configured === 'dark'}
              readOnly
            />
            <label
              className={`custom-control-label font-weight-bold ${styles.label}`}
              htmlFor="dark"
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
