import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FiMoon, FiSun } from 'react-icons/fi';
import { useHistory } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { SearchFiltersURL } from '../../types';
import getMetaTag from '../../utils/getMetaTag';
import isWhiteLabel from '../../utils/isWhiteLabel';
import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
import Modal from '../common/Modal';
import styles from './WidgetModal.module.css';

interface Props {
  packageId: string;
  packageName: string;
  packageDescription: string;
  visibleWidget: boolean;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
  setOpenStatus: Dispatch<SetStateAction<boolean>>;
}

interface WidgetTheme {
  name: string;
  icon: JSX.Element;
}

const DEFAULT_THEME = 'light';
const THEMES: WidgetTheme[] = [
  {
    name: DEFAULT_THEME,
    icon: <FiSun />,
  },
  { name: 'dark', icon: <FiMoon /> },
];

const WidgetModal = (props: Props) => {
  const history = useHistory();
  const whiteLabel = isWhiteLabel();
  const siteName = getMetaTag('siteName');
  const [theme, setTheme] = useState<string>(DEFAULT_THEME);
  const [header, setHeader] = useState<boolean>(whiteLabel ? false : true);
  const [stars, setStars] = useState<boolean>(true);
  const [responsive, setRepsonsive] = useState<boolean>(false);

  const buildWidgetCode = (): string => {
    const url = `${window.location.origin}${window.location.pathname}`;
    const code = `<div class="artifacthub-widget" data-url="${url}" data-theme="${theme}" data-header="${
      !header ? 'false' : 'true'
    }" data-stars="${!stars ? 'false' : 'true'}" data-responsive="${
      responsive ? 'true' : 'false'
    }"><blockquote><p lang="en" dir="ltr"><b>${props.packageName}</b>${
      props.packageDescription ? `: ${props.packageDescription}` : ''
    }</p>&mdash; Open in <a href="${url}">${siteName}</a></blockquote></div><script async src="${
      window.location.origin
    }/artifacthub-widget.js"></script>`;

    return code;
  };

  const [widgetCode, setWidgetCode] = useState<string>(buildWidgetCode());

  const resetValues = () => {
    setTheme(DEFAULT_THEME);
    setHeader(true);
    setRepsonsive(false);
    setWidgetCode(buildWidgetCode());
  };

  const onCloseModal = () => {
    props.setOpenStatus(false);
    resetValues();
    history.replace({
      search: '',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  useEffect(() => {
    setWidgetCode(buildWidgetCode());
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [theme, header, responsive, stars, props.packageId, props.visibleWidget]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (props.visibleWidget) {
      history.replace({
        search: '?modal=widget',
        state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
      });
    }
  }, [props.visibleWidget]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      {props.visibleWidget && (
        <Modal
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Widget</div>}
          onClose={onCloseModal}
          open={props.visibleWidget}
        >
          <div className="w-100 position-relative">
            <label className={`font-weight-bold ${styles.label}`} htmlFor="theme">
              Theme
            </label>
            <div className="d-flex flex-row mb-3">
              {THEMES.map((themeOpt: WidgetTheme) => {
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

            {!whiteLabel && (
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
                  Display Artifact Hub header at the top of the widget.
                </small>
              </div>
            )}

            <div className="mt-4 mb-3">
              <div className="custom-control custom-switch pl-0">
                <input
                  id="stars"
                  type="checkbox"
                  className="custom-control-input"
                  value="true"
                  onChange={() => setStars(!stars)}
                  checked={stars}
                />
                <label
                  htmlFor="stars"
                  className={`custom-control-label font-weight-bold ${styles.label} ${styles.customControlRightLabel}`}
                >
                  Stars
                </label>
              </div>

              <small className="form-text text-muted mt-2">Display number of stars given to the package.</small>
            </div>

            <div className="mt-4 mb-3">
              <div className="custom-control custom-switch pl-0">
                <input
                  id="responsive"
                  type="checkbox"
                  className="custom-control-input"
                  value="true"
                  onChange={() => setRepsonsive(!responsive)}
                  checked={responsive}
                />
                <label
                  htmlFor="responsive"
                  className={`custom-control-label font-weight-bold ${styles.label} ${styles.customControlRightLabel}`}
                >
                  Responsive
                </label>
              </div>

              <small className="form-text text-muted mt-2">
                The widget will try to use the width available on the parent container (between 350px and 650px).
              </small>
            </div>

            <div className="mt-3 mb-2">
              <label className={`font-weight-bold ${styles.label}`}>Code</label>

              <div data-testid="block-content" className={`flex-grow-1 mr-3 user-select-none ${styles.blockWrapper}`}>
                <SyntaxHighlighter
                  language="text"
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
                className={`btn-outline-secondary ${styles.copyBtn}`}
                label="Copy code to clipboard"
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default WidgetModal;
