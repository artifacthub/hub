import classnames from 'classnames';
import React, { useState } from 'react';
import { FaRegLightbulb, FaRegQuestionCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import { SearchTipItem } from '../../types';
import { SEARH_TIPS } from '../../utils/data';
import prepareQueryString from '../../utils/prepareQueryString';
import Modal from './Modal';
import styles from './SearchTipsModal.module.css';

interface Props {
  size: 'big' | 'normal';
}

const SearchTipsModal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState<boolean>(false);

  return (
    <div
      className={classnames('position-absolute text-dark', styles.tipIcon, {
        [styles.bigTipIcon]: props.size === 'big',
      })}
    >
      <button
        data-testid="openSearchTipsBtn"
        onClick={() => setOpenStatus(true)}
        className={classnames('btn btn-link p-2 text-light', {
          'btn-lg': props.size === 'big',
        })}
      >
        <FaRegQuestionCircle />
      </button>

      <Modal noFooter onClose={() => setOpenStatus(false)} open={openStatus}>
        <div className="mw-100 text-left">
          <div className="d-flex flex-row justify-content-between mb-4">
            <div className={`h3 d-flex flex-row align-items-baseline ${styles.title}`}>
              Search tips
              <FaRegLightbulb className="ml-2" />
            </div>

            <div>
              <button
                data-testid="closeModalBtn"
                type="button"
                className={`close ${styles.closeModalBtn}`}
                onClick={() => {
                  setOpenStatus(false);
                }}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          </div>

          <ul className={`mb-0 ${styles.list}`}>
            {SEARH_TIPS.map((tip: SearchTipItem, index: number) => (
              <li data-testid="searchTip" className="my-1" key={`searchBarTip_${index}`}>
                {tip.content} <small className="text-muted">Example:</small>{' '}
                <Link
                  data-testid="searchTipLink"
                  className="font-weight-bold text-dark p-0"
                  onClick={() => setOpenStatus(false)}
                  to={{
                    pathname: '/packages/search',
                    search: prepareQueryString({
                      pageNumber: 1,
                      tsQueryWeb: tip.example,
                      filters: {},
                    }),
                  }}
                >
                  <u>{tip.example}</u>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default SearchTipsModal;
