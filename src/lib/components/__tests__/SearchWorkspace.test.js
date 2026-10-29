import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import SearchWorkspace from '../SearchWorkspace.svelte';

describe('SearchWorkspace Component', () => {
  it('renders search input, examples, and empty state when no results', () => {
    const { html } = render(SearchWorkspace, {
      props: {
        searchQuery: '',
        searchResults: [],
        isSearching: false,
      },
    });

    expect(html).toContain('Lazy Natural Language Search');
    expect(html).toContain('Find Documents');
    expect(html).toContain('No matches found yet');
    expect(html).toContain('TCS cloud hosting invoice');
  });

  it('renders matching document results when results are passed', () => {
    const { html } = render(SearchWorkspace, {
      props: {
        searchQuery: 'cloud invoice',
        searchResults: [
          {
            id: '1',
            title: 'TCS Cloud Invoice Q4',
            document_type: 'Invoice',
            similarity_score: 0.94,
            summary: 'Summary of quarterly cloud fees',
            uploaded_at: '2026-10-29',
          },
        ],
        isSearching: false,
      },
    });

    expect(html).toContain('TCS Cloud Invoice Q4');
    expect(html).toContain('94% Match');
    expect(html).toContain('Open Deep Dive Viewer →');
  });
});
