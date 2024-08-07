import isNull from 'lodash/isNull';

import getMetaTag from './getMetaTag';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tinycolor = require('tinycolor2');

interface ColorItem {
  name: string;
  color: string;
}

class ThemeBuilder {
  private primary: string | null = null;
  private secondary: string | null = null;
  private customColors: ColorItem[] = [];
  private sheet: CSSStyleSheet | null = null;

  public init() {
    this.primary = getMetaTag('primaryColor');
    this.secondary = getMetaTag('secondaryColor');
    this.createStyleSheet();
    this.prepareCustomColors();
    this.applyColors();
  }

  private createStyleSheet() {
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(''));
    document.head.appendChild(style);

    this.sheet = style.sheet;
  }

  private prepareCustomColors() {
    if (!isNull(this.primary) && tinycolor(this.primary).isValid()) {
      this.customColors.push({ name: '--color-1-500', color: this.primary });

      if (!isNull(this.secondary) && tinycolor(this.primary).isValid()) {
        this.customColors.push({ name: '--color-1-700', color: this.secondary });
      } else {
        this.secondary = tinycolor(this.primary).darken(40);
        this.customColors.push({ name: '--color-1-700', color: this.secondary! });
      }

      this.customColors.push({
        name: '--color-1-100',
        color: tinycolor(this.primary).lighten(40).brighten(20).desaturate(50).toHexString(),
      });
      this.customColors.push({
        name: '--color-1-200',
        color: tinycolor(this.primary).lighten(35).brighten(10).desaturate(50).toHexString(),
      });
      this.customColors.push({ name: '--color-1-300', color: tinycolor(this.primary).lighten(20).toHexString() });
      this.customColors.push({ name: '--color-1-400', color: tinycolor(this.primary).lighten(10).toHexString() });
      this.customColors.push({ name: '--color-1-600', color: tinycolor(this.primary).darken(10).toHexString() });
      this.customColors.push({ name: '--color-1-800', color: tinycolor(this.secondary).darken(5).toHexString() });
      this.customColors.push({ name: '--color-1-900', color: tinycolor(this.secondary).darken(10).toHexString() });
      this.customColors.push({ name: '--color-2-500', color: tinycolor(this.primary).lighten(35).toHexString() });
      this.customColors.push({ name: '--highlighted', color: this.primary });
    }
  }

  public applyColors() {
    if (!isNull(this.sheet)) {
      const colorsList = this.customColors.map((item: ColorItem) => `${item.name}: ${item.color};`);
      this.sheet.insertRule(`[data-theme='light'] { ${colorsList.join('')} }`, 0);
    }
  }
}

const themeBuilder = new ThemeBuilder();
export default themeBuilder;
