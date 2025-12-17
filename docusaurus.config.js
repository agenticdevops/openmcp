// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Open MCP Gateway',
  tagline: 'Vendor-neutral MCP server orchestration for the modern AI stack',
  favicon: 'img/favicon.ico',

  url: 'https://openmcp.aof.sh',
  baseUrl: '/',

  organizationName: 'agenticdevops',
  projectName: 'openmcp',

  // GitHub Pages deployment settings
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/agenticdevops/openmcp/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/og-image.png',
      navbar: {
        title: 'Open MCP Gateway',
        logo: {
          alt: 'Open MCP Gateway Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'userSidebar',
            position: 'left',
            label: 'User Guide',
          },
          {
            type: 'docSidebar',
            sidebarId: 'developerSidebar',
            position: 'left',
            label: 'Developer Docs',
          },
          {
            to: '/docs/why-mcp-gateway',
            label: 'Why MCP Gateway?',
            position: 'left',
          },
          {
            href: 'https://github.com/agenticdevops/openmcp',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/getting-started',
              },
              {
                label: 'Configuration',
                to: '/docs/configuration',
              },
              {
                label: 'API Reference',
                to: '/docs/developer/api-reference',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub Discussions',
                href: 'https://github.com/agenticdevops/openmcp/discussions',
              },
              {
                label: 'Issues',
                href: 'https://github.com/agenticdevops/openmcp/issues',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/agenticdevops/openmcp',
              },
              {
                label: 'Releases',
                href: 'https://github.com/agenticdevops/openmcp/releases',
              },
              {
                label: 'Roadmap',
                to: '/docs/roadmap',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Open MCP Gateway. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'yaml', 'rust', 'json'],
      },
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
    }),
};

export default config;
