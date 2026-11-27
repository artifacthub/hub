const DEFAULT_DIGITS = 2;

const prettifyNumber = (num: number, digits?: number): string | number => {
  if (num < 1000) {
    return num;
  }

  const si = [
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'k' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'G' },
    { value: 1e12, symbol: 'T' },
    { value: 1e15, symbol: 'P' },
    { value: 1e18, symbol: 'E' },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  let i;
  for (i = si.length - 1; i > 0; i--) {
    if (num >= si[i].value) {
      break;
    }
  }
  const fractionDigits = digits ?? DEFAULT_DIGITS;
  let scaled = (num / si[i].value).toFixed(fractionDigits);
  // Rounding can push the value up to 1000 (e.g. 999999 -> "1000.00k"), so it has to use the next unit
  if (parseFloat(scaled) >= 1000 && i < si.length - 1) {
    i++;
    scaled = (num / si[i].value).toFixed(fractionDigits);
  }
  return scaled.replace(rx, '$1') + si[i].symbol;
};

export default prettifyNumber;
