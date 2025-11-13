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
      path: "/property-listings/filter",
      handler: "property-listings.filter",
      config: {
        auth: false,
      },
    },
  ],
};