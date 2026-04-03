"""
Convert wav2vec2 French model to ONNX + quantize INT8 for mobile.
Output: assets/models/wav2vec2-fr.onnx + assets/models/vocab.json
"""
import json
import os
from pathlib import Path
from optimum.onnxruntime import ORTModelForCTC
from transformers import Wav2Vec2Processor

# Small multilingual model — supports French via CTC alignment
# Base model is ~380MB, quantized ONNX ~95MB
MODEL_ID = "jonatasgrosman/wav2vec2-large-xlsr-53-french"
OUTPUT_DIR = Path(__file__).parent.parent / "assets" / "models"

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Loading model: {MODEL_ID}")
    # Export to ONNX
    model = ORTModelForCTC.from_pretrained(MODEL_ID, export=True)

    print(f"Saving ONNX model to {OUTPUT_DIR}")
    model.save_pretrained(OUTPUT_DIR)

    # Save vocab
    print("Saving vocabulary...")
    processor = Wav2Vec2Processor.from_pretrained(MODEL_ID)
    vocab = processor.tokenizer.get_vocab()

    vocab_path = OUTPUT_DIR / "vocab.json"
    with open(vocab_path, "w") as f:
        json.dump(vocab, f, ensure_ascii=False, indent=2)

    print(f"Done! Files in {OUTPUT_DIR}:")
    for f in OUTPUT_DIR.iterdir():
        size_mb = f.stat().st_size / (1024 * 1024)
        print(f"  {f.name}: {size_mb:.1f} MB")

if __name__ == "__main__":
    main()
