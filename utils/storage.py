import os
import uuid
from fastapi import UploadFile, Request

UPLOAD_DIR = "static/profile_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class LocalStorageBackend:
    async def store_profile_image(self, file: UploadFile, request: Request) -> str:
        ext = os.path.splitext(file.filename or "")[1].lower()
        filename = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(UPLOAD_DIR, filename)

        contents = await file.read()
        with open(path, "wb") as f:
            f.write(contents)

        # Build full URL and return
        base_url = str(request.base_url).rstrip("/")
        return f"{base_url}/{UPLOAD_DIR}/{filename}"


def get_storage():
    return LocalStorageBackend()
