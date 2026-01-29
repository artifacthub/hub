const YAML_SPECIAL_CHARACTERS = /[:!@#%&|*\-=[\]{}?<>]+/;

const formatStringForYAML = (str: string): string => {
  if (typeof str === 'string' && str.match(YAML_SPECIAL_CHARACTERS)) {
    return `"${str}"`;
  }
  return str;
};

export default formatStringForYAML;
