from pydantic import BaseModel


class DigitizePayload(BaseModel):
    fileName: str
    fileType: str
    fileDataUrl: str
