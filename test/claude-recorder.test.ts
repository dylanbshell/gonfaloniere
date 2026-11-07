// The native Claude API recorder (CC-20261107-05): what it sends, what it costs, how the record keeps it.

import assert from "node:assert/strict";
import { test } from "node:test";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_PRICES, callClaude, claudeCost, claudeRoute, describeClaudeRoute, isClaudeModel } from "../src/minigame/recorder.ts";

function fakeClient(sent: unknown[], reply: Partial<Anthropic.Message> = {}) {
  return {
    messages: {
      create: async (req: unknown) => {
        sent.push(req);
        return {
          model: "claude-haiku-5-5",
          stop_reason: "end_turn",
          content: [{ type: "text", text: '{"entries": []}' }],
          usage: { input_tokens: 100, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 900 },
          ...reply,
        };
      },
    },
  } as unknown as Pick<Anthropic, "messages">;
}

test("a Claude recorder sends a cached system message, no temperature, and thinking off its own way", async () => {
  for (const [model, thinking] of [
    ["claude-haiku-5-5", { type: "disabled" }],
    ["claude-sonnet-5-5", { type: "between_tools" }],
  ] as const) {
    const sent: Record<string, unknown>[] = [];
    const r = claudeRoute(`claude:${model}`, { client: fakeClient(sent as unknown[]) });
    const reply = await callClaude(r, "SYSTEM", "USER", 1800);
    assert.ok(reply.ok);
    const req = sent[0]!;
    assert.equal(req.model, model);
    assert.equal(req.max_tokens, 1800);
    assert.ok(!("temperature" in req), "no temperature");
    assert.deepEqual(req.thinking, thinking);
    assert.deepEqual(req.system, [{ type: "text", text: "SYSTEM", cache_control: { type: "ephemeral" } }]);
    assert.deepEqual(req.messages, [{ role: "user", content: "USER" }]);
  }
});

test("cost counts cache writes and reads at their own rates; usage and the reply's text come back", async () => {
  const r = claudeRoute("claude:claude-sonnet-5-5", { client: fakeClient([], { usage: { input_tokens: 100, output_tokens: 20, cache_creation_input_tokens: 1000, cache_read_input_tokens: 0 } as Anthropic.Usage }) });
  const reply = await callClaude(r, "S", "U", 100);
  assert.ok(reply.ok);
  assert.equal(reply.content, '{"entries": []}');
  assert.deepEqual(reply.usage, { input: 100, output: 20, cacheWrite: 1000, cacheRead: 0 });
  const p = CLAUDE_PRICES["claude-sonnet-5-5"]!;
  assert.equal(reply.costUsd, 100 * p.input + 20 * p.output + 1000 * p.cacheWrite);
  assert.ok(Math.abs(claudeCost(p, { input: 0, output: 0, cacheWrite: 0, cacheRead: 1e6 }) - 0.2) < 1e-12, "a million cached tokens read cost $0.20 on Sonnet 5.5");
});

test("an API error comes back as a failure with its status, for the replay to stop on", async () => {
  const client = {
    messages: {
      create: async () => {
        throw new Anthropic.APIError(403, { type: "error", error: { type: "permission_error", message: "no credit" } }, "no credit", new Headers());
      },
    },
  } as unknown as Pick<Anthropic, "messages">;
  const reply = await callClaude(claudeRoute("claude:claude-haiku-5-5", { client }), "S", "U", 10);
  assert.equal(reply.ok, false);
  assert.equal(!reply.ok && reply.status, 403);
});

test("the route is recorded with no key, temperature as the model default, and only the credit key is used", () => {
  process.env.ANTHROPIC_API_KEY = "must-not-be-used";
  const r = claudeRoute("claude:claude-haiku-5-5", { client: fakeClient([]) });
  assert.equal(process.env.ANTHROPIC_API_KEY, undefined, "dropped, never read");
  const d = describeClaudeRoute(r, "claude-haiku-5-5");
  assert.equal(d.temperature_sent, "model default (not sent)");
  assert.equal(d.endpoint, "Claude API (CLAUDE_CREDIT_API_KEY)");
  assert.ok(!JSON.stringify(d).includes("must-not-be-used"));
  assert.ok(isClaudeModel("claude:claude-sonnet-5-5") && !isClaudeModel("deepseek-v4.1-flash") && !isClaudeModel(undefined));
  assert.throws(() => claudeRoute("claude:claude-unknown-9", { client: fakeClient([]) }), /No price or thinking-off setting/);
});
