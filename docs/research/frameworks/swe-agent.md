# SWE-agent

## 1. Snapshot

This snapshot fixes the source boundary used by every claim and count below.

| Field | Value |
| --- | --- |
| Repository | [`SWE-agent/SWE-agent`](https://github.com/SWE-agent/SWE-agent) |
| Pinned commit | [`3ea751c087f32b16e039a2233dd6eefecef325d5`](https://github.com/SWE-agent/SWE-agent/tree/3ea751c087f32b16e039a2233dd6eefecef325d5) |
| Date read | 2026-08-15 |
| Licence | MIT — [`LICENSE`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/LICENSE) |
| Languages | Python package with shell/Python tool bundles — [`pyproject.toml`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/pyproject.toml#L11-L62), [`tools/`](https://github.com/SWE-agent/SWE-agent/tree/3ea751c087f32b16e039a2233dd6eefecef325d5/tools) |
| Measured scale | 409 tracked files; 100 tracked `.py` files; 12,413 lines across those Python files |

**Measured 2026-08-15 at the pinned commit, in PowerShell:**

```powershell
(git ls-files | Measure-Object -Line).Lines
(git ls-files -- '*.py' | Measure-Object -Line).Lines
git ls-files -- '*.py' | ForEach-Object { (Get-Content -LiteralPath $_ | Measure-Object -Line).Lines } | Measure-Object -Sum
```

The first two commands prove the tracked-file and Python-file counts. The third produced 12,413;
it measures physical lines in every tracked Python file, including tests, not source-only or
logical LOC.

## 2. The core loop

The default loop is in
[`DefaultAgent.run`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L1265-L1294):
`setup` establishes the environment, tools, initial prompt history, and trajectory path; then
`run` calls `step` until `StepOutput.done` and writes the trajectory after each step
([`setup`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L561-L606)).

One turn is the following concrete path:

1. [`DefaultAgent.step`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L1235-L1263)
   sends the processed `messages` history to `forward_with_handling`.
2. [`DefaultAgent.forward`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L1006-L1060)
   queries the model, parses its response into thought and action through `ToolHandler`, then calls
   `handle_action`.
3. [`DefaultAgent.handle_action`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L936-L1004)
   blocks forbidden commands, handles the explicit `exit` action, sends the guarded command to the
   environment, captures observation and state, and detects retry, forfeit, or submission signals.
4. `step` appends the result to model history, updates exit/submission/model statistics, and appends
   a durable trajectory step. [`add_step_to_history`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L714-L746)
   gives empty and oversized observations explicit feedback shapes instead of passing raw output
   unchanged.

Errors remain part of the loop rather than bypassing it. `forward_with_handling` requeries format,
blocklist, content-policy, and shell-syntax failures, while cost, context, execution-time, repeated
timeout, environment, and API failures terminate through an attempted patch submission
([`forward_with_handling`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L1062-L1218)).
Executable tests exercise step-by-step history and the cost/context/format/blocklist exit statuses
([`tests/test_agent.py`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/tests/test_agent.py#L80-L194)).

## 3. State and persistence

The live agent keeps three distinct in-memory records: model-facing `history`, an append-only
`trajectory`, and summary `info`
([`DefaultAgent.__init__`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L443-L489)).
`messages` filters history to the named agent and applies configured history processors before a
model call; processing does not replace the stored history
([`messages`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L540-L554)).

The `.traj` file is the durable boundary. `get_trajectory_data` serializes trajectory, full history,
summary info, replay configuration, and environment name, and `save_trajectory` writes that JSON
after every completed step
([`get_trajectory_data` and `save_trajectory`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L762-L790),
[`run`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L1280-L1289)).

That durability is not checkpoint recovery. Batch mode skips a trajectory with a final exit status,
but deletes and reruns an empty, unreadable, `early_exit`, or status-less trajectory
([`RunBatch.should_skip`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/run/run_batch.py#L376-L409)).
Replay constructs a new run that reissues recorded actions; it does not restore the old process and
continue its model history from the crash point
([`run_replay.py`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/run/run_replay.py#L94-L171)).

**Bounded absence check, 2026-08-15.** `rg -n 'resume|checkpoint|restore|replay' sweagent tests docs`
found replay, repository reset, and batch skip/delete paths, but no live-agent resume or checkpoint
loader. This establishes absence only within those three tracked directories at the pinned commit.

## 4. Tools and the outside world

A tool bundle is a directory whose `config.yaml` is validated into named `Command` objects
([`Bundle`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/tools/bundle.py#L17-L58)).
Each command has a signature, documentation, and typed arguments; it can be rendered as a
function-calling schema
([`Command`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/tools/commands.py#L79-L166)).
`ToolConfig.commands` combines the built-in bash command with bundle commands and rejects duplicate
names, while `ToolConfig.tools` exposes their schemas
([`ToolConfig`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/tools/tools.py#L75-L223)).

At setup, `ToolHandler` uploads each bundle into the runtime, installs it, extends `PATH`, and checks
that each command exists
([`ToolHandler.install`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/tools/tools.py#L227-L313)).
At turn time, parsing is delegated to the configured parser, commands pass a blocklist, multiline
input is guarded, and execution crosses `SWEEnv.communicate`
([`ToolHandler`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/tools/tools.py#L337-L388),
[`SWEEnv.communicate`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/environment/swe_env.py#L197-L232)).

The isolation guarantee belongs below this repository: `SWEEnv` sends actions to a SWE-ReX
deployment/runtime, and `pyproject.toml` declares `swe-rex>=1.4.0`
([`swe_env.py`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/environment/swe_env.py#L197-L224),
[`pyproject.toml`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/pyproject.toml#L41-L61)).
This extraction therefore establishes the boundary to the sandbox, not SWE-ReX's containment
properties.

Submission is also a tool protocol. The default configuration loads `review_on_submit_m`; its
`submit` command first writes `/root/model.patch` and emits review feedback, and only a later stage
prints the sentinel that `handle_submission` treats as terminal
([`config/default.yaml`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/config/default.yaml#L33-L68),
[`tools/review_on_submit_m/bin/submit`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/tools/review_on_submit_m/bin/submit#L13-L47),
[`handle_submission`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L870-L905)).

## 5. Composition

The default architecture constructs one named agent around one model and later attaches one
environment during setup
([`DefaultAgent`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L443-L489),
[`setup`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L561-L606)).
**Bounded absence check, 2026-08-15.** `rg -n 'subagent|sub-agent|handoff|delegate' sweagent` found no
agent-to-agent delegation primitive in the live package at the pinned commit.

Composition exists one level above the turn as retry-and-select. `RetryAgent` creates a fresh
`DefaultAgent` for an attempt, hard-resets the environment between attempts, records each attempt,
and asks a score or chooser loop whether to retry and which result to retain
([`RetryAgent._setup_agent` and `_next_attempt`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L303-L325),
[`RetryAgent.run`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L390-L440)).
The boundary is therefore sequential attempts plus reviewer state, not peers sharing control of one
trajectory.

## 6. The human in the loop

`DefaultAgent` has no per-action approval step in the traced loop. The explicit intervention mode is
the separate `ShellAgent`: `Ctrl+C` swaps the model for `HumanModel`, `Ctrl+D` restores the original
model, and an AI-generated terminal result is handed to the human for final submission
([`ShellAgent`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/extra/shell_agent.py#L13-L101)).
`HumanModel` reads actions from the terminal, including multiline commands, and returns them through
the same model-response interface
([`HumanModel`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/models.py#L344-L444)).

Because takeover still runs `step`, human actions and observations enter the same history and
trajectory as model actions
([`ShellAgent.run`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/extra/shell_agent.py#L59-L101),
[`DefaultAgent.step`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L1235-L1263)).
The durable record identifies the action, observation, and agent name, but the inspected types carry
no separate approval decision or approver identity
([`types.py`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/types.py#L13-L79)).

## 7. The abstraction bargain

**Opinion.** I think SWE-agent's strongest abstraction is the agent-computer interface, not the
`while` loop. The loop is small; most of the mechanism is spent making tools typed, installable and
visible, shaping empty/truncated observations, rejecting unsafe interaction shapes, and turning
submission into an explicit sentinel protocol. The premises are the tool and history paths traced
in sections 2 and 4.

**Opinion.** I would treat `.traj` as an audit and replay artifact, not as durable execution. Saving
after every step is valuable, but batch mode's response to an incomplete artifact is deletion and a
fresh run. Calling that “resume” would erase the most important persistence boundary found in
section 3.

**Opinion.** I think retry-and-select is deliberately cheaper than multi-agent collaboration: each
attempt owns a normal trajectory and the meta-layer shares only the problem, reset environment,
budget, submissions, and reviewer result. That makes the cost legible, but it cannot express agents
cooperating inside one turn.

## 8. What rungs takes

These verdicts are inputs to WI-017; they do not change the catalogue here.

| Pattern id | Verdict | Pinned evidence | Reason |
| --- | --- | --- | --- |
| `narrowest-anchor-loop` | take | [`config/default.yaml`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/config/default.yaml#L8-L31) | **Opinion.** I read the default “find/read → reproduce → edit → rerun” instruction as independent architecture-level support for the existing workflow pattern. |
| `prompt-writes-artifact` | take | [`DefaultAgent.run`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L1265-L1294) | **Opinion.** I would strengthen the catalogue's durable-output rationale with a system that writes the full trajectory after every step, not only at successful completion. |
| `session-handoff` | take-as-warning | [`get_trajectory_data`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L762-L790), [`RunBatch.should_skip`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/run/run_batch.py#L376-L409) | **Opinion.** I take the counter-example: a detailed durable log still is not a resumable handoff when incomplete work is discarded and restarted. |
| `candidate: agent-facing-interface` | take | [`Command.get_function_calling_tool`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/tools/commands.py#L133-L166), [`add_step_to_history`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L714-L746) | **Opinion.** I think tools, errors, empty output, truncation, and state should be designed as one agent-facing interface; the existing catalogue has no definition for that boundary. |
| `candidate: bounded-agent-loop` | take | [`forward_with_handling`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/agent/agents.py#L1062-L1218), [`ToolConfig`](https://github.com/SWE-agent/SWE-agent/blob/3ea751c087f32b16e039a2233dd6eefecef325d5/sweagent/tools/tools.py#L75-L155) | **Opinion.** I would extract the explicit cost, context, wall-time, consecutive-timeout, and format-retry limits as one termination-budget pattern rather than leave “until done” unbounded. |
