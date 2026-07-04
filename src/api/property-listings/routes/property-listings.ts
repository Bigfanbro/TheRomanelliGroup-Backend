export default {
  routes: [
    {
      method: "GET",
      path: "/property-listings/listings",
      handler: "property-listings.listings",
      config: {
        auth: false,
      },
    },

    {
      method: "GET",
      path: "/property-listings/featured",
      handler: "property-listings.featured",
      config: {
        auth: false,
      },
    },

    {
      method: "GET",
      path: "/property-listings/filter",
      handler: "property-listings.filter",
      config: {
        auth: false,
      },
    },

    {
      method: "GET",
      path: "/property-listings/property",
      handler: "property-listings.property",
      config: {
        auth: false,
      },
    },

    // NEW ROUTE
    {
      method: "GET",
      path: "/property-listings/related",
      handler: "property-listings.related",
      config: {
        auth: false,
      },
    },
  ],
};