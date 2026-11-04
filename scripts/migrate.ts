import { migrate } from "../lib/migrate";
import { db } from "../lib/db";

migrate()
  .then(() => console.log("Tayyor"))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db().end());
