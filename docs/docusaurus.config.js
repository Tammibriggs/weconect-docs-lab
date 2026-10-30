// @ts-check
// The weConect API docs site. `npm run gen` builds the reference pages from the
// public spec (../openapi/weconect-public.yaml) into content/reference/, and
// copies the spec to static/ so the site serves it for download. `npm start`
// and `npm run build` run it first, so the pages always match the spec.

const repo = 'https://github.com/Tammibriggs/weconect-docs-lab';

/** @type {import('@docusaurus/types').Config} */
export default {
  title: 'weConect API',
  tagline: 'Profiles, follows, posts, and timelines for the weConect social app',
  // Netlify sets URL to the site's address during a build
  url: process.env.URL || 'http://localhost:3000',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  markdown: { hooks: { onBrokenMarkdownLinks: 'throw' } },
  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          // Pages live in content/, not docs/, because this folder is already docs/
          path: 'content',
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          // Renders the generated reference pages, and plain pages as usual
          docItemComponent: '@theme/ApiItem',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      }),
    ],
  ],

  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'openapi',
        docsPluginId: 'classic',
        config: {
          weconect: {
            specPath: '../openapi/weconect-public.yaml',
            outputDir: 'content/reference',
            downloadUrl: '/weconect-public.yaml',
            // The API isn't deployed, so there's nothing for "Send API Request" to
            // reach. Turn it back on when the sandbox exists.
            hideSendButton: true,
            sidebarOptions: { groupPathsBy: 'tag', categoryLinkSource: 'tag' },
          },
        },
      },
    ],
  ],
  themes: ['docusaurus-theme-openapi-docs'],

  themeConfig: {
    navbar: {
      title: 'weConect API',
      items: [{ href: repo, label: 'GitHub', position: 'right' }],
    },
    colorMode: { respectPrefersColorScheme: true },
    // Code samples on each endpoint page, in this order; curl opens first
    languageTabs: [
      { highlight: 'bash', language: 'curl', logoClass: 'curl' },
      { highlight: 'python', language: 'python', logoClass: 'python', variant: 'Requests' },
      { highlight: 'javascript', language: 'javascript', logoClass: 'javascript', variant: 'Fetch' },
    ],
    prism: { additionalLanguages: ['bash', 'json', 'http'] },
  },
};
