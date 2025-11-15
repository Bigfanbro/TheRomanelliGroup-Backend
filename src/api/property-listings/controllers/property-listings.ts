import { Context } from "koa";

export default {
  async listings(ctx: Context) {
    try {
      const response = await fetch(`https://replication.sparkapi.com/Version/3/Reso/OData/Property?$filter=PropertyType eq 'Residential' or PropertyType eq 'Residential Income' or PropertyType eq 'Land' or PropertyType eq 'Commercial Sale' or PropertyType eq 'Farm' or PropertyType eq 'Multi-Family'&$orderby=ModificationTimestamp desc&$top=18&$expand=Media`, {
        headers: {
          Authorization: `Bearer ${process.env.SPARK_API_KEY}`,
        },
      });
      const data = await response.json();
      ctx.body = data;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: "Failed to fetch listings" };
    }
  },

  async filter(ctx: Context) {
    try {
      const { city, min, max, bedrooms, bathrooms, property, listingType } = ctx.query;

      let baseUrl = `https://replication.sparkapi.com/Version/3/Reso/OData/Property?$orderby=ModificationTimestamp%20desc&$top=100&$expand=Media`;
      let filters = [];

      if (city) {
        filters.push(`City eq '${encodeURIComponent(city as string)}'`);
      }

      if (property) {
        filters.push(`PropertyType eq '${encodeURIComponent(property as string)}'`);
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

      if (bedrooms) {
        filters.push(`BedroomsTotal eq ${bedrooms}`);
      }

      if (bathrooms) {
        filters.push(`BathroomsTotalInteger eq ${bathrooms}`);
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

      const data = await response.json();
      ctx.body = data;

    } catch (err) {
      console.error("❌ Error:", err.message);
      ctx.status = 500;
      ctx.body = { error: "Failed to fetch from Spark API", details: err.message };
    }
  },
};