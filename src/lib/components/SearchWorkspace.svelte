<script>
  import { createEventDispatcher } from 'svelte';
  import CIcon from '../icons/CIcon.svelte';
  import CButton from '../ui/CButton.svelte';
  import CCard from '../ui/CCard.svelte';
  import CTextBox from '../ui/CTextBox.svelte';
  import CBadge from '../ui/CBadge.svelte';

  export let searchQuery = '';
  export let searchResults = [];
  export let isSearching = false;

  const dispatch = createEventDispatcher();

  let searchPage = 1;
  const searchPageSize = 5;

  $: searchTotalPages = Math.ceil(searchResults.length / searchPageSize) || 1;
  $: {
    if (searchPage > searchTotalPages) searchPage = searchTotalPages;
    if (searchPage < 1) searchPage = 1;
  }
  $: paginatedSearchResults = searchResults.slice(
    (searchPage - 1) * searchPageSize,
    searchPage * searchPageSize,
  );
  $: if (searchQuery !== undefined) {
    searchPage = 1;
  }

  function handleSearch() {
    dispatch('search', { query: searchQuery });
  }

  function handleSelectExample(query) {
    searchQuery = query;
    dispatch('search', { query });
  }

  function handleViewDoc(docId) {
    dispatch('viewDocument', { docId });
  }
</script>

<div class="search-view">
  <div class="view-header">
    <div>
      <h2>Lazy Natural Language Search</h2>
      <p class="subtitle">
        Query documents using vague thoughts or natural language — Qdrant vector engine matches
        meaning
      </p>
    </div>
  </div>

  <div class="search-input-section">
    <CCard spacious={true}>
      <div class="flex flex-col md:flex-row gap-3 items-stretch">
        <div class="flex-1">
          <CTextBox
            type="text"
            placeholder="e.g. 'that contract with automatic renewal penalty' or 'TCS cloud invoice'"
            bind:value={searchQuery}
            on:keydown={(e) => e.key === 'Enter' && handleSearch()}
          >
            <svelte:fragment slot="leading">
              <CIcon name="search" size={18} />
            </svelte:fragment>
          </CTextBox>
        </div>
        <CButton variant="primary" loading={isSearching} on:click={handleSearch}>
          <CIcon name="search" size={16} />
          <span>{isSearching ? 'Matching Vectors...' : 'Find Documents'}</span>
        </CButton>
      </div>

      <div class="search-examples mt-4 flex flex-wrap items-center gap-2">
        <span class="text-xs font-semibold uppercase tracking-wider text-muted">Try asking:</span>
        <CButton
          variant="chip"
          size="sm"
          on:click={() => handleSelectExample('TCS cloud hosting invoice')}
        >
          "TCS cloud hosting invoice"
        </CButton>
        <CButton
          variant="chip"
          size="sm"
          on:click={() => handleSelectExample('agreement with 1 year automatic renewal')}
        >
          "agreement with 1 year automatic renewal"
        </CButton>
        <CButton
          variant="chip"
          size="sm"
          on:click={() => handleSelectExample('contracts with liquidated damages penalty')}
        >
          "liquidated damages penalty"
        </CButton>
      </div>
    </CCard>
  </div>

  <!-- Search Results List -->
  <div class="search-results-list mt-6">
    {#if searchResults.length === 0}
      <CCard spacious={true} class="text-center py-12">
        <div
          class="w-12 h-12 mx-auto mb-3 rounded-full bg-subtle flex items-center justify-center text-muted"
        >
          <CIcon name="search" size={24} />
        </div>
        <h4 class="text-base font-semibold text-main">No matches found yet</h4>
        <p class="text-sm text-muted mt-1 max-w-md mx-auto">
          Type a natural language query above to search through indexed semantic embeddings.
        </p>
      </CCard>
    {:else}
      <div class="results-meta mb-4 text-sm text-muted">
        Found <strong class="text-main">{searchResults.length}</strong> matching documents for query
        "<em class="text-main">{searchQuery}</em>":
      </div>

      <div class="search-results-scroll space-y-4">
        {#each paginatedSearchResults as item}
          <div
            role="button"
            tabindex="0"
            class="cursor-pointer"
            on:click={() => handleViewDoc(item.document_id || item.id)}
            on:keydown={(e) =>
              (e.key === 'Enter' || e.key === ' ') && handleViewDoc(item.document_id || item.id)}
          >
            <CCard interactive={true} spacious={true}>
              <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-7 h-7 rounded-md bg-subtle flex items-center justify-center text-muted"
                  >
                    <CIcon name="document" size={15} />
                  </div>
                  <h4 class="text-base font-semibold text-main font-serif">
                    {item.title || item.original_filename}
                  </h4>
                  <CBadge variant="indigo">{item.document_type || 'Document'}</CBadge>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-muted">Vector Similarity:</span>
                  <CBadge variant="emerald"
                    >{Math.round((item.similarity_score || 0.88) * 100)}% Match</CBadge
                  >
                </div>
              </div>

              <p class="text-sm text-muted leading-relaxed mb-3">
                {item.summary}
              </p>

              {#if item.highlighted_points && item.highlighted_points.length > 0}
                <div class="flex flex-wrap gap-1.5 mb-4">
                  {#each item.highlighted_points as pt}
                    <span
                      class="text-xs px-2.5 py-1 rounded bg-subtle text-muted border border-border"
                    >
                      • {pt}
                    </span>
                  {/each}
                </div>
              {/if}

              <div
                class="flex items-center justify-between pt-3 border-t border-border text-xs text-muted"
              >
                <span>Indexed: {item.uploaded_at || 'Recently'}</span>
                <CButton
                  variant="action"
                  size="sm"
                  on:click={() => handleViewDoc(item.document_id || item.id)}
                >
                  <span>Open Deep Dive Viewer →</span>
                </CButton>
              </div>
            </CCard>
          </div>
        {/each}
      </div>

      <!-- Pagination Bar -->
      <div class="pagination-bar standalone mt-4">
        <span class="pagination-info">
          Showing <strong
            >{(searchPage - 1) * searchPageSize + 1}–{Math.min(
              searchPage * searchPageSize,
              searchResults.length,
            )}</strong
          >
          of <strong>{searchResults.length}</strong> results
        </span>
        <div class="pagination-controls">
          <button
            type="button"
            class="pagination-btn"
            disabled={searchPage <= 1}
            on:click={() => searchPage--}
            aria-label="Previous Page"
          >
            &larr; Prev
          </button>
          <span class="pagination-page-indicator">
            Page <strong>{searchPage}</strong> of <strong>{searchTotalPages}</strong>
          </span>
          <button
            type="button"
            class="pagination-btn"
            disabled={searchPage >= searchTotalPages}
            on:click={() => searchPage++}
            aria-label="Next Page"
          >
            Next &rarr;
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .search-view {
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }

  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .view-header h2 {
    font-family: var(--font-heading);
    font-size: 1.6rem;
    font-weight: 600;
    color: var(--text-main);
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }

  .subtitle {
    color: var(--text-muted);
    font-size: 0.88rem;
  }

  .pagination-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 10px 16px;
    background: #14171d;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-size: 0.82rem;
    color: #9da2ab;
  }

  .pagination-info {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .pagination-info strong {
    color: var(--text-main);
    font-weight: 600;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pagination-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 5px 12px;
    font-size: 0.78rem;
    font-weight: 600;
    color: #f6f6f6;
    background: #161922;
    border: 1px solid #2b2e35;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s ease-in-out;
  }

  .pagination-btn:hover:not(:disabled) {
    background: #20242e;
    border-color: #f2b84b;
    color: #f2b84b;
  }

  .pagination-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pagination-page-indicator {
    font-size: 0.78rem;
    padding: 0 4px;
  }
</style>
