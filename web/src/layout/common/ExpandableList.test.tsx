import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

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

  it('changes button to click on it and renders proper items number', () => {
    const { getByTestId, queryAllByTestId } = render(<ExpandableList items={getItems(12)} />);

    const btn = getByTestId('expandableListBtn');

    expect(btn).toHaveTextContent('Show more...');
    expect(queryAllByTestId('item')).toHaveLength(5);

    fireEvent.click(btn);

    expect(btn).toHaveTextContent('Show less...');
    expect(queryAllByTestId('item')).toHaveLength(12);
  });

  it('does not render button when items list length is less than visible items number', () => {
    const { queryByTestId, queryAllByTestId } = render(<ExpandableList items={getItems(4)} />);

    expect(queryByTestId('expandableListBtn')).toBeNull();
    expect(queryAllByTestId('item')).toHaveLength(4);
  });

  it('renders correct visible items number', () => {
    const { queryAllByTestId } = render(<ExpandableList items={getItems(12)} visibleItems={8} />);

    expect(queryAllByTestId('item')).toHaveLength(8);
  });

  it('calls onBtnClick mock on status changes when is defined', () => {
    const onBtnClickMock = jest.fn();
    const { getByTestId } = render(<ExpandableList items={getItems(12)} onBtnClick={onBtnClickMock} />);

    const btn = getByTestId('expandableListBtn');

    fireEvent.click(btn);

    expect(onBtnClickMock).toHaveBeenCalledTimes(1);
    expect(onBtnClickMock).toHaveBeenCalledWith(true);
  });

  it('initializes expandable list open', () => {
    const { getByTestId, queryAllByTestId } = render(<ExpandableList items={getItems(12)} open />);

    const btn = getByTestId('expandableListBtn');
    expect(btn).toHaveTextContent('Show less...');
    expect(queryAllByTestId('item')).toHaveLength(12);
  });

  it('closes list when value in resetStatusOnChange is a new one', () => {
    const { getByTestId, rerender } = render(<ExpandableList items={getItems(12)} open resetStatusOnChange="pkg1" />);

    const btn = getByTestId('expandableListBtn');
    expect(btn).toHaveTextContent('Show less...');

    rerender(<ExpandableList items={getItems(12)} open resetStatusOnChange="pkg2" />);

    waitFor(() => {
      expect(btn).toHaveTextContent('Show more...');
    });
  });

  it('closes list when value in resetStatusOnChange is the same', () => {
    const { getByTestId, queryAllByTestId, rerender } = render(
      <ExpandableList items={getItems(12)} open resetStatusOnChange="pkg1" />
    );

    const btn = getByTestId('expandableListBtn');
    expect(btn).toHaveTextContent('Show less...');
    expect(queryAllByTestId('item')).toHaveLength(12);

    rerender(<ExpandableList items={getItems(15)} open resetStatusOnChange="pkg1" />);

    waitFor(() => {
      expect(btn).toHaveTextContent('Show less...');
      expect(queryAllByTestId('item')).toHaveLength(15);
    });
  });
});
