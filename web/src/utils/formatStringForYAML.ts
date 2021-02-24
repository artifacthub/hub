const YAML_SPECIAL_CHARACTERS = /[:!@#%&|*\-=[\]{}?<>]+/;

export default (str: string): string => {
  if (str.match(YAML_SPECIAL_CHARACTERS)) {
    return `"${str}"`;
  }
  return str;
};
