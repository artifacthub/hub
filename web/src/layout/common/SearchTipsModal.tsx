import { FaRegLightbulb } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import { SearchTipItem } from '../../types';
import { SEARH_TIPS } from '../../utils/data';
import { prepareQueryString } from '../../utils/prepareQueryString';
import Modal from './Modal';
import styles from './SearchTipsModal.module.css';

interface Props {
  size: 'big' | 'normal';
  openTips: boolean;
  setOpenTips: (status: boolean) => void;
}

const SearchTipsModal = (props: Props) => {
  if (!props.openTips) return null;

  return (
    <Modal noFooter onClose={() => props.setOpenTips(false)} open={props.openTips}>
      <div className="mw-100 text-start text-dark">
        <div className="d-flex flex-row justify-content-between mb-4">
          <div className={`h3 d-flex flex-row align-items-baseline ${styles.title}`}>
            Search tips
            <FaRegLightbulb className="ms-2" />
          </div>

          <div>
            <button
              type="button"
              className={`btn-close p-3 ${styles.closeModalBtn}`}
              onClick={() => {
                props.setOpenTips(false);
              }}
              aria-label="Close"
            ></button>
          </div>
        </div>

        <ul className={`mb-0 ${styles.list}`}>
          {SEARH_TIPS.map((tip: SearchTipItem, index: number) => (
            <li className="my-1" key={`searchBarTip_${index}`}>
              {tip.content} <small className="text-muted">Example:</small>{' '}
              <Link
                className="fw-bold text-dark p-0"
                onClick={() => props.setOpenTips(false)}
                to={{
                  pathname: '/packages/search',
                  search: prepareQueryString({
                    pageNumber: 1,
                    tsQueryWeb: tip.example,
                  }),
                }}
                aria-label={`Filter by ${tip.example}`}
              >
                <u>{tip.example}</u>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};

export default SearchTipsModal;
