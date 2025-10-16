import classNames from 'classnames';

interface Props {
  offset: number;
  itemsInPage: number;
  total: number;
  className?: string;
}

const PaginationSummary = (props: Props) => {
  if (props.total === 0 || props.itemsInPage === 0) return null;

  const firstItem = props.offset + 1;
  const lastItem = Math.min(props.offset + props.itemsInPage, props.total);
  const label =
    firstItem === lastItem
      ? `${firstItem} of ${props.total} results`
      : `${firstItem} - ${lastItem} of ${props.total} results`;

  return (
    <div className={classNames('text-muted text-end', props.className)} data-testid="pagination-summary">
      {label}
    </div>
  );
};

export default PaginationSummary;
