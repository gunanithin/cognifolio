import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import App from '../App.svelte';

describe('App root component', () => {
  it('renders root layout and portal without SSR crashes', () => {
    const { html } = render(App);
    expect(html).toContain('Cognifolio');
    expect(html).toContain('Terms');
  });
});
