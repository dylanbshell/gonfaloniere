"""Capitulation Pilot, Phase B: DPO on Tinker (Models & Research v0.17).

Trains a LoRA adapter on Qwen3.8-27B from results/pilot/pairs.jsonl (stock
Qwen's leaks rejected, GPT-5.4's listener-checked holds chosen; Dylan, Oct 23),
one epoch, in the same prompt format the pairs were sampled in (TD v0.4 system
+ user, rendered as qwen3_8_disable_thinking). Then registers the final sampler
checkpoint in pilot/checkpoints.json and downloads the adapter to
pilot/adapters/<name>/ (gitignored).

    set -a; . ./.env; set +a
    pilot/.venv/bin/python pilot/train_dpo.py --name dpo1

Never prints the API key.
"""

import argparse
import json
import logging
import sys
import urllib.request
from pathlib import Path

import tinker
from tinker_cookbook import checkpoint_utils
from tinker_cookbook.preference import train_dpo
from tinker_cookbook.preference.dpo_datasets import DPODatasetBuilderFromComparisons
from tinker_cookbook.preference.preference_datasets import ComparisonBuilderFromJsonl
from tinker_cookbook.supervised.types import ChatDatasetBuilderCommonConfig

BASE_MODEL = "Qwen/Qwen3.8-27B"
RENDERER = "qwen3_8_disable_thinking"  # the harness's Tinker render (probe.config.ts)
LORA_RANK = 32  # same shape as the step-0 adapter
PAIRS = Path("results/pilot/pairs.jsonl")
CHECKPOINTS = Path("pilot/checkpoints.json")


def write_comparisons(out: Path) -> int:
    """pairs.jsonl → the cookbook's LabeledComparison JSONL (chosen is A)."""
    rows = [json.loads(line) for line in PAIRS.read_text().splitlines() if line.strip()]
    with out.open("w") as f:
        for p in rows:
            prompt = [{"role": "system", "content": p["system"]}, {"role": "user", "content": p["user"]}]
            comparison = {
                "prompt_conversation": prompt,
                "completion_A": [{"role": "assistant", "content": p["chosen"]}],
                "completion_B": [{"role": "assistant", "content": p["rejected"]}],
            }
            f.write(json.dumps({"comparison": comparison, "label": "A"}) + "\n")
    return len(rows)


def download_adapter(service: tinker.ServiceClient, state_path: str, name: str) -> Path:
    """Export the trained weights in external (HF/PEFT) format and download every file."""
    training = service.create_training_client_from_state(state_path)
    saved = training.save_weights_external(name=name).result()
    urls = service.create_rest_client().get_external_weights_urls(saved.path).result().urls
    dest = Path("pilot/adapters") / name
    dest.mkdir(parents=True, exist_ok=True)
    for rel, url in urls.items():
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, target)
    return dest


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", default="dpo1")
    ap.add_argument("--learning-rate", type=float, default=1e-5)  # the cookbook DPO recipe's default
    ap.add_argument("--beta", type=float, default=0.1)
    ap.add_argument("--batch-size", type=int, default=4)  # pairs per step: 84 pairs is 21 steps
    args = ap.parse_args()

    log_path = Path("pilot/runs") / args.name
    log_path.mkdir(parents=True, exist_ok=True)
    data = log_path / "comparisons.jsonl"
    n = write_comparisons(data)
    print(f"{n} pairs → {data}")

    config = train_dpo.Config(
        log_path=str(log_path),
        model_name=BASE_MODEL,
        recipe_name="gonfaloniere-capitulation-pilot",
        renderer_name=RENDERER,
        dataset_builder=DPODatasetBuilderFromComparisons(
            comparison_builder=ComparisonBuilderFromJsonl(train_path=str(data)),
            common_config=ChatDatasetBuilderCommonConfig(
                model_name_for_tokenizer=BASE_MODEL,
                renderer_name=RENDERER,
                max_length=8192,
                batch_size=args.batch_size,
            ),
        ),
        learning_rate=args.learning_rate,
        num_epochs=1,  # a second epoch only on Dylan's approval
        dpo_beta=args.beta,
        lora_rank=LORA_RANK,
        save_every=0,
        eval_every=0,
        infrequent_eval_every=0,
        ttl_seconds=None,
    )
    train_dpo.main(config)

    final = checkpoint_utils.get_last_checkpoint(str(log_path), required_key="sampler_path")
    if final is None or not final.sampler_path or not final.state_path:
        sys.exit("No final checkpoint recorded")
    checkpoints = json.loads(CHECKPOINTS.read_text()) if CHECKPOINTS.exists() else {}
    checkpoints[args.name] = final.sampler_path
    CHECKPOINTS.write_text(json.dumps(checkpoints, indent=2) + "\n")

    service = tinker.ServiceClient()
    dest = download_adapter(service, final.state_path, args.name)
    print(json.dumps({"name": args.name, "sampler_path": final.sampler_path, "adapter": str(dest)}))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    try:
        main()
    except tinker.TinkerError as e:
        print(f"Tinker error: {e}", file=sys.stderr)
        sys.exit(1)
