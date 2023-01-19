import styles from './SubNavbar.module.css';

interface Props {
  children: JSX.Element | JSX.Element[];
  className?: string;
}

const SubNavbar = (props: Props) => (
  <nav className={`navbar navbar-expand-sm ${styles.navbar} ${props.className}`} role="navigation">
    <div className="container-lg px-1 px-sm-4 px-lg-0 d-flex align-items-center justify-content-between flex-nowrap">
      {props.children}
    </div>
  </nav>
);

export default SubNavbar;
