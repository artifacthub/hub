import React from 'react';

import styles from './SubNavbar.module.css';

interface Props {
  children: JSX.Element | JSX.Element[];
}

const SubNavbar = (props: Props) => (
  <nav className={`navbar navbar-expand-sm ${styles.navbar}`} role="navigation">
    <div className="container-lg px-sm-4 px-lg-0 d-flex justify-content-between flex-nowrap">{props.children}</div>
  </nav>
);

export default SubNavbar;
