export default {
  routes: [
    {
      method: "GET",
      path: "/ping",
      handler: "ping.index",
      config: {
        auth: false, // no auth required
      },
    },
  ],
};
