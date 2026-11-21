// One sidebar. The reference part is generated from the spec by `npm run gen`:
// the overview, then one category per tag. The quickstart, which is written by
// hand, goes between the overview and the categories.
import reference from './content/reference/sidebar';

const [overview, ...tags] = reference;

export default {
  docs: [overview, 'quickstart', ...tags],
};
