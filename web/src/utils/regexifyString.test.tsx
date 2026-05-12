import { render, screen } from '@testing-library/react';

import regexifyString from './regexifyString';

describe('regexifyString', () => {
  it('decorates matches', () => {
    render(
      <>
        {regexifyString({
          pattern: /hub/gi,
          decorator: (match, index) => {
            return <span key={`match_${index}`}>{match}</span>;
          },
          input: 'artifact-hub security-hub',
        })}
      </>
    );

    expect(screen.getAllByText('hub')).toHaveLength(2);
  });

  it('passes the match result to the decorator', () => {
    render(
      <>
        {regexifyString({
          pattern: /repo-(\d+)/,
          decorator: (_match, _index, result) => {
            return <span>{result[1]}</span>;
          },
          input: 'repo-1 repo-2',
        })}
      </>
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
