import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';

import CButton from '../CButton.svelte';
import CCard from '../CCard.svelte';
import CBadge from '../CBadge.svelte';
import CTabs from '../CTabs.svelte';
import CTextBox from '../CTextBox.svelte';
import CSelect from '../CSelect.svelte';
import CIcon from '../../icons/CIcon.svelte';

describe('UI Primitives Snapshot Tests', () => {
  describe('CButton', () => {
    it('matches snapshot for primary variant', () => {
      const { html } = render(CButton, { props: { variant: 'primary' } });
      expect(html).toMatchSnapshot();
    });

    it('matches snapshot for secondary variant', () => {
      const { html } = render(CButton, { props: { variant: 'secondary' } });
      expect(html).toMatchSnapshot();
    });

    it('matches snapshot for action variant', () => {
      const { html } = render(CButton, { props: { variant: 'action' } });
      expect(html).toMatchSnapshot();
    });

    it('matches snapshot for chip variant', () => {
      const { html } = render(CButton, { props: { variant: 'chip' } });
      expect(html).toMatchSnapshot();
    });

    it('matches snapshot for loading state', () => {
      const { html } = render(CButton, { props: { variant: 'primary', loading: true } });
      expect(html).toMatchSnapshot();
    });

    it('matches snapshot for disabled state', () => {
      const { html } = render(CButton, { props: { variant: 'secondary', disabled: true } });
      expect(html).toMatchSnapshot();
    });
  });

  describe('CCard', () => {
    it('matches snapshot for default spacious card', () => {
      const { html } = render(CCard, { props: { spacious: true, interactive: false } });
      expect(html).toMatchSnapshot();
    });

    it('matches snapshot for interactive card', () => {
      const { html } = render(CCard, { props: { spacious: true, interactive: true } });
      expect(html).toMatchSnapshot();
    });

    it('matches snapshot for subtle variant', () => {
      const { html } = render(CCard, { props: { variant: 'subtle', spacious: false } });
      expect(html).toMatchSnapshot();
    });
  });

  describe('CBadge', () => {
    it('matches snapshot for emerald badge', () => {
      const { html } = render(CBadge, { props: { variant: 'emerald' } });
      expect(html).toMatchSnapshot();
    });

    it('matches snapshot for indigo badge', () => {
      const { html } = render(CBadge, { props: { variant: 'indigo' } });
      expect(html).toMatchSnapshot();
    });

    it('matches snapshot for amber badge', () => {
      const { html } = render(CBadge, { props: { variant: 'amber' } });
      expect(html).toMatchSnapshot();
    });

    it('matches snapshot for rose badge', () => {
      const { html } = render(CBadge, { props: { variant: 'rose' } });
      expect(html).toMatchSnapshot();
    });
  });

  describe('CTabs', () => {
    it('matches snapshot with tabs and active selection', () => {
      const sampleTabs = [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'upload', label: 'Upload & Extract', icon: 'upload' },
        { id: 'search', label: 'Semantic Search', icon: 'search' },
        { id: 'privacy', label: 'Compliance & Audit', icon: 'shield', badge: 'SOC2' },
      ];
      const { html } = render(CTabs, {
        props: {
          tabs: sampleTabs,
          activeTab: 'dashboard',
        },
      });
      expect(html).toMatchSnapshot();
    });
  });

  describe('CTextBox', () => {
    it('matches snapshot with placeholder', () => {
      const { html } = render(CTextBox, {
        props: {
          placeholder: 'Search invoices...',
          value: '',
        },
      });
      expect(html).toMatchSnapshot();
    });

    it('matches snapshot with label and disabled state', () => {
      const { html } = render(CTextBox, {
        props: {
          label: 'Document ID',
          value: 'doc-12345',
          disabled: true,
        },
      });
      expect(html).toMatchSnapshot();
    });
  });

  describe('CIcon', () => {
    it('matches snapshot for vector icons', () => {
      const icons = ['document', 'lightning', 'building', 'shield', 'search'];
      for (const name of icons) {
        const { html } = render(CIcon, { props: { name, size: 20 } });
        expect(html).toMatchSnapshot();
      }
    });
  });
});
