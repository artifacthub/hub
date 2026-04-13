import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AppCtx } from '../../context/AppCtx';
import { Banner as BannerData } from '../../types';
import { hasClassContaining } from '../../utils/testUtils';
import Banner from './Banner';

const mockCtx = {
  user: null,
  prefs: {
    controlPanel: {},
    search: { limit: 60 },
    theme: {
      configured: 'light',
      effective: 'light',
    },
    notifications: {
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    },
  },
};

const defaultBanner: BannerData = {
  name: 'Artifact Hub banner',
  images: {
    'light-theme': 'https://example.com/banner-light.png',
    'dark-theme': 'https://example.com/banner-dark.png',
  },
};

describe('Banner', () => {
  it('reveals the banner after the image loads', async () => {
    render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Banner banner={defaultBanner} removeBanner={jest.fn()} maxEqualRatio={false} />
      </AppCtx.Provider>
    );

    const image = screen.getByAltText(defaultBanner.name as string);
    const wrapper = image.parentElement?.parentElement?.parentElement;

    expect(wrapper).not.toBeNull();

    fireEvent.load(image);

    await waitFor(() => {
      expect(hasClassContaining(wrapper as Element, 'loaded')).toBe(true);
    });
  });
});
