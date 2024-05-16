import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FiMoon, FiSun } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

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
  const navigate = useNavigate();
  const location = useLocation();
  const whiteLabel = isWhiteLabel();
  const siteName = getMetaTag('siteName');
  const [theme, setTheme] = useState<string>(DEFAULT_THEME);
  const [header, setHeader] = useState<boolean>(whiteLabel ? false : true);
  const [stars, setStars] = useState<boolean>(true);
  const [responsive, setResponsive] = useState<boolean>(false);

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
    setResponsive(false);
    setWidgetCode(buildWidgetCode());
  };

  const onCloseModal = () => {
    props.setOpenStatus(false);
    resetValues();
    navigate('', {
      state: location.state,
      replace: true,
    });
  };

  useEffect(() => {
    setWidgetCode(buildWidgetCode());
  }, [theme, header, responsive, stars, props.packageId, props.visibleWidget]);

  useEffect(() => {
    if (props.visibleWidget) {
      navigate('?modal=widget', {
        state: location.state,
        replace: true,
      });
    }
  }, [props.visibleWidget]);

  return (
    <>
      {props.visibleWidget && (
        <Modal
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Widget</div>}
          onClose={onCloseModal}
          open={props.visibleWidget}
        >
          <div className="w-100 position-relative">
            <label className={`form-label fw-bold ${styles.label}`} htmlFor="theme">
              Theme
            </label>
            <div className="d-flex flex-row mb-3">
              {THEMES.map((themeOpt: WidgetTheme) => {
                return (
                  <div className="form-check me-4" key={`radio_theme_${themeOpt.name}`}>
                    <input
                      className="form-check-input"
                      type="radio"
                      name="theme"
                      id={themeOpt.name}
                      value={themeOpt.name}
                      checked={theme === themeOpt.name}
                      onChange={() => {
                        setTheme(themeOpt.name);
                      }}
                      required
                    />
                    <label className="form-label text-capitalize form-check-label" htmlFor={themeOpt.name}>
                      <div className="d-flex flex-row align-items-center">
                        {themeOpt.icon}
                        <span className="ms-1">{themeOpt.name}</span>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>

            {!whiteLabel && (
              <div className="mt-4 mb-3">
                <div className="form-check form-switch ps-0">
                  <label htmlFor="header" className={`form-check-label fw-bold ${styles.label}`}>
                    Header
                  </label>{' '}
                  <input
                    id="header"
                    type="checkbox"
                    className="form-check-input position-absolute ms-2"
                    value="true"
                    role="switch"
                    onChange={() => setHeader(!header)}
                    checked={header}
                  />
                </div>

                <div className="form-text text-muted mt-2">Display Artifact Hub header at the top of the widget.</div>
              </div>
            )}

            <div className="mt-4 mb-3">
              <div className="form-check form-switch ps-0">
                <label htmlFor="stars" className={`form-check-label fw-bold ${styles.label}`}>
                  Stars
                </label>
                <input
                  id="stars"
                  type="checkbox"
                  role="switch"
                  className="form-check-input position-absolute ms-2"
                  value="true"
                  onChange={() => setStars(!stars)}
                  checked={stars}
                />
              </div>

              <div className="form-text text-muted mt-2">Display number of stars given to the package.</div>
            </div>

            <div className="mt-4 mb-3">
              <div className="form-check form-switch ps-0">
                <label htmlFor="responsive" className={`form-check-label fw-bold ${styles.label}`}>
                  Responsive
                </label>
                <input
                  id="responsive"
                  type="checkbox"
                  role="switch"
                  className="form-check-input position-absolute ms-2"
                  value="true"
                  onChange={() => setResponsive(!responsive)}
                  checked={responsive}
                />
              </div>

              <div className="form-text text-muted mt-2">
                The widget will try to use the width available on the parent container (between 350px and 650px).
              </div>
            </div>

            <div className="mt-3 mb-2">
              <label className={`form-label fw-bold ${styles.label}`}>Code</label>

              <div data-testid="block-content" className={`flex-grow-1 me-3 user-select-none ${styles.blockWrapper}`}>
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
                tooltipClassName={`bs-tooltip-end ${styles.copyBtnTooltip}`}
                arrowClassName={styles.copyBtnArrow}
                visibleBtnText
                contentBtn="Copy code to clipboard"
                className="btn-outline-secondary text-uppercase px-2 py-1"
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
