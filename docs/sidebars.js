// One sidebar. The reference part is generated from the spec by `npm run gen`:
// the overview, then one category per tag. The overview's main sections are
// listed under it as links to its headings, so readers can find authentication
// and errors from any page. If you rename one of those headings in the spec,
// change its link here; the build fails on a broken anchor. The quickstart,
// which is written by hand, goes between the overview and the categories, and
// an "Endpoints" heading separates the categories from the pages above them.
import reference from './content/reference/sidebar';

const [overview, ...tags] = reference;

const section = (label, anchor) => ({
  type: 'link',
  label,
  href: `/reference/weconect-api#${anchor}`,
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
    // A plain heading, not a category, so the tags stay one level deep
    {
      type: 'html',
      value: 'Endpoints',
      className: 'sidebar-section-label',
      defaultStyle: true,
    },
    ...tags,
  ],
};
