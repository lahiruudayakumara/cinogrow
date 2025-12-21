from pydantic import BaseModel
from typing import Any, Optional

class APIResponse(BaseModel):
    status: str
    message: Optional[str]
    data: Optional[Any]