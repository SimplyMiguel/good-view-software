/**
 * Single source of truth for site details.
 *
 * Set `email` once business email is ready. While it is `null`, the contact
 * section shows the "Project inquiries opening soon" notice instead of a
 * button, so nothing on the page is broken or fake.
 */
export const site = {
  name: "Good View Software",
  operator: "Good View Ventures LLC",
  location: "Bakersfield, California",
  email: null as string | null,
  inquiriesNote: "Project inquiries opening soon",
};
