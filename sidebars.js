/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  userSidebar: [
    'introduction',
    'why-mcp-gateway',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started',
        'installation',
        'quick-start',
      ],
    },
    {
      type: 'category',
      label: 'Configuration',
      items: [
        'configuration',
        'configuration/gateway-config',
        'configuration/server-catalog',
        'configuration/runtimes',
        'configuration/authentication',
      ],
    },
    {
      type: 'category',
      label: 'Usage',
      items: [
        'usage/http-transport',
        'usage/stdio-transport',
        'usage/claude-desktop',
        'usage/hot-reload',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/docker',
        'deployment/kubernetes',
        'deployment/production',
      ],
    },
    'troubleshooting',
    'faq',
  ],
  developerSidebar: [
    'developer/overview',
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'developer/architecture',
        'developer/crate-structure',
        'developer/runtime-abstraction',
        'developer/lifecycle-management',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'developer/api-reference',
        'developer/api-endpoints',
        'developer/mcp-protocol',
      ],
    },
    {
      type: 'category',
      label: 'Extending',
      items: [
        'developer/custom-runtimes',
        'developer/middleware',
      ],
    },
    'developer/contributing',
    'developer/changelog',
    'roadmap',
  ],
};

export default sidebars;
