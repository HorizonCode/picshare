import { HTTPServer } from "https://deno.land/x/rapid@v0.2.2/mod.ts";
import * as cryptoString from "https://deno.land/x/crypto_random_string@1.1.0/mod.ts";
import * as path from "https://deno.land/std@0.190.0/path/mod.ts";
import { fileExists } from "./fileUtils.ts";

const webApp = new HTTPServer(false);

webApp.post("/sharex/upload", async (request, _reply) => {
  const fileBlob = await request.blob();
  if (fileBlob) {
    if (fileBlob.size > 104857600) return "file exceeded 100MB file size!";
    if (!fileBlob.type.includes("/")) return `invalid filetype (${fileBlob.type})!`;
    const fileArgs = fileBlob.type.split("/");
    const mediaType = fileArgs[0];
    const mediaEncoding = fileArgs[1];
    switch (mediaType) {
      case "text": {
        let randomStr = cryptoString.cryptoRandomString({ length: 16 });
        const fileUrl = `http://${request.header("host")}/data/${randomStr}.txt`;
        while (await fileExists(path.join(Deno.cwd(), "pub", `${randomStr}.txt`))) {
          console.log("file exists, generating new random string");
          randomStr = cryptoString.cryptoRandomString({ length: 16 });
        }
        const text = await fileBlob.text();
        console.log("writing data...");
        try {
          await Deno.writeTextFile(
            path.join(Deno.cwd(), "pub", `${randomStr}.txt`),
            text,
          );
          console.log(`uploaded file ${randomStr}.txt`)
          return fileUrl;
        } catch (err) {
          console.log(err)
          return "error while processing file";
        }
      }
      case "image": {
        let randomStr = cryptoString.cryptoRandomString({ length: 16 });
        const fileUrl = `http://${request.header("host")}/data/${randomStr}.${mediaEncoding}`;
        //Avoid same file names, lmao
        while (await fileExists(path.join(Deno.cwd(), "pub", `${randomStr}.${mediaEncoding}`))) {
          console.log("file exists, generating new random string");
          randomStr = cryptoString.cryptoRandomString({ length: 16 });
        }
        console.log("writing data...");
        try {
          await Deno.writeFile(
            path.join(Deno.cwd(), "pub", `${randomStr}.${mediaEncoding}`),
            fileBlob.stream(),
          );
          console.log(`uploaded file ${randomStr}.${mediaEncoding}`)
          return fileUrl;
        } catch (err) {
          console.log(err)
          return "error while processing file";
        }
      }
      default:
        return `invalid filetype(${fileBlob.type})!`;
    }

  }
  return "error";
});

webApp.listen({
  port: 8081,
  staticLocalDir: "/pub",
  staticServePath: "/data",
});
