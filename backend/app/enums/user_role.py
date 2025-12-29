import enum

class UserRole(str, enum.Enum):
    FARMER = "farmer"
    COMPANY = "company"
    ADMIN = "admin"