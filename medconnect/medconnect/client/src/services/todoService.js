import { client } from "../utils/clientUtils";

export const getTodos = async () => {
  return await client.get("/todos");
};
