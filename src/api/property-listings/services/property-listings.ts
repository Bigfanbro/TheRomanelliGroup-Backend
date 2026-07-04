export default {
  async sparkFetch(url: string) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.SPARK_API_KEY}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  },
};