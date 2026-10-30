// Overrides ("swizzles") one part of the OpenAPI theme's ResponseExamples
// component: the "Example (auto)" tab, which the theme makes up from the schema.
// Every example in the spec comes from a captured response, so a made-up one
// next to it would contradict the overview. Everything else is the original.
export * from '@theme-original/ResponseExamples';

export function ExampleFromSchema() {
  return null;
}
