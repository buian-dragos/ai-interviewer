from pydantic import BaseModel, EmailStr, Field


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str | None


class SignUpResponse(BaseModel):
    user: UserResponse | None = None
    confirmation_required: bool = False
    message: str | None = None
