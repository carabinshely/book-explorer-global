import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExternalMediaEmbed } from './ExternalMediaEmbed';

describe('ExternalMediaEmbed', () => {
  it('does not create an iframe until the visitor explicitly loads it', () => {
    const { container } = render(
      <ExternalMediaEmbed provider="YouTube">
        <iframe src="https://www.youtube-nocookie.com/embed/example" title="Example" />
      </ExternalMediaEmbed>
    );

    expect(container.querySelector('iframe')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Load YouTube' }));
    expect(container.querySelector('iframe')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/example'
    );
  });
});
