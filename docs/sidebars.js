// One sidebar. The reference part is generated from the spec by `npm run gen`:
// the overview, then one category per tag. The overview's main sections are
// listed under it as links to its headings, so readers can find authentication
// and errors from any page. If you rename one of those headings in the spec,
// change its link here; the build fails on a broken anchor. The pages written
// by hand, the quickstart and the guides, go between the overview and the
// categories. "Guides" and "Endpoints" headings separate the groups.
import reference from './content/reference/sidebar';

const [overview, ...tags] = reference;

const section = (label, anchor) => ({
  type: 'link',
  label,
  href: `/reference/weconect-api#${anchor}`,
});

// Styled by .sidebar-section-label in src/css/custom.css
const heading = (value) => ({
  type: 'html',
  value,
  className: 'sidebar-section-label',
  defaultStyle: true,
});

export default {
  docs: [
    {
      type: 'category',
      label: 'Introduction',
      link: { type: 'doc', id: overview.id },
      collapsible: false,
      items: [
        section('Authentication', 'authentication'),
        section('Errors', 'errors'),
        section('IDs', 'ids'),
      ],
    },
    'quickstart',
    // Plain headings, not categories, so the pages under them stay one level deep
    heading('Guides'),
    'guides/find-people-and-follow-them',
    'guides/show-a-feed-with-author-names',
    heading('Endpoints'),
    ...tags,
  ],
};
