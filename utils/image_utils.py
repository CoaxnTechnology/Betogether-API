BASE_URL = "http://31.97.231.30/"  # change when deployed

def get_full_image_url(image_path: str) -> str:
    if not image_path:
        return ""
    normalized_path = image_path.replace("\\", "/")
    if normalized_path.startswith("http"):
        return normalized_path
    return BASE_URL + normalized_path