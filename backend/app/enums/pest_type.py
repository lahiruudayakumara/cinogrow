from enum import Enum

class PestType(str, Enum):
    INSECT = "Insect"
    FUNGAL = "Fungal"
    VIRAL = "Viral"
    BACTERIAL = "Bacterial"