"""Stable product-level partitions shared by training and demo catalog export."""
import hashlib


def split_by_product(frame, seed=42):
    """Return disjoint train, evaluation, and catalog row frames by Clothing ID."""
    def partition(group):
        digest = hashlib.sha256(f"{seed}:{group}".encode("utf-8")).digest()
        fraction = int.from_bytes(digest[:8], "big") / 2**64
        if fraction < 0.70:
            return "train"
        if fraction < 0.85:
            return "evaluation"
        return "catalog"

    groups = frame["Clothing ID"].astype(str).map(partition)
    return tuple(
        frame.loc[groups == name].copy()
        for name in ("train", "evaluation", "catalog")
    )
