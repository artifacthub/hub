import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useRef, useState } from 'react';
import { BiImages, BiUnlink } from 'react-icons/bi';
import { FaArrowCircleLeft, FaArrowCircleRight } from 'react-icons/fa';
import { GoDotFill } from 'react-icons/go';
import { useLocation, useNavigate } from 'react-router';

import useOutsideClick from '../../../hooks/useOutsideClick';
import { Screenshot } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import FullScreenModal from '../../common/FullScreenModal';
import Loading from '../../common/Loading';
import styles from './Modal.module.css';

interface Props {
  visibleScreenshotsModal: boolean;
  screenshots: Screenshot[];
}

const ScreenshotsModal = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const img = useRef<HTMLImageElement>(null);
  const fullSizeImage = useRef<HTMLImageElement>(null);
  const imgWrapper = useRef<HTMLDivElement>(null);
  const brokenImg = useRef<HTMLDivElement>(null);
  const leftBtn = useRef<HTMLDivElement>(null);
  const rightBtn = useRef<HTMLDivElement>(null);
  const dotsBtn = useRef<HTMLDivElement>(null);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [activeScreenshot, setActiveScreenshot] = useState<number>(0);
  const [error, setError] = useState(false);
  const [onLoadedImage, setOnLoadedImage] = useState<boolean>(false);
  const [isBigImg, setIsBigImg] = useState<boolean>(false);
  const [zoomed, setZoomed] = useState<boolean>(false);
  useOutsideClick([img, brokenImg, fullSizeImage, leftBtn, rightBtn, dotsBtn], openStatus, () => {
    onCloseModal();
  });

  const onOpenModal = () => {
    setOpenStatus(true);
    navigate('?modal=screenshots', {
      state: location.state,
      replace: true,
    });
  };

  const onCloseModal = () => {
    setIsBigImg(false);
    setZoomed(false);
    setActiveScreenshot(0);
    setError(false);
    setOpenStatus(false);
    navigate('', {
      state: location.state,
      replace: true,
    });
  };

  const onChangeActiveScreenshot = (newIndex: number) => {
    setError(false);
    setOnLoadedImage(false);
    setIsBigImg(false);
    setZoomed(false);
    setActiveScreenshot(newIndex);
  };

  const calculateImgDimensions = () => {
    if (fullSizeImage && fullSizeImage.current && imgWrapper && imgWrapper.current) {
      if (
        fullSizeImage.current.width > imgWrapper.current.clientWidth ||
        fullSizeImage.current.height > imgWrapper.current.clientHeight
      ) {
        setIsBigImg(true);
      }
    }
  };

  useEffect(() => {
    if (props.visibleScreenshotsModal && !openStatus) {
      onOpenModal();
    }
  }, []);

  if (props.screenshots.length === 0) return null;

  return (
    <>
      <button
        type="button"
        className={classnames(
          'btn fw-bold text-uppercase position-relative btn-outline-secondary btn-sm text-nowrap w-100'
        )}
        onClick={onOpenModal}
        aria-label="Open screenshots modal"
      >
        <div className="d-flex align-items-center justify-content-center">
          <BiImages className="me-2" />
          <span>Screenshots</span>
        </div>
      </button>

      <FullScreenModal onClose={onCloseModal} open={openStatus}>
        <div className="d-flex flex-column h-100 w-100 align-items-center unselectable">
          <div className={`d-flex flex-grow-1 w-100 pt-3 ${styles.minHeight}`}>
            <div className="d-flex flex-row align-items-center justify-content-between px-3 pt-3 h-100 w-100">
              <div className="me-3" ref={leftBtn}>
                <button
                  className={classnames('btn btn-link fs-2', styles.arrowBtn, {
                    [`disabled ${styles.disabled}`]: activeScreenshot === 0,
                  })}
                  disabled={activeScreenshot === 0}
                  onClick={() => onChangeActiveScreenshot(activeScreenshot - 1)}
                  aria-label="Go to previous screenshot"
                >
                  <FaArrowCircleLeft />
                </button>
              </div>

              <div className="h-100 w-100">
                {!onLoadedImage && <Loading className="bg-transparent" />}

                {error ? (
                  <div className="d-flex flex-column justify-content-center align-items-center h-100">
                    <BiUnlink className={`mb-4 text-light ${styles.imgErrorIcon}`} />
                    <div className="fst-italic text-light" ref={brokenImg}>
                      Sorry, this{' '}
                      <ExternalLink
                        href={props.screenshots[activeScreenshot].url}
                        className={`text-reset fst-italic position-relative bg-transparent text-decoration-underline ${styles.externalLink}`}
                        btnType
                      >
                        image link
                      </ExternalLink>{' '}
                      is broken
                    </div>
                  </div>
                ) : (
                  <div className="d-flex flex-column justify-content-center align-items-center h-100 w-100">
                    <div className="d-flex flex-column h-100 w-100 align-items-center">
                      <div
                        ref={imgWrapper}
                        className={classnames(
                          'flex-grow-1 d-flex align-items-center justify-content-center pb-1 position-relative w-100',
                          styles.minHeight,
                          { 'pb-3': isUndefined(props.screenshots[activeScreenshot].title) }
                        )}
                      >
                        <div className="h-100 w-100 position-relative">
                          <img
                            ref={img}
                            src={props.screenshots[activeScreenshot].url}
                            alt={`Screenshot: ${props.screenshots[activeScreenshot].title}`}
                            className={classnames(
                              'mh-100 mw-100 border border-3 position-relative top-50 start-50 translate-middle',
                              styles.image,
                              {
                                [styles.bigImg]: isBigImg,
                              }
                            )}
                            onLoad={() => setOnLoadedImage(true)}
                            onError={() => {
                              setOnLoadedImage(true);
                              setError(true);
                            }}
                            onClick={
                              isBigImg
                                ? () => {
                                    setZoomed(true);
                                  }
                                : undefined
                            }
                            aria-hidden="true"
                          />
                        </div>
                        {onLoadedImage && (
                          <div
                            className={classnames(
                              'position-absolute overflow-hidden top-0 bottom-0 start-0 end-0',
                              styles.bigImageView,
                              {
                                'd-none': !zoomed,
                              },
                              { [`d-block ${styles.isVisible}`]: zoomed }
                            )}
                            onClick={() => setZoomed(false)}
                          >
                            <div
                              className={`position-absolute mw-100 mh-100 overflow-auto text-center border border-3 align-middle top-50 start-50 translate-middle ${styles.zoomedImgWrapper}`}
                            >
                              <img
                                ref={fullSizeImage}
                                alt={`Screenshot: ${props.screenshots[activeScreenshot].title}`}
                                onLoad={() => calculateImgDimensions()}
                                src={props.screenshots[activeScreenshot].url}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {!isUndefined(props.screenshots[activeScreenshot].title) && (
                        <div className={`text-truncate text-center mt-4 ${styles.imgTitle}`}>
                          {props.screenshots[activeScreenshot].title}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="ms-3" ref={rightBtn}>
                <button
                  className={classnames('btn btn-link fs-2', styles.arrowBtn, {
                    [`disabled ${styles.disabled}`]: activeScreenshot === props.screenshots.length - 1,
                  })}
                  disabled={activeScreenshot === props.screenshots.length - 1}
                  onClick={() => onChangeActiveScreenshot(activeScreenshot + 1)}
                  aria-label="Go to next screenshot"
                >
                  <FaArrowCircleRight />
                </button>
              </div>
            </div>
          </div>

          <div className="my-3 text-center" ref={dotsBtn}>
            {Array.from(Array(props.screenshots.length).keys()).map((idx: number) => (
              <button
                data-testid="dotBtn"
                key={`botBtn_${idx}`}
                className={classnames(
                  'btn btn-link px-1',
                  { [styles.dotBtn]: idx !== activeScreenshot },
                  {
                    [`disabled opacity-100 ${styles.disabledDotBtn}`]: idx === activeScreenshot,
                  }
                )}
                onClick={() => onChangeActiveScreenshot(idx)}
                disabled={idx === activeScreenshot}
                aria-label={`Go to screenshot number ${idx + 1}`}
              >
                <GoDotFill />
              </button>
            ))}
          </div>
        </div>
      </FullScreenModal>
    </>
  );
};

export default ScreenshotsModal;
