"""Export the held-out Clothing ID groups as the review-only demo catalog."""
import json
import os
from pathlib import Path

import pandas as pd

from dataset_splits import split_by_product

HERE = Path(__file__).resolve().parent
CSV_PATH = Path(os.getenv("SENTIMENT_TRAINING_CSV", HERE / "../../data/Womens Clothing E-Commerce Reviews.csv")).resolve()
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "demo_catalog.json"


def clean(value):
    return None if pd.isna(value) else value


def main():
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"Place the Kaggle CC0 CSV at {CSV_PATH} or set SENTIMENT_TRAINING_CSV.")
    frame = pd.read_csv(CSV_PATH).dropna(subset=["Clothing ID", "Rating", "Review Text"])
    frame["Review Text"] = frame["Review Text"].astype(str).str.strip()
    frame = frame[frame["Review Text"].str.len().between(1, 10000)]
    train, evaluation, catalog = split_by_product(frame)
    products = []
    for clothing_id, rows in catalog.groupby("Clothing ID", sort=True):
        rows = rows.sort_values("Unnamed: 0") if "Unnamed: 0" in rows else rows
        first = rows.iloc[0]
        class_name = clean(first.get("Class Name")) or "Clothing item"
        department = clean(first.get("Department Name")) or "Clothing"
        reviews = []
        for _, row in rows.iterrows():
            text = clean(row["Review Text"])
            if clean(row.get("Title")):
                text = f"{str(row['Title']).strip()} — {text}"
            reviews.append({
                "id": f"dataset-{int(row.get('Unnamed: 0', row.name))}",
                "text": text,
                "rating": int(row["Rating"]),
                "verified": False,
                "source": "Women’s Clothing E-Commerce Reviews dataset",
            })
        products.append({
            "id": f"clothing-{int(clothing_id)}",
            "title": f"{class_name} · Item {int(clothing_id)}",
            "brand": department,
            "description": f"Dataset category: {department} / {class_name}",
            "category": department,
            "tags": [str(class_name), str(department)],
            "image": "/clothing-placeholder.svg",
            "reviews": reviews,
            "datasetSplit": "catalog_holdout",
        })
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(products, ensure_ascii=False), encoding="utf-8")
    print(f"Exported {len(products)} held-out products and {sum(len(p['reviews']) for p in products)} reviews.")
    print(f"Product-disjoint rows: train={len(train)}, evaluation={len(evaluation)}, catalog={len(catalog)}")


if __name__ == "__main__":
    main()
