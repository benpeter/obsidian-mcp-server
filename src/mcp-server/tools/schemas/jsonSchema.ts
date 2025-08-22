/**
 * @fileoverview Defines a self-referencing Zod schema for validating JSON-compatible values.
 * @module src/mcp-server/tools/schemas/jsonSchema
 */

import { z } from "zod";

/**
 * @description
 * Defines a self-referencing Zod schema for validating JSON-compatible values.
 * This is necessary because standard JSON can have nested structures (objects within objects, arrays of objects, etc.),
 * and `z.any()` is too permissive for strict type validation required by some systems.
 *
 * - `type JsonValue`: A TypeScript type alias that mirrors the structure of a JSON value. It can be a primitive
 *   (string, number, boolean, null, undefined) or a recursive structure (an object with string keys and JsonValue values,
 *   or an array of JsonValues).
 *
 * - `const JsonValueSchema`: The Zod schema implementation.
 *   - `z.lazy()`: This is the key to handling recursion. Zod schemas are typically defined statically, but for a type
 *     that refers to itself (like a nested JSON object), we need to defer its definition. `z.lazy()` allows the
 *     schema to be evaluated at runtime, breaking the infinite loop that would otherwise occur.
 *   - `z.union([...])`: Defines that a valid `JsonValue` can be one of several types.
 *   - `z.record(z.string(), z.lazy(() => JsonValueSchema))`: This defines an object with string keys and values that
 *     must also conform to the `JsonValueSchema`. Another `z.lazy()` is used here for the recursive definition.
 *   - `z.array(z.lazy(() => JsonValueSchema))`: This defines an array where each element must also conform to the
 *     `JsonValueSchema`, again using `z.lazy()` for recursion.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [x: string]: JsonValue }
  | Array<JsonValue>;

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.undefined(),
    z.record(
      z.string(),
      z.lazy(() => JsonValueSchema),
    ),
    z.array(z.lazy(() => JsonValueSchema)),
  ]),
);
