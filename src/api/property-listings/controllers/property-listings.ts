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
      const { city,         // "Dublin"
      state,        // "OH"
      country, min, max, bedrooms, bathrooms, property, listingType, Bedrooms, Bathrooms } = ctx.query;
      // Use the correct parameter names (handle both cases)
      const bedroomParam = bedrooms || Bedrooms;
      const bathroomParam = bathrooms || Bathrooms;

      let baseUrl = `https://replication.sparkapi.com/Version/3/Reso/OData/Property?$orderby=ModificationTimestamp desc&$top=300&$expand=Media`;
      let filters = [];

      if (city) filters.push(`City eq '${city}'`);
      if (state) filters.push(`StateOrProvince eq '${state}'`);
      if (country) filters.push(`Country eq '${country}'`);


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

      if (bedroomParam) {
        filters.push(`BedroomsTotal eq ${bedroomParam}`);
      }

      if (bathroomParam) {
        filters.push(`BathroomsTotalInteger eq ${bathroomParam}`);
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