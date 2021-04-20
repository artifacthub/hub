import React, { useEffect, useRef, useState } from 'react';
import { SketchPicker } from 'react-color';
import { AiOutlineColumnWidth } from 'react-icons/ai';
import { BsArrowsFullscreen } from 'react-icons/bs';
import { FiMoon, FiSun } from 'react-icons/fi';
import { IoIosClose } from 'react-icons/io';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { RefInputField } from '../../types';
import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
import InputField from '../common/InputField';
import Modal from '../common/Modal';
import styles from './WidgetsGroupModal.module.css';

interface Props {
  visibleWidget: boolean;
  setOpenStatus: React.Dispatch<React.SetStateAction<boolean>>;
}

interface RadioProps {
  name: string;
  icon: JSX.Element;
}

const DEFAULT_COLOR = '#659dbd';
const WIDGET_WIDTH = 380;
const DEFAULT_THEME = 'light';
const THEMES: RadioProps[] = [
  {
    name: DEFAULT_THEME,
    icon: <FiSun />,
  },
  { name: 'dark', icon: <FiMoon /> },
];
const PRESET_COLORS = ['#659dbd', '#ef6b3a', '#a6ca35', '#ee9595', '#2f4f95', '#ce2029', '#c17d00', '#726a95'];
const DEFAULT_WRAPPER_OPTION = 'responsive';
const WRAPPER_OPTIONS: RadioProps[] = [
  {
    name: DEFAULT_WRAPPER_OPTION,
    icon: <BsArrowsFullscreen />,
  },
  {
    name: 'fixed',
    icon: <AiOutlineColumnWidth />,
  },
];

const WidgetsGroupModal = (props: Props) => {
  const widthInput = useRef<RefInputField>(null);
  const [theme, setTheme] = useState<string>(DEFAULT_THEME);
  const [header, setHeader] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [color, setColor] = useState<string>(DEFAULT_COLOR);
  const [fixedWidth, setFixedWidth] = useState<string | undefined>();
  const [groupWrapperWidthOpt, setGroupWrapperWidthOpt] = useState<string>(DEFAULT_WRAPPER_OPTION);
  const [isValidCode, setIsValidCode] = useState<boolean>(true);

  const onFixedWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFixedWidth(e.target.value);
    widthInput.current!.checkIsValid().then((res: boolean) => {
      setIsValidCode(res);
    });
  };

  const buildWidgetsGroupCode = (): string => {
    const code = `<div class="artifacthub-widget-group" data-url="${
      window.location.href
    }" data-theme="${theme}" data-header="${!header ? 'false' : 'true'}" data-color="${color}" data-responsive="${
      groupWrapperWidthOpt === 'responsive'
    }" ${fixedWidth ? `data-width="${fixedWidth}"` : ''} data-loading="${
      loading ? 'true' : 'false'
    }"></div><script async src="${window.location.origin}/artifacthub-widget.js"></script>`;

    return code;
  };

  const [widgetCode, setWidgetCode] = useState<string>(buildWidgetsGroupCode());

  const resetValues = () => {
    setTheme(DEFAULT_THEME);
    setHeader(false);
    setLoading(true);
    setFixedWidth(undefined);
    setColor(DEFAULT_COLOR);
    setGroupWrapperWidthOpt(DEFAULT_WRAPPER_OPTION);
    setWidgetCode(buildWidgetsGroupCode());
  };

  const onCloseModal = () => {
    props.setOpenStatus(false);
    resetValues();
  };

  const handleColorChange = (color: any) => {
    setColor(color.hex);
  };

  useEffect(() => {
    setWidgetCode(buildWidgetsGroupCode());
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    theme,
    header,
    fixedWidth,
    groupWrapperWidthOpt,
    color,
    props.visibleWidget,
  ]); /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <>
      {props.visibleWidget && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Widgets group</div>}
          onClose={onCloseModal}
          open={props.visibleWidget}
        >
          <div className="w-100 position-relative">
            <label className={`font-weight-bold ${styles.label}`} htmlFor="theme">
              Theme
            </label>
            <div className="d-flex flex-row mb-3">
              {THEMES.map((themeOpt: RadioProps) => {
                return (
                  <div className="custom-control custom-radio mr-4" key={`radio_theme_${themeOpt.name}`}>
                    <input
                      className="custom-control-input"
                      type="radio"
                      name="theme"
                      id={themeOpt.name}
                      value={themeOpt.name}
                      checked={theme === themeOpt.name}
                      required
                      readOnly
                    />
                    <label
                      className="text-capitalize custom-control-label"
                      htmlFor={themeOpt.name}
                      onClick={() => {
                        setTheme(themeOpt.name);
                      }}
                    >
                      <div className="d-flex flex-row align-items-center">
                        {themeOpt.icon}
                        <span className="ml-1">{themeOpt.name}</span>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 mb-3">
              <div className="custom-control custom-switch pl-0">
                <input
                  id="header"
                  type="checkbox"
                  className="custom-control-input"
                  value="true"
                  onChange={() => setHeader(!header)}
                  checked={header}
                />
                <label
                  htmlFor="header"
                  className={`custom-control-label font-weight-bold ${styles.label} ${styles.customControlRightLabel}`}
                >
                  Header
                </label>
              </div>

              <small className="form-text text-muted mt-2">
                Displays Artifact Hub header at the top of the widget.
              </small>
            </div>

            <div className="d-flex flex-row">
              <div>
                <label className={`font-weight-bold ${styles.label}`} htmlFor="groupWrapperWidthOpt">
                  Container width
                </label>
                <div className="d-flex flex-row">
                  {WRAPPER_OPTIONS.map((wrapperOpt: RadioProps) => {
                    return (
                      <div className="custom-control custom-radio mr-4" key={`radio_wrapperOpt_${wrapperOpt.name}`}>
                        <input
                          className="custom-control-input"
                          type="radio"
                          name="groupWrapperWidthOpt"
                          id={wrapperOpt.name}
                          value={wrapperOpt.name}
                          checked={groupWrapperWidthOpt === wrapperOpt.name}
                          required
                          readOnly
                        />
                        <label
                          className="text-capitalize custom-control-label"
                          htmlFor={wrapperOpt.name}
                          onClick={() => {
                            if (wrapperOpt.name === 'fixed') {
                              setFixedWidth((WIDGET_WIDTH * 2).toString());
                            } else {
                              setIsValidCode(true);
                              setFixedWidth(undefined);
                            }
                            setGroupWrapperWidthOpt(wrapperOpt.name);
                          }}
                        >
                          <div className="d-flex flex-row align-items-center">
                            {wrapperOpt.icon}
                            <span className="ml-1">{wrapperOpt.name}</span>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className={`position-relative ${styles.inputWrapper}`}>
                {groupWrapperWidthOpt === 'fixed' && (
                  <div className="position-absolute d-flex flex-row">
                    <InputField
                      ref={widthInput}
                      type="number"
                      name="fixedWidth"
                      min={380}
                      className="mb-0"
                      inputClassName={styles.input}
                      invalidText={{
                        default: 'This field is required',
                        rangeUnderflow: 'The min value is 380',
                      }}
                      onChange={onFixedWidthChange}
                      value={fixedWidth}
                      validateOnBlur
                      required
                    />
                    <div className="mt-1 text-muted ml-2">px</div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 mb-3">
              <div className="custom-control custom-switch pl-0">
                <input
                  id="loading"
                  type="checkbox"
                  className="custom-control-input"
                  value="true"
                  onChange={() => setLoading(!loading)}
                  checked={loading}
                />
                <label
                  htmlFor="loading"
                  className={`custom-control-label font-weight-bold ${styles.label} ${styles.customControlRightLabel}`}
                >
                  Loading spinner
                </label>
              </div>

              <small className="form-text text-muted mt-2">
                Displays loading spinner while waiting for search results.
              </small>
            </div>

            <div className="mt-4 mb-3">
              <div className="d-flex flex-row align-items-center">
                <label htmlFor="color" className={`font-weight-bold mb-0 ${styles.label}`}>
                  Color
                </label>
                <div className={`btn btn-sm btn-light ${styles.colorInputWrapper}`}>
                  <div
                    className={styles.colorInput}
                    style={{
                      backgroundColor: color,
                    }}
                  />
                </div>
                {color !== DEFAULT_COLOR && (
                  <button className="btn btn-sm btn-link text-muted py-0" onClick={() => setColor(DEFAULT_COLOR)}>
                    <IoIosClose />
                    <small>Reset to default</small>
                  </button>
                )}
              </div>
              <small className="form-text text-muted mt-3 mb-2">
                Color used for widgets border, header and loading spinner.
              </small>
              <div className={`pb-2 ${styles.colorPickerWrapper}`}>
                <SketchPicker
                  color={color}
                  presetColors={PRESET_COLORS}
                  onChangeComplete={handleColorChange}
                  disableAlpha
                />
              </div>
            </div>

            <div className="mt-3 mb-2">
              <label className={`font-weight-bold ${styles.label}`}>Code</label>

              <div className={`flex-grow-1 mr-3 user-select-none ${styles.blockWrapper}`}>
                <SyntaxHighlighter
                  language="html"
                  style={docco}
                  customStyle={{
                    backgroundColor: 'var(--color-1-10)',
                  }}
                >
                  {widgetCode}
                </SyntaxHighlighter>
              </div>

              <ButtonCopyToClipboard
                text={widgetCode}
                tooltipClassName={`bs-tooltip-right ${styles.copyBtnTooltip}`}
                arrowClassName={styles.copyBtnArrow}
                visibleBtnText
                contentBtn="Copy code to clipboard"
                className={`btn-secondary ${styles.copyBtn}`}
                disabled={!isValidCode}
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default WidgetsGroupModal;
