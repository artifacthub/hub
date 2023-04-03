import styles from './ResourceLabel.module.css';

interface Props {
  text: string;
}

const ResourceLabel = (props: Props) => (
  <span className={`text-truncate border border-1 fw-bold ${styles.label}`}>{props.text}</span>
);

export default ResourceLabel;
