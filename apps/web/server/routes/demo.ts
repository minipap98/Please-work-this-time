import { RequestHandler } from "express";
import type { DemoResponse } from "../../../../packages/shared/src/api.js";

export const handleDemo: RequestHandler = (_req, res) => {
  const response: DemoResponse = {
    message: "Hello from Express server",
  };
  res.status(200).json(response);
};
