import { Context } from "koa";

export default {
  async submit(ctx: Context) {
    ctx.body = {
      success: true,
      message: "Contact endpoint is working!",
    };
  },
};  
