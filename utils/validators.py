from fastapi import UploadFile, HTTPException
from typing import Iterable, List, Optional

ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png", "image/webp"}


def validate_image_upload(file: UploadFile) -> None:
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No image provided")
    if file.content_type not in ALLOWED_IMAGE_MIME:
        raise HTTPException(status_code=415, detail=f"Unsupported image type: {file.content_type}")


def normalize_string_list(items: Optional[Iterable[str]]) -> List[str]:
    if not items:
        return []
    return [str(x).strip() for x in items if x and str(x).strip()]
