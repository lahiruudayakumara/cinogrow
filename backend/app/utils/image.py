import cv2
import numpy as np
import io
from PIL import Image, UnidentifiedImageError

def load_image(file_bytes: bytes):
    """Load image bytes into an OpenCV BGR ndarray.

    Raises ValueError with a user-friendly message when the bytes are empty or invalid.
    """
    if not file_bytes:
        raise ValueError("Empty file uploaded")

    try:
        img = Image.open(io.BytesIO(file_bytes))
        img = img.convert("RGB")
    except UnidentifiedImageError:
        raise ValueError("Unsupported or corrupted image format")
    except OSError:
        raise ValueError("Invalid image data")

    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)