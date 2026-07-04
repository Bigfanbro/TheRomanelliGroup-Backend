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

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.SPARK_API_KEY}`,
          Accept: "application/json"
        }
      });

     if (!response.ok) {
  const errorText = await response.text();

 
  throw new Error(`Spark API error ${response.status}: ${errorText}`);
}

      const data = await response.json();
      ctx.body = data;

    } catch (error) {
      console.error("❌ Spark listings error:", error.message);
      ctx.status = 500;
      ctx.body = { error: "Failed to fetch listings" };
    }
  },


  // features listing function
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
      .map(city => `City eq '${city}'`)
      .join(" or ");

    const propertyTypeFilter = [
      "Residential",
      "Residential Income",
      "Land",
      "Commercial Sale",
      "Farm",
      "Multi-Family",
    ]
      .map(type => `PropertyType eq '${type}'`)
      .join(" or ");

    const filter = `(${locationFilter}) and (${propertyTypeFilter})`;

    const url =
      `https://replication.sparkapi.com/Version/3/Reso/OData/Property` +
      `?$filter=${encodeURIComponent(filter)}` +
      `&$orderby=ModificationTimestamp desc` +
      `&$top=30` +
      `&$expand=Media`;

    const data: any = await strapi
  .service("api::property-listings.property-listings")
  .sparkFetch(url);

    const listings = data.value || [];

    // Quality Filter
    const qualityListings = listings.filter((property: any) => {

      return (

        property.StandardStatus === "Active" &&

        property.ListPrice &&
        property.ListPrice > 1000 &&

        property.Media &&
        property.Media.length > 0 &&
        property.Media[0]?.MediaURL &&

        property.PublicRemarks &&
        property.PublicRemarks.length > 80 &&

        property.BedroomsTotal &&
        property.BathroomsTotalInteger &&
        property.BuildingAreaTotal &&

        property.City &&
        allowedLocations.includes(property.City)

      );

    });

    // One listing per city
    const seenCities = new Set();

    const diverseListings = qualityListings.filter((property: any) => {

      if (seenCities.has(property.City)) {
        return false;
      }

      seenCities.add(property.City);

      return true;

    });

    // Newest first
    diverseListings.sort((a: any, b: any) =>

      new Date(b.ModificationTimestamp).getTime() -
      new Date(a.ModificationTimestamp).getTime()

    );

    // Return only 12
    const featuredListings = diverseListings.slice(0, 12);

featuredCache = featuredListings;
featuredCacheTime = Date.now();

console.log("🔥 Cached featured listings");

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
},

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

const response = await fetch(url, {
  headers: {
    Authorization: `Bearer ${process.env.SPARK_API_KEY}`,
    Accept: "application/json",
  },
});

if (!response.ok) {
  throw new Error(
    `Spark API error: ${response.status} ${response.statusText}`
  );
}

const data = (await response.json()) as any;

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
        // Remove redundant client-side filtering since it's already handled in OData query
        // The API already filters by bedrooms and bathrooms in the query construction above
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
    ctx.body = {
      message: "Related endpoint coming soon",
    };
  },
};
