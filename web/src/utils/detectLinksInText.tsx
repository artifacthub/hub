import { Fragment } from 'react';

const URL_REGEX = /(\bhttps?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi; // eslint-disable-line

const detectLinksInText = (text: string, linkClass?: string): JSX.Element => {
  const matches = text.match(URL_REGEX);
  if (matches) {
    const parts = text.split(' ');
    return (
      <>
        {parts.map((part: string, index: number) => {
          return (
            <Fragment key={`part_${index}`}>
              {matches.includes(part) ? (
                <>
                  <a
                    className={`d-inline text-secondary ${linkClass}`}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {part}
                  </a>{' '}
                </>
              ) : (
                <>{part} </>
              )}
            </Fragment>
          );
        })}
      </>
    );
  } else {
    return <>{text}</>;
  }
};

export default detectLinksInText;
