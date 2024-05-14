// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getMetaTag = (name: string, isTrue?: boolean): any => {
  const value = document.querySelector(`meta[name='artifacthub:${name}']`)
    ? document.querySelector(`meta[name='artifacthub:${name}']`)!.getAttribute('content')
    : null;
  if (isTrue) {
    return value === 'true';
  } else {
    return value;
  }
};

export default getMetaTag;
