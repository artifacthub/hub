import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ExpandableList from './ExpandableList';

const getItems = (itemsNumber: number): JSX.Element[] => {
  return Array.from(Array(itemsNumber), (_, i) => <span data-testid="item" key={i}>{`item ${i}`}</span>);
};

describe('ExpandableList', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ExpandableList items={getItems(12)} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('changes button to click on it and renders proper items number', async () => {
    render(<ExpandableList items={getItems(12)} />);

    const btn = screen.getByTestId('expandableListBtn');

    expect(btn).toHaveTextContent('Show more...');
    expect(screen.queryAllByTestId('item')).toHaveLength(5);

    await userEvent.click(btn);

    expect(btn).toHaveTextContent('Show less...');
    expect(screen.queryAllByTestId('item')).toHaveLength(12);
  });

  it('does not render button when items list length is less than visible items number', () => {
    render(<ExpandableList items={getItems(4)} />);

    expect(screen.queryByTestId('expandableListBtn')).toBeNull();
    expect(screen.queryAllByTestId('item')).toHaveLength(4);
  });

  it('renders correct visible items number', () => {
    render(<ExpandableList items={getItems(12)} visibleItems={8} />);

    expect(screen.queryAllByTestId('item')).toHaveLength(8);
  });

  it('calls onBtnClick mock on status changes when is defined', async () => {
    const onBtnClickMock = jest.fn();
    render(<ExpandableList items={getItems(12)} onBtnClick={onBtnClickMock} />);

    const btn = screen.getByTestId('expandableListBtn');

    await userEvent.click(btn);

    expect(onBtnClickMock).toHaveBeenCalledTimes(1);
    expect(onBtnClickMock).toHaveBeenCalledWith(true);
  });

  it('initializes expandable list open', () => {
    render(<ExpandableList items={getItems(12)} open />);

    const btn = screen.getByTestId('expandableListBtn');
    expect(btn).toHaveTextContent('Show less...');
    expect(screen.queryAllByTestId('item')).toHaveLength(12);
  });

  it('closes list when value when forceCollapseList is true', async () => {
    const { rerender } = render(<ExpandableList items={getItems(12)} open forceCollapseList={false} />);

    const btn = screen.getByTestId('expandableListBtn');
    expect(btn).toHaveTextContent('Show less...');

    rerender(<ExpandableList items={getItems(12)} open forceCollapseList={true} />);

    expect(await screen.findByTestId('expandableListBtn')).toHaveTextContent('Show more...');
  });
});
