import { HTTPServer } from "https://deno.land/x/rapid@v0.2.2/mod.ts";
import * as cryptoString from "https://deno.land/x/crypto_random_string@1.1.0/mod.ts";
import * as path from "https://deno.land/std@0.190.0/path/mod.ts";
import { fileExists } from "./fileUtils.ts";
import nanomatch from "npm:nanomatch";

const uploadFolder = "upload";

const webApp = new HTTPServer(false);

const getDirFiles = async (dir: string): Promise<Array<string>> => {
  const fileNames = new Array<string>();
  const files = Deno.readDir(path.join(Deno.cwd(), dir));
  for await (const file of files) {
    fileNames.push(file.name);
  }

  return fileNames;
};

webApp.get("/:fileHash", async (req, _rep) => {
  let file = req.pathParam("fileHash");
  const dirFiles = await getDirFiles(uploadFolder);
  const yes = nanomatch(dirFiles, `${file}.*`);
  if (yes.length > 0) file = yes[0];
  const filePath = path.join(Deno.cwd(), uploadFolder, file);
  const fileCheck = await fileExists(filePath);
  if (!fileCheck) return `file ${file} found!`;
  try {
    const fileContents = await Deno.open(filePath, { read: true });
    return fileContents.readable;
  } catch (err) {
    console.log(err);
    return "could not read file.";
  }
});

webApp.post("/sharex/upload", async (request, _reply) => {
  const fileBlob = await request.blob();
  if (fileBlob) {
    if (fileBlob.size > 104857600) return "file exceeded 100MB file size!";
    if (!fileBlob.type.includes("/")) {
      return `invalid filetype (${fileBlob.type})!`;
    }
    const fileArgs = fileBlob.type.split("/");
    const mediaType = fileArgs[0];
    const mediaEncoding = fileArgs[1];
    switch (mediaType) {
      case "text": {
        let randomStr = cryptoString.cryptoRandomString({ length: 16 });
        const fileUrl = `http://${request.header("host")}/${randomStr}`;
        while (
          await fileExists(
            path.join(Deno.cwd(), uploadFolder, `${randomStr}.txt`),
          )
        ) {
          console.log("file exists, generating new random string");
          randomStr = cryptoString.cryptoRandomString({ length: 16 });
        }
        const text = await fileBlob.text();
        console.log("writing data...");
        try {
          await Deno.writeTextFile(
            path.join(Deno.cwd(), uploadFolder, `${randomStr}.txt`),
            text,
          );
          console.log(`uploaded file ${randomStr}.txt`);
          return fileUrl;
        } catch (err) {
          console.log(err);
          return "error while processing file";
        }
      }
      case "video":
      case "image": {
        let randomStr = cryptoString.cryptoRandomString({ length: 16 });
        const fileUrl = `http://${request.header("host")}/${randomStr}`;
        //Avoid same file names, lmao
        while (
          await fileExists(
            path.join(
              Deno.cwd(),
              uploadFolder,
              `${randomStr}.${mediaEncoding}`,
            ),
          )
        ) {
          console.log("file exists, generating new random string");
          randomStr = cryptoString.cryptoRandomString({ length: 16 });
        }
        console.log("writing data...");
        try {
          await Deno.writeFile(
            path.join(
              Deno.cwd(),
              uploadFolder,
              `${randomStr}.${mediaEncoding}`,
            ),
            fileBlob.stream(),
          );
          console.log(`uploaded file ${randomStr}.${mediaEncoding}`);
          return {
            response: {
              url: fileUrl
            }
          };;
        } catch (err) {
          console.log(err);
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
});
