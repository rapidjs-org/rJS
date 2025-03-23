import { request as requestHttp } from "http";
import { request as requestHttps } from "https";

import { setup } from "../../setup/serve.setup.js";

await setup();

function fetch(options) {
  const optionsWithDefaults = {
    protocol: "http:",
    hostname: "localhost",
    
    ...options
  };

  return new Promise((resolve, reject) => {
    ((optionsWithDefaults.protocol === "http:")
        ? requestHttp
        : requestHttps
    )(optionsWithDefaults, res => {
      const body = [];
      res.on("data", chunk => {
        body.push(chunk);
      });
      res.on("end", () => {
        resolve({
          ...res,

          body: body.join("")
        })
      });
      res.on("error", reject);
    })
    .on("error", reject)
    .end();
  });
}

new UnitTest("http.serve adapter")
  .actual(async () => {
    const res = await fetch({
      pathname: "/foo",
      port: 7777
    });
    return res.statusCode;
  })
  .expect(500);
