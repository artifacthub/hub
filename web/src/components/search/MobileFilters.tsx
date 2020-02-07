import React from 'react';
import { FaFilter } from 'react-icons/fa';
import Filters from './Filters';
import Modal from '../common/Modal';
import { Facets, Filters as FiltersProp } from '../../types';
import styles from './MobileFilters.module.css';

interface Props {
  activeFilters: FiltersProp;
  facets: Facets[] | null;
  packagesNumber: number;
  isLoading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MobileFilters = (props: Props) => {
  const getCloseButtonInfo = (): JSX.Element | string => {
    if (props.isLoading) {
      return (
        <>
          <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
          <span className="ml-2">Loading...</span>
        </>
      );
    } else {
      return `See ${props.packagesNumber} results`;
    }
  }

  return (
    <Modal
      className="d-inline-block d-md-none mr-2"
      buttonType={`btn-sm rounded-circle ${styles.btnFilters}`}
      buttonIcon={<FaFilter />}
      header={<div className="h6 text-uppercase mb-0">Filters</div>}
      closeButton={getCloseButtonInfo()}
    >
      <Filters
        {...props}
        visibleTitle={false}
      />
    </Modal>
  );
}

export default MobileFilters;
