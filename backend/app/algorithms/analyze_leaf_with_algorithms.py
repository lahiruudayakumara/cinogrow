"""
Basic CV algorithms to heuristically detect cinnamon leaf issues as a fallback
to Roboflow. Keeps output compatible with router expectations.
"""
from typing import List, Dict, Any, Tuple
from PIL import Image
import numpy as np
import cv2


def _pil_to_bgr(image: Image.Image) -> np.ndarray:
    arr = np.array(image.convert("RGB"))
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def _yellow_index(hsv: np.ndarray) -> float:
    # Yellow approx: H in [20, 35] degrees mapped to [10, 30] in OpenCV (0-179)
    h, s, v = cv2.split(hsv)
    mask = (h >= 10) & (h <= 30) & (s > 60) & (v > 80)
    return float(np.count_nonzero(mask)) / float(h.size)


def _edges_density(gray: np.ndarray) -> float:
    edges = cv2.Canny(gray, 100, 200)
    return float(np.count_nonzero(edges)) / float(edges.size)


def _blob_count(gray: np.ndarray) -> int:
    # Simple blob detection for galls-like spots
    params = cv2.SimpleBlobDetector_Params()
    params.filterByArea = True
    params.minArea = 15
    params.maxArea = 2000
    params.filterByCircularity = True
    params.minCircularity = 0.6
    params.filterByConvexity = False
    params.filterByInertia = False
    detector = cv2.SimpleBlobDetector_create(params)
    keypoints = detector.detect(gray)
    return len(keypoints)


def analyze_leaf_with_algorithms(image: Image.Image) -> List[Dict[str, Any]]:
    """
    Returns a list of pseudo-predictions: [{class, confidence, bbox(optional)}]
    """
    bgr = _pil_to_bgr(image)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

    y_idx = _yellow_index(hsv)           # chlorosis proxy
    e_den = _edges_density(gray)         # thin serpentine mines proxy
    blobs = _blob_count(gray)            # gall-like blobs proxy

    preds: List[Dict[str, Any]] = []

    # Heuristic rules with soft confidences
    if e_den > 0.08:
        conf = min(0.4 + (e_den - 0.08) * 3.0, 0.9)
        # Map to DISEASE_MAP slug for leaf spot like symptoms
        preds.append({"class": "leaf-spot-high-stage", "confidence": float(conf)})

    if blobs >= 8 or (blobs >= 4 and y_idx > 0.06):
        conf = min(0.45 + 0.04 * blobs + (y_idx * 0.5), 0.9)
        preds.append({"class": "leaf-gall-louse", "confidence": float(conf)})

    # If strong yellowing with few edges/blobs, consider healthy or nutrient-related; for pests return low conf
    if y_idx < 0.03 and e_den < 0.03 and blobs <= 2:
        preds.append({"class": "healthy", "confidence": 0.6})

    # Ensure at least one output
    if not preds:
        preds.append({"class": "healthy", "confidence": 0.5})

    # Sort descending by confidence
    preds.sort(key=lambda p: p.get("confidence", 0.0), reverse=True)
    return preds
