CINNAMON_CLASSES = [
    "Leaf Gall Louse",
    "Cinnamon Thrips",
    "Cinnamon Leaf Blight",
    "Cinnamon Die Back"
]

def is_cinnamon(labels):
    return any(label in CINNAMON_CLASSES for label in labels)