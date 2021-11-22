const YAML_SPECIAL_CHARACTERS = /[:!@#%&|*\-=[\]{}?<>]+/;

const formatStringForYAML = (str: string): string => {
  if (str.match(YAML_SPECIAL_CHARACTERS)) {
    return `"${str}"`;
  }
  return str;
};

export default formatStringForYAML;
