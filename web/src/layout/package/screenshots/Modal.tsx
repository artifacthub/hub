import classnames from 'classnames';
import { isUndefined } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { BiImages, BiUnlink } from 'react-icons/bi';
import { FaArrowCircleLeft, FaArrowCircleRight } from 'react-icons/fa';
import { GoPrimitiveDot } from 'react-icons/go';
import { useHistory } from 'react-router';

import useOutsideClick from '../../../hooks/useOutsideClick';
import { Screenshot, SearchFiltersURL } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import FullScreenModal from '../../common/FullScreenModal';
import Loading from '../../common/Loading';
import styles from './Modal.module.css';

interface Props {
  visibleScreenshotsModal: boolean;
  screenshots: Screenshot[];
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const ScreenshotsModal = (props: Props) => {
  const history = useHistory();
  const img = useRef<HTMLImageElement>(null);
  const imgWrapper = useRef<HTMLDivElement>(null);
  const brokenImg = useRef<HTMLDivElement>(null);
  const leftBtn = useRef<HTMLDivElement>(null);
  const rightBtn = useRef<HTMLDivElement>(null);
  const dotsBtn = useRef<HTMLDivElement>(null);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [activeScreenshot, setActiveScreenshot] = useState<number>(0);
  const [error, setError] = useState(false);
  const [onLoadedImage, setOnLoadedImage] = useState<boolean>(false);
  useOutsideClick([img, brokenImg, leftBtn, rightBtn, dotsBtn], openStatus, () => {
    onCloseModal();
  });

  const onOpenModal = () => {
    setOpenStatus(true);
    history.replace({
      search: '?modal=screenshots',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  const onCloseModal = () => {
    setActiveScreenshot(0);
    setError(false);
    setOpenStatus(false);
    history.replace({
      search: '',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  const onChangeActiveScreenshot = (newIndex: number) => {
    setError(false);
    setOnLoadedImage(false);
    setActiveScreenshot(newIndex);
  };

  useEffect(() => {
    if (props.visibleScreenshotsModal && !openStatus) {
      onOpenModal();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <button
        type="button"
        className={classnames(
          'btn font-weight-bold text-uppercase position-relative btn-block btn-outline-secondary btn-sm text-nowrap'
        )}
        onClick={onOpenModal}
        aria-label="Open screenshots modal"
      >
        <div className="d-flex align-items-center justify-content-center">
          <BiImages className="mr-2" />
          <span>Screenshots</span>
        </div>
      </button>

      <FullScreenModal onClose={onCloseModal} open={openStatus}>
        <div className="d-flex flex-column h-100 w-100 align-items-center unselectable">
          <div className={`d-flex flex-grow-1 w-100 pt-3 ${styles.minHeight}`}>
            <div className="d-flex flex-row align-items-center justify-content-between px-3 pt-3 h-100 w-100">
              <div className="mr-3" ref={leftBtn}>
                <button
                  className={classnames('btn btn-link', styles.arrowBtn, {
                    [`disabled ${styles.disabled}`]: activeScreenshot === 0,
                  })}
                  disabled={activeScreenshot === 0}
                  onClick={() => onChangeActiveScreenshot(activeScreenshot - 1)}
                >
                  <FaArrowCircleLeft />
                </button>
              </div>

              <div className="h-100 w-100">
                {!onLoadedImage && <Loading className={styles.loading} />}

                {error ? (
                  <div className="d-flex flex-column justify-content-center align-items-center h-100">
                    <BiUnlink className={`mb-4 text-light ${styles.imgErrorIcon}`} />
                    <div className="font-italic text-light" ref={brokenImg}>
                      Sorry, this{' '}
                      <ExternalLink
                        href={props.screenshots[activeScreenshot].url}
                        className={`text-reset font-italic position-relative ${styles.externalLink}`}
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
                          'flex-grow-1 d-flex align-items-center justify-content-center pb-1 position-relative',
                          styles.minHeight,
                          { 'pb-3': isUndefined(props.screenshots[activeScreenshot].title) }
                        )}
                      >
                        <div className="h-100 w-100 position-relative">
                          <img
                            ref={img}
                            src={props.screenshots[activeScreenshot].url}
                            alt={`Screenshot: ${props.screenshots[activeScreenshot].title}`}
                            className={classnames('mh-100 mw-100', styles.image)}
                            onLoad={() => setOnLoadedImage(true)}
                            onError={() => {
                              setOnLoadedImage(true);
                              setError(true);
                            }}
                            aria-hidden="true"
                          />
                        </div>
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

              <div className="ml-3" ref={rightBtn}>
                <button
                  className={classnames('btn btn-link', styles.arrowBtn, {
                    [`disabled ${styles.disabled}`]: activeScreenshot === props.screenshots.length - 1,
                  })}
                  disabled={activeScreenshot === props.screenshots.length - 1}
                  onClick={() => onChangeActiveScreenshot(activeScreenshot + 1)}
                >
                  <FaArrowCircleRight />
                </button>
              </div>
            </div>
          </div>

          <div className="my-3 text-center" ref={dotsBtn}>
            {Array.from(Array(props.screenshots.length).keys()).map((idx: number) => (
              <button
                key={`botBtn_${idx}`}
                className={classnames(
                  'btn btn-link px-1',
                  { [styles.dotBtn]: idx !== activeScreenshot },
                  {
                    [`disabled ${styles.disabledDotBtn}`]: idx === activeScreenshot,
                  }
                )}
                onClick={() => onChangeActiveScreenshot(idx)}
                disabled={idx === activeScreenshot}
              >
                <GoPrimitiveDot />
              </button>
            ))}
          </div>
        </div>
      </FullScreenModal>
    </>
  );
};

export default ScreenshotsModal;
