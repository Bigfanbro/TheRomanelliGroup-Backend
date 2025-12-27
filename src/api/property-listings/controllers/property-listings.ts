import { Context } from "koa";

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
        throw new Error(`Spark API error ${response.status}`);
      }

      const data = await response.json();
      ctx.body = data;

    } catch (error) {
      console.error("❌ Spark listings error:", error.message);
      ctx.status = 500;
      ctx.body = { error: "Failed to fetch listings" };
    }
  },

  async filter(ctx: Context) {
    try {
      const { city,         // "Dublin"
      state,        // "OH"
      country, min, max, bedrooms, bathrooms, property, listingType, Bedrooms, Bathrooms , street,         // NEW
      streetNumber,   // NEW
      postalCode,     // NEW
      zip,            // alias
      address     ,sqftMin, sqftMax , unparsedAddress    } = ctx.query;
      // Use the correct parameter names (handle both cases)
      const bedroomParam = bedrooms || Bedrooms;
      const bathroomParam = bathrooms || Bathrooms;
      const zipParam = postalCode || zip;

      let baseUrl = `https://replication.sparkapi.com/Version/3/Reso/OData/Property?$orderby=ModificationTimestamp desc&$top=300&$expand=Media`;
      let filters = [];

      if (city) {
        const cityName = decodeURIComponent(city as string).replace(/'/g, "''");
        filters.push(`(startswith(City, '${cityName}') or startswith(City, '${cityName.toUpperCase()}') or City eq '${cityName}')`);
      }
      if (state) filters.push(`StateOrProvince eq '${decodeURIComponent(state as string).replace(/'/g, "''")}'`);
      if (country) filters.push(`Country eq '${decodeURIComponent(country as string).replace(/'/g, "''")}'`);

      if( unparsedAddress) {
        const addr = decodeURIComponent(unparsedAddress as string).replace(/'/g, "''");
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

      if (min && max) {
        filters.push(`ListPrice ge ${min} and ListPrice le ${max}`);
      } else if (min) {
        filters.push(`ListPrice ge ${min}`);
      } else if (max) {
        filters.push(`ListPrice le ${max}`);
      }
      // SqFt filtering
if (sqftMin && sqftMax) {
  filters.push(`BuildingAreaTotal ge ${sqftMin} and BuildingAreaTotal le ${sqftMax}`);
} else if (sqftMin) {
  filters.push(`BuildingAreaTotal ge ${sqftMin}`);
} else if (sqftMax) {
  filters.push(`BuildingAreaTotal le ${sqftMax}`);
}


      if (bedroomParam) {
        filters.push(`BedroomsTotal eq ${bedroomParam}`);
      }

      if (bathroomParam) {
        filters.push(`BathroomsTotalInteger eq ${bathroomParam}`);
      }
       // 1) Street name partial
    if (street) {
      filters.push(`startswith(StreetName, '${street}')`);
    }

    // 2) Street number (safe cast because many MLS store it as numeric)
    if (streetNumber) {
      filters.push(`startswith(StreetNumber, '${streetNumber}')`);
    }

    // 3) PostalCode / ZIP
    if (zipParam) {
      filters.push(`startswith(PostalCode, '${zipParam}')`);
    }

    // 4) Full "address" search (safe: Spark allows startswith(), NOT contains)
    if (address) {
      const a = address;
      filters.push(
        `(startswith(StreetName, '${a}') or ` +
        `startswith(cast(StreetNumber, 'Edm.String'), '${a}') or ` +
        `startswith(StreetDirPrefix, '${a}') or ` +
        `startswith(StreetSuffix, '${a}') or ` +
        `startswith(UnparsedAddress, '${a}') or ` +
        `startswith(PostalCode, '${a}'))`
      );
    }

      let url = baseUrl;
      if (filters.length > 0) {
        const filterString = filters.join(' and ');
        url += `&$filter=${encodeURIComponent(filterString)}`;
      }
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${process.env.SPARK_API_KEY}`,
          "Accept": "application/json",
        },
      });
      

      if (!response.ok) {
        throw new Error(`Spark API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      // Log sample locations to see what's available
      if (data.value?.length > 0) {
        const sampleLocations = data.value.slice(0, 5).map(item => ({
          city: item.City,
          state: item.StateOrProvince,
          country: item.Country
        }));
      }
      
      if (data.value) {
        
        if (bedroomParam) {
          const bedroomNum = parseInt(bedroomParam as string);
          data.value = data.value.filter((item: any) => item.BedroomsTotal === bedroomNum);
        }
        
        if (bathroomParam) {
          const bathroomNum = parseInt(bathroomParam as string);
          data.value = data.value.filter((item: any) => item.BathroomsTotalInteger === bathroomNum);
        }
      }
      
      ctx.body = data;

    } catch (err) {
      console.error("❌ Error:", err.message);
      ctx.status = 500;
      ctx.body = { error: "Failed to fetch from Spark API", details: err.message };
    }
  },
};