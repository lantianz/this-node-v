import { mount } from '@vue/test-utils';
import { NCard, NTag } from 'naive-ui';
import { describe, expect, it } from 'vitest';
import ToolchainCard from '../../webview/src/components/ToolchainCard.vue';

describe('ToolchainCard', () => {
  it('renders pinned and active versions', () => {
    const wrapper = mount(ToolchainCard, {
      global: {
        components: {
          NCard,
          NTag
        }
      },
      props: {
        tool: {
          key: 'node',
          label: 'Node.js',
          pinnedVersion: '20.12.2',
          expectedVersion: null,
          activeVersion: 'v20.12.2',
          activePath: '/usr/local/bin/node',
          source: 'volta',
          status: 'ready'
        }
      }
    });

    expect(wrapper.text()).toContain('Node.js');
    expect(wrapper.text()).toContain('20.12.2');
    expect(wrapper.text()).toContain('v20.12.2');
    expect(wrapper.text()).toContain('就绪');
  });
});
