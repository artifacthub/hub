import { fireEvent, render } from '@testing-library/react';
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
});
