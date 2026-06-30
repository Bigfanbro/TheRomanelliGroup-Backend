import { Context } from "koa";

export default {
  async submit(ctx: Context) {
    try {
      const { name, email, reason, message, source } = ctx.request.body as any;

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
          message: `Reason: ${reason}\n\n${message}`,
          person: {
            firstName: name?.split(" ")[0] || "",
            lastName: name?.split(" ").slice(1).join(" ") || "",
            emails: [
              {
                value: email,
              },
            ],
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