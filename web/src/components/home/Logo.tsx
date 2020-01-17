import React from 'react';
import logo from '../../images/cncf.svg';
import styles from './Logo.module.css';

const Logo = () => (
  <div className="mt-auto text-center mb-5">
    <img className={styles.logo} src={logo} alt="Logo CNCF" />

    <div className="pt-3">
      Hub is a <a href="https://www.cncf.io/" className={`font-weight-bold ${styles.link}`}>Cloud Native Computing Foundation</a> sandbox project.
    </div>
  </div>
);

export default Logo;
