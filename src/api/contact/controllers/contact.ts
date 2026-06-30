import { Context } from "koa";

export default {
  async submit(ctx: Context) {
    try {
      const {
  name,
  email,
  phone,
  reason,
  message,
  source,
  propertyAddress,
  listingKey,
  propertyUrl,
} = ctx.request.body as any;

      const response = await fetch("https://api.followupboss.com/v1/events", {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(process.env.FOLLOWUPBOSS_API_KEY + ":").toString("base64"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: source || "Website Contact Form",
          system: "The Romanelli Group Website",
          type: "General Inquiry",

        message: `
Reason: ${reason || "N/A"}

Message:
${message || "N/A"}

Property:
${propertyAddress || "N/A"}

Listing Key:
${listingKey || "N/A"}

Property URL:
${propertyUrl || "N/A"}
`,

          tags: [
            source || "Website",
            reason || "General Inquiry",
          ],

          person: {
            firstName: name?.split(" ")[0] || "",
            lastName: name?.split(" ").slice(1).join(" ") || "",

            emails: email
              ? [
                  {
                    value: email,
                  },
                ]
              : [],

            phones: phone
              ? [
                  {
                    value: phone,
                  },
                ]
              : [],
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        ctx.status = response.status;
        ctx.body = data;
        return;
      }

      ctx.body = {
        success: true,
        followUpBoss: data,
      };
    } catch (err: any) {
      console.error(err);

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: err.message,
      };
    }
  },
};