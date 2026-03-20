/**
 * whatsapp-web.js RemoteAuth calls fs.promises.unlink on session zips without
 * handling ENOENT (e.g. race after compress, or container FS cleared). That
 * surfaces as: "ENOENT: no such file or directory, unlink '.../RemoteAuth-....zip'".
 * Patch the same fs-extra instance RemoteAuth uses (pnpm-nested) so ENOENT under
 * .wwebjs_auth is ignored.
 *
 * MUST be imported before `whatsapp-web.js` loads RemoteAuth.
 */
import { createRequire } from "node:module";
import { dirname } from "node:path";

const require = createRequire(import.meta.url);
const wwebRoot = dirname(require.resolve("whatsapp-web.js/package.json"));
const fsExtra = require(require.resolve("fs-extra", { paths: [wwebRoot] })) as {
  promises: { unlink: (path: string | Buffer | URL) => Promise<void> };
};

const origUnlink = fsExtra.promises.unlink.bind(fsExtra.promises);

fsExtra.promises.unlink = async (path: string | Buffer | URL) => {
  try {
    return await origUnlink(path);
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    const p = typeof path === "string" ? path : path instanceof Buffer ? path.toString("utf8") : String(path);
    if (e?.code === "ENOENT" && p.includes(".wwebjs_auth")) {
      return undefined;
    }
    throw err;
  }
};
