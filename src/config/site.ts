/**
 * Central branding. Rename the product by editing this file only: every page
 * title, email, footer and social preview reads from here.
 */
export const siteConfig = {
  name: "CampusConnect",
  fullName: "CampusConnect Pakistan",
  shortDescription: "University events, competitions and volunteering across Pakistan.",
  description:
    "Discover hackathons, competitions, workshops, festivals and volunteer roles at universities across Pakistan, and run your society's events in one place.",
  locale: "en-PK",
  defaultTimeZone: "Asia/Karachi",
  defaultCurrency: "PKR",
  contactEmail: "hello@campusconnect.example",
  safetyEmail: "trust@campusconnect.example",
  links: {
    github: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
