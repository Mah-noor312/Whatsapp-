const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function callWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err?.status === 503 || err?.response?.status === 503) {
        await sleep(2000 * (i + 1));
        continue;
      }
      throw err;
    }
  }
}

module.exports = {
  sleep,
  callWithRetry,
};
