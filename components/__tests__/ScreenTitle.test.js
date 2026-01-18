import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ScreenTitle from '../ScreenTitle';

describe('ScreenTitle', () => {
  it('renders the title text', () => {
    render(<ScreenTitle title="Match Scouting" />);
    expect(screen.getByText('Match Scouting')).toBeOnTheScreen();
  });

  it('renders different titles correctly', () => {
    render(<ScreenTitle title="Settings" />);
    expect(screen.getByText('Settings')).toBeOnTheScreen();
  });
});
