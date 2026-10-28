export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      fetch(`${env.API_URL}/health`).then((r) => console.log(`ping ${r.status}`), (e) => console.log(`ping failed: ${e}`)),
    );
  },
};
