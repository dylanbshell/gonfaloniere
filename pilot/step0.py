"""Step-0 baseline checkpoint for the Capitulation Pilot (Models & Research v0.15).

A fresh LoRA adapter starts with its output weights at zero, so its sampler
checkpoint behaves exactly like the stock model, served the same way the
trained adapter will be. Evaluating it gives a stock baseline that differs
from the trained one only in the training.

    op run --env-file=.env -- pilot/.venv/bin/python pilot/step0.py

Prints the tinker:// sampler path (not a secret). Never prints the API key.
"""

import json
import sys

import tinker

BASE_MODEL = "Qwen/Qwen3.8-27B"
LORA_RANK = 32  # the rank Phase B will train at, so the step-0 adapter matches its shape
CHECKPOINTS = "pilot/checkpoints.json"


def main() -> None:
    service = tinker.ServiceClient()  # reads TINKER_API_KEY from the environment
    training = service.create_lora_training_client(base_model=BASE_MODEL, rank=LORA_RANK, seed=1492)
    saved = training.save_weights_for_sampler(name="step0").result()
    # The harness reads sampler paths from here (probe.config.ts, tinkerCheckpoint).
    try:
        with open(CHECKPOINTS) as f:
            checkpoints = json.load(f)
    except FileNotFoundError:
        checkpoints = {}
    checkpoints["step0"] = saved.path
    with open(CHECKPOINTS, "w") as f:
        json.dump(checkpoints, f, indent=2)
    print(json.dumps({"base_model": BASE_MODEL, "lora_rank": LORA_RANK, "sampler_path": saved.path}))


if __name__ == "__main__":
    try:
        main()
    except tinker.TinkerError as e:
        print(f"Tinker error: {e}", file=sys.stderr)
        sys.exit(1)
