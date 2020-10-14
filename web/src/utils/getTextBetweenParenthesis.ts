export default (name: string): string | undefined => {
  const regExp = /\(([^)]+)\)/;
  const matches = regExp.exec(name);
  return matches ? matches[1] : undefined;
};
