import { Context } from "koa";
let featuredCache: any[] | null = null;
let featuredCacheTime = 0;

const FEATURED_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
export default {
 async listings(ctx: Context) {
    try {
      const allowedLocations = [
        "Westerville",
        "Dublin",
        "Powell",
        "Gahanna",
        "New Albany",
        "Galena",
        "Sunbury",
        "Upper Arlington",
        "Worthington",
        "Bexley",
        "Hilliard",
        "Short North",
        "German Village",
        "Merion Village",
        "Clintonville"
      ];

      const locationFilter = allowedLocations
        .map(city => `City eq '${city}'`)
        .join(" or ");

      const propertyTypeFilter = [
        "Residential",
        "Residential Income",
        "Land",
        "Commercial Sale",
        "Farm",
        "Multi-Family"
      ].map(type => `PropertyType eq '${type}'`).join(" or ");

      const filter = `(${locationFilter}) and (${propertyTypeFilter})`;

      const url =
        `https://replication.sparkapi.com/Version/3/Reso/OData/Property` +
        `?$filter=${encodeURIComponent(filter)}` +
        `&$orderby=ModificationTimestamp desc` +
        `&$top=30` +
        `&$expand=Media`;

     const data = await strapi
  .service("api::property-listings.property-listings")
  .sparkFetch(url);

ctx.body = data;
      ctx.body = data;

    } catch (error) {
      console.error("❌ Spark listings error:", error.message);
      ctx.status = 500;
      ctx.body = { error: "Failed to fetch listings" };
    }
  },


  // Featured Listings
async featured(ctx: Context) {
  try {
    const now = Date.now();

    if (
      featuredCache &&
      now - featuredCacheTime < FEATURED_CACHE_DURATION
    ) {
      console.log("✅ Returning featured listings from cache");

      ctx.body = {
        value: featuredCache,
      };

      return;
    }

    const ROMANELLI_AGENTS = [
      "Antonio Romanelli",
      "Cristina Romanelli",
      "Crystianna Rana",
      "Miranda Sutton",
      "Siobhan Blake",
    ];

    const allowedLocations = [
      "Westerville",
      "Dublin",
      "Powell",
      "Gahanna",
      "New Albany",
      "Galena",
      "Sunbury",
      "Upper Arlington",
      "Worthington",
      "Bexley",
      "Hilliard",
      "Short North",
      "German Village",
      "Merion Village",
      "Clintonville",
    ];

    const locationFilter = allowedLocations
      .map((city) => `City eq '${city}'`)
      .join(" or ");

    const propertyTypeFilter = [
      "Residential",
      "Residential Income",
      "Land",
      "Commercial Sale",
      "Farm",
      "Multi-Family",
    ]
      .map((type) => `PropertyType eq '${type}'`)
      .join(" or ");

    const filter = `(${locationFilter}) and (${propertyTypeFilter})`;

    const selectFields = [
      "ListingKey",
      "ListPrice",
      "BedroomsTotal",
      "BathroomsTotalInteger",
      "BuildingAreaTotal",
      "UnparsedAddress",
      "StreetNumber",
      "StreetName",
      "City",
      "StateOrProvince",
      "StandardStatus",
      "ModificationTimestamp",
      "PublicRemarks",
      "ListOfficeName",
      "ListAgentFirstName",
      "ListAgentLastName",
    ].join(",");

    const url =
      `https://replication.sparkapi.com/Version/3/Reso/OData/Property` +
      `?$select=${selectFields}` +
      `&$filter=${encodeURIComponent(filter)}` +
      `&$orderby=ModificationTimestamp desc` +
      `&$top=50` +
      `&$expand=Media`;

    const data: any = await strapi
      .service("api::property-listings.property-listings")
      .sparkFetch(url);

    const listings = data.value || [];

    // Only active listings with at least one image
    const qualityListings = listings.filter(
      (property: any) =>
        property.StandardStatus === "Active" &&
        property.Media?.length > 0 &&
        property.Media[0]?.MediaURL
    );

    // Sort newest first
    const sortNewest = (a: any, b: any) =>
      new Date(b.ModificationTimestamp).getTime() -
      new Date(a.ModificationTimestamp).getTime();

    // Romanelli Team Listings
    const romanelliListings = qualityListings
      .filter((property: any) => {
        const fullName =
          `${property.ListAgentFirstName || ""} ${property.ListAgentLastName || ""}`.trim();

        return ROMANELLI_AGENTS.includes(fullName);
      })
      .map((property: any) => ({
        ...property,
        badge: "The Romanelli Group Exclusive",
      }))
      .sort(sortNewest);

    // Keller Williams Listings (excluding Romanelli team)
    const kwListings = qualityListings
      .filter((property: any) => {
        const office =
          property.ListOfficeName?.toLowerCase() || "";

        const fullName =
          `${property.ListAgentFirstName || ""} ${property.ListAgentLastName || ""}`.trim();

        return (
          office.includes("keller williams greater cols") &&
          !ROMANELLI_AGENTS.includes(fullName)
        );
      })
      .map((property: any) => ({
        ...property,
        badge: "Keller Williams Listing",
      }))
      .sort(sortNewest);

    // Everyone else
    const otherListings = qualityListings
      .filter((property: any) => {
        const office =
          property.ListOfficeName?.toLowerCase() || "";

        const fullName =
          `${property.ListAgentFirstName || ""} ${property.ListAgentLastName || ""}`.trim();

        return (
          !office.includes("keller williams greater cols") &&
          !ROMANELLI_AGENTS.includes(fullName)
        );
      })
      .sort(sortNewest);

    // Merge in priority order
    const featuredListings = [
      ...romanelliListings,
      ...kwListings,
      ...otherListings,
    ].slice(0, 15);

    featuredCache = featuredListings;
    featuredCacheTime = Date.now();

    console.log(
      `⭐ Featured: ${romanelliListings.length} Romanelli | ${kwListings.length} KW | ${otherListings.length} Others`
    );

    ctx.body = {
      value: featuredListings,
    };
  } catch (error: any) {
    console.error("Featured listings error:", error.message);

    ctx.status = 500;

    ctx.body = {
      error: "Failed to fetch featured listings",
    };
  }
}

  async filter(ctx: Context) {
    try {
      // Validate API key
      if (!process.env.SPARK_API_KEY) {
        throw new Error('SPARK_API_KEY environment variable is not configured');
      }

      const {
        city,
        state,
        country,
        min,
        max,
        bedrooms,
        bathrooms,
        property,
        listingType,
        Bedrooms,
        Bathrooms,
        street,
        streetNumber,
        postalCode,
        zip,
        address,
        sqftMin,
        sqftMax,
        unparsedAddress
      } = ctx.query;

      // Sanitize function for OData values
      const sanitizeODataValue = (value: string): string => {
        return value
          .replace(/'/g, "''")
          .replace(/[()]/g, '') // Remove parentheses
          .replace(/\s+(and|or)\s+/gi, ' ') // Remove SQL operators
          .trim();
      };
      // Use the correct parameter names (handle both cases)
      const bedroomParam = bedrooms || Bedrooms;
      const bathroomParam = bathrooms || Bathrooms;
      const zipParam = postalCode || zip;

      let baseUrl = `https://replication.sparkapi.com/Version/3/Reso/OData/Property?$orderby=ModificationTimestamp desc&$top=300&$expand=Media`;
      let filters = [];

      if (city) {
        const cityName = sanitizeODataValue(decodeURIComponent(city as string));
        filters.push(`(startswith(City, '${cityName}') or startswith(City, '${cityName.toUpperCase()}') or City eq '${cityName}')`);
      }
      if (state) {
        const stateName = sanitizeODataValue(decodeURIComponent(state as string));
        filters.push(`StateOrProvince eq '${stateName}'`);
      }
      if (country) {
        const countryName = sanitizeODataValue(decodeURIComponent(country as string));
        filters.push(`Country eq '${countryName}'`);
      }

      if (unparsedAddress) {
        const addr = sanitizeODataValue(decodeURIComponent(unparsedAddress as string));
        filters.push(`startswith(UnparsedAddress, '${addr}')`);
      }
      if (property) {
        filters.push(`PropertyType eq '${decodeURIComponent(property as string).replace(/'/g, "''")}'`);
      } else if (listingType) {
        let typeFilters = [];
        if (listingType === "Buy") {
          typeFilters = [
            "Residential",
            "Residential Income", 
            "Land",
            "Commercial Sale",
            "Farm",
            "Multi-Family",
          ].map(type => `PropertyType eq '${type}'`);
        } else if (listingType === "Rent") {
          typeFilters = [
            "Residential Lease",
            "Commercial Lease",
          ].map(type => `PropertyType eq '${type}'`);
        }
        if (typeFilters.length > 0) {
          filters.push(`(${typeFilters.join(' or ')})`);
        }
      }

      // Sanitize numeric parameters
      if (min && /^\d+(\.\d+)?$/.test(min as string)) {
        filters.push(`ListPrice ge ${min}`);
      }
      if (max && /^\d+(\.\d+)?$/.test(max as string)) {
        filters.push(`ListPrice le ${max}`);
      }
      if (sqftMin && /^\d+(\.\d+)?$/.test(sqftMin as string)) {
        filters.push(`BuildingAreaTotal ge ${sqftMin}`);
      }
      if (sqftMax && /^\d+(\.\d+)?$/.test(sqftMax as string)) {
        filters.push(`BuildingAreaTotal le ${sqftMax}`);
      }
      if (bedroomParam && /^\d+$/.test(bedroomParam as string)) {
        filters.push(`BedroomsTotal eq ${bedroomParam}`);
      }
      if (bathroomParam && /^\d+$/.test(bathroomParam as string)) {
  const bath = Number(bathroomParam);

  if (bath >= 5) {
    filters.push(`BathroomsTotalDecimal ge ${bath}`);
  } else {
    filters.push(
      `(BathroomsTotalDecimal ge ${bath} and BathroomsTotalDecimal lt ${bath + 1})`
    );
  }
}
      if (street) {
        const streetName = sanitizeODataValue(decodeURIComponent(street as string));
        filters.push(`startswith(StreetName, '${streetName}')`);
      }

      if (streetNumber) {
        const streetNum = sanitizeODataValue(decodeURIComponent(streetNumber as string));
        filters.push(`startswith(StreetNumber, '${streetNum}')`);
      }

      if (zipParam) {
        const zip = sanitizeODataValue(decodeURIComponent(zipParam as string));
        filters.push(`startswith(PostalCode, '${zip}')`);
      }

      if (address) {
        const addr = sanitizeODataValue(decodeURIComponent(address as string));
        filters.push(
          `(startswith(StreetName, '${addr}') or ` +
          `startswith(cast(StreetNumber, 'Edm.String'), '${addr}') or ` +
          `startswith(StreetDirPrefix, '${addr}') or ` +
          `startswith(StreetSuffix, '${addr}') or ` +
          `startswith(UnparsedAddress, '${addr}') or ` +
          `startswith(PostalCode, '${addr}'))`
        );
      }
let url = baseUrl;

if (filters.length > 0) {
  const filterString = filters.join(" and ");
  url += `&$filter=${encodeURIComponent(filterString)}`;
}

const data: any = await strapi
  .service("api::property-listings.property-listings")
  .sparkFetch(url);

ctx.body = data;
      // Log sample locations to see what's available
      if (data.value?.length > 0) {
        const sampleLocations = data.value.slice(0, 5).map(item => ({
          city: item.City,
          state: item.StateOrProvince,
          country: item.Country
        }));
      }
      
      if (data.value) {
        
      }
      
      ctx.body = data;

    } catch (err) {
      console.error("❌ Error:", err.message);
      ctx.status = 500;
      ctx.body = { error: "Failed to fetch from Spark API", details: err.message };
    }
  },

  async property(ctx: Context) {
    try {
      const { ListingKey } = ctx.query;

      if (!ListingKey) {
        ctx.status = 400;
        ctx.body = {
          error: "ListingKey is required"
        };
        return;
      }
      
const filter = `ListingKey eq '${ListingKey}'`;

const url =
  `https://replication.sparkapi.com/Version/3/Reso/OData/Property` +
  `?$filter=${encodeURIComponent(filter)}` +
  `&$expand=Media`;

const data = await strapi
  .service("api::property-listings.property-listings")
  .sparkFetch(url);

      ctx.body = data;

    } catch (err) {
      console.error("❌ Property error:", err.message);

      ctx.status = 500;
      ctx.body = {
        error: "Failed to fetch property",
        details: err.message
      };
    }
  },
   async related(ctx: Context) {
  try {
    const { ListingKey } = ctx.query;

    if (!ListingKey) {
      ctx.status = 400;
      ctx.body = {
        error: "ListingKey is required",
      };
      return;
    }

    // Fetch current property first
    const currentFilter = `ListingKey eq '${ListingKey}'`;

    const currentUrl =
      `https://replication.sparkapi.com/Version/3/Reso/OData/Property` +
      `?$filter=${encodeURIComponent(currentFilter)}`;

    const currentData: any = await strapi
      .service("api::property-listings.property-listings")
      .sparkFetch(currentUrl);

    const current = currentData.value?.[0];

    if (!current) {
      ctx.status = 404;
      ctx.body = {
        error: "Property not found",
      };
      return;
    }

    const minPrice = Math.round(current.ListPrice * 0.8);
const maxPrice = Math.round(current.ListPrice * 1.2);
const minBedrooms = Math.max((current.BedroomsTotal || 1) - 1, 1);
const maxBedrooms = (current.BedroomsTotal || 1) + 1;

const relatedFilter = [
  `ListingKey ne '${current.ListingKey}'`,
  `StandardStatus eq 'Active'`,
  `City eq '${current.City}'`,
  `PropertyType eq '${current.PropertyType}'`,
  `BedroomsTotal ge ${minBedrooms}`,
  `BedroomsTotal le ${maxBedrooms}`,
  `ListPrice ge ${minPrice}`,
  `ListPrice le ${maxPrice}`,
].join(" and ");

const relatedUrl =
  `https://replication.sparkapi.com/Version/3/Reso/OData/Property` +
  `?$filter=${encodeURIComponent(relatedFilter)}` +
  `&$expand=Media` +
  `&$top=6`;

const relatedData: any = await strapi
  .service("api::property-listings.property-listings")
  .sparkFetch(relatedUrl);

ctx.body = relatedData.value.map((item: any) => ({
  ListingKey: item.ListingKey,
  ListPrice: item.ListPrice,
  BedroomsTotal: item.BedroomsTotal,
  BathroomsTotalInteger: item.BathroomsTotalInteger,
  BuildingAreaTotal: item.BuildingAreaTotal,
  UnparsedAddress: item.UnparsedAddress,
  City: item.City,
  StateOrProvince: item.StateOrProvince,
  StandardStatus: item.StandardStatus,
  PropertyType: item.PropertyType,
  PropertySubType: item.PropertySubType,
  PhotosCount: item.PhotosCount,
  Media: item.Media?.slice(0, 1),
}));

  } catch (err: any) {
    console.error("❌ Related error:", err.message);

    ctx.status = 500;
    ctx.body = {
      error: "Failed to fetch related properties",
      details: err.message,
    };
  }
},
};
