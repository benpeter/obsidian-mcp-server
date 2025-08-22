/**
 * @fileoverview Configures and exports a global fetch instance with custom SSL verification.
 * @module src/utils/internal/fetch
 */
import { Agent, setGlobalDispatcher } from "undici";
import { config } from "../../config/index.js";

const dispatcher = new Agent({
  connect: {
    rejectUnauthorized: config.obsidianVerifySsl,
  },
});

setGlobalDispatcher(dispatcher);
