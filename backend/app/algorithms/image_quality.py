import cv2
import numpy as np

def is_image_good(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.Laplacian(gray, cv2.CV_64F).var()
    brightness = np.mean(gray)

    return blur > 80 and 40 < brightness < 220