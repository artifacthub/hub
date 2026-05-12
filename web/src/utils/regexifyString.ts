import type { ReactNode } from 'react';

interface RegexifyStringProps {
  pattern: RegExp;
  decorator: (match: string, index: number, result: RegExpExecArray) => ReactNode;
  input: string;
}

/**
 * Splits text by a regex and decorates each match for React rendering.
 */
const regexifyString = (props: RegexifyStringProps): ReactNode[] => {
  const { pattern, decorator, input } = props;
  // Work on a global copy so callers can pass reusable regex constants.
  const patternFlags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, patternFlags);
  const output: ReactNode[] = [];
  let match = globalPattern.exec(input);
  let matchIndex = 0;
  let previousMatchEnd = 0;

  while (match !== null) {
    const matchStart = match.index;
    const matchValue = match[0];
    // Preserve text between matches so React can render the original input.
    output.push(input.substring(previousMatchEnd, matchStart));
    output.push(decorator(matchValue, matchIndex, match));

    // Avoid infinite loops when a regex can match an empty string.
    if (matchValue.length === 0) {
      globalPattern.lastIndex += 1;
    }
    previousMatchEnd = globalPattern.lastIndex;
    matchIndex += 1;
    match = globalPattern.exec(input);
  }

  if (previousMatchEnd < input.length) {
    output.push(input.substring(previousMatchEnd));
  }

  return output;
};

export default regexifyString;
