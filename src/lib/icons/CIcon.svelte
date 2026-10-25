<script>
  export let name = ''; // icon name
  export let src = ''; // optional custom image / Canva asset URL
  export let size = 18; // size in px
  export let className = ''; // custom class
  export let color = 'currentColor'; // stroke/fill color
</script>

{#if src}
  <!-- Custom Asset / Canva Graphic Slot -->
  <img
    {src}
    alt={name || 'Icon'}
    width={size}
    height={size}
    class="inline-block object-contain align-middle {className}"
    loading="lazy"
  />
{:else if name === 'document' || name === 'file'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
{:else if name === 'lightning' || name === 'bolt'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
{:else if name === 'building' || name === 'enterprise'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <line x1="8" y1="6" x2="8.01" y2="6" />
    <line x1="12" y1="6" x2="12.01" y2="6" />
    <line x1="16" y1="6" x2="16.01" y2="6" />
    <line x1="8" y1="10" x2="8.01" y2="10" />
    <line x1="12" y1="10" x2="12.01" y2="10" />
    <line x1="16" y1="10" x2="16.01" y2="10" />
    <line x1="8" y1="14" x2="8.01" y2="14" />
    <line x1="12" y1="14" x2="12.01" y2="14" />
    <line x1="16" y1="14" x2="16.01" y2="14" />
  </svg>
{:else if name === 'shield' || name === 'lock' || name === 'security'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
{:else if name === 'compliance' || name === 'shield-check'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
{:else if name === 'search'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
{:else if name === 'upload'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
{:else if name === 'compare' || name === 'diff'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <path d="M16 3h5v5" />
    <path d="M8 21H3v-5" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </svg>
{:else if name === 'eye' || name === 'view'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
{:else if name === 'trash' || name === 'delete'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
{:else if name === 'copy' || name === 'clipboard'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
{:else if name === 'check'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
{:else if name === 'refresh'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
{:else if name === 'close' || name === 'cross'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
{:else if name === 'sparkle' || name === 'ai'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <path
      d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
    />
  </svg>
{:else if name === 'dashboard'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
{:else if name === 'chevron-left'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
{:else if name === 'chevron-right'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
{:else if name === 'plus'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
{:else if name === 'minus'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
{:else if name === 'warning' || name === 'alert' || name === 'alert-triangle'}
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0 align-middle {className}"
  >
    <path
      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
    />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
{:else}
  <slot />
{/if}
