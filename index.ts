import { HTTPServer } from "https://deno.land/x/rapid@v0.2.2/mod.ts";
import * as cryptoString from "https://deno.land/x/crypto_random_string@1.1.0/mod.ts";
import * as path from "https://deno.land/std@0.190.0/path/mod.ts";
import { fileExists } from "./fileUtils.ts";

const webApp = new HTTPServer(false);

webApp.post("/sharex/upload", async (request, _reply) => {
  let randomStr = cryptoString.cryptoRandomString({ length: 16 });
  const fileUrl = `http://${request.header("host")}/i/${randomStr}.png`;
  const fileBlob = await request.blob();
  if (fileBlob.size > 104857600) return "file exceeded 100MB file size!";
  if (!fileBlob.type.includes("/")) return "invalid filetype!";
  const fileArgs = fileBlob.type.split("/");
  const mediaType = fileArgs[0];
  if (mediaType != "image") return "invalid filetype!";
  const mediaEncoding = fileArgs[1];
  if (fileBlob) {
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
    } catch (_err) {
      return "error while processing file";
    }
  }
  return "error";
});

webApp.listen({
  port: 8081,
  staticLocalDir: "/pub",
  staticServePath: "/i",
});
